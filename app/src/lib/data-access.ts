/**
 * Supabase-backed data access + response mappers.
 * Response shapes mirror the previous in-memory data store so the
 * dashboard pages keep working unchanged.
 */
import { getSessionData } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { WorkerRecord, FilingItem, ChallanItem, NotificationItem, AnyRow } from "@/lib/types";

export interface Tenant {
  organizationId: string;
  sector: string;
  email: string;
}

export async function requireTenant(): Promise<Tenant | null> {
  const session = await getSessionData();
  if (!session) return null;
  return {
    organizationId: session.organization.id,
    sector: session.organization.sector || "OTHER",
    email: session.email,
  };
}

function toDateStr(value: string | null | undefined | Date): string {
  if (!value) return "";
  return String(value).slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKERS
// ─────────────────────────────────────────────────────────────────────────────

export async function getWorkerRecords(tenant: Tenant): Promise<WorkerRecord[]> {
  const supabase = await createClient();
  const orgId = tenant.organizationId;

  const { data: rows } = await supabase
    .from("workers")
    .select("*")
    .eq("organization_id", orgId)
    .order("onboarded_date", { ascending: false });

  const workers = (rows as AnyRow[] | null) || [];
  if (workers.length === 0) return [];

  const workerIds = workers.map((w) => w.id);

  // Latest FY aggregate per worker.
  const { data: aggRows } = await supabase
    .from("worker_annual_aggregates")
    .select("*")
    .in("worker_id", workerIds)
    .order("financial_year", { ascending: false });

  const aggByWorker = new Map<string, AnyRow>();
  (aggRows as AnyRow[] | null)?.forEach((a) => {
    if (!aggByWorker.has(a.worker_id)) aggByWorker.set(a.worker_id, a);
  });

  // Days worked in the rolling 90-day window + last active date.
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: ledgerRows } = await supabase
    .from("daily_engagement_ledger")
    .select("worker_id, engagement_date")
    .in("worker_id", workerIds)
    .gte("engagement_date", cutoff);

  const days90 = new Map<string, Set<string>>();
  (ledgerRows as AnyRow[] | null)?.forEach((l) => {
    if (!days90.has(l.worker_id)) days90.set(l.worker_id, new Set());
    days90.get(l.worker_id)!.add(toDateStr(l.engagement_date));
  });

  // Last active date = most recent day in each worker's 90-day window
  // (derived from the rows above, so every worker is covered).
  const lastActive = new Map<string, string>();
  days90.forEach((dates, workerId) => {
    let latest = "";
    dates.forEach((d) => {
      if (d > latest) latest = d;
    });
    if (latest) lastActive.set(workerId, latest);
  });

  return workers.map((w) => {
    const agg = aggByWorker.get(w.id);
    const rawStatus: string = w.eligibility_status || "INACTIVE";
    const status: WorkerRecord["status"] =
      rawStatus === "ELIGIBLE_MULTI_AGGREGATOR" ? "ELIGIBLE" : (rawStatus as WorkerRecord["status"]);
    const externalDays = Number(agg?.declared_external_days ?? 0);

    return {
      id: w.id,
      aggregatorWorkerId: w.worker_internal_code,
      fullName: w.full_name,
      aadhaarLast4: w.masked_aadhaar ? String(w.masked_aadhaar).slice(-4) : "",
      maskedAadhaar: w.masked_aadhaar || "N/A",
      uan: w.uan || undefined,
      phone: w.phone_encrypted || undefined,
      sector: tenant.sector,
      state: w.state || "DELHI",
      status,
      daysInLast90: days90.get(w.id)?.size ?? 0,
      cumulativeDaysFY: Number(agg?.total_cumulative_days ?? 0),
      grossPayoutFY: Number(agg?.total_gross_earnings ?? 0),
      otherPlatformDays: externalDays,
      lastActiveDate: lastActive.get(w.id) || toDateStr(w.onboarded_date) || toDateStr(new Date()),
      crossPlatformDeclared: externalDays > 0,
      registeredAt: toDateStr(w.onboarded_date) || toDateStr(w.created_at),
    };
  });
}

export function upsertWorkerInput(partial: AnyRow, tenant: Tenant, overrides?: AnyRow): AnyRow {
  return {
    organization_id: tenant.organizationId,
    worker_internal_code: partial.workerInternalCode ?? partial.aggregatorWorkerId ?? "",
    full_name: partial.fullName ?? partial.full_name ?? "",
    uan: partial.uan ?? null,
    masked_aadhaar: partial.maskedAadhaar ?? partial.masked_aadhaar ?? null,
    phone_encrypted: partial.phone ?? partial.phoneEncrypted ?? null,
    state: partial.state ?? "DELHI",
    registration_status: partial.registrationStatus ?? "PENDING_SUBMISSION",
    eligibility_status: partial.eligibilityStatus ?? partial.status ?? "INACTIVE",
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FILINGS
// ─────────────────────────────────────────────────────────────────────────────

function computeChallanInfo(filingRow: AnyRow, challansByFiling: Map<string, AnyRow[]>): Partial<FilingItem> {
  const list = challansByFiling.get(filingRow.id) || [];
  const latest = list[0];
  return latest
    ? {
        submittedAt: latest.locked_at || undefined,
        challanId: latest.id,
        challanNumber: latest.challan_number,
        challanUrl: latest.document_url,
        bankName: latest.bank_name || undefined,
        utrNumber: latest.utr_number || undefined,
        sha256Hash: latest.sha256_hash || undefined,
        paymentDate: latest.payment_date ? toDateStr(latest.payment_date) : undefined,
        challanVerified: latest.verified ?? undefined,
      }
    : {
        submittedAt: filingRow.filed_at || undefined,
      };
}

export function mapFiling(row: AnyRow, challansByFiling: Map<string, AnyRow[]>): FilingItem {
  return {
    id: row.id,
    financialYear: row.financial_year,
    quarter: row.quarter || undefined,
    filingType: row.form_type,
    turnoverAmount: Number(row.reported_turnover ?? 0),
    payoutAmount: Number(row.reported_worker_payouts ?? 0),
    ratePercent: Number(row.applied_rate_pct ?? 0),
    calculatedCess: Number(row.assessed_contribution ?? 0),
    payoutCapAmount: Number(row.statutory_ceiling_amount ?? 0),
    finalCessPayable: Number(row.final_liability_amount ?? 0),
    eligibleWorkerCount: row.eligible_worker_count ?? 0,
    totalWorkerCount: row.total_worker_count ?? 0,
    dueDate: toDateStr(row.due_date),
    status: row.status,
    ...computeChallanInfo(row, challansByFiling),
  };
}

export async function getFilings(orgId: string): Promise<FilingItem[]> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("filing_records")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const filings = (rows as AnyRow[] | null) || [];

  const { data: challanRows } = filings.length
    ? await supabase
        .from("filing_challans")
        .select("*")
        .in("filing_record_id", filings.map((f) => f.id))
        .order("locked_at", { ascending: false })
    : { data: [] as AnyRow[] };

  const byFiling = new Map<string, AnyRow[]>();
  (challanRows as AnyRow[])?.forEach((c) => {
    if (!byFiling.has(c.filing_record_id)) byFiling.set(c.filing_record_id, []);
    byFiling.get(c.filing_record_id)!.push(c);
  });

  return filings.map((f) => mapFiling(f, byFiling));
}

export function mapChallan(row: AnyRow): ChallanItem {
  return {
    id: row.id,
    filingId: row.filing_record_id,
    challanNumber: row.challan_number,
    bankName: row.bank_name || "State Bank of India — Treasury Branch",
    utrNumber: row.utr_number,
    amount: Number(row.amount_deposited ?? 0),
    paymentDate: toDateStr(row.payment_date),
    verified: row.verified ?? true,
    lockedAt: row.locked_at || row.created_at,
    sha256Hash: row.sha256_hash || "",
    documentUrl: row.document_url || "",
  };
}

export async function getChallans(orgId: string): Promise<ChallanItem[]> {
  const supabase = await createClient();

  const { data: filingRows } = await supabase
    .from("filing_records")
    .select("id")
    .eq("organization_id", orgId);

  const filingIds = (filingRows as AnyRow[] | null)?.map((f) => f.id) || [];
  if (filingIds.length === 0) return [];

  const { data: rows } = await supabase
    .from("filing_challans")
    .select("*")
    .in("filing_record_id", filingIds)
    .order("locked_at", { ascending: false });

  return ((rows as AnyRow[]) || []).map(mapChallan);
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

const NOTIFICATION_URLS: Record<string, string> = {
  STATUTORY_DEADLINE: "/dashboard/filings",
  WORKER_THRESHOLD: "/dashboard/workers?status=APPROACHING",
  PAYMENT_CONFIRMATION: "/dashboard/challans",
  // REGULATORY_UPDATE intentionally has no action URL (no such page yet).
};

export function mapNotification(row: AnyRow): NotificationItem {
  return {
    id: row.id,
    title: row.subject,
    message: row.content_summary || "",
    type: row.type,
    read: row.read ?? false,
    createdAt: row.sent_at || row.created_at,
    actionUrl: NOTIFICATION_URLS[row.type] || undefined,
  };
}

export async function getNotifications(orgId: string): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("notification_logs")
    .select("*")
    .eq("organization_id", orgId)
    .order("sent_at", { ascending: false });

  return ((rows as AnyRow[]) || []).map(mapNotification);
}