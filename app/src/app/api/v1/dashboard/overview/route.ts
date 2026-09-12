import { NextResponse } from "next/server";
import { requireTenant, getWorkerRecords, getFilings } from "@/lib/data-access";

export async function GET() {
  const tenant = await requireTenant();
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const [workers, filings] = await Promise.all([
    getWorkerRecords(tenant),
    getFilings(tenant.organizationId),
  ]);

  const totalWorkers = workers.length;
  const eligibleWorkers = workers.filter((w) => w.status === "ELIGIBLE").length;
  const approachingWorkers = workers.filter((w) => w.status === "APPROACHING").length;
  const inactiveWorkers = workers.filter((w) => w.status === "INACTIVE").length;

  // Most recent filing drives the financial snapshot; zeros when none exist yet.
  const currentFiling = filings[0] || null;
  const paidFilings = filings.filter((f) => f.status === "PAID");
  const totalCessPaidYTD = paidFilings.reduce((sum, f) => sum + f.finalCessPayable, 0);

  // Next deadline = nearest due date among still-open filings.
  const openFilings = filings
    .filter((f) => f.status !== "PAID" && f.dueDate)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const nextDue = openFilings[0] || null;

  const now = new Date();
  const daysRemaining =
    nextDue && nextDue.dueDate
      ? Math.max(0, Math.ceil((new Date(`${nextDue.dueDate}T23:59:59Z`).getTime() - now.getTime()) / (1000 * 3600 * 24)))
      : null;
  const isOverdue =
    nextDue && nextDue.dueDate ? new Date(`${nextDue.dueDate}T23:59:59Z`).getTime() < now.getTime() : false;

  const eligiblePercentage = totalWorkers > 0 ? Math.round((eligibleWorkers / totalWorkers) * 100) : 0;
  const complianceScore = totalWorkers > 0 ? Math.min(100, 50 + Math.round((eligibleWorkers / totalWorkers) * 50)) : 50;

  const q2 = currentFiling
    ? {
        turnoverQ2: currentFiling.turnoverAmount,
        payoutQ2: currentFiling.payoutAmount,
        cessRatePercent: currentFiling.ratePercent || 1.5,
        calculatedCessQ2: currentFiling.calculatedCess,
        payoutCapQ2: currentFiling.payoutCapAmount,
        netCessPayableQ2: currentFiling.finalCessPayable,
      }
    : {
        turnoverQ2: 0,
        payoutQ2: 0,
        cessRatePercent: 1.5,
        calculatedCessQ2: 0,
        payoutCapQ2: 0,
        netCessPayableQ2: 0,
      };

  return NextResponse.json({
    success: true,
    data: {
      stats: {
        totalWorkers,
        eligibleWorkers,
        approachingWorkers,
        inactiveWorkers,
        eligiblePercentage,
      },
      financials: {
        ...q2,
        totalCessPaidYTD,
      },
      statutoryDeadline: nextDue
        ? {
            filingName:
              nextDue.filingType === "FORM_XXI_ANNUAL"
                ? "Form-XXI (Annual Return)"
                : "Form-XX (Quarterly Turnover Return)",
            quarter: nextDue.quarter ? `${nextDue.quarter} FY ${nextDue.financialYear}` : `FY ${nextDue.financialYear}`,
            dueDate: nextDue.dueDate,
            daysRemaining,
            status: nextDue.status === "OVERDUE" || isOverdue ? "OVERDUE" : "UPCOMING",
            penaltyRiskRate: "1% compounding per month under Section 114(4)",
          }
        : {
            filingName: null,
            quarter: null,
            dueDate: null,
            daysRemaining: null,
            status: "NO_OPEN_FILINGS",
            penaltyRiskRate: "1% compounding per month under Section 114(4)",
          },
      recentFilings: filings.slice(0, 3),
      complianceScore,
      riskLevel: complianceScore >= 80 ? "LOW" : complianceScore >= 55 ? "MEDIUM" : "HIGH",
    },
  });
}