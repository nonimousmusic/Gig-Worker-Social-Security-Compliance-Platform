import { describe, it, expect } from "vitest";
import {
  calculateEligibility,
  getStatusLabel,
  getStatusColor,
  rankEligibility,
  isEligibleStatus,
  SINGLE_AGGREGATOR_THRESHOLD,
  MULTI_AGGREGATOR_THRESHOLD,
  APPROACHING_START,
} from "./eligibility-engine";

describe("eligibility thresholds", () => {
  it("exposes the statutory constants", () => {
    expect(SINGLE_AGGREGATOR_THRESHOLD).toBe(90);
    expect(MULTI_AGGREGATOR_THRESHOLD).toBe(120);
    expect(APPROACHING_START).toBe(75);
  });

  it("marks 0 and sub-threshold workers INACTIVE", () => {
    expect(calculateEligibility(0, 0).eligibilityStatus).toBe("INACTIVE");
    expect(calculateEligibility(74, 0).eligibilityStatus).toBe("INACTIVE");
    expect(calculateEligibility(0, 0).isEligible).toBe(false);
  });

  it("marks 75–89 internal days APPROACHING", () => {
    expect(calculateEligibility(75, 0).eligibilityStatus).toBe("APPROACHING");
    expect(calculateEligibility(89, 0).eligibilityStatus).toBe("APPROACHING");
    expect(calculateEligibility(89, 0).isEligible).toBe(false);
  });

  it("marks 90+ internal days ELIGIBLE", () => {
    expect(calculateEligibility(90, 0).eligibilityStatus).toBe("ELIGIBLE");
    expect(calculateEligibility(145, 0).eligibilityStatus).toBe("ELIGIBLE");
    expect(calculateEligibility(90, 0).isEligible).toBe(true);
  });

  it("requires external days for the multi-aggregator branch", () => {
    // 119 internal alone is single-aggregator ELIGIBLE, not multi.
    expect(calculateEligibility(119, 0).eligibilityStatus).toBe("ELIGIBLE");
    // 120+ total with external days → multi.
    expect(calculateEligibility(100, 30).eligibilityStatus).toBe("ELIGIBLE_MULTI_AGGREGATOR");
    expect(calculateEligibility(50, 70).eligibilityStatus).toBe("ELIGIBLE_MULTI_AGGREGATOR");
    expect(calculateEligibility(100, 30).isEligible).toBe(true);
  });

  it("stays INACTIVE below every threshold even with external days", () => {
    // 50 + 69 = 119 total, internal under 75 → no branch fires.
    const r = calculateEligibility(50, 69);
    expect(r.eligibilityStatus).toBe("INACTIVE");
    expect(r.totalCumulativeDays).toBe(119);
  });

  it("reports days-until-threshold correctly", () => {
    const r = calculateEligibility(80, 10);
    expect(r.internalDaysWorked).toBe(80);
    expect(r.declaredExternalDays).toBe(10);
    expect(r.totalCumulativeDays).toBe(90);
    expect(r.daysUntilSingleThreshold).toBe(10);
    expect(r.daysUntilMultiThreshold).toBe(30);
    expect(calculateEligibility(200, 0).daysUntilSingleThreshold).toBe(0);
  });
});

describe("status labels and colors", () => {
  it("labels every status", () => {
    expect(getStatusLabel("INACTIVE")).toContain("Not Yet Eligible");
    expect(getStatusLabel("APPROACHING")).toContain("Approaching");
    expect(getStatusLabel("ELIGIBLE")).toContain("Eligible");
    expect(getStatusLabel("ELIGIBLE_MULTI_AGGREGATOR")).toContain("Multi-Aggregator");
  });

  it("colors every status distinctly", () => {
    const colors = new Set([
      getStatusColor("INACTIVE"),
      getStatusColor("APPROACHING"),
      getStatusColor("ELIGIBLE"),
      getStatusColor("ELIGIBLE_MULTI_AGGREGATOR"),
    ]);
    expect(colors.size).toBe(4);
  });
});

describe("rank helpers", () => {
  it("orders statuses for promote-only updates", () => {
    expect(rankEligibility("INACTIVE")).toBeLessThan(rankEligibility("APPROACHING"));
    expect(rankEligibility("APPROACHING")).toBeLessThan(rankEligibility("ELIGIBLE"));
    expect(rankEligibility("ELIGIBLE")).toBeLessThan(rankEligibility("ELIGIBLE_MULTI_AGGREGATOR"));
  });

  it("returns 0 for unknown DB values", () => {
    expect(rankEligibility("SOMETHING_ELSE")).toBe(0);
    expect(rankEligibility("")).toBe(0);
  });

  it("detects eligible statuses", () => {
    expect(isEligibleStatus("ELIGIBLE")).toBe(true);
    expect(isEligibleStatus("ELIGIBLE_MULTI_AGGREGATOR")).toBe(true);
    expect(isEligibleStatus("APPROACHING")).toBe(false);
    expect(isEligibleStatus("INACTIVE")).toBe(false);
  });
});
