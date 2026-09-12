import { NextRequest, NextResponse } from "next/server";
import { dataStore, FilingItem } from "@/lib/data-store";
import { calculateContribution } from "@/lib/contribution-calc";
import { logAuditEvent } from "@/lib/audit-logger";

export async function GET() {
  const filings = dataStore.getFilings();
  return NextResponse.json({
    success: true,
    data: {
      filings,
      total: filings.length,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      financialYear,
      quarter,
      filingType,
      turnoverAmount,
      payoutAmount,
      ratePercent,
      eligibleWorkerCount,
      totalWorkerCount,
    } = body;

    const rate = ratePercent || 1.5;
    const calc = calculateContribution({
      annualTurnover: turnoverAmount || 0,
      totalWorkerPayouts: payoutAmount || 0,
      ratePercentage: rate,
    });

    const newFiling: Omit<FilingItem, "id"> = {
      financialYear: financialYear || "2025-2026",
      quarter: quarter || "Q2",
      filingType: filingType || "FORM_XX_QUARTERLY",
      turnoverAmount: turnoverAmount || 0,
      payoutAmount: payoutAmount || 0,
      ratePercent: rate,
      calculatedCess: calc.turnoverBasis.amount,
      payoutCapAmount: calc.workerPaymentBasis.amount,
      finalCessPayable: calc.finalObligation.amount,
      eligibleWorkerCount: eligibleWorkerCount || 1410,
      totalWorkerCount: totalWorkerCount || 1850,
      dueDate: quarter === "Q1" ? "2025-07-31" : quarter === "Q2" ? "2025-10-31" : "2026-01-31",
      status: "DRAFT",
    };

    const created = dataStore.createFiling(newFiling);

    await logAuditEvent({
      action: "FILING_DRAFT_CREATED",
      entity: "FilingRecord",
      entityId: created.id,
      metadata: { filingType: created.filingType, quarter: created.quarter, finalCess: created.finalCessPayable },
    });

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create filing" } },
      { status: 500 }
    );
  }
}
