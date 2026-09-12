import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import { logAuditEvent } from "@/lib/audit-logger";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "dev-cron-secret";

  if (authHeader !== `Bearer ${cronSecret}` && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 }
    );
  }

  const workers = dataStore.getWorkers();
  let newlyEligibleCount = 0;

  workers.forEach((w) => {
    const isNowEligible = w.daysInLast90 >= 90 || w.cumulativeDaysFY >= 120;
    if (isNowEligible && w.status !== "ELIGIBLE") {
      dataStore.updateWorker(w.id, { status: "ELIGIBLE" });
      newlyEligibleCount++;
    }
  });

  await logAuditEvent({
    action: "CRON_ELIGIBILITY_EVALUATED",
    entity: "WorkerLedger",
    metadata: {
      evaluatedCount: workers.length,
      newlyEligibleCount,
      timestamp: new Date().toISOString(),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      evaluatedWorkers: workers.length,
      newlyEligibleCount,
      timestamp: new Date().toISOString(),
      statutoryReference: "Section 114 / Rule 28 Nightly Rolling Threshold Job",
    },
  });
}
