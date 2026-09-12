"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Shield,
  Plus,
  Percent,
} from "lucide-react";
import { FilingItem } from "@/lib/types";

export default function StatutoryFilingsPage() {
  const [filings, setFilings] = useState<FilingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Wizard state
  const [formData, setFormData] = useState({
    financialYear: "2025-2026",
    quarter: "Q2",
    filingType: "FORM_XX_QUARTERLY",
    turnoverAmount: 38500000, // 3.85 Cr
    payoutAmount: 21400000, // 2.14 Cr
    ratePercent: 1.5,
    eligibleWorkerCount: 1410,
    totalWorkerCount: 1850,
  });

  const [wizardSubmitting, setWizardSubmitting] = useState(false);

  // Deadline banner is driven by the loaded filings, never hardcoded.
  // The day-count is computed inside the load effect (impure date math
  // is not allowed during render).
  const [banner, setBanner] = useState<{
    openCount: number;
    nextLabel: string;
    nextDue: string;
    nextDays: number | null;
    paidCount: number;
    paidTotal: number;
  }>({
    openCount: 0,
    nextLabel: "No open filings",
    nextDue: "—",
    nextDays: null,
    paidCount: 0,
    paidTotal: 0,
  });

  function computeBanner(rows: FilingItem[]) {
    const open = rows.filter((f) => f.status !== "PAID" && f.dueDate);
    const next = [...open].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0];
    const paid = rows.filter((f) => f.status === "PAID");
    setBanner({
      openCount: open.length,
      nextLabel: next
        ? `${next.filingType === "FORM_XXI_ANNUAL" ? "Form-XXI" : "Form-XX"}: ${next.quarter ? `${next.quarter} ` : ""}Return`
        : "No open filings",
      nextDue: next?.dueDate || "—",
      nextDays: next?.dueDate
        ? Math.max(0, Math.ceil((new Date(`${next.dueDate}T23:59:59Z`).getTime() - Date.now()) / 86400000))
        : null,
      paidCount: paid.length,
      paidTotal: paid.reduce((s, f) => s + f.finalCessPayable, 0),
    });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/filings");
        const json = await res.json();
        if (!cancelled && json.success) {
          setFilings(json.data.filings);
          computeBanner(json.data.filings);
        }
      } catch (err) {
        console.error("Filings load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadFilings() {
    try {
      const res = await fetch("/api/v1/filings");
      const json = await res.json();
      if (json.success) {
        setFilings(json.data.filings);
        computeBanner(json.data.filings);
      }
    } catch (err) {
      console.error("Filings reload failed:", err);
    }
  }

  const turnoverCess = formData.turnoverAmount * (formData.ratePercent / 100);
  const payoutCap = formData.payoutAmount * 0.05;
  const finalCess = Math.min(turnoverCess, payoutCap);
  const isCapped = payoutCap < turnoverCess;

  // Display due date for the selected quarter (mirrors the API mapping).
  // Years live in state because derivation runs in the FY select handler.
  const [wizardYears, setWizardYears] = useState({ start: "2025", end: "2026" });
  const quarterOptions = [
    { value: "Q1", label: `Q1 (April–June ${wizardYears.start}) — Due Jul 31` },
    { value: "Q2", label: `Q2 (July–September ${wizardYears.start}) — Due Oct 31` },
    { value: "Q3", label: `Q3 (October–December ${wizardYears.start}) — Due Jan 31` },
    { value: "Q4", label: `Q4 (January–March ${wizardYears.end}) — Due Apr 30` },
  ];
  const wizardDueLabel = (() => {
    switch (formData.quarter) {
      case "Q1":
        return `July 31, ${wizardYears.start}`;
      case "Q2":
        return `October 31, ${wizardYears.start}`;
      case "Q3":
        return `January 31, ${wizardYears.end}`;
      default:
        return `April 30, ${wizardYears.end}`;
    }
  })();

  async function handleCreateFiling() {
    setWizardSubmitting(true);
    try {
      const res = await fetch("/api/v1/filings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setIsWizardOpen(false);
        setWizardStep(1);
        reloadFilings();
      }
    } catch (err) {
      console.error("Create filing request failed:", err);
    } finally {
      setWizardSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400" />
            Statutory Filings Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Form-XX (Quarterly Turnover Return) & Form-XXI (Annual Return) compliance under Section 114 & Rule 31.
          </p>
        </div>

        <button
          onClick={() => {
            setWizardStep(1);
            setIsWizardOpen(true);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" />
          New Form-XX Filing
        </button>
      </div>

      {/* Deadlines Banner (live filing data) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111622] p-5 rounded-xl border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Active Deadline
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
              {banner.nextDays ?? "—"} DAYS
            </span>
          </div>
          <p className="text-base font-bold text-white">{banner.nextLabel}</p>
          <p className="text-xs text-slate-400">Due: {banner.nextDue}</p>
        </div>

        <div className="bg-[#111622] p-5 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Open Filings</span>
            <span className="text-[10px] text-slate-500 font-mono">{banner.openCount} pending</span>
          </div>
          <p className="text-base font-bold text-white">Awaiting Payment</p>
          <p className="text-xs text-slate-400">Deposit challans from the Challan Vault</p>
        </div>

        <div className="bg-[#111622] p-5 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Completed Returns</span>
            <span className="text-[10px] text-slate-500 font-mono">{banner.paidCount} paid</span>
          </div>
          <p className="text-base font-bold text-white">₹{banner.paidTotal.toLocaleString("en-IN")} locked</p>
          <p className="text-xs text-slate-400">Cess deposited & audit-locked</p>
        </div>
      </div>

      {/* Filings Table */}
      <div className="bg-[#111622] rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Filings History & Statutory Records</h3>
          <span className="text-xs text-slate-400 font-mono">{filings.length} Filings Tracked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Filing Type & Period</th>
                <th className="py-3 px-4">Turnover & Rate</th>
                <th className="py-3 px-4">Payout Cap (5%)</th>
                <th className="py-3 px-4">Net Cess Payable</th>
                <th className="py-3 px-4">Eligible Workers</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Challan / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading statutory filings...
                  </td>
                </tr>
              ) : (
                filings.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">
                        {f.filingType === "FORM_XX_QUARTERLY" ? `Form-XX (${f.quarter})` : "Form-XXI (Annual)"}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">FY {f.financialYear}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-200">₹{(f.turnoverAmount / 10000000).toFixed(2)} Cr</div>
                      <div className="text-[10px] text-slate-500">@{f.ratePercent}% = ₹{f.calculatedCess.toLocaleString("en-IN")}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      ₹{f.payoutCapAmount.toLocaleString("en-IN")}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-emerald-400 font-mono text-sm">
                        ₹{f.finalCessPayable.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-slate-500">Due: {f.dueDate}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      {f.eligibleWorkerCount} / {f.totalWorkerCount}
                    </td>

                    <td className="py-3 px-4">
                      {f.status === "PAID" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> PAID
                        </span>
                      ) : f.status === "OVERDUE" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" /> OVERDUE
                        </span>
                      ) : f.status === "SUBMITTED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          <Clock className="w-3 h-3" /> SUBMITTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3" /> DRAFT
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {f.status === "PAID" ? (
                        <Link
                          href="/dashboard/challans"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700"
                        >
                          <Shield className="w-3 h-3 text-emerald-400" />
                          View Challan
                        </Link>
                      ) : (
                        <Link
                          href="/dashboard/challans"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] text-white font-semibold"
                        >
                          Pay & Lock
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Form-XX Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111622] border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  Form-XX Filing Preparation Wizard
                </h3>
                <p className="text-xs text-slate-400">Quarterly Turnover Return under Section 114 & Rule 31</p>
              </div>
              <button onClick={() => setIsWizardOpen(false)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            {/* Steps Indicator */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[
                { step: 1, title: "1. Period & Numbers" },
                { step: 2, title: "2. Cess Formula" },
                { step: 3, title: "3. Worker Census" },
                { step: 4, title: "4. Verification" },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`p-2 rounded-lg border font-medium transition ${
                    wizardStep === s.step
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                      : wizardStep > s.step
                      ? "bg-slate-900 text-slate-300 border-slate-800"
                      : "bg-slate-950 text-slate-600 border-slate-900"
                  }`}
                >
                  {s.title}
                </div>
              ))}
            </div>

            {/* Step 1: Period & Numbers */}
            {wizardStep === 1 && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 mb-1">Financial Year</label>
                    <select
                      value={formData.financialYear}
                      onChange={(e) => {
                        const fy = e.target.value;
                        const sep = fy.indexOf("-");
                        setFormData({ ...formData, financialYear: fy });
                        setWizardYears({
                          start: sep > 0 ? fy.slice(0, sep) : "",
                          end: sep > 0 ? fy.slice(sep + 1) : "",
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                    >
                      <option value="2025-2026">FY 2025-2026</option>
                      <option value="2024-2025">FY 2024-2025</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Filing Quarter</label>
                    <select
                      value={formData.quarter}
                      onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                    >
                      {quarterOptions.map((q) => (
                        <option key={q.value} value={q.value}>
                          {q.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 mb-1">Quarter Platform Turnover (INR) *</label>
                    <input
                      type="number"
                      value={formData.turnoverAmount}
                      onChange={(e) => setFormData({ ...formData, turnoverAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      ₹{(formData.turnoverAmount / 10000000).toFixed(2)} Crores
                    </span>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Aggregate Worker Payouts (INR) *</label>
                    <input
                      type="number"
                      value={formData.payoutAmount}
                      onChange={(e) => setFormData({ ...formData, payoutAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      ₹{(formData.payoutAmount / 10000000).toFixed(2)} Crores
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Cess Formula */}
            {wizardStep === 2 && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Percent className="w-4 h-4 text-emerald-400" /> Section 114 Comparison
                  </h4>
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">{formData.ratePercent}% of Turnover</span>
                      <strong className="text-white text-base font-mono">₹{turnoverCess.toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">5% Worker Payout Cap</span>
                      <strong className="text-white text-base font-mono">₹{payoutCap.toLocaleString("en-IN")}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
                  <span className="text-emerald-300 font-semibold block text-xs">Statutory Result:</span>
                  <p className="text-2xl font-bold text-white font-mono mt-1">
                    ₹{finalCess.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isCapped
                      ? "Statutory ceiling of 5% applied. Savings of ₹" + (turnoverCess - payoutCap).toLocaleString("en-IN")
                      : "Turnover rate of 1.5% applied (comfortably below 5% payout ceiling)."}
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Worker Census */}
            {wizardStep === 3 && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-white text-sm">Linked Worker Census (Rule 28)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[11px]">Eligible Gig Workers Linked</span>
                      <strong className="text-emerald-400 text-lg block font-mono">
                        {formData.eligibleWorkerCount.toLocaleString("en-IN")} Workers
                      </strong>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[11px]">Aadhaar Masking Pipeline</span>
                      <strong className="text-white text-lg block flex items-center gap-1 font-mono">
                        <Shield className="w-4 h-4 text-emerald-400" /> Masked at ingestion
                      </strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {formData.eligibleWorkerCount.toLocaleString("en-IN")} of {formData.totalWorkerCount.toLocaleString("en-IN")} linked
                    workers are counted toward Section 114 coverage from the platform engagement ledger.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Final Verification */}
            {wizardStep === 4 && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Summary for Submission
                  </h4>
                  <div className="space-y-1 text-slate-300 text-xs">
                    <p>Filing: <strong className="text-white">Form-XX (Quarterly Return) &bull; {formData.quarter} FY {formData.financialYear}</strong></p>
                    <p>Turnover Declared: <strong className="text-white">₹{(formData.turnoverAmount / 10000000).toFixed(2)} Cr</strong></p>
                    <p>Payout Declared: <strong className="text-white">₹{(formData.payoutAmount / 10000000).toFixed(2)} Cr</strong></p>
                    <p>Statutory Cess Amount: <strong className="text-emerald-400 font-mono text-base font-bold">₹{finalCess.toLocaleString("en-IN")}</strong></p>
                    <p>Due Date: <strong className="text-amber-300">{wizardDueLabel}</strong></p>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 text-[11px]">
                  Next step: After creating this filing draft, proceed to the Challan Vault to deposit the cess amount with the nominated bank and lock the return.
                </div>
              </div>
            )}

            {/* Modal Controls */}
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(wizardStep - 1)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  &larr; Previous Step
                </button>
              ) : (
                <div />
              )}

              {wizardStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(wizardStep + 1)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center gap-1.5"
                >
                  Next Step <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateFiling}
                  disabled={wizardSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                >
                  {wizardSubmitting ? "Creating..." : "Save & Generate Form-XX Draft"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
