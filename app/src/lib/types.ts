// UI-facing types shared between dashboard pages and API routes.

/* eslint-disable @typescript-eslint/no-explicit-any -- loose shape for untyped Supabase rows until DB types are generated */
export type AnyRow = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface WorkerRecord {
  id: string;
  aggregatorWorkerId: string;
  fullName: string;
  aadhaarLast4: string;
  maskedAadhaar: string;
  uan?: string;
  phone?: string;
  sector: string;
  state: string;
  status: "ELIGIBLE" | "APPROACHING" | "INACTIVE";
  daysInLast90: number;
  cumulativeDaysFY: number;
  grossPayoutFY: number;
  otherPlatformDays: number;
  lastActiveDate: string;
  crossPlatformDeclared: boolean;
  registeredAt: string;
}

export interface FilingItem {
  id: string;
  financialYear: string;
  quarter?: string;
  filingType: "FORM_XX_QUARTERLY" | "FORM_XXI_ANNUAL";
  turnoverAmount: number;
  payoutAmount: number;
  ratePercent: number;
  calculatedCess: number;
  payoutCapAmount: number;
  finalCessPayable: number;
  eligibleWorkerCount: number;
  totalWorkerCount: number;
  dueDate: string;
  status: "DRAFT" | "SUBMITTED" | "PAID" | "OVERDUE";
  submittedAt?: string;
  challanId?: string;
  challanNumber?: string;
  challanUrl?: string;
  bankName?: string;
  utrNumber?: string;
  sha256Hash?: string;
  paymentDate?: string;
  challanVerified?: boolean;
}

export interface ChallanItem {
  id: string;
  filingId: string;
  challanNumber: string;
  bankName: string;
  utrNumber: string;
  amount: number;
  paymentDate: string;
  verified: boolean;
  lockedAt: string;
  sha256Hash: string;
  documentUrl: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type:
    | "STATUTORY_DEADLINE"
    | "WORKER_THRESHOLD"
    | "PAYMENT_CONFIRMATION"
    | "REGULATORY_UPDATE";
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

// Fallback org descriptor (used by the settings page until it reads from API).
export const mockOrganization = {
  id: "00000000-0000-0000-0000-000000000001",
  legalName: "QuickMove Technologies Private Limited",
  cin: "U72900DL2021PTC389102",
  gstin: "07AABCQ1234F1Z5",
  pan: "AABCQ1234F",
  sector: "LOGISTICS_DELIVERY",
  platformName: "QuickMove Express",
  websiteUrl: "https://quickmove.in",
  registeredAddress: "Level 4, Cyber City, Tower B, Gurugram, Haryana - 122002",
  primaryContactName: "Arjun Verma",
  primaryContactEmail: "compliance@quickmove.in",
  primaryContactPhone: "+91 98101 23456",
  cessRatePercent: 1.5,
  state: "HARYANA",
};