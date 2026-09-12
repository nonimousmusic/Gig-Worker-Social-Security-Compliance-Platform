import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/data-access";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFinancialYear } from "@/lib/financial-year";
import { calculateEligibility, rankEligibility, isEligibleStatus } from "@/lib/eligibility-engine";

export async function POST(
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
  const { otherPlatformName, declaredDays, periodStart, periodEnd } = body;

  const addedDays = parseInt(declaredDays || "0", 10);
  if (Number.isNaN(addedDays) || addedDays < 0) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "declaredDays must be a non-negative number" } },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("id, worker_internal_code, organization_id, eligibility_status")
    .eq("id", id)
    .eq("organization_id", tenant.organizationId)
    .single();

  if (!worker) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Worker not found" } },
      { status: 404 }
    );
  }

  // Land the declaration on the worker's latest FY aggregate (the same row the
  // directory displays) instead of blindly using the wall-clock FY.
  const { data: agg } = await supabase
    .from("worker_annual_aggregates")
    .select("*")
    .eq("worker_id", id)
    .order("financial_year", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fy = agg?.financial_year ?? getCurrentFinancialYear();

  const prevExternal = Number(agg?.declared_external_days ?? 0);
  const internalDays = Number(agg?.internal_days_worked ?? 0);
  const newExternal = prevExternal + addedDays;
  const newCumulative = Number(agg?.total_cumulative_days ?? 0) + addedDays;

  // Promote-only: a declaration adds information, so it must never demote a
  // worker who is already ELIGIBLE via the 90-day rolling rule.
  const candidate = calculateEligibility(internalDays, newExternal).eligibilityStatus;
  const current = worker.eligibility_status;
  const newStatus = rankEligibility(candidate) > rankEligibility(current) ? candidate : current;

  const aggregateInsert = {
    worker_id: id,
    financial_year: fy,
    internal_days_worked: internalDays,
    declared_external_days: newExternal,
    total_cumulative_days: newCumulative,
    total_gross_earnings: Number(agg?.total_gross_earnings ?? 0),
    is_eligible: isEligibleStatus(newStatus),
  };

  if (agg) {
    await supabase.from("worker_annual_aggregates").update(aggregateInsert).eq("id", agg.id);
  } else {
    await supabase.from("worker_annual_aggregates").insert(aggregateInsert);
  }

  const [workerUpdate, declInsert] = await Promise.all([
    supabase
      .from("workers")
      .update({ eligibility_status: newStatus })
      .eq("id", id),
    supabase.from("worker_declarations").insert({
      worker_id: id,
      financial_year: fy,
      external_aggregator: otherPlatformName || "Cross-Platform Partner",
      declared_days_count: addedDays,
      declared_date: new Date().toISOString(),
    }).select().single(),
  ]);

  const declaration = declInsert.data;
  if (declInsert.error || !declaration) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to record declaration" } },
      { status: 500 }
    );
  }

  await supabase.from("notification_logs").insert({
    organization_id: tenant.organizationId,
    recipient_email: tenant.email,
    type: "WORKER_THRESHOLD",
    subject: "Cross-Platform Declaration Submitted",
    content_summary:
      `${worker.worker_internal_code} declared ${addedDays} day(s) on ${otherPlatformName || "another aggregator"} for ${fy}.`,
  });

  if (workerUpdate.error) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update worker" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      worker: {
        id,
        aggregatorWorkerId: worker.worker_internal_code,
        status: newStatus,
        cumulativeDaysFY: newCumulative,
        otherPlatformDays: newExternal,
        crossPlatformDeclared: true,
      },
      declaration: {
        id: declaration.id,
        workerId: id,
        otherPlatformName: otherPlatformName || "Cross-Platform Partner",
        declaredDays: addedDays,
        periodStart,
        periodEnd,
        status: "RECORDED",
        statutoryRule: "Rule 28(2) Cross-Platform Day Aggregation",
      },
    },
  });
}