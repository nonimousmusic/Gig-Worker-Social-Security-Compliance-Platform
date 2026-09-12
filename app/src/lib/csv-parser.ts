import Papa from "papaparse";

export interface ParsedLedgerRow {
  rowNumber: number;
  workerId: string;
  workerName: string;
  uan?: string;
  aadhaarLast4: string;
  date: string;
  hoursWorked: number;
  grossPayout: number;
  platformTurnover: number;
  tripCount: number;
  isValid: boolean;
  errors: string[];
}

export interface ParsedBackfillRow {
  rowNumber: number;
  workerId: string;
  workerName: string;
  uan?: string;
  aadhaarLast4: string;
  periodStart: string;
  periodEnd: string;
  totalActiveDays: number;
  totalPayout: number;
  otherPlatformDays: number;
  isValid: boolean;
  errors: string[];
}

export function parseDailyLedgerCSV(csvContent: string): {
  rows: ParsedLedgerRow[];
  totalRows: number;
  validCount: number;
  errorCount: number;
} {
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const rows: ParsedLedgerRow[] = (result.data as Record<string, string>[]).map((raw, index) => {
    const errors: string[] = [];
    const workerId = (raw.worker_id || raw.WorkerId || "").trim();
    const workerName = (raw.worker_name || raw.WorkerName || "").trim();
    const uan = (raw.uan || raw.UAN || "").trim();
    const aadhaarLast4 = (raw.aadhaar_last4 || raw.aadhaar || raw.Aadhaar || "").trim().slice(-4);
    const dateStr = (raw.date || raw.engagement_date || raw.Date || "").trim();
    const hours = parseFloat(raw.hours_worked || raw.hours || "0");
    const payout = parseFloat(raw.gross_payout || raw.payout || "0");
    const turnover = parseFloat(raw.platform_turnover_attributed || raw.turnover || "0");
    const trips = parseInt(raw.trip_or_gig_count || raw.trips || "1", 10);

    if (!workerId) errors.push("Missing worker_id");
    if (!workerName) errors.push("Missing worker_name");
    if (aadhaarLast4 && (aadhaarLast4.length !== 4 || isNaN(Number(aadhaarLast4)))) {
      errors.push("Invalid aadhaar_last4 (must be 4 digits)");
    }
    if (!dateStr || isNaN(new Date(dateStr).getTime())) {
      errors.push("Invalid date format (expected YYYY-MM-DD)");
    }
    if (isNaN(hours) || hours < 0 || hours > 24) {
      errors.push("Invalid hours_worked (must be between 0 and 24)");
    }
    if (isNaN(payout) || payout < 0) {
      errors.push("Invalid gross_payout");
    }

    return {
      rowNumber: index + 1,
      workerId,
      workerName,
      uan: uan || undefined,
      aadhaarLast4: aadhaarLast4 || "0000",
      date: dateStr,
      hoursWorked: isNaN(hours) ? 0 : hours,
      grossPayout: isNaN(payout) ? 0 : payout,
      platformTurnover: isNaN(turnover) ? 0 : turnover,
      tripCount: isNaN(trips) ? 1 : trips,
      isValid: errors.length === 0,
      errors,
    };
  });

  const validCount = rows.filter((r) => r.isValid).length;
  return {
    rows,
    totalRows: rows.length,
    validCount,
    errorCount: rows.length - validCount,
  };
}

export function parseSummaryBackfillCSV(csvContent: string): {
  rows: ParsedBackfillRow[];
  totalRows: number;
  validCount: number;
  errorCount: number;
} {
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const rows: ParsedBackfillRow[] = (result.data as Record<string, string>[]).map((raw, index) => {
    const errors: string[] = [];
    const workerId = (raw.worker_id || "").trim();
    const workerName = (raw.worker_name || "").trim();
    const uan = (raw.uan || "").trim();
    const aadhaarLast4 = (raw.aadhaar_last4 || "").trim().slice(-4);
    const start = (raw.period_start || "").trim();
    const end = (raw.period_end || "").trim();
    const activeDays = parseInt(raw.total_active_days || "0", 10);
    const payout = parseFloat(raw.total_payout || "0");
    const otherDays = parseInt(raw.other_platform_days || "0", 10);

    if (!workerId) errors.push("Missing worker_id");
    if (!workerName) errors.push("Missing worker_name");
    if (isNaN(activeDays) || activeDays < 0 || activeDays > 366) {
      errors.push("Invalid total_active_days");
    }
    if (isNaN(payout) || payout < 0) {
      errors.push("Invalid total_payout");
    }

    return {
      rowNumber: index + 1,
      workerId,
      workerName,
      uan: uan || undefined,
      aadhaarLast4: aadhaarLast4 || "0000",
      periodStart: start,
      periodEnd: end,
      totalActiveDays: isNaN(activeDays) ? 0 : activeDays,
      totalPayout: isNaN(payout) ? 0 : payout,
      otherPlatformDays: isNaN(otherDays) ? 0 : otherDays,
      isValid: errors.length === 0,
      errors,
    };
  });

  const validCount = rows.filter((r) => r.isValid).length;
  return {
    rows,
    totalRows: rows.length,
    validCount,
    errorCount: rows.length - validCount,
  };
}
