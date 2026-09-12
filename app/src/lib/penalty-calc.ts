/**
 * Interest Penalty Calculator — Section 133, Rule 49
 * Late filing: 1% per month (or fraction) on unpaid balance = 12% p.a. simple interest
 */

import { differenceInCalendarDays } from "./financial-year";

export interface PenaltyCalcResult {
  balancePayable: number;
  daysOverdue: number;
  monthsOverdue: number;
  interestRate: number; // 1% per month
  penaltyAmount: number;
  annualizedRate: number; // 12%
  legalReference: string;
}

export function calculatePenalty(
  balancePayable: number,
  dueDate: Date,
  currentDate: Date = new Date()
): PenaltyCalcResult {
  const daysOverdue = differenceInCalendarDays(currentDate, dueDate);

  if (daysOverdue <= 0) {
    return {
      balancePayable,
      daysOverdue: 0,
      monthsOverdue: 0,
      interestRate: 1,
      penaltyAmount: 0,
      annualizedRate: 12,
      legalReference: "Section 133 / Rule 49, Social Security (Central) Rules, 2026",
    };
  }

  // Fraction of month rounds up
  const monthsOverdue = Math.ceil(daysOverdue / 30);
  const penaltyAmount = balancePayable * (0.01 * monthsOverdue);

  return {
    balancePayable,
    daysOverdue,
    monthsOverdue,
    interestRate: 1,
    penaltyAmount: Math.round(penaltyAmount * 100) / 100,
    annualizedRate: 12,
    legalReference: "Section 133 / Rule 49, Social Security (Central) Rules, 2026",
  };
}
