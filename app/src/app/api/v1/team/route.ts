import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/data-access";
import { createClient } from "@/lib/supabase/server";
import type { AnyRow } from "@/lib/types";

/** Compliance team = profiles attached to the caller's organization (RLS-scoped). */
export async function GET() {
  const tenant = await requireTenant();
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("organization_id", tenant.organizationId)
    .order("email", { ascending: true });

  return NextResponse.json({
    success: true,
    data: {
      members: ((rows as AnyRow[] | null) || []).map((p) => ({
        id: p.id,
        name: p.full_name || p.email,
        email: p.email,
        role: p.role,
      })),
    },
  });
}
