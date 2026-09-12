import { describe, it, expect } from "vitest";
import { calculatePenalty } from "./penalty-calc";

const day = 24 * 60 * 60 * 1000;

describe("calculatePenalty", () => {
  it("returns zeros when not overdue", () => {
    const now = new Date("2026-09-12T00:00:00Z");
    const future = new Date("2026-10-31T00:00:00Z");
    const r = calculatePenalty(577_500, future, now);
    expect(r.daysOverdue).toBe(0);
    expect(r.monthsOverdue).toBe(0);
    expect(r.penaltyAmount).toBe(0);
  });

  it("rounds a fraction of a month up", () => {
    const due = new Date("2025-07-31T00:00:00Z");
    const pay = new Date(due.getTime() + 45 * day);
    const r = calculatePenalty(100_000, due, pay);
    expect(r.daysOverdue).toBe(45);
    expect(r.monthsOverdue).toBe(2);
    expect(r.penaltyAmount).toBe(2_000);
  });

  it("charges exactly one month at 30 days", () => {
    const due = new Date("2025-07-31T00:00:00Z");
    const pay = new Date(due.getTime() + 30 * day);
    const r = calculatePenalty(577_500, due, pay);
    expect(r.monthsOverdue).toBe(1);
    expect(r.penaltyAmount).toBe(5_775);
  });

  it("always reports the statutory rate metadata", () => {
    const r = calculatePenalty(100, new Date("2025-01-01"), new Date("2025-03-01"));
    expect(r.interestRate).toBe(1);
    expect(r.annualizedRate).toBe(12);
    expect(r.legalReference).toContain("Section 133");
  });
});
