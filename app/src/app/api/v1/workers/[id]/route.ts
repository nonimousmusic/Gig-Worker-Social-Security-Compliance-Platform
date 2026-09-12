import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const worker = dataStore.getWorkerById(id);

  if (!worker) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Worker not found" } },
      { status: 404 }
    );
  }

  // Generate 90-day engagement calendar sample data
  const history = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const active = i % 3 !== 0;
    return {
      date: dateStr,
      active,
      hoursWorked: active ? 6.5 + (i % 3) : 0,
      payout: active ? 650 + (i % 200) : 0,
      trips: active ? 8 + (i % 5) : 0,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      worker,
      recentEngagementDays: history,
      declarations: worker.crossPlatformDeclared
        ? [
            {
              id: "dec-1",
              platformName: "Zomato Logistics",
              daysReported: worker.otherPlatformDays,
              period: "Q1-Q2 2025",
              verified: true,
              submittedAt: "2025-08-01",
            },
          ]
        : [],
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updated = dataStore.updateWorker(id, body);

  if (!updated) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Worker not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: updated,
  });
}
