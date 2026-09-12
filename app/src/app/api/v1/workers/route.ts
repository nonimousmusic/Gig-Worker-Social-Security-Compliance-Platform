import { NextRequest, NextResponse } from "next/server";
import { requireTenant, getWorkerRecords, upsertWorkerInput } from "@/lib/data-access";
import { createClient } from "@/lib/supabase/server";
import { maskAadhaar } from "@/lib/aadhaar-masking";
import { getCurrentFinancialYear } from "@/lib/financial-year";
import type { WorkerRecord } from "@/lib/types";

export async function GET(req: NextRequest) {
  const tenant = await requireTenant();
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase() || "";
  const status = searchParams.get("status") || "";
  const sector = searchParams.get("sector") || "";

  let list = await getWorkerRecords(tenant);

  if (search) {
    list = list.filter(
      (w) =>
        w.fullName.toLowerCase().includes(search) ||
        w.aggregatorWorkerId.toLowerCase().includes(search) ||
        (w.uan && w.uan.includes(search)) ||
        w.aadhaarLast4.includes(search)
    );
  }

  if (status) {
    list = list.filter((w) => w.status === status);
  }

  if (sector) {
    list = list.filter((w) => w.sector === sector);
  }

  return NextResponse.json({
    success: true,
    data: {
      workers: list,
      total: list.length,
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
    const { aggregatorWorkerId, workerInternalCode, fullName, aadhaarNumber, uan, phone, state } = body;

    const code = workerInternalCode || aggregatorWorkerId;

    if (!code || !fullName || !aadhaarNumber) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Worker ID, full name, and Aadhaar are required" } },
        { status: 400 }
      );
    }

    const cleanAadhaar = String(aadhaarNumber).replace(/\D/g, "");
    if (cleanAadhaar.length !== 12) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_AADHAAR", message: "Aadhaar must be exactly 12 digits" } },
        { status: 400 }
      );
    }

    const masked = maskAadhaar(cleanAadhaar) || `XXXX-XXXX-${cleanAadhaar.slice(-4)}`;
    const today = new Date().toISOString();

    const supabase = await createClient();

    const { data: worker, error } = await supabase
      .from("workers")
      .insert(upsertWorkerInput(body, tenant, {
        worker_internal_code: code,
        full_name: fullName,
        masked_aadhaar: masked,
        phone_encrypted: phone || null,
        eligibility_status: "INACTIVE",
        registration_status: "PENDING_SUBMISSION",
        onboarded_date: today.slice(0, 10),
        is_active: true,
      }))
      .select()
      .single();

    if (error || !worker) {
      return NextResponse.json(
        { success: false, error: { code: "INTERNAL_ERROR", message: error?.message || "Failed to create worker" } },
        { status: 500 }
      );
    }

    // Seed the new worker with one active day (aggregate + ledger row).
    const fy = getCurrentFinancialYear();
    await supabase.from("worker_annual_aggregates").insert({
      worker_id: worker.id,
      financial_year: fy,
      internal_days_worked: 1,
      declared_external_days: 0,
      total_cumulative_days: 1,
      total_gross_earnings: 0,
      is_eligible: false,
    });
    await supabase.from("daily_engagement_ledger").insert({
      worker_id: worker.id,
      engagement_date: today.slice(0, 10),
      gross_earnings: 0,
      trip_or_task_id: `${code}-onboard`,
    });

    const created: WorkerRecord = {
      id: worker.id,
      aggregatorWorkerId: code,
      fullName: worker.full_name,
      aadhaarLast4: cleanAadhaar.slice(-4),
      maskedAadhaar: masked,
      uan: uan || undefined,
      phone: phone || undefined,
      sector: tenant.sector,
      state: state || "DELHI",
      status: "INACTIVE",
      daysInLast90: 1,
      cumulativeDaysFY: 1,
      grossPayoutFY: 0,
      otherPlatformDays: 0,
      lastActiveDate: today.slice(0, 10),
      crossPlatformDeclared: false,
      registeredAt: today.slice(0, 10),
    };

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create worker" } },
      { status: 500 }
    );
  }
}