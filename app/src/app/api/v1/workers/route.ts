import { NextRequest, NextResponse } from "next/server";
import { dataStore, WorkerRecord } from "@/lib/data-store";
import { maskAadhaar } from "@/lib/aadhaar-masking";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase() || "";
  const status = searchParams.get("status") || "";
  const sector = searchParams.get("sector") || "";

  let list = dataStore.getWorkers();

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
    const body = await req.json();
    const { aggregatorWorkerId, fullName, aadhaarNumber, uan, phone, sector, state } = body;

    if (!aggregatorWorkerId || !fullName || !aadhaarNumber) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Worker ID, full name, and Aadhaar are required" } },
        { status: 400 }
      );
    }

    const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");
    if (cleanAadhaar.length !== 12) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_AADHAAR", message: "Aadhaar must be exactly 12 digits" } },
        { status: 400 }
      );
    }

    const last4 = cleanAadhaar.slice(-4);
    const masked = maskAadhaar(cleanAadhaar) || `XXXX-XXXX-${last4}`;

    const newWorker: Omit<WorkerRecord, "id"> = {
      aggregatorWorkerId,
      fullName,
      aadhaarLast4: last4,
      maskedAadhaar: masked,
      uan: uan || undefined,
      phone: phone || undefined,
      sector: sector || "LOGISTICS_DELIVERY",
      state: state || "DELHI",
      status: "INACTIVE",
      daysInLast90: 1,
      cumulativeDaysFY: 1,
      grossPayoutFY: 0,
      otherPlatformDays: 0,
      lastActiveDate: new Date().toISOString().split("T")[0],
      crossPlatformDeclared: false,
      registeredAt: new Date().toISOString().split("T")[0],
    };

    const saved = dataStore.addWorker(newWorker);

    return NextResponse.json({
      success: true,
      data: saved,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create worker" } },
      { status: 500 }
    );
  }
}
