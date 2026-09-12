import { NextResponse } from "next/server";
import { requireTenant, getWorkerRecords } from "@/lib/data-access";

export async function GET() {
  const tenant = await requireTenant();
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const workers = await getWorkerRecords(tenant);

  const breakdown = {
    eligible: workers.filter((w) => w.status === "ELIGIBLE"),
    approaching: workers.filter((w) => w.status === "APPROACHING"),
    inactive: workers.filter((w) => w.status === "INACTIVE"),
    crossPlatformDeclaredCount: workers.filter((w) => w.crossPlatformDeclared).length,
  };

  return NextResponse.json({
    success: true,
    data: {
      total: workers.length,
      counts: {
        eligible: breakdown.eligible.length,
        approaching: breakdown.approaching.length,
        inactive: breakdown.inactive.length,
        crossPlatformDeclared: breakdown.crossPlatformDeclaredCount,
      },
      workers: workers.map((w) => ({
        id: w.id,
        aggregatorWorkerId: w.aggregatorWorkerId,
        fullName: w.fullName,
        maskedAadhaar: w.maskedAadhaar,
        uan: w.uan || null,
        daysInLast90: w.daysInLast90,
        cumulativeDaysFY: w.cumulativeDaysFY,
        otherPlatformDays: w.otherPlatformDays,
        status: w.status,
        progressTo90: Math.min(100, Math.round((w.daysInLast90 / 90) * 100)),
        progressTo120: Math.min(100, Math.round((w.cumulativeDaysFY / 120) * 100)),
        crossPlatformDeclared: w.crossPlatformDeclared,
        lastActiveDate: w.lastActiveDate,
      })),
      statutoryRule: "Rule 28 — Engagement threshold of 90 days in the rolling 90-day window or 120 cumulative days across aggregators",
    },
  });
}