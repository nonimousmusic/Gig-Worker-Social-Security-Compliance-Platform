"use client";

import { useState } from "react";
import {
  Calculator,
  Percent,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { calculateContribution } from "@/lib/contribution-calc";
import { calculatePenalty } from "@/lib/penalty-calc";

export default function Section114SimulatorPage() {
  const [turnoverCr, setTurnoverCr] = useState(40); // 40 Crores
  const [payoutsCr, setPayoutsCr] = useState(22); // 22 Crores
  const [ratePercent, setRatePercent] = useState(1.5);
  const [includeStateCess, setIncludeStateCess] = useState(false);

  // Penalty tab state
  const [monthsLate, setMonthsLate] = useState(2);

  const turnoverRupees = turnoverCr * 10000000;
  const payoutsRupees = payoutsCr * 10000000;

  const result = calculateContribution({
    annualTurnover: turnoverRupees,
    totalWorkerPayouts: payoutsRupees,
    ratePercentage: ratePercent,
  });

  const stateCessAmount = includeStateCess ? payoutsRupees * 0.01 : 0; // 1% state overlay
  const totalCessPayable = result.finalObligation.amount + stateCessAmount;

  // Hypothetical due date N months ago — the penalty below is illustrative,
  // not tied to a real filing.
  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() - monthsLate);
  const penalty = calculatePenalty(totalCessPayable, dueDate, new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Calculator className="w-6 h-6 text-emerald-400" />
          Section 114 Statutory Cess Simulator
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Interactive simulation engine for statutory social security contribution calculations & ceiling optimization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column (1 Col) */}
        <div className="bg-[#111622] rounded-xl border border-slate-800 p-6 space-y-6">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Percent className="w-4 h-4 text-emerald-400" /> Simulation Parameters
          </h3>

          {/* Turnover Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Platform Turnover</span>
              <strong className="text-white font-mono">₹{turnoverCr} Crores</strong>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={turnoverCr}
              onChange={(e) => setTurnoverCr(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>₹1 Cr</span>
              <span>₹50 Cr</span>
              <span>₹100 Cr</span>
            </div>
          </div>

          {/* Worker Payouts Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Aggregate Worker Payouts</span>
              <strong className="text-white font-mono">₹{payoutsCr} Crores</strong>
            </div>
            <input
              type="range"
              min="1"
              max="80"
              step="1"
              value={payoutsCr}
              onChange={(e) => setPayoutsCr(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>₹1 Cr</span>
              <span>₹40 Cr</span>
              <span>₹80 Cr</span>
            </div>
          </div>

          {/* Cess Rate Selector */}
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-medium block">
              Aggregator Category Cess Rate (1.0% – 2.0%)
            </label>
            <div className="grid grid-cols-5 gap-1.5 text-xs font-mono">
              {[1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setRatePercent(rate)}
                  className={`py-2 rounded-lg border font-semibold transition ${
                    ratePercent === rate
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          {/* State Overlay Checkbox */}
          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={includeStateCess}
                onChange={(e) => setIncludeStateCess(e.target.checked)}
                className="mt-0.5 accent-emerald-500"
              />
              <div>
                <span className="text-slate-200 font-medium">Include State-Level Overlay</span>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Adds 1.0% state welfare fund contribution (e.g. Karnataka Gig Workers Act / Rajasthan Platform Based Gig Workers Act).
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Results & Visualizer (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Comparison Card */}
          <div className="bg-[#111622] rounded-xl border border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Statutory Section 114 Comparison
              </h3>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                {result.finalObligation.basisUsed === "TURNOVER_RATE" ? "Turnover Basis Applied" : "5% Cap Applied"}
              </span>
            </div>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className={`p-4 rounded-xl border transition ${
                  result.finalObligation.basisUsed === "TURNOVER_RATE"
                    ? "bg-emerald-950/20 border-emerald-500/40"
                    : "bg-slate-900 border-slate-800 opacity-75"
                }`}
              >
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-300">Turnover Basis ({ratePercent}%)</span>
                  {result.finalObligation.basisUsed === "TURNOVER_RATE" && (
                    <span className="text-[10px] text-emerald-400 font-bold">APPLIED</span>
                  )}
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  ₹{result.turnoverBasis.amount.toLocaleString("en-IN")}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {ratePercent}% of ₹{turnoverCr} Cr Platform Turnover
                </p>
              </div>

              <div
                className={`p-4 rounded-xl border transition ${
                  result.finalObligation.basisUsed === "WORKER_PAYMENT_5PCT_CEILING"
                    ? "bg-emerald-950/20 border-emerald-500/40"
                    : "bg-slate-900 border-slate-800 opacity-75"
                }`}
              >
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-300">Worker Payout Cap (5%)</span>
                  {result.finalObligation.basisUsed === "WORKER_PAYMENT_5PCT_CEILING" && (
                    <span className="text-[10px] text-emerald-400 font-bold">APPLIED</span>
                  )}
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  ₹{result.workerPaymentBasis.amount.toLocaleString("en-IN")}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  5.0% statutory maximum on ₹{payoutsCr} Cr Worker Payouts
                </p>
              </div>
            </div>

            {/* Total Cess Payable Highlight */}
            <div className="p-5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 block">Total Statutory Liability:</span>
                <span className="text-3xl font-bold text-emerald-400 font-mono">
                  ₹{totalCessPayable.toLocaleString("en-IN")}
                </span>
                {includeStateCess && (
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    (Includes ₹{stateCessAmount.toLocaleString("en-IN")} State Welfare Fund overlay)
                  </span>
                )}
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-400 block">Cap Optimization Savings:</span>
                <span className="text-sm font-bold text-white font-mono">
                  {result.finalObligation.basisUsed === "WORKER_PAYMENT_5PCT_CEILING"
                    ? `₹${result.finalObligation.savings.toLocaleString("en-IN")}`
                    : "₹0 (Below 5% cap)"}
                </span>
              </div>
            </div>
          </div>

          {/* Late Penalty & Interest Compounding Tab */}
          <div className="bg-[#111622] rounded-xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Section 133 Late Payment Penalty Estimator
                </h3>
                <p className="text-xs text-slate-400">1% Simple Interest per month of delay</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Illustrative estimate against a hypothetical due date.</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Delay:</span>
                <select
                  value={monthsLate}
                  onChange={(e) => setMonthsLate(parseInt(e.target.value, 10))}
                  className="bg-slate-900 border border-slate-800 rounded p-1 text-white font-mono"
                >
                  <option value={1}>1 Month Overdue</option>
                  <option value={2}>2 Months Overdue</option>
                  <option value={3}>3 Months Overdue</option>
                  <option value={6}>6 Months Overdue</option>
                  <option value={12}>12 Months (1 Year Overdue)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Accrued Interest (1%/mo)</span>
                <strong className="text-amber-300 font-mono text-base block mt-0.5">
                  ₹{penalty.penaltyAmount.toLocaleString("en-IN")}
                </strong>
                <span className="text-[10px] text-slate-500">Simple interest accrued</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Max Statutory Damages</span>
                <strong className="text-rose-400 font-mono text-base block mt-0.5">
                  ₹{totalCessPayable.toLocaleString("en-IN")}
                </strong>
                <span className="text-[10px] text-slate-500">Up to 100% under Sec 133</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Total Default Exposure</span>
                <strong className="text-white font-mono text-base block mt-0.5">
                  ₹{(totalCessPayable + penalty.penaltyAmount).toLocaleString("en-IN")}
                </strong>
                <span className="text-[10px] text-slate-500">Cess + Interest</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
