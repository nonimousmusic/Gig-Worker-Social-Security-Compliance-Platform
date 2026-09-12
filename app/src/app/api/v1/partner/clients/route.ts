import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/data-access";
import { createClient } from "@/lib/supabase/server";
import type { AnyRow } from "@/lib/types";

export async function GET() {
  const tenant = await requireTenant();
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const supabase = await createClient();

  // Active partner grants for this organization.
  const { data: grants } = await supabase
    .from("partner_client_access")
    .select("client_organization_id, access_level, granted_at")
    .eq("partner_organization_id", tenant.organizationId)
    .is("revoked_at", null);

  const clientIds = (grants as AnyRow[] | null)?.map((g) => g.client_organization_id) || [];

  const { data: ownOrg } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", tenant.organizationId)
    .single();

  const clients: AnyRow[] = [];

  if (clientIds.length > 0) {
    const { data: orgRows } = await supabase
      .from("organizations")
      .select("*")
      .in("id", clientIds);

    for (const org of (orgRows as AnyRow[] | null) || []) {
      const { count: workerCount } = await supabase
        .from("workers")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org.id);

      const { count: eligibleCount } = await supabase
        .from("workers")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org.id)
        .in("eligibility_status", ["ELIGIBLE", "ELIGIBLE_MULTI_AGGREGATOR"]);

      const { data: filingRows } = await supabase
        .from("filing_records")
        .select("due_date, status, final_liability_amount")
        .eq("organization_id", org.id);

      const filings = (filingRows as AnyRow[] | null) || [];
      const open = filings.filter((f) => f.status !== "PAID" && f.due_date);
      const openLiability = open.reduce((sum, f) => sum + Number(f.final_liability_amount ?? 0), 0);
      const nextDue: string | null = open.length
        ? open.map((f) => String(f.due_date).slice(0, 10)).sort()[0]
        : null;
      const overdue =
        open.some((f) => f.status === "OVERDUE") ||
        (nextDue !== null && nextDue < new Date().toISOString().slice(0, 10));

      clients.push({
        id: org.id,
        legalName: org.name,
        sector: org.sector,
        cin: org.cin_or_registration,
        activeWorkers: workerCount ?? 0,
        eligibleWorkers: eligibleCount ?? 0,
        nextFilingDue: nextDue,
        complianceStatus: overdue ? "OVERDUE" : open.length > 0 ? "ATTENTION_REQUIRED" : "COMPLIANT",
        riskScore: eligibleCount && workerCount ? Math.round((eligibleCount / workerCount) * 100) : 0,
        openCessLiability: Math.round(openLiability * 100) / 100,
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      partnerFirm: (ownOrg as AnyRow | null)?.name || "Advisory Partner",
      totalClients: clients.length,
      clients,
    },
  });
}