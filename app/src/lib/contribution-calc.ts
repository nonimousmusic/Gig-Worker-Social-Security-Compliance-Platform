/**
 * Contribution Calculator — Section 114, Code on Social Security 2020
 *
 * Turnover Basis: Annual Turnover × Category Rate (1%-2%)
 * Ceiling: Total Worker Payments × 5%
 * Statutory Obligation: min(Turnover Basis, Ceiling)
 */

export interface ContributionCalcInput {
  annualTurnover: number;
  totalWorkerPayouts: number;
  ratePercentage: number; // e.g. 1.5 for 1.5%
  maxWorkerPayoutPct?: number; // default 5%
}

export interface ContributionCalcResult {
  turnoverBasis: {
    base: number;
    rate: number;
    amount: number;
  };
  workerPaymentBasis: {
    base: number;
    ceilingRate: number;
    amount: number;
  };
  finalObligation: {
    amount: number;
    basisUsed: "TURNOVER_RATE" | "WORKER_PAYMENT_5PCT_CEILING";
    savings: number;
  };
}

export function calculateContribution(input: ContributionCalcInput): ContributionCalcResult {
  const ceilingRate = input.maxWorkerPayoutPct ?? 5;

  const turnoverAmount = input.annualTurnover * (input.ratePercentage / 100);
  const ceilingAmount = input.totalWorkerPayouts * (ceilingRate / 100);

  const isCeilingLower = ceilingAmount < turnoverAmount;
  const finalAmount = Math.min(turnoverAmount, ceilingAmount);
  const savings = Math.abs(turnoverAmount - ceilingAmount);

  return {
    turnoverBasis: {
      base: input.annualTurnover,
      rate: input.ratePercentage,
      amount: Math.round(turnoverAmount * 100) / 100,
    },
    workerPaymentBasis: {
      base: input.totalWorkerPayouts,
      ceilingRate,
      amount: Math.round(ceilingAmount * 100) / 100,
    },
    finalObligation: {
      amount: Math.round(finalAmount * 100) / 100,
      basisUsed: isCeilingLower ? "WORKER_PAYMENT_5PCT_CEILING" : "TURNOVER_RATE",
      savings: Math.round(savings * 100) / 100,
    },
  };
}
