"use client";

import { useState } from "react";
import {
  Settings,
  Building2,
  Users,
  Shield,
  Key,
  Save,
  Mail,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import { mockOrganization } from "@/lib/data-store";

export default function OrganizationSettingsPage() {
  const [org, setOrg] = useState(mockOrganization);
  const [team, setTeam] = useState([
    { id: "usr-1", name: "Arjun Verma", email: "compliance@quickmove.in", role: "ADMIN", status: "ACTIVE" },
    { id: "usr-2", name: "Priya Sundaram", email: "legal@quickmove.in", role: "COMPLIANCE_OFFICER", status: "ACTIVE" },
    { id: "usr-3", name: "Singhania & Partners", email: "audit@singhania.law", role: "EXTERNAL_AUDITOR", status: "ACTIVE" },
  ]);
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" />
          Organization & Compliance Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Corporate entity registration, aggregator sector mapping, and compliance team role management.
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Organization settings saved successfully.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Corporate Profile Form (2 Cols) */}
        <form onSubmit={handleSave} className="lg:col-span-2 bg-[#111622] rounded-xl border border-slate-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" /> Corporate Legal Entity
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Company Legal Name *</label>
              <input
                type="text"
                required
                value={org.legalName}
                onChange={(e) => setOrg({ ...org, legalName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Aggregator Sector *</label>
              <select
                value={org.sector}
                onChange={(e) => setOrg({ ...org, sector: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
              >
                <option value="LOGISTICS_DELIVERY">Logistics & Delivery</option>
                <option value="RIDE_HAILING">Ride-Hailing</option>
                <option value="FOOD_DELIVERY">Food Delivery</option>
                <option value="MARKETPLACE_FREELANCE">Marketplace / Freelance</option>
                <option value="HEALTHCARE_PERSONAL_SERVICES">Healthcare & Personal Services</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Corporate Identification Number (CIN) *</label>
              <input
                type="text"
                required
                value={org.cin}
                onChange={(e) => setOrg({ ...org, cin: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Goods & Services Tax (GSTIN) *</label>
              <input
                type="text"
                required
                value={org.gstin}
                onChange={(e) => setOrg({ ...org, gstin: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-slate-400 mb-1">Registered Corporate Address</label>
            <textarea
              rows={2}
              value={org.registeredAddress}
              onChange={(e) => setOrg({ ...org, registeredAddress: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        </form>

        {/* Team Roles (1 Col) */}
        <div className="bg-[#111622] rounded-xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> Compliance Team
            </h3>
            <button className="text-xs text-blue-400 hover:underline flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5" /> Invite
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {team.map((m) => (
              <div key={m.id} className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-white">{m.name}</strong>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {m.role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{m.email}</p>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            Roles supported: <strong className="text-slate-200">Admin</strong> (full management), <strong className="text-slate-200">Compliance Officer</strong> (filings & declarations), <strong className="text-slate-200">External Auditor</strong> (read-only audit dossier access).
          </div>
        </div>
      </div>
    </div>
  );
}
