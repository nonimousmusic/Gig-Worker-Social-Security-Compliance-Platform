import { NextRequest, NextResponse } from "next/server";
import { parseDailyLedgerCSV, parseSummaryBackfillCSV } from "@/lib/csv-parser";
import { dataStore } from "@/lib/data-store";
import { logAuditEvent } from "@/lib/audit-logger";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const format = (formData.get("format") as string) || "daily_ledger";

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "NO_FILE", message: "No CSV file provided in upload" } },
        { status: 400 }
      );
    }

    const text = await file.text();

    if (format === "summary_backfill") {
      const parsed = parseSummaryBackfillCSV(text);

      // Ingest valid rows into store
      parsed.rows
        .filter((r) => r.isValid)
        .forEach((r) => {
          const existing = dataStore.getWorkerById(r.workerId);
          if (existing) {
            const newCum = existing.cumulativeDaysFY + r.totalActiveDays + r.otherPlatformDays;
            dataStore.updateWorker(existing.id, {
              cumulativeDaysFY: newCum,
              otherPlatformDays: existing.otherPlatformDays + r.otherPlatformDays,
              grossPayoutFY: existing.grossPayoutFY + r.totalPayout,
              status: newCum >= 120 ? "ELIGIBLE" : "APPROACHING",
            });
          } else {
            dataStore.addWorker({
              aggregatorWorkerId: r.workerId,
              fullName: r.workerName,
              aadhaarLast4: r.aadhaarLast4,
              maskedAadhaar: `XXXX-XXXX-${r.aadhaarLast4}`,
              uan: r.uan,
              sector: "LOGISTICS_DELIVERY",
              state: "DELHI",
              status: r.totalActiveDays + r.otherPlatformDays >= 120 ? "ELIGIBLE" : "APPROACHING",
              daysInLast90: Math.min(90, r.totalActiveDays),
              cumulativeDaysFY: r.totalActiveDays + r.otherPlatformDays,
              grossPayoutFY: r.totalPayout,
              otherPlatformDays: r.otherPlatformDays,
              lastActiveDate: r.periodEnd || new Date().toISOString().split("T")[0],
              crossPlatformDeclared: r.otherPlatformDays > 0,
              registeredAt: r.periodStart || new Date().toISOString().split("T")[0],
            });
          }
        });

      await logAuditEvent({
        action: "CSV_BACKFILL_INGESTED",
        entity: "SummaryBackfill",
        metadata: { filename: file.name, totalRows: parsed.totalRows, validRows: parsed.validCount },
      });

      return NextResponse.json({
        success: true,
        data: {
          filename: file.name,
          format: "summary_backfill",
          totalRows: parsed.totalRows,
          validCount: parsed.validCount,
          errorCount: parsed.errorCount,
          preview: parsed.rows.slice(0, 10),
        },
      });
    } else {
      const parsed = parseDailyLedgerCSV(text);

      parsed.rows
        .filter((r) => r.isValid)
        .forEach((r) => {
          const existing = dataStore.getWorkerById(r.workerId);
          if (existing) {
            dataStore.updateWorker(existing.id, {
              daysInLast90: existing.daysInLast90 + 1,
              cumulativeDaysFY: existing.cumulativeDaysFY + 1,
              grossPayoutFY: existing.grossPayoutFY + r.grossPayout,
              lastActiveDate: r.date,
              status: existing.daysInLast90 + 1 >= 90 || existing.cumulativeDaysFY + 1 >= 120 ? "ELIGIBLE" : existing.status,
            });
          } else {
            dataStore.addWorker({
              aggregatorWorkerId: r.workerId,
              fullName: r.workerName,
              aadhaarLast4: r.aadhaarLast4,
              maskedAadhaar: `XXXX-XXXX-${r.aadhaarLast4}`,
              uan: r.uan,
              sector: "LOGISTICS_DELIVERY",
              state: "DELHI",
              status: "INACTIVE",
              daysInLast90: 1,
              cumulativeDaysFY: 1,
              grossPayoutFY: r.grossPayout,
              otherPlatformDays: 0,
              lastActiveDate: r.date,
              crossPlatformDeclared: false,
              registeredAt: r.date,
            });
          }
        });

      await logAuditEvent({
        action: "CSV_DAILY_LEDGER_INGESTED",
        entity: "DailyLedger",
        metadata: { filename: file.name, totalRows: parsed.totalRows, validRows: parsed.validCount },
      });

      return NextResponse.json({
        success: true,
        data: {
          filename: file.name,
          format: "daily_ledger",
          totalRows: parsed.totalRows,
          validCount: parsed.validCount,
          errorCount: parsed.errorCount,
          preview: parsed.rows.slice(0, 10),
        },
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "CSV processing failed";
    return NextResponse.json(
      { success: false, error: { code: "INGESTION_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
