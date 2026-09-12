"use client";

import { useState } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  ShieldAlert,
  ArrowRight,
  Database,
  RefreshCw,
} from "lucide-react";

export default function CSVUploadPage() {
  const [format, setFormat] = useState<"daily_ledger" | "summary_backfill">("daily_ledger");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    filename: string;
    totalRows: number;
    validCount: number;
    errorCount: number;
    preview: Array<{
      rowNumber: number;
      workerId: string;
      workerName: string;
      aadhaarLast4: string;
      isValid: boolean;
      errors: string[];
    }>;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const sampleDailyCSV = `worker_id,worker_name,uan,aadhaar_last4,date,hours_worked,gross_payout,platform_turnover_attributed,trip_or_gig_count
QM-DEL-9901,Suresh Patel,101239847111,4921,2025-09-11,8.5,950,1650,11
QM-DEL-9902,Kavita Nair,101994821099,8104,2025-09-11,7.0,820,1400,9
QM-DEL-9903,Mohd Farooq,,2389,2025-09-11,9.0,1100,1950,14`;

  const sampleBackfillCSV = `worker_id,worker_name,uan,aadhaar_last4,period_start,period_end,total_active_days,total_payout,other_platform_days
QM-DEL-9901,Suresh Patel,101239847111,4921,2025-04-01,2025-06-30,68,54000,15
QM-DEL-9902,Kavita Nair,101994821099,8104,2025-04-01,2025-06-30,72,61000,0`;

  function handleDownloadTemplate() {
    const content = format === "daily_ledger" ? sampleDailyCSV : sampleBackfillCSV;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${format}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setErrorMsg("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("format", format);

    try {
      const res = await fetch("/api/v1/ledger/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error?.message || "CSV processing failed");
        setUploading(false);
        return;
      }
      setResult(json.data);
    } catch {
      setErrorMsg("Failed to upload CSV file");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-blue-400" />
          CSV Ingestion Studio
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          High-throughput batch ingestion pipeline for daily gig engagement logs & summary backfill returns.
        </p>
      </div>

      {/* Format Selection & Template Download */}
      <div className="bg-[#111622] p-5 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Select Ingestion Format</h3>
            <p className="text-xs text-slate-400">Choose between granular daily trip logs or aggregated historical backfill.</p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Download Sample CSV
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label
            onClick={() => setFormat("daily_ledger")}
            className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
              format === "daily_ledger"
                ? "bg-blue-500/10 border-blue-500/40 text-white"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/40"
            }`}
          >
            <input
              type="radio"
              name="format"
              checked={format === "daily_ledger"}
              onChange={() => setFormat("daily_ledger")}
              className="mt-1 accent-blue-500"
            />
            <div>
              <strong className="block text-xs text-white">Daily Engagement Ledger</strong>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Individual daily records with date, hours worked, gross payouts, and trip counts. Best for nightly ERP/dispatch feeds.
              </p>
            </div>
          </label>

          <label
            onClick={() => setFormat("summary_backfill")}
            className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
              format === "summary_backfill"
                ? "bg-purple-500/10 border-purple-500/40 text-white"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/40"
            }`}
          >
            <input
              type="radio"
              name="format"
              checked={format === "summary_backfill"}
              onChange={() => setFormat("summary_backfill")}
              className="mt-1 accent-purple-500"
            />
            <div>
              <strong className="block text-xs text-white">Quarterly Summary Backfill</strong>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Aggregated period totals including active day counts, total payouts, and declared cross-platform days.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Upload Dropzone */}
      <form onSubmit={handleUpload} className="bg-[#111622] p-6 rounded-xl border border-slate-800 space-y-4">
        <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/50 rounded-xl p-8 text-center transition bg-slate-900/40">
          <UploadCloud className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-xs text-slate-300 font-medium">
            Drag & drop your CSV file here, or{" "}
            <label className="text-blue-400 hover:underline cursor-pointer">
              browse files
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Maximum 50,000 rows per batch &bull; UTF-8 encoded CSV</p>

          {file && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>{file.name}</span>
              <span className="text-[10px] text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!file || uploading}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-blue-600/20 flex items-center gap-2 transition"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Parsing & Validating...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                Process & Ingest Batch
              </>
            )}
          </button>
        </div>
      </form>

      {/* Ingestion Results Preview */}
      {result && (
        <div className="bg-[#111622] rounded-xl border border-slate-800 p-6 space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Ingestion Completed Successfully
              </h3>
              <p className="text-xs text-slate-400">Batch: {result.filename}</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-emerald-400 font-bold">{result.validCount} Valid Rows</span>
              {result.errorCount > 0 && <span className="text-rose-400 font-bold">{result.errorCount} Errors</span>}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Row</th>
                  <th className="py-2.5 px-3">Worker ID</th>
                  <th className="py-2.5 px-3">Worker Name</th>
                  <th className="py-2.5 px-3">Aadhaar Last 4</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                {result.preview.map((row) => (
                  <tr key={row.rowNumber} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-slate-500">{row.rowNumber}</td>
                    <td className="py-2.5 px-3 text-white font-semibold">{row.workerId}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-200">{row.workerName}</td>
                    <td className="py-2.5 px-3 text-slate-400">XXXX-{row.aadhaarLast4}</td>
                    <td className="py-2.5 px-3">
                      {row.isValid ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Valid
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Invalid
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-rose-300 font-sans text-[11px]">
                      {row.errors.join("; ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
