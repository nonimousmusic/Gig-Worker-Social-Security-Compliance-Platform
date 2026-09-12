import { NextRequest, NextResponse } from "next/server";
import { calculateContribution } from "@/lib/contribution-calc";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { turnover, workerPayouts, customRatePercent } = body;

    if (turnover === undefined || workerPayouts === undefined) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Turnover and worker payouts are required" } },
        { status: 400 }
      );
    }

    const t = parseFloat(turnover);
    const p = parseFloat(workerPayouts);
    const r = customRatePercent ? parseFloat(customRatePercent) : 1.5;

    const result = calculateContribution({
      annualTurnover: t,
      totalWorkerPayouts: p,
      ratePercentage: r,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        legalCitation: "Code on Social Security 2020, Section 114(1) & (2) — Cess between 1% and 2% of annual turnover, subject to a cap of 5% of aggregate amount payable to gig workers",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "CALCULATION_ERROR", message: "Calculation failed" } },
      { status: 500 }
    );
  }
}
