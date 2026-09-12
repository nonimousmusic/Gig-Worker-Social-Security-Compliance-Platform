import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

export async function GET() {
  const workers = dataStore.getWorkers();

  // Tier distributions:
  // Eligible: >= 90 days in 90-day window or >= 120 days in FY
  // Approaching: 80 - 89 days in 90d window or 100 - 119 in FY
  // Inactive: < 80 days
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
        uan: w.uan || "Pending Linkage",
        daysInLast90: w.daysInLast90,
        cumulativeDaysFY: w.cumulativeDaysFY,
        otherPlatformDays: w.otherPlatformDays,
        status: w.status,
        progressTo90: Math.min(100, Math.round((w.daysInLast90 / 90) * 100)),
        progressTo120: Math.min(100, Math.round((w.cumulativeDaysFY / 120) * 100)),
        crossPlatformDeclared: w.crossPlatformDeclared,
        lastActiveDate: w.lastActiveDate,
      })),
      statutoryRule: "Rule 28 — Engagement threshold of 90 days in rolling 12-month window or 120 cumulative days across aggregators",
    },
  });
}
