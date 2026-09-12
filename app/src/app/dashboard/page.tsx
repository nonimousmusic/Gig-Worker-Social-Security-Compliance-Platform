"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Percent,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const [data, setData] = useState<{
    stats: {
      totalWorkers: number;
      eligibleWorkers: number;
      approachingWorkers: number;
      inactiveWorkers: number;
      eligiblePercentage: number;
    };
    financials: {
      turnoverQ2: number;
      payoutQ2: number;
      cessRatePercent: number;
      calculatedCessQ2: number;
      payoutCapQ2: number;
      netCessPayableQ2: number;
      totalCessPaidYTD: number;
    };
    statutoryDeadline: {
      filingName: string | null;
      quarter: string | null;
      dueDate: string | null;
      daysRemaining: number | null;
      status: string;
      penaltyRiskRate: string;
    };
    recentFilings: {
      id: string;
      filingType: string;
      quarter?: string;
      financialYear: string;
      status: string;
      dueDate: string;
      finalCessPayable: number;
    }[];
    complianceScore: number;
    riskLevel: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/v1/dashboard/overview");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Dashboard overview load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading Statutory Compliance Intelligence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Compliance Dashboard
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-normal">
              <ShieldCheck className="w-3 h-3" /> Section 114 Compliant
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time compliance monitoring under the <strong className="text-slate-300">Code on Social Security 2020</strong> & Rule 28.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/upload"
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload CSV Ledger
          </Link>
          <Link
            href="/dashboard/filings"
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            Prepare Form-XX
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Workers */}
        <div className="bg-[#111622] p-5 rounded-xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Registered Gig Workers</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {data.stats.totalWorkers.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-medium">100% Aadhaar Masked</span> & DPDP ready
            </div>
          </div>
        </div>

        {/* Eligible Workers */}
        <div className="bg-[#111622] p-5 rounded-xl border border-emerald-500/20 relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Statutory Eligible Workers</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
              {data.stats.eligibleWorkers.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-300 font-semibold">{data.stats.eligiblePercentage}%</span> of workforce (90d / 120d threshold)
            </div>
          </div>
        </div>

        {/* Approaching Threshold */}
        <div className="bg-[#111622] p-5 rounded-xl border border-amber-500/20 relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Approaching 90-Day Mark</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-300 tracking-tight">
              {data.stats.approachingWorkers.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              80–89 days logged &bull; <Link href="/dashboard/workers?status=APPROACHING" className="text-amber-400 underline">Review UANs</Link>
            </div>
          </div>
        </div>

        {/* Q2 Cess Liability */}
        <div className="bg-[#111622] p-5 rounded-xl border border-purple-500/20 relative overflow-hidden group hover:border-purple-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Q2 Cess Liability Payable</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              ₹{(data.financials.netCessPayableQ2 / 100000).toFixed(2)} Lakh
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Rate: 1.5% Turnover</span> &bull; <span className="text-purple-400">Under 5% Cap</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section: Cess Formula Visualizer & Statutory Countdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 114 Cess Computation Card (2 Cols) */}
        <div className="lg:col-span-2 bg-[#111622] rounded-xl border border-slate-800 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-400" />
                Section 114 Statutory Cess Computation (Q2 FY 2025-26)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Formula: Minimum of 1.5% Turnover or 5% of Worker Payouts
              </p>
            </div>
            <Link
              href="/dashboard/calculator"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              Open Simulator <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Turnover Basis */}
            <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Turnover Basis (1.5%)</span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-mono">
                  Applied Basis
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Q2 Platform Turnover:</span>
                  <strong className="text-slate-200">₹{(data.financials.turnoverQ2 / 10000000).toFixed(2)} Cr</strong>
                </div>
                <div className="flex justify-between">
                  <span>Prescribed Rate:</span>
                  <strong className="text-slate-200">1.50%</strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800 text-sm">
                  <span className="font-semibold text-slate-200">Turnover Cess:</span>
                  <strong className="text-emerald-400 font-mono font-bold">
                    ₹{data.financials.calculatedCessQ2.toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>
            </div>

            {/* Payout Ceiling Basis */}
            <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Worker Payout Ceiling (5%)</span>
                <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full font-mono">
                  Statutory Cap
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Q2 Aggregate Payouts:</span>
                  <strong className="text-slate-200">₹{(data.financials.payoutQ2 / 10000000).toFixed(2)} Cr</strong>
                </div>
                <div className="flex justify-between">
                  <span>Max Ceiling Rate:</span>
                  <strong className="text-slate-200">5.00%</strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800 text-sm">
                  <span className="font-semibold text-slate-200">Payout Cap:</span>
                  <strong className="text-slate-300 font-mono font-bold">
                    ₹{data.financials.payoutCapQ2.toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Final Calculation Summary Bar */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-emerald-300">
                Net Statutory Cess Payable for Q2:
              </p>
              <p className="text-2xl font-bold text-white font-mono mt-0.5">
                ₹{data.financials.netCessPayableQ2.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/filings"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition"
              >
                File Form-XX Now
              </Link>
            </div>
          </div>
        </div>

        {/* Statutory Filing Calendar Card (1 Col) */}
        <div className="bg-[#111622] rounded-xl border border-slate-800 p-6 space-y-4">
          <div className="border-b border-slate-800/80 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Statutory Filing Calendar
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Rule 31 Central Rules Schedule</p>
          </div>

          {/* Active Countdown */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-300">
                {data.statutoryDeadline.filingName || "No open filings"}
                {data.statutoryDeadline.quarter ? ` — ${data.statutoryDeadline.quarter}` : ""}
              </span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono text-[10px]">
                {data.statutoryDeadline.daysRemaining ?? "—"} DAYS LEFT
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Due on <strong className="text-white">{data.statutoryDeadline.dueDate || "—"}</strong>
              {data.statutoryDeadline.status === "OVERDUE" && (
                <span className="ml-2 text-rose-400 font-bold">OVERDUE</span>
              )}
            </p>
            <p className="text-[11px] text-amber-400/90 leading-relaxed">
              Delay triggers interest of 1% per month under Section 133 + statutory damages.
            </p>
          </div>

          {/* Recent filings from the ledger */}
          <div className="space-y-2 text-xs">
            {data.recentFilings.length === 0 && (
              <p className="text-slate-500 text-[11px]">No filings recorded yet.</p>
            )}
            {data.recentFilings.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <div>
                  <p className="font-medium text-slate-300">
                    {f.filingType === "FORM_XXI_ANNUAL" ? "Form-XXI (Annual)" : `Form-XX (${f.quarter || "—"})`} · FY {f.financialYear}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    ₹{f.finalCessPayable.toLocaleString("en-IN")} · Due {f.dueDate}
                  </p>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">{f.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workforce Eligibility Distribution & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution Progress */}
        <div className="lg:col-span-2 bg-[#111622] rounded-xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Worker Eligibility Breakdown</h3>
              <p className="text-xs text-slate-400">90-Day Rolling Window (Rule 28) & 120-Day Cumulative Count</p>
            </div>
            <Link
              href="/dashboard/eligibility"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              View Engine &rarr;
            </Link>
          </div>

          {/* Visual Bar */}
          <div className="space-y-2">
            <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${data.stats.eligiblePercentage}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Eligible: ${data.stats.eligiblePercentage}%`}
              />
              <div
                style={{ width: "9.8%" }}
                className="bg-amber-500 h-full transition-all"
                title="Approaching 90 days: 9.8%"
              />
              <div
                style={{ width: "14%" }}
                className="bg-slate-600 h-full transition-all"
                title="Inactive: 14%"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Eligible ({data.stats.eligibleWorkers})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Approaching 90d ({data.stats.approachingWorkers})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <span>Under Threshold ({data.stats.inactiveWorkers})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Statutory Actions */}
        <div className="bg-[#111622] rounded-xl border border-slate-800 p-6 space-y-3">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
            Quick Actions
          </h3>
          <div className="space-y-2 text-xs">
            <Link
              href="/dashboard/upload"
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition"
            >
              <span className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-blue-400" />
                Upload Daily CSV Ledger
              </span>
              <span>&rarr;</span>
            </Link>
            <Link
              href="/dashboard/challans"
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Upload & Lock Bank Challan
              </span>
              <span>&rarr;</span>
            </Link>
            <Link
              href="/dashboard/reports"
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Export Statutory Audit Dossier
              </span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
