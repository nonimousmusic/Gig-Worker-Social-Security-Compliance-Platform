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
  type: "STATUTORY_DEADLINE" | "WORKER_THRESHOLD" | "PAYMENT_CONFIRMATION" | "REGULATORY_UPDATE";
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

// In-Memory Seed Data
export const mockOrganization = {
  id: "org-quickmove-01",
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

export const initialWorkers: WorkerRecord[] = [
  {
    id: "wrk-1001",
    aggregatorWorkerId: "QM-DEL-8901",
    fullName: "Rajesh Kumar",
    aadhaarLast4: "4921",
    maskedAadhaar: "XXXX-XXXX-4921",
    uan: "101239847102",
    phone: "+91 98234 11201",
    sector: "LOGISTICS_DELIVERY",
    state: "DELHI",
    status: "ELIGIBLE",
    daysInLast90: 92,
    cumulativeDaysFY: 145,
    grossPayoutFY: 84500,
    otherPlatformDays: 0,
    lastActiveDate: "2025-09-11",
    crossPlatformDeclared: false,
    registeredAt: "2024-04-10",
  },
  {
    id: "wrk-1002",
    aggregatorWorkerId: "QM-DEL-8902",
    fullName: "Amit Sharma",
    aadhaarLast4: "8104",
    maskedAadhaar: "XXXX-XXXX-8104",
    uan: "101994821034",
    phone: "+91 98765 22345",
    sector: "LOGISTICS_DELIVERY",
    state: "HARYANA",
    status: "ELIGIBLE",
    daysInLast90: 75,
    cumulativeDaysFY: 124,
    grossPayoutFY: 72300,
    otherPlatformDays: 20,
    lastActiveDate: "2025-09-11",
    crossPlatformDeclared: true,
    registeredAt: "2024-05-15",
  },
  {
    id: "wrk-1003",
    aggregatorWorkerId: "QM-DEL-8903",
    fullName: "Pooja Verma",
    aadhaarLast4: "2389",
    maskedAadhaar: "XXXX-XXXX-2389",
    uan: "101482019482",
    phone: "+91 97112 33456",
    sector: "LOGISTICS_DELIVERY",
    state: "UTTAR_PRADESH",
    status: "APPROACHING",
    daysInLast90: 84,
    cumulativeDaysFY: 108,
    grossPayoutFY: 59000,
    otherPlatformDays: 0,
    lastActiveDate: "2025-09-10",
    crossPlatformDeclared: false,
    registeredAt: "2024-06-01",
  },
  {
    id: "wrk-1004",
    aggregatorWorkerId: "QM-DEL-8904",
    fullName: "Sunil Yadav",
    aadhaarLast4: "9012",
    maskedAadhaar: "XXXX-XXXX-9012",
    uan: "101389201948",
    phone: "+91 99201 44567",
    sector: "LOGISTICS_DELIVERY",
    state: "DELHI",
    status: "APPROACHING",
    daysInLast90: 81,
    cumulativeDaysFY: 94,
    grossPayoutFY: 51200,
    otherPlatformDays: 0,
    lastActiveDate: "2025-09-10",
    crossPlatformDeclared: false,
    registeredAt: "2024-06-20",
  },
  {
    id: "wrk-1005",
    aggregatorWorkerId: "QM-DEL-8905",
    fullName: "Vikas Chauhan",
    aadhaarLast4: "3341",
    maskedAadhaar: "XXXX-XXXX-3341",
    uan: "101882019401",
    phone: "+91 98110 55678",
    sector: "LOGISTICS_DELIVERY",
    state: "KARNATAKA",
    status: "ELIGIBLE",
    daysInLast90: 95,
    cumulativeDaysFY: 160,
    grossPayoutFY: 98000,
    otherPlatformDays: 0,
    lastActiveDate: "2025-09-11",
    crossPlatformDeclared: false,
    registeredAt: "2024-04-01",
  },
  {
    id: "wrk-1006",
    aggregatorWorkerId: "QM-DEL-8906",
    fullName: "Deepak Mehra",
    aadhaarLast4: "7720",
    maskedAadhaar: "XXXX-XXXX-7720",
    uan: "101773920194",
    phone: "+91 98701 66789",
    sector: "LOGISTICS_DELIVERY",
    state: "DELHI",
    status: "INACTIVE",
    daysInLast90: 22,
    cumulativeDaysFY: 35,
    grossPayoutFY: 18200,
    otherPlatformDays: 0,
    lastActiveDate: "2025-07-28",
    crossPlatformDeclared: false,
    registeredAt: "2024-08-01",
  },
  {
    id: "wrk-1007",
    aggregatorWorkerId: "QM-DEL-8907",
    fullName: "Manish Tiwari",
    aadhaarLast4: "6431",
    maskedAadhaar: "XXXX-XXXX-6431",
    uan: "101662910482",
    phone: "+91 99102 77890",
    sector: "LOGISTICS_DELIVERY",
    state: "MAHARASHTRA",
    status: "ELIGIBLE",
    daysInLast90: 91,
    cumulativeDaysFY: 138,
    grossPayoutFY: 81400,
    otherPlatformDays: 15,
    lastActiveDate: "2025-09-11",
    crossPlatformDeclared: true,
    registeredAt: "2024-05-10",
  },
  {
    id: "wrk-1008",
    aggregatorWorkerId: "QM-DEL-8908",
    fullName: "Anita Devi",
    aadhaarLast4: "1945",
    maskedAadhaar: "XXXX-XXXX-1945",
    uan: "101552910391",
    phone: "+91 98114 88901",
    sector: "LOGISTICS_DELIVERY",
    state: "DELHI",
    status: "APPROACHING",
    daysInLast90: 86,
    cumulativeDaysFY: 110,
    grossPayoutFY: 63000,
    otherPlatformDays: 0,
    lastActiveDate: "2025-09-09",
    crossPlatformDeclared: false,
    registeredAt: "2024-05-25",
  },
];

export const initialFilings: FilingItem[] = [
  {
    id: "fl-q1-2025",
    financialYear: "2025-2026",
    quarter: "Q1",
    filingType: "FORM_XX_QUARTERLY",
    turnoverAmount: 32400000, // 3.24 Cr
    payoutAmount: 18200000, // 1.82 Cr
    ratePercent: 1.5,
    calculatedCess: 486000, // 1.5% of turnover
    payoutCapAmount: 910000, // 5% of payout cap
    finalCessPayable: 486000,
    eligibleWorkerCount: 1240,
    totalWorkerCount: 1680,
    dueDate: "2025-07-31",
    status: "PAID",
    submittedAt: "2025-07-28T14:30:00Z",
    challanId: "chl-01",
    challanNumber: "CHL-2025-Q1-09823",
    challanUrl: "/sample-challan-q1.pdf",
  },
  {
    id: "fl-q2-2025",
    financialYear: "2025-2026",
    quarter: "Q2",
    filingType: "FORM_XX_QUARTERLY",
    turnoverAmount: 38500000, // 3.85 Cr
    payoutAmount: 21400000, // 2.14 Cr
    ratePercent: 1.5,
    calculatedCess: 577500,
    payoutCapAmount: 1070000,
    finalCessPayable: 577500,
    eligibleWorkerCount: 1410,
    totalWorkerCount: 1850,
    dueDate: "2025-10-31",
    status: "DRAFT",
  },
  {
    id: "fl-annual-2024",
    financialYear: "2024-2025",
    filingType: "FORM_XXI_ANNUAL",
    turnoverAmount: 128000000, // 12.8 Cr
    payoutAmount: 74500000,
    ratePercent: 1.5,
    calculatedCess: 1920000,
    payoutCapAmount: 3725000,
    finalCessPayable: 1920000,
    eligibleWorkerCount: 1550,
    totalWorkerCount: 2100,
    dueDate: "2025-06-30",
    status: "PAID",
    submittedAt: "2025-06-25T11:15:00Z",
    challanId: "chl-00",
    challanNumber: "CHL-2024-ANN-00412",
    challanUrl: "/sample-challan-annual.pdf",
  },
];

export const initialChallans: ChallanItem[] = [
  {
    id: "chl-01",
    filingId: "fl-q1-2025",
    challanNumber: "CHL-2025-Q1-09823",
    bankName: "State Bank of India — Treasury Branch",
    utrNumber: "SBIN00293819283",
    amount: 486000,
    paymentDate: "2025-07-28",
    verified: true,
    lockedAt: "2025-07-28T16:00:00Z",
    sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    documentUrl: "/sample-challan-q1.pdf",
  },
];

export const initialNotifications: NotificationItem[] = [
  {
    id: "ntf-1",
    title: "Form-XX Q2 Filing Due in 49 Days",
    message: "Statutory filing Form-XX for Q2 (July–Sept 2025) must be submitted along with challan payment before October 31, 2025.",
    type: "STATUTORY_DEADLINE",
    read: false,
    createdAt: "2025-09-11T09:00:00Z",
    actionUrl: "/dashboard/filings",
  },
  {
    id: "ntf-2",
    title: "28 Workers Approaching 90-Day Threshold",
    message: "28 gig workers have logged between 80 and 89 days in the current rolling window. Verify their registration and UAN linkage.",
    type: "WORKER_THRESHOLD",
    read: false,
    createdAt: "2025-09-10T14:30:00Z",
    actionUrl: "/dashboard/workers?status=APPROACHING",
  },
  {
    id: "ntf-3",
    title: "Challan Q1 Locked & Audit-Proofed",
    message: "Challan CHL-2025-Q1-09823 (INR 4,86,000) was successfully verified and locked with immutable SHA-256 ledger record.",
    type: "PAYMENT_CONFIRMATION",
    read: true,
    createdAt: "2025-07-28T16:05:00Z",
    actionUrl: "/dashboard/challans",
  },
  {
    id: "ntf-4",
    title: "MoLE Advisory on Cross-Platform Aggregation",
    message: "Ministry of Labour & Employment published clarifications regarding self-declarations under Rule 28 for multi-apping gig partners.",
    type: "REGULATORY_UPDATE",
    read: true,
    createdAt: "2025-08-15T11:00:00Z",
    actionUrl: "/regulatory-reference",
  },
];

// In-Memory store singleton
let workersStore: WorkerRecord[] = [...initialWorkers];
let filingsStore: FilingItem[] = [...initialFilings];
let challansStore: ChallanItem[] = [...initialChallans];
let notificationsStore: NotificationItem[] = [...initialNotifications];

export const dataStore = {
  getOrganization: () => mockOrganization,

  // Workers
  getWorkers: () => workersStore,
  getWorkerById: (id: string) => workersStore.find((w) => w.id === id || w.aggregatorWorkerId === id),
  addWorker: (worker: Omit<WorkerRecord, "id">) => {
    const newWorker: WorkerRecord = {
      ...worker,
      id: `wrk-${Date.now()}`,
    };
    workersStore.unshift(newWorker);
    return newWorker;
  },
  updateWorker: (id: string, updates: Partial<WorkerRecord>) => {
    const idx = workersStore.findIndex((w) => w.id === id);
    if (idx !== -1) {
      workersStore[idx] = { ...workersStore[idx], ...updates };
      return workersStore[idx];
    }
    return null;
  },

  // Filings
  getFilings: () => filingsStore,
  getFilingById: (id: string) => filingsStore.find((f) => f.id === id),
  createFiling: (filing: Omit<FilingItem, "id">) => {
    const newFiling: FilingItem = {
      ...filing,
      id: `fl-${Date.now()}`,
    };
    filingsStore.unshift(newFiling);
    return newFiling;
  },
  updateFiling: (id: string, updates: Partial<FilingItem>) => {
    const idx = filingsStore.findIndex((f) => f.id === id);
    if (idx !== -1) {
      filingsStore[idx] = { ...filingsStore[idx], ...updates };
      return filingsStore[idx];
    }
    return null;
  },

  // Challans
  getChallans: () => challansStore,
  addChallan: (challan: Omit<ChallanItem, "id">) => {
    const newChallan: ChallanItem = {
      ...challan,
      id: `chl-${Date.now()}`,
    };
    challansStore.unshift(newChallan);
    return newChallan;
  },

  // Notifications
  getNotifications: () => notificationsStore,
  markNotificationRead: (id: string) => {
    const notif = notificationsStore.find((n) => n.id === id);
    if (notif) notif.read = true;
    return notif;
  },
};
