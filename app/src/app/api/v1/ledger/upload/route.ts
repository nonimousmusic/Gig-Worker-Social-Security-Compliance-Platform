import { NextRequest, NextResponse } from "next/server";
import { parseDailyLedgerCSV, parseSummaryBackfillCSV } from "@/lib/csv-parser";
import { requireTenant } from "@/lib/data-access";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit-logger";
import { getCurrentFinancialYear } from "@/lib/financial-year";
import { calculateEligibility, rankEligibility, isEligibleStatus } from "@/lib/eligibility-engine";
import type { ParsedLedgerRow, ParsedBackfillRow } from "@/lib/csv-parser";

export async function POST(req: NextRequest) {
  try {
    const tenant = await requireTenant();
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const format = (formData.get("format") as string) || "daily_ledger";

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "NO_FILE", message: "No CSV file provided in upload" } },
        { status: 400 }
      );
    }

    const text = await file.text();
    const supabase = await createClient();
    const orgId = tenant.organizationId;
    const fy = getCurrentFinancialYear();
    // One batch id per upload so rows from the same file stay grouped.
    const batchId = `csv-${Date.now()}`;

    if (format === "summary_backfill") {
      const parsed = parseSummaryBackfillCSV(text);
      const validRows = parsed.rows.filter((r) => r.isValid);
      const ingestErrors: string[] = [];

      for (const row of validRows) {
        const err = await ingestBackfillRow(supabase, orgId, fy, row);
        if (err && ingestErrors.length < 5) ingestErrors.push(`Row ${row.rowNumber}: ${err}`);
      }

      await logAuditEvent({
        action: "CSV_BACKFILL_INGESTED",
        entity: "SummaryBackfill",
        metadata: { filename: file.name, totalRows: parsed.totalRows, validRows: parsed.validCount, failedRows: ingestErrors.length },
      });

      return NextResponse.json({
        success: true,
        data: {
          filename: file.name,
          format: "summary_backfill",
          totalRows: parsed.totalRows,
          validCount: parsed.validCount,
          errorCount: parsed.errorCount,
          failedCount: ingestErrors.length,
          ingestErrors,
          preview: parsed.rows.slice(0, 10),
        },
      });
    }

    const parsed = parseDailyLedgerCSV(text);
    const validRows = parsed.rows.filter((r) => r.isValid);
    const ingestErrors: string[] = [];

    for (const row of validRows) {
      const err = await ingestLedgerRow(supabase, orgId, fy, row, batchId);
      if (err && ingestErrors.length < 5) ingestErrors.push(`Row ${row.rowNumber}: ${err}`);
    }

    await logAuditEvent({
      action: "CSV_DAILY_LEDGER_INGESTED",
      entity: "DailyLedger",
      metadata: { filename: file.name, totalRows: parsed.totalRows, validRows: parsed.validCount, failedRows: ingestErrors.length },
    });

    return NextResponse.json({
      success: true,
      data: {
        filename: file.name,
        format: "daily_ledger",
        totalRows: parsed.totalRows,
        validCount: parsed.validCount,
        errorCount: parsed.errorCount,
        failedCount: ingestErrors.length,
        ingestErrors,
        preview: parsed.rows.slice(0, 10),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "CSV processing failed";
    return NextResponse.json(
      { success: false, error: { code: "INGESTION_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

type QueryClient = Awaited<ReturnType<typeof createClient>>;

async function findWorker(supabase: QueryClient, orgId: string, code: string) {
  const { data } = await supabase
    .from("workers")
    .select("*")
    .eq("worker_internal_code", code)
    .eq("organization_id", orgId)
    .single();
  return data;
}

async function ingestLedgerRow(
  supabase: QueryClient,
  orgId: string,
  fy: string,
  row: ParsedLedgerRow,
  batchId: string
): Promise<string | null> {
  const existing = await findWorker(supabase, orgId, row.workerId);

  if (existing) {
    const { error: ledgerError } = await supabase.from("daily_engagement_ledger").insert({
      worker_id: existing.id,
      engagement_date: row.date,
      gross_earnings: row.grossPayout,
      trip_or_task_id: row.workerId && row.date ? `${row.workerId}-${row.date}` : null,
      source_batch_id: batchId,
    });
    if (ledgerError) return ledgerError.message;

    const { data: agg } = await supabase
      .from("worker_annual_aggregates")
      .select("*")
      .eq("worker_id", existing.id)
      .eq("financial_year", fy)
      .single();

    const newInternal = Number(agg?.internal_days_worked ?? 0) + 1;
    const external = Number(agg?.declared_external_days ?? 0);
    const newCumulative = Number(agg?.total_cumulative_days ?? 0) + 1;
    const newEarnings = Number(agg?.total_gross_earnings ?? 0) + row.grossPayout;

    // Promote-only: ingestion adds a day, so it must never demote.
    const candidate = calculateEligibility(newInternal, external).eligibilityStatus;
    const newStatus =
      rankEligibility(candidate) > rankEligibility(existing.eligibility_status)
        ? candidate
        : existing.eligibility_status;

    if (agg) {
      const { error } = await supabase.from("worker_annual_aggregates").update({
        internal_days_worked: newInternal,
        total_cumulative_days: newCumulative,
        total_gross_earnings: newEarnings,
        is_eligible: isEligibleStatus(newStatus),
      }).eq("id", agg.id);
      if (error) return error.message;
    } else {
      const { error } = await supabase.from("worker_annual_aggregates").insert({
        worker_id: existing.id,
        financial_year: fy,
        internal_days_worked: newInternal,
        declared_external_days: 0,
        total_cumulative_days: newCumulative,
        total_gross_earnings: newEarnings,
        is_eligible: isEligibleStatus(newStatus),
      });
      if (error) return error.message;
    }

    const { error } = await supabase.from("workers").update({ eligibility_status: newStatus }).eq("id", existing.id);
    if (error) return error.message;
    return null;
  }

  // New worker
  const { data: worker, error: workerError } = await supabase
    .from("workers")
    .insert({
      organization_id: orgId,
      worker_internal_code: row.workerId,
      full_name: row.workerName,
      uan: row.uan || null,
      masked_aadhaar: `XXXX-XXXX-${row.aadhaarLast4 || "0000"}`,
      state: "DELHI",
      registration_status: "PENDING_SUBMISSION",
      eligibility_status: "INACTIVE",
      onboarded_date: row.date,
      is_active: true,
    })
    .select()
    .single();

  if (workerError || !worker) return workerError?.message || "Worker insert failed";

  const { error: aggError } = await supabase.from("worker_annual_aggregates").insert({
    worker_id: worker.id,
    financial_year: fy,
    internal_days_worked: 1,
    declared_external_days: 0,
    total_cumulative_days: 1,
    total_gross_earnings: row.grossPayout,
    is_eligible: false,
  });
  if (aggError) return aggError.message;
  const { error: ledgerError } = await supabase.from("daily_engagement_ledger").insert({
    worker_id: worker.id,
    engagement_date: row.date,
    gross_earnings: row.grossPayout,
    trip_or_task_id: `${row.workerId}-${row.date}`,
    source_batch_id: batchId,
  });
  if (ledgerError) return ledgerError.message;
  return null;
}

async function ingestBackfillRow(
  supabase: QueryClient,
  orgId: string,
  fy: string,
  row: ParsedBackfillRow
): Promise<string | null> {
  const existing = await findWorker(supabase, orgId, row.workerId);
  const newCumulative = row.totalActiveDays + row.otherPlatformDays;

  if (existing) {
    const { data: agg } = await supabase
      .from("worker_annual_aggregates")
      .select("*")
      .eq("worker_id", existing.id)
      .eq("financial_year", fy)
      .single();

    const maxInternal = Math.max(Number(agg?.internal_days_worked ?? 0), row.totalActiveDays);
    const finalCumulative = Number(agg?.total_cumulative_days ?? 0) + newCumulative;
    const finalExternal = Number(agg?.declared_external_days ?? 0) + row.otherPlatformDays;
    const finalEarnings = Number(agg?.total_gross_earnings ?? 0) + row.totalPayout;

    // Promote-only: a backfill adds days, so it must never demote.
    const candidate = calculateEligibility(maxInternal, finalExternal).eligibilityStatus;
    const newStatus =
      rankEligibility(candidate) > rankEligibility(existing.eligibility_status)
        ? candidate
        : existing.eligibility_status;

    if (agg) {
      const { error } = await supabase.from("worker_annual_aggregates").update({
        internal_days_worked: maxInternal,
        declared_external_days: finalExternal,
        total_cumulative_days: finalCumulative,
        total_gross_earnings: finalEarnings,
        is_eligible: isEligibleStatus(newStatus),
      }).eq("id", agg.id);
      if (error) return error.message;
    } else {
      const { error } = await supabase.from("worker_annual_aggregates").insert({
        worker_id: existing.id,
        financial_year: fy,
        internal_days_worked: row.totalActiveDays,
        declared_external_days: row.otherPlatformDays,
        total_cumulative_days: finalCumulative,
        total_gross_earnings: finalEarnings,
        is_eligible: isEligibleStatus(newStatus),
      });
      if (error) return error.message;
    }

    const { error } = await supabase.from("workers").update({
      eligibility_status: newStatus,
    }).eq("id", existing.id);
    if (error) return error.message;
    return null;
  }

  const initialStatus = calculateEligibility(row.totalActiveDays, row.otherPlatformDays).eligibilityStatus;

  const { data: worker, error: workerError } = await supabase
    .from("workers")
    .insert({
      organization_id: orgId,
      worker_internal_code: row.workerId,
      full_name: row.workerName,
      uan: row.uan || null,
      masked_aadhaar: row.aadhaarLast4 ? `XXXX-XXXX-${row.aadhaarLast4}` : null,
      state: "DELHI",
      registration_status: "PENDING_SUBMISSION",
      eligibility_status: initialStatus,
      onboarded_date: row.periodStart || row.periodEnd || new Date().toISOString().slice(0, 10),
      is_active: true,
    })
    .select()
    .single();

  if (workerError || !worker) return workerError?.message || "Worker insert failed";

  const { error } = await supabase.from("worker_annual_aggregates").insert({
    worker_id: worker.id,
    financial_year: fy,
    internal_days_worked: row.totalActiveDays,
    declared_external_days: row.otherPlatformDays,
    total_cumulative_days: newCumulative,
    total_gross_earnings: row.totalPayout,
    is_eligible: isEligibleStatus(initialStatus),
  });
  if (error) return error.message;
  return null;
}