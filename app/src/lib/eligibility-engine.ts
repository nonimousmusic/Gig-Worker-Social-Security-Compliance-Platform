/**
 * Eligibility Engine — 90-day / 120-day Day-Count Calculator
 * Central Rules 2026, Rule 48/49
 *
 * A worker is "engaged" on any calendar day where recorded income > 0.
 * Single-aggregator threshold: 90 days → ELIGIBLE
 * Multi-aggregator threshold: 120 days (internal + self-reported) → ELIGIBLE_MULTI_AGGREGATOR
 */

import type { EligibilityStatus } from "@prisma/client";

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
const AT_RISK_START = 85;

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
  } else if (internalDays >= AT_RISK_START) {
    eligibilityStatus = "AT_RISK_CRITICAL";
  } else if (internalDays >= APPROACHING_START) {
    eligibilityStatus = "APPROACHING_THRESHOLD";
  } else {
    eligibilityStatus = "NOT_YET_ELIGIBLE";
  }

  const isEligible =
    eligibilityStatus === "ELIGIBLE" ||
    eligibilityStatus === "ELIGIBLE_MULTI_AGGREGATOR";

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
    NOT_YET_ELIGIBLE: "Not Yet Eligible",
    APPROACHING_THRESHOLD: "Approaching (75-84 days)",
    AT_RISK_CRITICAL: "At Risk (85-89 days)",
    ELIGIBLE: "Eligible (90+ days)",
    ELIGIBLE_MULTI_AGGREGATOR: "Eligible — Multi-Aggregator (120+ days)",
  };
  return labels[status];
}

export function getStatusColor(status: EligibilityStatus): string {
  const colors: Record<EligibilityStatus, string> = {
    NOT_YET_ELIGIBLE: "slate",
    APPROACHING_THRESHOLD: "amber",
    AT_RISK_CRITICAL: "orange",
    ELIGIBLE: "emerald",
    ELIGIBLE_MULTI_AGGREGATOR: "blue",
  };
  return colors[status];
}

export { SINGLE_AGGREGATOR_THRESHOLD, MULTI_AGGREGATOR_THRESHOLD, APPROACHING_START, AT_RISK_START };
