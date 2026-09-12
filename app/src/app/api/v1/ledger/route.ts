import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workerId = searchParams.get("workerId");

  const workers = dataStore.getWorkers();
  const targetWorker = workerId ? workers.find((w) => w.id === workerId) : workers[0];

  const days = Array.from({ length: 15 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return {
      id: `eng-${i + 1}`,
      workerId: targetWorker ? targetWorker.id : "wrk-1001",
      workerName: targetWorker ? targetWorker.fullName : "Rajesh Kumar",
      date: d.toISOString().split("T")[0],
      hoursWorked: 7.5,
      grossPayout: 850,
      platformTurnover: 1420,
      tripCount: 9,
      status: "VERIFIED",
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      entries: days,
      total: days.length,
    },
  });
}
