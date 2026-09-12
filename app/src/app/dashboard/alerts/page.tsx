"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  ExternalLink,
  Shield,
} from "lucide-react";
import { NotificationItem } from "@/lib/data-store";

export default function AlertsNotificationsPage() {
  const [alerts, setAlerts] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAlerts() {
    try {
      const res = await fetch("/api/v1/notifications");
      const json = await res.json();
      if (json.success) {
        setAlerts(json.data.notifications);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  async function handleMarkAllRead() {
    await fetch("/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    loadAlerts();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400" />
            Statutory Alerts & Compliance Notifications
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated statutory deadline warnings, worker 80-day threshold triggers, and regulatory gazette advisories.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition self-start sm:self-auto"
        >
          Mark all as read
        </button>
      </div>

      {/* Alerts Stream */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-center py-8 text-slate-500 text-xs">Loading compliance alerts...</p>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-5 rounded-xl border transition ${
                alert.read
                  ? "bg-[#111622] border-slate-800 text-slate-300"
                  : "bg-slate-900/90 border-amber-500/30 text-white shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      alert.type === "STATUTORY_DEADLINE"
                        ? "bg-amber-500/15 text-amber-400"
                        : alert.type === "WORKER_THRESHOLD"
                        ? "bg-blue-500/15 text-blue-400"
                        : alert.type === "PAYMENT_CONFIRMATION"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-purple-500/15 text-purple-400"
                    }`}
                  >
                    {alert.type === "STATUTORY_DEADLINE" ? (
                      <Calendar className="w-4 h-4" />
                    ) : alert.type === "WORKER_THRESHOLD" ? (
                      <Clock className="w-4 h-4" />
                    ) : alert.type === "PAYMENT_CONFIRMATION" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Shield className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">{alert.title}</h3>
                      {!alert.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                      {alert.message}
                    </p>
                    <span className="text-[10px] text-slate-500 block font-mono mt-1">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {alert.actionUrl && (
                  <Link
                    href={alert.actionUrl}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center gap-1 transition"
                  >
                    <span>Action</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
