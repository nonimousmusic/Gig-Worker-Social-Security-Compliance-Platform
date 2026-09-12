import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/data-access";
import { createClient } from "@/lib/supabase/server";
import type { AnyRow } from "@/lib/types";

function mapWorkerRow(row: AnyRow, sector: string) {
  return {
    id: row.id,
    aggregatorWorkerId: row.worker_internal_code,
    fullName: row.full_name,
    aadhaarLast4: row.masked_aadhaar ? String(row.masked_aadhaar).slice(-4) : "",
    maskedAadhaar: row.masked_aadhaar || "N/A",
    uan: row.uan || undefined,
    phone: row.phone_encrypted || undefined,
    sector: sector,
    state: row.state || "DELHI",
    status: row.eligibility_status === "ELIGIBLE_MULTI_AGGREGATOR" ? "ELIGIBLE" : row.eligibility_status,
    registrationStatus: row.registration_status,
    isActive: row.is_active,
    registeredAt: row.onboarded_date,
  };
}

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

  const { data: worker } = await supabase
    .from("workers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", tenant.organizationId)
    .single();

  if (!worker) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Worker not found" } },
      { status: 404 }
    );
  }

  const { data: declRows } = await supabase
    .from("worker_declarations")
    .select("*")
    .eq("worker_id", id)
    .order("declared_date", { ascending: false });

  // Real 30-day engagement calendar: days with ledger rows are active,
  // all other days inactive. Hours/trips are not captured — never invented.
  const { data: engagementRows } = await supabase
    .from("daily_engagement_ledger")
    .select("engagement_date, gross_earnings")
    .eq("worker_id", id)
    .gte("engagement_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
    .order("engagement_date", { ascending: false });

  const activeByDate = new Map<string, number>();
  ((engagementRows as AnyRow[] | null) || []).forEach((r) => {
    const day = String(r.engagement_date).slice(0, 10);
    activeByDate.set(day, Number(r.gross_earnings ?? 0));
  });

  const history = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const payout = activeByDate.get(dateStr);
    const active = payout !== undefined;
    return {
      date: dateStr,
      active,
      payout: active ? payout : 0,
    };
  });

  const declarations = (declRows || []).map((d: AnyRow) => ({
    id: d.id,
    platformName: d.external_aggregator || "Cross-Platform Partner",
    daysReported: d.declared_days_count,
    period: d.financial_year,
    verified: !!d.verified_by_profile_id,
    submittedAt: d.declared_date,
  }));

  return NextResponse.json({
    success: true,
    data: {
      worker: mapWorkerRow(worker, tenant.sector),
      recentEngagementDays: history,
      declarations,
    },
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

  const patch: Record<string, unknown> = {};
  if (body.fullName !== undefined) patch.full_name = body.fullName;
  if (body.workerInternalCode !== undefined && body.workerInternalCode !== null) {
    patch.worker_internal_code = body.workerInternalCode;
  }
  if (body.uan !== undefined) patch.uan = body.uan || null;
  if (body.maskedAadhaar !== undefined) patch.masked_aadhaar = body.maskedAadhaar || null;
  if (body.phone !== undefined) patch.phone_encrypted = body.phone || null;
  if (body.state !== undefined) patch.state = body.state;
  if (body.registrationStatus !== undefined) patch.registration_status = body.registrationStatus;
  if (body.eligibilityStatus !== undefined) patch.eligibility_status = body.eligibilityStatus;
  if (body.status !== undefined) patch.eligibility_status = body.status;
  if (body.isActive !== undefined) patch.is_active = body.isActive;

  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from("workers")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", tenant.organizationId)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Worker not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: mapWorkerRow(updated, tenant.sector),
  });
}