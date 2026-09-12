import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/data-access";
import { createClient } from "@/lib/supabase/server";

const VALID_SECTORS = [
  "RIDE_HAILING",
  "FOOD_DELIVERY",
  "LOGISTICS_DELIVERY",
  "MARKETPLACE_FREELANCE",
  "HEALTHCARE_PERSONAL_SERVICES",
  "OTHER",
];

export async function GET() {
  const tenant = await requireTenant();
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", tenant.organizationId)
    .single();

  if (!org) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Organization not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: org.id,
      legalName: org.name,
      sector: org.sector,
      cin: org.cin_or_registration,
      gstin: org.gstin,
      registeredAddress: org.registered_address || "",
      annualTurnover: org.annual_turnover,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const tenant = await requireTenant();
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const body = await req.json();

  if (body.sector !== undefined && !VALID_SECTORS.includes(body.sector)) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid sector" } },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.legalName !== undefined) patch.name = body.legalName;
  if (body.sector !== undefined) patch.sector = body.sector;
  if (body.cin !== undefined) patch.cin_or_registration = body.cin || null;
  if (body.gstin !== undefined) patch.gstin = body.gstin || null;
  if (body.registeredAddress !== undefined) patch.registered_address = body.registeredAddress || null;

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("organizations")
    .update(patch)
    .eq("id", tenant.organizationId)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error?.message || "Organization update failed" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      legalName: updated.name,
      sector: updated.sector,
      cin: updated.cin_or_registration,
      gstin: updated.gstin,
      registeredAddress: updated.registered_address || "",
    },
  });
}
