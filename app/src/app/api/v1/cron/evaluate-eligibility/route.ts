import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireTenant } from "@/lib/data-access";
import { calculateEligibility, isEligibleStatus, type EligibilityStatus } from "@/lib/eligibility-engine";
import type { AnyRow } from "@/lib/types";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "dev-cron-secret";
  const hasValidSecret = authHeader === `Bearer ${cronSecret}`;

  // Server-to-server cron uses the shared secret; the dashboard button
  // authenticates via the user's Supabase session (a browser can't hold the secret).
  let orgScope: string | null = null;
  if (!hasValidSecret) {
    const tenant = await requireTenant();
    if (!tenant && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
        { status: 401 }
      );
    }
    if (tenant) orgScope = tenant.organizationId;
  }

  const supabase = createServiceClient();

  // All workers across all organizations (service role bypasses RLS),
  // or just the caller's organization for session-authenticated runs.
  let workersQuery = supabase.from("workers").select("*");
  if (orgScope) workersQuery = workersQuery.eq("organization_id", orgScope);
  const { data: workers } = await workersQuery;
  const allWorkers = (workers as AnyRow[] | null) || [];
  if (allWorkers.length === 0) {
    return NextResponse.json({
      success: true,
      data: { evaluatedWorkers: 0, newlyEligibleCount: 0, timestamp: new Date().toISOString() },
    });
  }

  const workerIds = allWorkers.map((w) => w.id);

  // Latest FY aggregate per worker.
  const { data: aggRows } = await supabase
    .from("worker_annual_aggregates")
    .select("worker_id, internal_days_worked, declared_external_days, total_cumulative_days, financial_year")
    .in("worker_id", workerIds)
    .order("financial_year", { ascending: false });

  const aggByWorker = new Map<string, AnyRow>();
  (aggRows as AnyRow[] | null)?.forEach((a) => {
    if (!aggByWorker.has(a.worker_id)) aggByWorker.set(a.worker_id, a);
  });

  // Days worked in the rolling 90-day window.
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: ledgerRows } = await supabase
    .from("daily_engagement_ledger")
    .select("worker_id, engagement_date")
    .in("worker_id", workerIds)
    .gte("engagement_date", cutoff);

  const days90 = new Map<string, Set<string>>();
  (ledgerRows as AnyRow[] | null)?.forEach((l) => {
    if (!days90.has(l.worker_id)) days90.set(l.worker_id, new Set());
    days90.get(l.worker_id)!.add(String(l.engagement_date).slice(0, 10));
  });

  // Full sync (both directions): the nightly job reconciles stored status
  // with the single engine definition. Single-aggregator days are the best
  // of the rolling-90 count and the FY internal count, so seasonal workers
  // with 120+ FY days stay covered even as the window slides.
  const toUpdate: { id: string; organization_id: string; from: string; to: string }[] = [];
  const orgsAffected = new Set<string>();

  allWorkers.forEach((w) => {
    const agg = aggByWorker.get(w.id);
    const rolling90 = days90.get(w.id)?.size ?? 0;
    const fyInternal = Number(agg?.internal_days_worked ?? 0);
    const external = Number(agg?.declared_external_days ?? 0);
    const singleDays = Math.max(rolling90, fyInternal);
    const fresh = calculateEligibility(singleDays, external).eligibilityStatus;
    const current: string = w.eligibility_status;

    if (fresh !== current) {
      toUpdate.push({ id: w.id, organization_id: w.organization_id, from: current, to: fresh });
      orgsAffected.add(w.organization_id);
    }
  });

  let newlyEligibleCount = 0;
  for (const w of toUpdate) {
    const toEligible = isEligibleStatus(w.to as EligibilityStatus);
    const wasEligible = isEligibleStatus(w.from as EligibilityStatus);
    await supabase
      .from("workers")
      .update({ eligibility_status: w.to })
      .eq("id", w.id);
    await supabase
      .from("worker_annual_aggregates")
      .update({ is_eligible: toEligible })
      .eq("worker_id", w.id);
    if (toEligible && !wasEligible) newlyEligibleCount += 1;
  }

  // Per-organization audit trail (append-only; service role bypasses RLS).
  for (const orgId of orgsAffected) {
    await supabase.from("audit_logs").insert({
      organization_id: orgId,
      actor_email: "system@gigcesshq.internal",
      action: "CRON_ELIGIBILITY_EVALUATED",
      entity_type: "WorkerLedger",
      details_json: {
        evaluatedCount: allWorkers.length,
        updatedCount: toUpdate.length,
        newlyEligibleCount,
        timestamp: new Date().toISOString(),
      },
      ip_address: "127.0.0.1",
      user_agent: "GigCess-Cron/1.0",
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      evaluatedWorkers: allWorkers.length,
      updatedWorkers: toUpdate.length,
      newlyEligibleCount,
      timestamp: new Date().toISOString(),
      statutoryReference: "Section 114 / Rule 28 Nightly Rolling Threshold Job",
    },
  });
}