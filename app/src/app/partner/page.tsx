"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  Users,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Shield,
  Search,
} from "lucide-react";

interface PartnerClient {
  id: string;
  legalName: string;
  sector: string;
  cin: string;
  activeWorkers: number;
  eligibleWorkers: number;
  nextFilingDue: string;
  complianceStatus: "COMPLIANT" | "ATTENTION_REQUIRED" | "OVERDUE";
  riskScore: number;
  cessLiabilityQ2: number;
}

export default function AdvisoryPartnerPortalPage() {
  const [clients, setClients] = useState<PartnerClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await fetch("/api/v1/partner/clients");
        const json = await res.json();
        if (json.success) {
          setClients(json.data.clients);
        }
      } catch {
        // Handled gracefully
      } finally {
        setLoading(false);
      }
    }
    loadClients();
  }, []);

  const filtered = clients.filter((c) =>
    c.legalName.toLowerCase().includes(search.toLowerCase()) ||
    c.sector.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Singhania & Partners LLP — Advisory Portal
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  Labour Law Advisory
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized multi-client management for aggregators under the Code on Social Security 2020.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
            >
              Back to Aggregator App <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Aggregated Overview KPI Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#111622] p-5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Total Retained Clients</span>
            <p className="text-2xl font-bold text-white mt-1">3 Aggregators</p>
            <span className="text-[10px] text-slate-500">Logistics, Mobility, Food</span>
          </div>
          <div className="bg-[#111622] p-5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Aggregated Workforce</span>
            <p className="text-2xl font-bold text-white mt-1">6,000 Gig Workers</p>
            <span className="text-[10px] text-emerald-400">4,540 Statutory Eligible</span>
          </div>
          <div className="bg-[#111622] p-5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Total Q2 Cess Monitored</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">₹17.42 Lakh</p>
            <span className="text-[10px] text-slate-500">All under 5% payout cap</span>
          </div>
          <div className="bg-[#111622] p-5 rounded-xl border border-amber-500/20">
            <span className="text-xs text-slate-400">Upcoming Oct 31 Filings</span>
            <p className="text-2xl font-bold text-amber-300 mt-1">3 Filings Due</p>
            <span className="text-[10px] text-amber-400">49 days remaining</span>
          </div>
        </div>

        {/* Client Search and Filter */}
        <div className="bg-[#111622] p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search client aggregator by legal name or sector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-400">{filtered.length} Aggregators</span>
        </div>

        {/* Client Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map((client) => (
            <div
              key={client.id}
              className="bg-[#111622] rounded-xl border border-slate-800 hover:border-indigo-500/40 transition p-6 space-y-4 shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{client.legalName}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">CIN: {client.cin}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      client.complianceStatus === "COMPLIANT"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : client.complianceStatus === "ATTENTION_REQUIRED"
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {client.complianceStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Eligible Workers</span>
                    <strong className="text-slate-200 font-mono">
                      {client.eligibleWorkers} / {client.activeWorkers}
                    </strong>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Q2 Cess Due</span>
                    <strong className="text-emerald-400 font-mono">
                      ₹{(client.cessLiabilityQ2 / 100000).toFixed(2)}L
                    </strong>
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
                  <span>Compliance Health Score:</span>
                  <strong className="text-white font-mono">{client.riskScore} / 100</strong>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[11px] text-slate-500">Next Due: {client.nextFilingDue}</span>
                <Link
                  href="/dashboard"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                >
                  Manage Client <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
