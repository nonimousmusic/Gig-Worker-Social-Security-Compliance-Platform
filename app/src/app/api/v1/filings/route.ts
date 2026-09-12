import { NextRequest, NextResponse } from "next/server";
import { requireTenant, getFilings, mapFiling } from "@/lib/data-access";
import { createClient } from "@/lib/supabase/server";
import { calculateContribution } from "@/lib/contribution-calc";
import { logAuditEvent } from "@/lib/audit-logger";
import type { FilingItem, AnyRow } from "@/lib/types";

export async function GET() {
  const tenant = await requireTenant();
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const filings = await getFilings(tenant.organizationId);

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
    const tenant = await requireTenant();
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

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

    const fy = financialYear || "2025-2026";
    const formType = filingType || "FORM_XX_QUARTERLY";
    const effQuarter = quarter || (formType === "FORM_XXI_ANNUAL" ? null : "Q2");
    // Due dates derived from the FY so new years keep working.
    const [startYear, endYear] = fy.split("-").map((y: string) => parseInt(y, 10));
    const dueDate =
      formType === "FORM_XXI_ANNUAL"
        ? `${endYear}-06-30`
        : effQuarter === "Q1"
          ? `${startYear}-07-31`
          : effQuarter === "Q2"
            ? `${startYear}-10-31`
            : effQuarter === "Q3"
              ? `${endYear}-01-31`
              : `${endYear}-04-30`;

    const insertPayload = {
      organization_id: tenant.organizationId,
      financial_year: fy,
      quarter: effQuarter,
      form_type: formType,
      due_date: dueDate,
      status: "DRAFT",
      reported_turnover: turnoverAmount || 0,
      reported_worker_payouts: payoutAmount || 0,
      applied_rate_pct: rate,
      assessed_contribution: calc.turnoverBasis.amount,
      statutory_ceiling_amount: calc.workerPaymentBasis.amount,
      final_liability_amount: calc.finalObligation.amount,
      eligible_worker_count: eligibleWorkerCount || 0,
      total_worker_count: totalWorkerCount || 0,
    };

    const supabase = await createClient();

    const { data: created, error } = await supabase
      .from("filing_records")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      // Duplicate (org, FY, form, quarter) — refresh the existing draft instead.
      let dupQuery = supabase
        .from("filing_records")
        .select("*")
        .eq("organization_id", tenant.organizationId)
        .eq("financial_year", fy)
        .eq("form_type", formType);
      dupQuery = effQuarter === null ? dupQuery.is("quarter", null) : dupQuery.eq("quarter", effQuarter);
      const { data: existing } = await dupQuery.maybeSingle();

      if (!existing) {
        return NextResponse.json(
          { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
          { status: 500 }
        );
      }

      const { data: refreshed } = await supabase
        .from("filing_records")
        .update({
          quarter: quarter || existing.quarter,
          due_date: dueDate,
          status: "DRAFT",
          reported_turnover: turnoverAmount ?? existing.reported_turnover,
          reported_worker_payouts: payoutAmount ?? existing.reported_worker_payouts,
          applied_rate_pct: rate,
          assessed_contribution: calc.turnoverBasis.amount,
          statutory_ceiling_amount: calc.workerPaymentBasis.amount,
          final_liability_amount: calc.finalObligation.amount,
          eligible_worker_count: eligibleWorkerCount ?? existing.eligible_worker_count,
          total_worker_count: totalWorkerCount ?? existing.total_worker_count,
        })
        .eq("id", existing.id)
        .select()
        .single();

      const { data: challanRows } = await supabase
        .from("filing_challans")
        .select("*")
        .eq("filing_record_id", existing.id);

      const byFiling = new Map<string, AnyRow[]>([[existing.id, challanRows || []]]);

      await logAuditEvent({
        action: "FILING_DRAFT_UPDATED",
        entity: "FilingRecord",
        entityId: existing.id,
        metadata: { filingType: formType, quarter, finalCess: calc.finalObligation.amount },
      });

      return NextResponse.json({
        success: true,
        data: mapFiling(refreshed || existing, byFiling),
      });
    }

    await logAuditEvent({
      action: "FILING_DRAFT_CREATED",
      entity: "FilingRecord",
      entityId: created.id,
      metadata: { filingType: created.form_type, quarter: created.quarter, finalCess: created.final_liability_amount },
    });

    const filing: FilingItem = {
      id: created.id,
      financialYear: created.financial_year,
      quarter: created.quarter || undefined,
      filingType: created.form_type,
      turnoverAmount: Number(created.reported_turnover),
      payoutAmount: Number(created.reported_worker_payouts),
      ratePercent: Number(created.applied_rate_pct),
      calculatedCess: Number(created.assessed_contribution),
      payoutCapAmount: Number(created.statutory_ceiling_amount),
      finalCessPayable: Number(created.final_liability_amount),
      eligibleWorkerCount: created.eligible_worker_count,
      totalWorkerCount: created.total_worker_count,
      dueDate: created.due_date,
      status: created.status,
    };

    return NextResponse.json({
      success: true,
      data: filing,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create filing" } },
      { status: 500 }
    );
  }
}