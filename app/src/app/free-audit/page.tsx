"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Percent,
  Lock,
  Download,
  Building,
  Users,
} from "lucide-react";

export default function FreeAuditToolPage() {
  const [form, setForm] = useState({
    companyName: "",
    contactEmail: "",
    contactPhone: "",
    sector: "LOGISTICS_DELIVERY",
    workerCount: "1200",
    annualTurnover: "45000000", // 4.5 Cr
    annualPayout: "26000000", // 2.6 Cr
    currentFilingPractices: "SPREADSHEETS",
  });

  const [loading, setLoading] = useState(false);
  const [scorecard, setScorecard] = useState<{
    complianceScore: number;
    riskRating: string;
    estimatedEligibleWorkers: number;
    estimatedAnnualCess: number;
    payoutCap: number;
    isCappedByPayout: boolean;
    potentialPenaltyRiskAnnual: number;
    identifiedGaps: string[];
    recommendations: string[];
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/free-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setScorecard(json.data.scorecard);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            Statutory Risk Evaluation Tool
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Gig Worker Social Security Compliance Audit
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Evaluate your platform’s exposure under the <strong className="text-slate-200">Code on Social Security 2020</strong> & Section 114 in under 60 seconds.
          </p>
        </div>

        {!scorecard ? (
          /* Form Card */
          <form
            onSubmit={handleSubmit}
            className="bg-[#111622] rounded-2xl border border-slate-800 p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in"
          >
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
                1. Platform & Corporate Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">Company / Platform Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FlashDeliver Technologies Pvt Ltd"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Aggregator Sector *</label>
                  <select
                    value={form.sector}
                    onChange={(e) => setForm({ ...form, sector: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    <option value="LOGISTICS_DELIVERY">Logistics & Delivery</option>
                    <option value="RIDE_HAILING">Ride-Hailing / Mobility</option>
                    <option value="FOOD_DELIVERY">Food Delivery</option>
                    <option value="MARKETPLACE_FREELANCE">Marketplace / Freelance</option>
                    <option value="HEALTHCARE_PERSONAL_SERVICES">Healthcare & Home Services</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">Work Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="compliance@yourcompany.com"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98..."
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
                2. Workforce & Financial Parameters
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">Active Gig Worker Count</label>
                  <input
                    type="number"
                    required
                    value={form.workerCount}
                    onChange={(e) => setForm({ ...form, workerCount: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Annual Platform Turnover (INR)</label>
                  <input
                    type="number"
                    required
                    value={form.annualTurnover}
                    onChange={(e) => setForm({ ...form, annualTurnover: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Annual Worker Payouts (INR)</label>
                  <input
                    type="number"
                    required
                    value={form.annualPayout}
                    onChange={(e) => setForm({ ...form, annualPayout: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-slate-300 mb-1">Current Statutory Filing Routine</label>
                <select
                  value={form.currentFilingPractices}
                  onChange={(e) => setForm({ ...form, currentFilingPractices: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                >
                  <option value="SPREADSHEETS">Internal Spreadsheets / Manual Logging</option>
                  <option value="NONE">No Formal Cess Mechanism Deployed Yet</option>
                  <option value="EXTERNAL_CA">Handled by External Advisory Firm</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <Link href="/" className="text-xs text-slate-400 hover:text-white">
                &larr; Back to Home
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition"
              >
                {loading ? "Evaluating Risk Exposure..." : "Generate Compliance Scorecard"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          /* Scorecard Results Card */
          <div className="bg-[#111622] rounded-2xl border border-slate-800 p-6 md:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Instant Compliance Evaluation
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">{form.companyName}</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase block">Compliance Score</span>
                  <strong className="text-2xl font-bold font-mono text-emerald-400">
                    {scorecard.complianceScore} / 100
                  </strong>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs">
                  {scorecard.riskRating}
                </div>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Estimated Eligible Workers</span>
                <strong className="text-xl text-white font-mono block mt-1">
                  {scorecard.estimatedEligibleWorkers} Workers
                </strong>
                <span className="text-[10px] text-slate-500">Based on 90-day activity model</span>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Annual Statutory Cess Obligation</span>
                <strong className="text-xl text-emerald-400 font-mono block mt-1">
                  ₹{scorecard.estimatedAnnualCess.toLocaleString("en-IN")}
                </strong>
                <span className="text-[10px] text-slate-500">
                  {scorecard.isCappedByPayout ? "5% Worker Payout Cap Applied" : "1.5% Turnover Rate"}
                </span>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Annual Default Penalty Risk</span>
                <strong className="text-xl text-rose-400 font-mono block mt-1">
                  ₹{scorecard.potentialPenaltyRiskAnnual.toLocaleString("en-IN")}
                </strong>
                <span className="text-[10px] text-slate-500">Interest + damages under Sec 133</span>
              </div>
            </div>

            {/* Identified Gaps */}
            {scorecard.identifiedGaps.length > 0 && (
              <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-rose-300 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> Statutory Deficiencies Identified
                </h4>
                <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                  {scorecard.identifiedGaps.map((gap, i) => (
                    <li key={i}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actionable Recommendations */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-2">
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Immediate Recommended Actions
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {scorecard.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">{i + 1}.</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action CTAs */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setScorecard(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                &larr; Recalculate with different numbers
              </button>
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
              >
                Onboard on GigCessHQ Platform <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
