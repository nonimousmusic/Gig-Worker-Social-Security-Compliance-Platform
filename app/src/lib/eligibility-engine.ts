/**
 * Eligibility Engine — 90-day / 120-day Day-Count Calculator
 * Central Rules 2026, Rule 48/49
 *
 * A worker is "engaged" on any calendar day where recorded income > 0.
 * Single-aggregator threshold: 90 days → ELIGIBLE
 * Multi-aggregator threshold: 120 days (internal + self-reported) → ELIGIBLE_MULTI_AGGREGATOR
 */

export type EligibilityStatus = "ELIGIBLE" | "APPROACHING" | "INACTIVE" | "ELIGIBLE_MULTI_AGGREGATOR";

/** Severity rank used for promote-only updates (ingestion paths never demote). */
export const ELIGIBILITY_RANK: Record<EligibilityStatus, number> = {
  INACTIVE: 0,
  APPROACHING: 1,
  ELIGIBLE: 2,
  ELIGIBLE_MULTI_AGGREGATOR: 3,
};

export function isEligibleStatus(status: EligibilityStatus): boolean {
  return status === "ELIGIBLE" || status === "ELIGIBLE_MULTI_AGGREGATOR";
}

/** Null-safe rank lookup for untyped DB values. */
export function rankEligibility(status: string): number {
  return ELIGIBILITY_RANK[status as EligibilityStatus] ?? 0;
}

/** Single source of truth for day-count eligibility. Used by the cron job, CSV ingestion, and declarations. */

export interface EligibilityResult {
  internalDaysWorked: number;
  declaredExternalDays: number;
  totalCumulativeDays: number;
  eligibilityStatus: EligibilityStatus;
  isEligible: boolean;
  daysUntilSingleThreshold: number;
  daysUntilMultiThreshold: number;
}

const SINGLE_AGGREGATOR_THRESHOLD = 90;
const MULTI_AGGREGATOR_THRESHOLD = 120;
const APPROACHING_START = 75;

export function calculateEligibility(
  internalDays: number,
  declaredExternalDays: number = 0
): EligibilityResult {
  const totalCumulativeDays = internalDays + declaredExternalDays;

  let eligibilityStatus: EligibilityStatus;

  if (totalCumulativeDays >= MULTI_AGGREGATOR_THRESHOLD && declaredExternalDays > 0) {
    eligibilityStatus = "ELIGIBLE_MULTI_AGGREGATOR";
  } else if (internalDays >= SINGLE_AGGREGATOR_THRESHOLD) {
    eligibilityStatus = "ELIGIBLE";
  } else if (internalDays >= APPROACHING_START) {
    eligibilityStatus = "APPROACHING";
  } else {
    eligibilityStatus = "INACTIVE";
  }

  const isEligible = isEligibleStatus(eligibilityStatus);

  return {
    internalDaysWorked: internalDays,
    declaredExternalDays,
    totalCumulativeDays,
    eligibilityStatus,
    isEligible,
    daysUntilSingleThreshold: Math.max(0, SINGLE_AGGREGATOR_THRESHOLD - internalDays),
    daysUntilMultiThreshold: Math.max(0, MULTI_AGGREGATOR_THRESHOLD - totalCumulativeDays),
  };
}

export function getStatusLabel(status: EligibilityStatus): string {
  const labels: Record<EligibilityStatus, string> = {
    INACTIVE: "Not Yet Eligible",
    APPROACHING: "Approaching (75-89 days)",
    ELIGIBLE: "Eligible (90+ days)",
    ELIGIBLE_MULTI_AGGREGATOR: "Eligible — Multi-Aggregator (120+ days)",
  };
  return labels[status];
}

export function getStatusColor(status: EligibilityStatus): string {
  const colors: Record<EligibilityStatus, string> = {
    INACTIVE: "slate",
    APPROACHING: "amber",
    ELIGIBLE: "emerald",
    ELIGIBLE_MULTI_AGGREGATOR: "blue",
  };
  return colors[status];
}

export { SINGLE_AGGREGATOR_THRESHOLD, MULTI_AGGREGATOR_THRESHOLD, APPROACHING_START };