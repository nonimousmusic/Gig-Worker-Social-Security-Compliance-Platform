import { describe, it, expect } from "vitest";
import { getCurrentFinancialYear, differenceInCalendarDays } from "./financial-year";

describe("getCurrentFinancialYear", () => {
  it("starts the new FY on 1 April", () => {
    expect(getCurrentFinancialYear(new Date(2026, 3, 1))).toBe("2026-2027");
    expect(getCurrentFinancialYear(new Date(2026, 11, 25))).toBe("2026-2027");
  });

  it("keeps the old FY through 31 March", () => {
    expect(getCurrentFinancialYear(new Date(2026, 2, 31))).toBe("2025-2026");
    expect(getCurrentFinancialYear(new Date(2026, 0, 15))).toBe("2025-2026");
  });
});

describe("differenceInCalendarDays", () => {
  it("counts whole calendar days ignoring time-of-day", () => {
    const a = new Date(2026, 8, 12, 23, 59);
    const b = new Date(2026, 8, 10, 0, 1);
    expect(differenceInCalendarDays(a, b)).toBe(2);
    expect(differenceInCalendarDays(b, a)).toBe(-2);
    expect(differenceInCalendarDays(a, a)).toBe(0);
  });
});
