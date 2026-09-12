"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Shield,
  Layers,
  Info,
  Calendar,
  Zap,
} from "lucide-react";

interface EligibilityWorker {
  id: string;
  aggregatorWorkerId: string;
  fullName: string;
  maskedAadhaar: string;
  uan: string;
  daysInLast90: number;
  cumulativeDaysFY: number;
  otherPlatformDays: number;
  status: "ELIGIBLE" | "APPROACHING" | "INACTIVE";
  progressTo90: number;
  progressTo120: number;
  crossPlatformDeclared: boolean;
  lastActiveDate: string;
}

export default function EligibilityEnginePage() {
  const [workers, setWorkers] = useState<EligibilityWorker[]>([]);
  const [counts, setCounts] = useState({
    eligible: 0,
    approaching: 0,
    inactive: 0,
    crossPlatformDeclared: 0,
  });
  const [loading, setLoading] = useState(true);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronMessage, setCronMessage] = useState("");

  // Declaration modal
  const [declaringWorker, setDeclaringWorker] = useState<EligibilityWorker | null>(null);
  const [declarationForm, setDeclarationForm] = useState({
    otherPlatformName: "Zomato Logistics",
    declaredDays: "15",
    periodStart: "2025-04-01",
    periodEnd: "2025-06-30",
  });
  const [declarationLoading, setDeclarationLoading] = useState(false);

  async function loadEligibilityData() {
    try {
      const res = await fetch("/api/v1/dashboard/eligibility");
      const json = await res.json();
      if (json.success) {
        setWorkers(json.data.workers);
        setCounts(json.data.counts);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEligibilityData();
  }, []);

  async function handleRunCron() {
    setCronRunning(true);
    setCronMessage("");
    try {
      const res = await fetch("/api/v1/cron/evaluate-eligibility", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setCronMessage(`Success: Evaluated ${json.data.evaluatedWorkers} workers. ${json.data.newlyEligibleCount} newly eligible.`);
        loadEligibilityData();
      }
    } catch {
      setCronMessage("Cron evaluation failed.");
    } finally {
      setCronRunning(false);
    }
  }

  async function handleDeclarationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!declaringWorker) return;
    setDeclarationLoading(true);

    try {
      const res = await fetch(`/api/v1/workers/${declaringWorker.id}/declarations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(declarationForm),
      });
      const json = await res.json();
      if (json.success) {
        setDeclaringWorker(null);
        loadEligibilityData();
      }
    } catch {
      // Handle error
    } finally {
      setDeclarationLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-400" />
            Statutory Eligibility Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated evaluation of Section 114 / Rule 28 engagement thresholds (90 days rolling / 120 cumulative days).
          </p>
        </div>

        <button
          onClick={handleRunCron}
          disabled={cronRunning}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition shrink-0"
        >
          <Zap className={`w-3.5 h-3.5 ${cronRunning ? "animate-spin" : ""}`} />
          {cronRunning ? "Evaluating Thresholds..." : "Trigger Nightly Audit Job"}
        </button>
      </div>

      {cronMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{cronMessage}</span>
        </div>
      )}

      {/* Statutory Rule Explainer Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#111622] to-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <Info className="w-4 h-4 text-blue-400" />
          <span>Statutory Criteria — Code on Social Security 2020 & Central Rules</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">Criterion A: 90-Day Rolling Window</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              At least 90 engagement days completed with the aggregator in the preceding 12-month rolling cycle.
            </p>
          </div>
          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <span className="text-purple-400 font-bold block mb-1">Criterion B: 120 Cumulative Days</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              120 days total in the Financial Year across single or multiple aggregators via self-declaration under Rule 28(2).
            </p>
          </div>
          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <span className="text-amber-400 font-bold block mb-1">Warning Zone: 80–89 Days</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Automated threshold alerts are dispatched to compliance officers when workers hit 80 days to ensure UAN linkage.
            </p>
          </div>
        </div>
      </div>

      {/* Live Engine Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#111622] p-4 rounded-xl border border-emerald-500/20">
          <span className="text-xs text-slate-400">Statutory Eligible</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{counts.eligible}</p>
          <span className="text-[10px] text-slate-500">Full cess entitlement</span>
        </div>
        <div className="bg-[#111622] p-4 rounded-xl border border-amber-500/20">
          <span className="text-xs text-slate-400">Approaching (80-89d)</span>
          <p className="text-2xl font-bold text-amber-300 mt-1">{counts.approaching}</p>
          <span className="text-[10px] text-slate-500">Action: Verify UAN</span>
        </div>
        <div className="bg-[#111622] p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400">Under 80 Days</span>
          <p className="text-2xl font-bold text-slate-400 mt-1">{counts.inactive}</p>
          <span className="text-[10px] text-slate-500">Not yet covered</span>
        </div>
        <div className="bg-[#111622] p-4 rounded-xl border border-indigo-500/20">
          <span className="text-xs text-slate-400">Multi-App Declared</span>
          <p className="text-2xl font-bold text-indigo-400 mt-1">{counts.crossPlatformDeclared}</p>
          <span className="text-[10px] text-slate-500">Rule 28(2) aggregated</span>
        </div>
      </div>

      {/* Workers Progress Stream */}
      <div className="bg-[#111622] rounded-xl border border-slate-800 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Live Worker Threshold Meters</h3>

        <div className="space-y-3">
          {loading ? (
            <p className="text-xs text-slate-500 text-center py-6">Loading threshold meters...</p>
          ) : (
            workers.map((w) => (
              <div
                key={w.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1 w-full md:w-64">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">{w.fullName}</span>
                    <span className="text-[10px] font-mono text-slate-500">({w.aggregatorWorkerId})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Aadhaar: {w.maskedAadhaar} &bull; UAN: {w.uan}
                  </div>
                </div>

                {/* Progress Gauges */}
                <div className="flex-1 w-full space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>90-Day Rolling Window:</span>
                      <strong className={w.daysInLast90 >= 90 ? "text-emerald-400" : "text-amber-300"}>
                        {w.daysInLast90} / 90 Days ({w.progressTo90}%)
                      </strong>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${w.progressTo90}%` }}
                        className={`h-full ${
                          w.daysInLast90 >= 90 ? "bg-emerald-500" : w.daysInLast90 >= 80 ? "bg-amber-500" : "bg-blue-500"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Cumulative FY (Threshold 120d):</span>
                      <strong className={w.cumulativeDaysFY >= 120 ? "text-purple-400" : "text-slate-300"}>
                        {w.cumulativeDaysFY} / 120 Days
                      </strong>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${w.progressTo120}%` }}
                        className="h-full bg-purple-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Status & Declaration CTA */}
                <div className="flex items-center gap-3 shrink-0">
                  {w.status === "ELIGIBLE" ? (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      ELIGIBLE
                    </span>
                  ) : w.status === "APPROACHING" ? (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      APPROACHING
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">
                      INACTIVE
                    </span>
                  )}

                  <button
                    onClick={() => setDeclaringWorker(w)}
                    className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition"
                  >
                    + Add Multi-App Days
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Multi-App Declaration Modal */}
      {declaringWorker && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111622] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Rule 28(2) Multi-App Self-Declaration</h3>
                <p className="text-xs text-slate-400">{declaringWorker.fullName} ({declaringWorker.maskedAadhaar})</p>
              </div>
              <button onClick={() => setDeclaringWorker(null)} className="text-slate-400 hover:text-white text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleDeclarationSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Other Platform Name *</label>
                <select
                  value={declarationForm.otherPlatformName}
                  onChange={(e) => setDeclarationForm({ ...declarationForm, otherPlatformName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Zomato Logistics">Zomato Logistics</option>
                  <option value="Swiggy Delivery Partner">Swiggy Delivery Partner</option>
                  <option value="Uber India Technology">Uber India Technology</option>
                  <option value="Ola Mobility">Ola Mobility</option>
                  <option value="Zepto Quick Commerce">Zepto Quick Commerce</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Additional Active Days Declared *</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  required
                  value={declarationForm.declaredDays}
                  onChange={(e) => setDeclarationForm({ ...declarationForm, declaredDays: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Period Start</label>
                  <input
                    type="date"
                    value={declarationForm.periodStart}
                    onChange={(e) => setDeclarationForm({ ...declarationForm, periodStart: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Period End</label>
                  <input
                    type="date"
                    value={declarationForm.periodEnd}
                    onChange={(e) => setDeclarationForm({ ...declarationForm, periodEnd: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-400 leading-relaxed">
                By submitting this declaration, the days reported are aggregate-linked with the worker's UIDAI/UAN profile under Central Rule 28 for Section 114 social security welfare.
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeclaringWorker(null)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={declarationLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500"
                >
                  {declarationLoading ? "Aggregating..." : "Confirm & Aggregate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
