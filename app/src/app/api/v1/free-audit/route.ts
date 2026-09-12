import { NextRequest, NextResponse } from "next/server";
import { calculateContribution } from "@/lib/contribution-calc";
import { createClient } from "@/lib/supabase/server";

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

    const rawWorkers = parseInt(workerCount || "500", 10);
    const rawTurnover = parseFloat(annualTurnover || "50000000"); // 5 Cr default
    const rawPayout = parseFloat(annualPayout || "28000000"); // 2.8 Cr default
    const workers = Number.isNaN(rawWorkers) ? 500 : Math.max(0, rawWorkers);
    const turnover = Number.isNaN(rawTurnover) ? 50000000 : Math.max(0, rawTurnover);
    const payout = Number.isNaN(rawPayout) ? 28000000 : Math.max(0, rawPayout);

    const calc = calculateContribution({
      annualTurnover: turnover,
      totalWorkerPayouts: payout,
      ratePercentage: 1.5,
    });

    // Heuristic marketing estimator (not a statutory determination):
    // starts from a neutral baseline and adjusts for filing posture.
    const BASE_COMPLIANCE_SCORE = 85;
    const NO_FILING_DEDUCTION = 35;
    const MANUAL_TRACKING_DEDUCTION = 15;
    const MIN_SCORE = 25;
    // Share of headcount typically active enough to qualify (planning estimate).
    const ESTIMATED_ELIGIBLE_SHARE = 0.76;
    // Flat annual-interest proxy (12% p.a. simple) for illustration only.
    const ANNUAL_INTEREST_PROXY = 0.12;

    let complianceScore = BASE_COMPLIANCE_SCORE;
    const flags: string[] = [];

    if (currentFilingPractices === "NONE") {
      complianceScore -= NO_FILING_DEDUCTION;
      flags.push("No statutory cess filing mechanism currently deployed");
    } else if (currentFilingPractices === "SPREADSHEETS") {
      complianceScore -= MANUAL_TRACKING_DEDUCTION;
      flags.push("Manual spreadsheet tracking lacks immutable SHA-256 audit trails required under DPDP & Section 114");
    }

    if (workers > 1000) {
      flags.push("High worker volume requires automated 90/120-day rolling window tracking");
    }

    const estimatedEligibleWorkers = Math.round(workers * ESTIMATED_ELIGIBLE_SHARE);
    complianceScore = Math.max(MIN_SCORE, complianceScore);

    // Persist the marketing lead (best-effort: never fail the audit itself).
    try {
      const supabase = await createClient();
      await supabase.from("audit_leads").insert({
        company_name: companyName || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        sector: sector || null,
        worker_count: Number.isNaN(workers) ? null : workers,
        annual_turnover: turnover,
        annual_payout: payout,
        filing_practices: currentFilingPractices || null,
        compliance_score: complianceScore,
      });
    } catch {
      // Lead capture is non-critical.
    }

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
          complianceScore,
          riskRating: complianceScore < 60 ? "HIGH RISK" : complianceScore < 80 ? "MEDIUM RISK" : "COMPLIANT",
          estimatedEligibleWorkers,
          annualTurnover,
          estimatedAnnualCess: calc.finalObligation.amount,
          payoutCap: calc.workerPaymentBasis.amount,
          isCappedByPayout: calc.finalObligation.basisUsed === "WORKER_PAYMENT_5PCT_CEILING",
          potentialPenaltyRiskAnnual: Math.round(calc.finalObligation.amount * ANNUAL_INTEREST_PROXY),
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
