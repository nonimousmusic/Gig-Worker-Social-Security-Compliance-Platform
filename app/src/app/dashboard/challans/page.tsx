"use client";

import { useState, useEffect } from "react";
import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  Hash,
  Plus,
} from "lucide-react";
import { ChallanItem } from "@/lib/types";

export default function ChallanVaultPage() {
  const [challans, setChallans] = useState<ChallanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [openFilings, setOpenFilings] = useState<
    { id: string; label: string; finalCessPayable: number }[]
  >([]);

  const [form, setForm] = useState({
    filingId: "",
    challanNumber: "",
    bankName: "State Bank of India — Treasury Branch",
    utrNumber: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
  });
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function applyFilingsData(filings: {
    id: string;
    status: string;
    financialYear: string;
    quarter?: string;
    filingType: string;
    finalCessPayable: number;
    challanId?: string;
    challanNumber?: string;
    bankName?: string;
    utrNumber?: string;
    sha256Hash?: string;
    paymentDate?: string;
    challanVerified?: boolean;
    submittedAt?: string;
    challanUrl?: string;
  }[]) {
    // Filings still awaiting payment (DRAFT/SUBMITTED) for the deposit dropdown.
    const open = filings
      .filter((f) => f.status !== "PAID")
      .map((f) => ({
        id: f.id,
        label: `${f.filingType === "FORM_XXI_ANNUAL" ? "Form-XXI" : "Form-XX"}: ${f.quarter ? `${f.quarter} ` : ""}FY ${f.financialYear} | Cess: ₹${f.finalCessPayable.toLocaleString("en-IN")}`,
        finalCessPayable: f.finalCessPayable,
      }));

    setOpenFilings(open);
    setForm((prev) => {
      const first = open[0];
      return {
        ...prev,
        filingId: first?.id || "",
        amount: first ? String(first.finalCessPayable) : prev.amount,
      };
    });

    // Paid filings carry their locked challan (bank, UTR, hash) from the API.
    const paidFilings = filings.filter((f) => f.status === "PAID");
    const list: ChallanItem[] = paidFilings.map((f) => ({
      id: f.challanId || `chl-${f.id}`,
      filingId: f.id,
      challanNumber: f.challanNumber || "Not yet deposited",
      bankName: f.bankName || "—",
      utrNumber: f.utrNumber || "—",
      amount: f.finalCessPayable,
      paymentDate: f.paymentDate || (f.submittedAt || "").split("T")[0] || "—",
      verified: f.challanVerified ?? true,
      lockedAt: f.submittedAt || new Date().toISOString(),
      sha256Hash: f.sha256Hash || "—",
      documentUrl: f.challanUrl || "",
    }));
    setChallans(list);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/filings");
        const json = await res.json();
        if (!cancelled && json.success) {
          applyFilingsData(json.data.filings);
        }
      } catch (err) {
        console.error("Challans load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadChallans() {
    try {
      const res = await fetch("/api/v1/filings");
      const json = await res.json();
      if (json.success) applyFilingsData(json.data.filings);
    } catch (err) {
      console.error("Challans reload failed:", err);
    }
  }

  async function handleChallanSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.filingId) {
      setErrorMsg("No open filing available to lock. Create or submit a filing first.");
      return;
    }
    setUploading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/v1/filings/${form.filingId}/challan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challanNumber: form.challanNumber,
          bankName: form.bankName,
          utrNumber: form.utrNumber,
          amount: parseFloat(form.amount),
          paymentDate: form.paymentDate,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error?.message || "Failed to lock challan");
        setUploading(false);
        return;
      }
      setIsUploadModalOpen(false);
      reloadChallans();
    } catch (err) {
      console.error("Challan lock request failed:", err);
      setErrorMsg("Network error during challan lock");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Lock className="w-6 h-6 text-emerald-400" />
            Statutory Challan Vault & Audit Lock
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable repository for Treasury bank challans, UTR receipts, and cryptographic SHA-256 compliance locks.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" />
          Deposit Challan & Lock
        </button>
      </div>

      {/* Security Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white block">Audit-Proof Ledger Verification</span>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Once verified, challan payment records cannot be tampered with or deleted, satisfying Rule 32 Central Rules.
            </p>
          </div>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono shrink-0">
          SHA-256 ENABLED
        </span>
      </div>

      {/* Challans List */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-center py-8 text-slate-500 text-xs">Loading verified challan ledger...</p>
        ) : challans.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-[#111622] rounded-xl border border-slate-800">
            No bank challans recorded yet. Use the button above to upload and lock payment for an open filing.
          </div>
        ) : (
          challans.map((c) => (
            <div
              key={c.id}
              className="bg-[#111622] rounded-xl border border-slate-800 p-5 hover:border-slate-700 transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">{c.challanNumber}</h3>
                    <p className="text-[11px] text-slate-400">{c.bankName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">Amount Paid:</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    ₹{c.amount.toLocaleString("en-IN")}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    VERIFIED & LOCKED
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px] block">Bank UTR Number:</span>
                  <strong className="text-slate-200 font-mono">{c.utrNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Date of Deposit:</span>
                  <strong className="text-slate-200">{c.paymentDate}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Lock Timestamp:</span>
                  <strong className="text-slate-200">{new Date(c.lockedAt).toLocaleString()}</strong>
                </div>
              </div>

              {/* SHA-256 Ledger Hash */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center gap-2 text-[11px] font-mono text-slate-400 overflow-x-auto">
                <Hash className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-500 shrink-0">SHA-256:</span>
                <span className="truncate text-slate-300">{c.sha256Hash}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Challan Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111622] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                Deposit Challan & Lock Filing
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-white text-lg">
                &times;
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleChallanSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Target Filing Return *</label>
                <select
                  value={form.filingId}
                  onChange={(e) => {
                    const selected = openFilings.find((o) => o.id === e.target.value);
                    setForm({
                      ...form,
                      filingId: e.target.value,
                      amount: selected ? String(selected.finalCessPayable) : form.amount,
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {openFilings.length === 0 && (
                    <option value="">No open filings — create one from the Filings page</option>
                  )}
                  {openFilings.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Bank Challan Reference Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CHL-2025-Q2-78192"
                  value={form.challanNumber}
                  onChange={(e) => setForm({ ...form, challanNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Bank UTR Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="SBIN00..."
                    value={form.utrNumber}
                    onChange={(e) => setForm({ ...form, utrNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Amount Paid (INR) *</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-[11px] leading-relaxed">
                Caution: Once locked, this filing return cannot be modified without a formal rectification application to the Social Security Board.
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !form.filingId}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 disabled:opacity-50"
                >
                  {uploading ? "Locking..." : "Verify & Lock Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
