/**
 * Financial Year Utilities
 * Indian FY runs from 1 April to 31 March
 */

export function getCurrentFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();
  // April (month 3) to March (month 2)
  if (month >= 3) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export function getFYStartDate(fy: string): Date {
  const startYear = parseInt(fy.split("-")[0]);
  return new Date(startYear, 3, 1); // April 1
}

export function getFYEndDate(fy: string): Date {
  const endYear = parseInt(fy.split("-")[1]);
  return new Date(endYear, 2, 31); // March 31
}

export function getFormXXDueDate(fy: string): Date {
  const endYear = parseInt(fy.split("-")[1]);
  return new Date(endYear, 5, 30); // June 30
}

export function getFormXXIDueDate(fy: string): Date {
  const endYear = parseInt(fy.split("-")[1]);
  return new Date(endYear, 9, 31); // October 31
}

export function differenceInCalendarDays(dateA: Date, dateB: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utcA = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const utcB = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
  return Math.floor((utcA - utcB) / msPerDay);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyDecimal(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
