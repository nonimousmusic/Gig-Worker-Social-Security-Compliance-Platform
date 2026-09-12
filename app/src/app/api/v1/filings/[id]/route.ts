import { NextRequest, NextResponse } from "next/server";
import { requireTenant, mapFiling } from "@/lib/data-access";
import { createClient } from "@/lib/supabase/server";
import type { AnyRow } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await requireTenant();
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: filing } = await supabase
    .from("filing_records")
    .select("*")
    .eq("id", id)
    .eq("organization_id", tenant.organizationId)
    .single();

  if (!filing) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Filing not found" } },
      { status: 404 }
    );
  }

  const { data: challanRows } = await supabase
    .from("filing_challans")
    .select("*")
    .eq("filing_record_id", id)
    .order("locked_at", { ascending: false });

  const byFiling = new Map<string, AnyRow[]>([[id, challanRows || []]]);

  return NextResponse.json({
    success: true,
    data: mapFiling(filing, byFiling),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await requireTenant();
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await req.json();

  const VALID_STATUSES = ["DRAFT", "SUBMITTED", "PAID", "OVERDUE"];
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid filing status" } },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("filing_records")
    .select("id, status")
    .eq("id", id)
    .eq("organization_id", tenant.organizationId)
    .single();

  if (!current) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Filing not found" } },
      { status: 404 }
    );
  }

  // PAID filings are audit-locked by their challan; they can only change via
  // a formal rectification, not a PATCH.
  if (current.status === "PAID") {
    return NextResponse.json(
      { success: false, error: { code: "FILING_LOCKED", message: "Paid filings are locked. File a rectification to amend." } },
      { status: 409 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.status !== undefined) patch.status = body.status;
  if (body.financialYear !== undefined) patch.financial_year = body.financialYear;
  if (body.quarter !== undefined) patch.quarter = body.quarter;
  if (body.filingType !== undefined) patch.form_type = body.filingType;
  if (body.dueDate !== undefined) patch.due_date = body.dueDate;
  if (body.turnoverAmount !== undefined) patch.reported_turnover = body.turnoverAmount;
  if (body.payoutAmount !== undefined) patch.reported_worker_payouts = body.payoutAmount;
  if (body.ratePercent !== undefined) patch.applied_rate_pct = body.ratePercent;
  if (body.assessedContribution !== undefined) patch.assessed_contribution = body.assessedContribution;
  if (body.statutoryCeilingAmount !== undefined) patch.statutory_ceiling_amount = body.statutoryCeilingAmount;
  if (body.finalLiabilityAmount !== undefined) patch.final_liability_amount = body.finalLiabilityAmount;
  if (body.eligibleWorkerCount !== undefined) patch.eligible_worker_count = body.eligibleWorkerCount;
  if (body.totalWorkerCount !== undefined) patch.total_worker_count = body.totalWorkerCount;
  if (body.submittedAt !== undefined) patch.filed_at = body.submittedAt;
  if (body.lockedHashSha256 !== undefined) patch.locked_hash_sha256 = body.lockedHashSha256;

  const { data: updated, error } = await supabase
    .from("filing_records")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", tenant.organizationId)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error?.message || "Filing update failed" } },
      { status: 500 }
    );
  }

  const { data: challanRows } = await supabase
    .from("filing_challans")
    .select("*")
    .eq("filing_record_id", id);

  const byFiling = new Map<string, AnyRow[]>([[id, challanRows || []]]);

  return NextResponse.json({
    success: true,
    data: mapFiling(updated, byFiling),
  });
}