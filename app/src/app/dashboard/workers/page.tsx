"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  Download,
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Filter,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";
import { WorkerRecord } from "@/lib/data-store";

export default function WorkersDirectoryPage() {
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<WorkerRecord | null>(null);

  // Form states for Add Worker
  const [newWorker, setNewWorker] = useState({
    aggregatorWorkerId: "",
    fullName: "",
    aadhaarNumber: "",
    uan: "",
    phone: "",
    sector: "LOGISTICS_DELIVERY",
    state: "DELHI",
  });
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  async function fetchWorkers() {
    try {
      const url = new URL("/api/v1/workers", window.location.origin);
      if (search) url.searchParams.set("search", search);
      if (statusFilter !== "ALL") url.searchParams.set("status", statusFilter);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setWorkers(json.data.workers);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWorkers();
  }, [search, statusFilter]);

  async function handleAddWorker(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");

    try {
      const res = await fetch("/api/v1/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWorker),
      });
      const json = await res.json();
      if (!json.success) {
        setAddError(json.error?.message || "Failed to add worker");
        setAddLoading(false);
        return;
      }
      setIsAddModalOpen(false);
      setNewWorker({
        aggregatorWorkerId: "",
        fullName: "",
        aadhaarNumber: "",
        uan: "",
        phone: "",
        sector: "LOGISTICS_DELIVERY",
        state: "DELHI",
      });
      fetchWorkers();
    } catch {
      setAddError("Network error adding worker");
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            Worker Compliance Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Section 113 Registration & Rule 28 Day Tracking. Aadhaar numbers strictly masked under DPDP Act 2023.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/api/v1/exports/workers"
            download
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </a>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Worker
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#111622] p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, ID, UAN, Aadhaar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs w-full md:w-auto overflow-x-auto">
          {[
            { id: "ALL", label: "All Workers" },
            { id: "ELIGIBLE", label: "Eligible (90d/120d)" },
            { id: "APPROACHING", label: "Approaching (80-89d)" },
            { id: "INACTIVE", label: "Inactive" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-md transition shrink-0 ${
                statusFilter === tab.id
                  ? "bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Workers Table */}
      <div className="bg-[#111622] rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Worker ID & Name</th>
                <th className="py-3 px-4">Aadhaar (Masked)</th>
                <th className="py-3 px-4">UAN Status</th>
                <th className="py-3 px-4">90-Day Window</th>
                <th className="py-3 px-4">Cumulative FY</th>
                <th className="py-3 px-4">Statutory Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading workers...
                  </td>
                </tr>
              ) : workers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No gig workers matched your search criteria.
                  </td>
                </tr>
              ) : (
                workers.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{w.fullName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{w.aggregatorWorkerId}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300">
                        <Shield className="w-3 h-3 text-emerald-400" />
                        {w.maskedAadhaar}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px]">
                      {w.uan ? (
                        <span className="text-slate-300">{w.uan}</span>
                      ) : (
                        <span className="text-amber-400 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          Pending Linkage
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{w.daysInLast90}d</span>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, (w.daysInLast90 / 90) * 100)}%` }}
                            className={`h-full ${
                              w.daysInLast90 >= 90 ? "bg-emerald-500" : w.daysInLast90 >= 80 ? "bg-amber-500" : "bg-slate-600"
                            }`}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-300">{w.cumulativeDaysFY} days</span>
                      {w.crossPlatformDeclared && (
                        <span className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          +{w.otherPlatformDays}d Multi-App
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {w.status === "ELIGIBLE" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Eligible
                        </span>
                      ) : w.status === "APPROACHING" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          Approaching (80-89d)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedWorker(w)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition"
                      >
                        Profile &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Worker Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111622] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" /> Add Gig Worker
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white text-lg">
                &times;
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddWorker} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Aggregator Worker ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QM-DEL-9102"
                  value={newWorker.aggregatorWorkerId}
                  onChange={(e) => setNewWorker({ ...newWorker, aggregatorWorkerId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Full Name (as per Aadhaar) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newWorker.fullName}
                  onChange={(e) => setNewWorker({ ...newWorker, fullName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  12-Digit Aadhaar Number *{" "}
                  <span className="text-[10px] text-emerald-400">(Never stored raw — auto-masked to XXXX-XXXX-1234)</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  placeholder="12-digit UID"
                  value={newWorker.aadhaarNumber}
                  onChange={(e) => setNewWorker({ ...newWorker, aadhaarNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">e-Shram / UAN</label>
                  <input
                    type="text"
                    placeholder="12-digit UAN"
                    value={newWorker.uan}
                    onChange={(e) => setNewWorker({ ...newWorker, uan: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98..."
                    value={newWorker.phone}
                    onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500"
                >
                  {addLoading ? "Saving..." : "Register Worker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Worker Profile Slideout/Modal */}
      {selectedWorker && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111622] border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{selectedWorker.fullName}</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedWorker.aggregatorWorkerId}</p>
              </div>
              <button onClick={() => setSelectedWorker(null)} className="text-slate-400 hover:text-white text-lg">
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Masked Aadhaar (DPDP)</span>
                <strong className="text-white font-mono text-sm">{selectedWorker.maskedAadhaar}</strong>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">e-Shram / UAN</span>
                <strong className="text-slate-200 font-mono text-sm">{selectedWorker.uan || "Pending"}</strong>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Days Active (Last 90d)</span>
                <strong className="text-emerald-400 text-sm">{selectedWorker.daysInLast90} Days</strong>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Cumulative FY Days</span>
                <strong className="text-purple-400 text-sm">{selectedWorker.cumulativeDaysFY} Days</strong>
              </div>
            </div>

            {selectedWorker.crossPlatformDeclared && (
              <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-lg text-xs space-y-1">
                <span className="font-semibold text-indigo-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Rule 28(2) Multi-App Self-Declaration
                </span>
                <p className="text-slate-400 text-[11px]">
                  Worker has declared {selectedWorker.otherPlatformDays} days on other platforms, aggregated toward Section 114 statutory coverage.
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedWorker(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
