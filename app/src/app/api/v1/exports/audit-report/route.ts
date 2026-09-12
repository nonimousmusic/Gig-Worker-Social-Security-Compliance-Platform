import { NextResponse } from "next/server";
import { requireTenant, getWorkerRecords, getFilings, getChallans } from "@/lib/data-access";
import { getAuditLogs } from "@/lib/audit-logger";
import { getSessionData } from "@/lib/session";

export async function GET() {
  const tenant = await requireTenant();
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const session = await getSessionData();
  const org = session?.organization;

  const [workers, filings, challans, auditLogs] = await Promise.all([
    getWorkerRecords(tenant),
    getFilings(tenant.organizationId),
    getChallans(tenant.organizationId),
    getAuditLogs(20),
  ]);

  const eligibleWorkers = workers.filter((w) => w.status === "ELIGIBLE");
  const paidFilings = filings.filter((f) => f.status === "PAID");
  const totalCessPaid = paidFilings.reduce((sum, f) => sum + f.finalCessPayable, 0);

  const complianceScore =
    workers.length > 0 && filings.length > 0
      ? Math.min(100, Math.round((eligibleWorkers.length / workers.length) * 50 + (paidFilings.length / filings.length) * 50))
      : workers.length > 0
        ? Math.round((eligibleWorkers.length / workers.length) * 100)
        : 96;

  return NextResponse.json({
    success: true,
    data: {
      reportGeneratedAt: new Date().toISOString(),
      statutoryReference: "Section 114 & Rule 32 of the Code on Social Security 2020",
      organization: {
        id: org?.id,
        legalName: org?.name || tenant.organizationId,
        cin: org?.cin_or_registration,
        gstin: org?.gstin,
        sector: org?.sector,
        annualTurnover: org?.annual_turnover,
        registeredAddress: org?.registered_address || "",
      },
      summary: {
        totalRegisteredWorkers: workers.length,
        eligibleWorkersCount: eligibleWorkers.length,
        totalFilingsCompleted: paidFilings.length,
        totalCessPaidINR: totalCessPaid,
        complianceScore,
        auditStatus: complianceScore >= 80 ? "COMPLIANT" : "REVIEW_REQUIRED",
      },
      filings,
      challans,
      immutableAuditTrail: auditLogs,
    },
  });
}