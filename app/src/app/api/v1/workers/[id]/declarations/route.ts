import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

export async function POST(
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

  const body = await req.json();
  const { otherPlatformName, declaredDays, periodStart, periodEnd } = body;

  const addedDays = parseInt(declaredDays || "0", 10);
  const newCumulative = worker.cumulativeDaysFY + addedDays;
  const newStatus = newCumulative >= 120 || worker.daysInLast90 >= 90 ? "ELIGIBLE" : "APPROACHING";

  const updated = dataStore.updateWorker(id, {
    otherPlatformDays: (worker.otherPlatformDays || 0) + addedDays,
    cumulativeDaysFY: newCumulative,
    status: newStatus,
    crossPlatformDeclared: true,
  });

  return NextResponse.json({
    success: true,
    data: {
      worker: updated,
      declaration: {
        id: `dec-${Date.now()}`,
        workerId: id,
        otherPlatformName,
        declaredDays: addedDays,
        periodStart,
        periodEnd,
        status: "VERIFIED",
        statutoryRule: "Rule 28(2) Cross-Platform Day Aggregation",
      },
    },
  });
}
