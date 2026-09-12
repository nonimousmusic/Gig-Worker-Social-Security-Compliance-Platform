import { describe, it, expect } from "vitest";
import { calculateContribution } from "./contribution-calc";

describe("calculateContribution", () => {
  it("applies the turnover basis when it is lower", () => {
    const r = calculateContribution({
      annualTurnover: 400_000_000,
      totalWorkerPayouts: 220_000_000,
      ratePercentage: 1.5,
    });
    expect(r.turnoverBasis.amount).toBe(6_000_000);
    expect(r.workerPaymentBasis.amount).toBe(11_000_000);
    expect(r.finalObligation.amount).toBe(6_000_000);
    expect(r.finalObligation.basisUsed).toBe("TURNOVER_RATE");
    expect(r.finalObligation.savings).toBe(5_000_000);
  });

  it("applies the 5% payout ceiling when it is lower", () => {
    const r = calculateContribution({
      annualTurnover: 1_000_000_000,
      totalWorkerPayouts: 200_000_000,
      ratePercentage: 1.5,
    });
    expect(r.turnoverBasis.amount).toBe(15_000_000);
    expect(r.workerPaymentBasis.amount).toBe(10_000_000);
    expect(r.finalObligation.amount).toBe(10_000_000);
    expect(r.finalObligation.basisUsed).toBe("WORKER_PAYMENT_5PCT_CEILING");
    expect(r.finalObligation.savings).toBe(5_000_000);
  });

  it("honors a custom ceiling rate", () => {
    const r = calculateContribution({
      annualTurnover: 1_000_000_000,
      totalWorkerPayouts: 200_000_000,
      ratePercentage: 1.5,
      maxWorkerPayoutPct: 10,
    });
    expect(r.workerPaymentBasis.ceilingRate).toBe(10);
    expect(r.workerPaymentBasis.amount).toBe(20_000_000);
    expect(r.finalObligation.basisUsed).toBe("TURNOVER_RATE");
  });

  it("rounds to two decimals", () => {
    const r = calculateContribution({
      annualTurnover: 33_333_333,
      totalWorkerPayouts: 0,
      ratePercentage: 1.5,
    });
    expect(r.turnoverBasis.amount).toBe(500_000);
    expect(r.finalObligation.amount).toBe(0);
  });

  it("handles zeros without NaN", () => {
    const r = calculateContribution({ annualTurnover: 0, totalWorkerPayouts: 0, ratePercentage: 1.5 });
    expect(r.finalObligation.amount).toBe(0);
    expect(r.finalObligation.savings).toBe(0);
  });
});
