"use client";

import { useState, useEffect } from "react";
import {
  FileCheck,
  Download,
  Printer,
  ShieldCheck,
  Building,
  CheckCircle2,
  Lock,
  Hash,
} from "lucide-react";

export default function StatutoryReportsPage() {
  const [report, setReport] = useState<{
    reportGeneratedAt: string;
    statutoryReference: string;
    organization: {
      legalName: string;
      cin: string;
      gstin: string;
      sector: string;
      registeredAddress: string;
    };
    summary: {
      totalRegisteredWorkers: number;
      eligibleWorkersCount: number;
      totalFilingsCompleted: number;
      totalCessPaidINR: number;
      complianceScore: number;
      auditStatus: string;
    };
    filings: Array<{
      id: string;
      quarter?: string;
      financialYear: string;
      filingType: string;
      turnoverAmount: number;
      finalCessPayable: number;
      status: string;
      challanNumber?: string;
    }>;
    immutableAuditTrail: Array<{
      id: string;
      action: string;
      actorEmail?: string;
      createdAt?: string;
    }>;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch("/api/v1/exports/audit-report");
        const json = await res.json();
        if (json.success) {
          setReport(json.data);
        }
      } catch {
        // Handled gracefully
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, []);

  function handlePrint() {
    window.print();
  }

  if (loading || !report) {
    return (
      <div className="text-center py-12 text-slate-500 text-xs">
        Generating statutory audit dossier...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-emerald-400" />
            Statutory Compliance Audit Dossier
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Section 114 & Rule 32 Certified Report ready for Ministry of Labour & Employment (MoLE) and auditor inspection.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/api/v1/exports/workers"
            download
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Workers CSV
          </a>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow flex items-center gap-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Dossier
          </button>
        </div>
      </div>

      {/* Main Printable Dossier Card */}
      <div className="bg-[#111622] rounded-xl border border-slate-800 p-8 space-y-6 text-xs text-slate-300 print:bg-white print:text-black print:p-0">
        {/* Dossier Header */}
        <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block mb-1">
              Statutory Form-XX / Section 114 Certified Dossier
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">{report.organization.legalName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              CIN: {report.organization.cin} &bull; GSTIN: {report.organization.gstin}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{report.organization.registeredAddress}</p>
          </div>

          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Compliance Status</span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> {report.summary.auditStatus}
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Generated: {new Date(report.reportGeneratedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Total Registered Workers</span>
            <strong className="text-lg text-white font-mono">{report.summary.totalRegisteredWorkers}</strong>
          </div>
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Statutory Eligible (90d/120d)</span>
            <strong className="text-lg text-emerald-400 font-mono">{report.summary.eligibleWorkersCount}</strong>
          </div>
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Returns Paid & Locked</span>
            <strong className="text-lg text-white font-mono">{report.summary.totalFilingsCompleted}</strong>
          </div>
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Total Cess Remitted (YTD)</span>
            <strong className="text-lg text-emerald-400 font-mono">
              ₹{report.summary.totalCessPaidINR.toLocaleString("en-IN")}
            </strong>
          </div>
        </div>

        {/* Filings Breakdown */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
            Statutory Filings Ledger (Form-XX / Form-XXI)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Declared Turnover</th>
                  <th className="py-2.5 px-3">Cess Remitted</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Challan Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                {report.filings.map((f) => (
                  <tr key={f.id}>
                    <td className="py-2.5 px-3 font-sans text-white font-medium">{f.quarter || "Annual"} FY {f.financialYear}</td>
                    <td className="py-2.5 px-3">{f.filingType}</td>
                    <td className="py-2.5 px-3">₹{(f.turnoverAmount / 10000000).toFixed(2)} Cr</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">₹{f.finalCessPayable.toLocaleString("en-IN")}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400">
                        {f.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{f.challanNumber || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Immutable Audit Log Trail */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            Immutable Audit Trail (DPDP Act & Rule 32 Verification)
          </h3>
          <div className="space-y-1.5 font-mono text-[11px]">
            {report.immutableAuditTrail.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-400"
              >
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-emerald-400" />
                  <strong className="text-slate-200">{log.action}</strong>
                  <span className="text-slate-500">by {log.actorEmail}</span>
                </div>
                <span className="text-slate-500 text-[10px]">
                  {new Date(log.createdAt || "").toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
