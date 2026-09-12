import { NextRequest, NextResponse } from "next/server";
import { calculateContribution } from "@/lib/contribution-calc";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyName,
      contactEmail,
      contactPhone,
      sector,
      workerCount,
      annualTurnover,
      annualPayout,
      currentFilingPractices,
    } = body;

    const workers = parseInt(workerCount || "500", 10);
    const turnover = parseFloat(annualTurnover || "50000000"); // 5 Cr default
    const payout = parseFloat(annualPayout || "28000000"); // 2.8 Cr default

    const calc = calculateContribution({
      annualTurnover: turnover,
      totalWorkerPayouts: payout,
      ratePercentage: 1.5,
    });

    // Scorecard logic
    let riskScore = 85;
    const flags: string[] = [];

    if (currentFilingPractices === "NONE") {
      riskScore -= 35;
      flags.push("No statutory cess filing mechanism currently deployed");
    } else if (currentFilingPractices === "SPREADSHEETS") {
      riskScore -= 15;
      flags.push("Manual spreadsheet tracking lacks immutable SHA-256 audit trails required under DPDP & Section 114");
    }

    if (workers > 1000) {
      flags.push("High worker volume requires automated 90/120-day rolling window tracking");
    }

    const estimatedEligibleWorkers = Math.round(workers * 0.76);

    return NextResponse.json({
      success: true,
      data: {
        lead: {
          companyName,
          contactEmail,
          contactPhone,
          sector: sector || "LOGISTICS_DELIVERY",
        },
        scorecard: {
          complianceScore: Math.max(25, riskScore),
          riskRating: riskScore < 60 ? "HIGH RISK" : riskScore < 80 ? "MEDIUM RISK" : "COMPLIANT",
          estimatedEligibleWorkers,
          annualTurnover,
          estimatedAnnualCess: calc.finalObligation.amount,
          payoutCap: calc.workerPaymentBasis.amount,
          isCappedByPayout: calc.finalObligation.basisUsed === "WORKER_PAYMENT_5PCT_CEILING",
          potentialPenaltyRiskAnnual: Math.round(calc.finalObligation.amount * 0.12), // 12% compounding
          identifiedGaps: flags,
          recommendations: [
            "Implement daily engagement logging with automated Aadhaar masking",
            "Establish Section 114 quarterly Form-XX filing routine before Oct 31 deadline",
            "Collect cross-platform Rule 28 self-declarations for multi-apping gig partners",
          ],
        },
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "AUDIT_FAILED", message: "Audit evaluation failed" } },
      { status: 500 }
    );
  }
}
