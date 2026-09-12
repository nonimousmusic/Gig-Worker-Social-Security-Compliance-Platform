import { describe, it, expect } from "vitest";
import { parseDailyLedgerCSV, parseSummaryBackfillCSV } from "./csv-parser";

describe("parseDailyLedgerCSV", () => {
  const header =
    "worker_id,worker_name,uan,aadhaar_last4,date,hours_worked,gross_payout,platform_turnover_attributed,trip_or_gig_count";

  it("parses a fully valid row", () => {
    const csv = `${header}\nQM-1,Ramesh,101239847102,4921,2026-09-11,8.5,950,1650,11`;
    const out = parseDailyLedgerCSV(csv);
    expect(out.totalRows).toBe(1);
    expect(out.validCount).toBe(1);
    expect(out.errorCount).toBe(0);
    expect(out.rows[0]).toMatchObject({
      rowNumber: 1,
      workerId: "QM-1",
      workerName: "Ramesh",
      aadhaarLast4: "4921",
      date: "2026-09-11",
      hoursWorked: 8.5,
      grossPayout: 950,
      tripCount: 11,
      isValid: true,
      errors: [],
    });
  });

  it("flags missing ids, bad dates, out-of-range hours, negative payouts", () => {
    const csv =
      `${header}\n` +
      `,NoId,,4921,2026-09-11,8,100,170,1\n` + // missing worker_id + worker_name
      `QM-2,Bad,101239847102,4921,not-a-date,8,100,170,1\n` + // bad date
      `QM-3,Long,101239847102,4921,2026-09-11,25,100,170,1\n` + // hours > 24
      `QM-4,Neg,101239847102,4921,2026-09-11,8,-5,170,1`; // negative payout
    const out = parseDailyLedgerCSV(csv);
    expect(out.totalRows).toBe(4);
    expect(out.validCount).toBe(0);
    expect(out.errorCount).toBe(4);
    expect(out.rows[0].errors).toContain("Missing worker_id");
  });

  it("accepts aliased headers", () => {
    const csv =
      "WorkerId,WorkerName,UAN,Aadhaar,Date,hours,payout,turnover,trips\n" +
      "QM-9,Kavita,101994821099,8104,2026-09-11,7,820,1400,9";
    const out = parseDailyLedgerCSV(csv);
    expect(out.validCount).toBe(1);
    expect(out.rows[0].aadhaarLast4).toBe("8104");
  });
});

describe("parseSummaryBackfillCSV", () => {
  const header =
    "worker_id,worker_name,uan,aadhaar_last4,period_start,period_end,total_active_days,total_payout,other_platform_days";

  it("parses a valid backfill row", () => {
    const csv = `${header}\nQM-1,Suresh,101239847111,4921,2026-04-01,2026-06-30,68,54000,15`;
    const out = parseSummaryBackfillCSV(csv);
    expect(out.validCount).toBe(1);
    expect(out.rows[0]).toMatchObject({
      totalActiveDays: 68,
      totalPayout: 54000,
      otherPlatformDays: 15,
    });
  });

  it("rejects out-of-range days and negative payouts", () => {
    const csv =
      `${header}\n` +
      `QM-1,A,101239847111,4921,2026-04-01,2026-06-30,367,100,0\n` + // > 366
      `QM-2,B,,4921,2026-04-01,2026-06-30,10,-5,0`; // negative payout
    const out = parseSummaryBackfillCSV(csv);
    expect(out.validCount).toBe(0);
    expect(out.errorCount).toBe(2);
  });
});
