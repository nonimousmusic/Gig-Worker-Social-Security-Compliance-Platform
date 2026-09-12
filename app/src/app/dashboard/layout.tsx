"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Users,
  UploadCloud,
  Clock,
  FileText,
  Calculator,
  Lock,
  Bell,
  FileCheck,
  Settings,
  Briefcase,
  ExternalLink,
  ChevronDown,
  AlertTriangle,
  LogOut,
  Building2,
} from "lucide-react";
import LinkNext from "next/link";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/workers", label: "Worker Directory", icon: Users },
  { href: "/dashboard/upload", label: "CSV Ingestion Studio", icon: UploadCloud },
  { href: "/dashboard/eligibility", label: "Eligibility Engine", icon: Clock },
  { href: "/dashboard/filings", label: "Statutory Filings", icon: FileText },
  { href: "/dashboard/calculator", label: "Section 114 Simulator", icon: Calculator },
  { href: "/dashboard/challans", label: "Challan Vault", icon: Lock },
  { href: "/dashboard/alerts", label: "Alerts & Deadlines", icon: Bell },
  { href: "/dashboard/reports", label: "Audit Reports", icon: FileCheck },
  { href: "/dashboard/settings", label: "Organization Settings", icon: Settings },
];

interface ShellData {
  orgName: string;
  orgDetail: string;
  userName: string;
  userEmail: string;
  userRole: string;
  deadline: {
    filingName: string | null;
    quarter: string | null;
    dueDate: string | null;
    daysRemaining: number | null;
    status: string;
  } | null;
  unreadCount: number;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [shell, setShell] = useState<ShellData>({
    orgName: "My Organization",
    orgDetail: "",
    userName: "Account",
    userEmail: "",
    userRole: "",
    deadline: null,
    unreadCount: 0,
  });

  // Best-effort shell personalization; static fallbacks above stay on failure.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, overviewRes, notifRes] = await Promise.all([
          fetch("/api/v1/auth/me"),
          fetch("/api/v1/dashboard/overview"),
          fetch("/api/v1/notifications"),
        ]);
        if (cancelled) return;
        const [me, overview, notif] = await Promise.all([meRes.json(), overviewRes.json(), notifRes.json()]);
        setShell((prev) => ({
          ...prev,
          orgName: me?.success ? me.data.organization.legalName : prev.orgName,
          orgDetail: me?.success
            ? [me.data.organization.cin, me.data.organization.sector].filter(Boolean).join(" · ")
            : prev.orgDetail,
          userName: me?.success ? me.data.user.fullName : prev.userName,
          userEmail: me?.success ? me.data.user.email : prev.userEmail,
          userRole: me?.success ? me.data.user.role : prev.userRole,
          deadline: overview?.success ? overview.data.statutoryDeadline : prev.deadline,
          unreadCount: notif?.success ? notif.data.unreadCount || 0 : prev.unreadCount,
        }));
      } catch (err) {
        console.error("Dashboard shell load failed:", err);
        // Shell keeps its static fallbacks.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const initials = shell.userName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const deadline = shell.deadline;
  const showBanner = !!deadline && !!deadline.dueDate;
  const overdue = deadline?.status === "OVERDUE";

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Statutory Deadline Banner (live data; hidden when nothing is open) */}
      {showBanner && (
      <div className={`border-b px-4 py-2 text-xs flex items-center justify-between z-50 ${
        overdue
          ? "bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-rose-950/80 border-rose-500/30 text-rose-200"
          : "bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-amber-950/80 border-amber-500/30 text-amber-200"
      }`}>
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <AlertTriangle className={`w-4 h-4 shrink-0 animate-pulse ${overdue ? "text-rose-400" : "text-amber-400"}`} />
          <span className={`font-semibold ${overdue ? "text-rose-300" : "text-amber-300"}`}>
            {overdue ? "OVERDUE:" : "STATUTORY DEADLINE:"}
          </span>
          <span>
            {deadline.filingName}{deadline.quarter ? ` (${deadline.quarter})` : ""} due{" "}
            {overdue ? "" : `in `}
            <strong className={`font-bold ${overdue ? "text-rose-100" : "text-amber-100"}`}>
              {overdue ? `${deadline.daysRemaining ?? "—"} days ago` : `${deadline.daysRemaining ?? "—"} days`}
            </strong>{" "}
            ({deadline.dueDate}). Section 114 cess deposit required.
          </span>
          <LinkNext
            href="/dashboard/filings"
            className={`ml-auto underline hover:text-white font-medium shrink-0 flex items-center gap-1 ${overdue ? "text-rose-300" : "text-amber-300"}`}
          >
            File Now &rarr;
          </LinkNext>
        </div>
      </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-[#111622] border-r border-slate-800 flex flex-col shrink-0">
          {/* Org Header */}
          <div className="p-4 border-b border-slate-800/80">
            <LinkNext href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  GigCessHQ
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded font-mono">v2.4</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[140px]">{shell.orgName}</p>
              </div>
            </LinkNext>
          </div>

          {/* Aggregator Badge */}
          <div className="mx-3 mt-3 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[11px] font-medium text-slate-300">{shell.orgDetail || "Aggregator"}</p>
                <p className="text-[10px] text-slate-500">Tenant workspace</p>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              const showBadge = item.href === "/dashboard/alerts" && shell.unreadCount > 0;
              return (
                <LinkNext
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {showBadge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {shell.unreadCount > 9 ? "9+" : shell.unreadCount}
                    </span>
                  )}
                </LinkNext>
              );
            })}
          </nav>

          {/* Bottom Portals */}
          <div className="p-3 border-t border-slate-800 space-y-1 bg-slate-900/40">
            <LinkNext
              href="/partner"
              className="flex items-center justify-between px-3 py-2 rounded-md text-xs text-indigo-300 hover:bg-indigo-950/30 border border-indigo-500/20"
            >
              <span className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5" />
                Partner Portal
              </span>
              <ExternalLink className="w-3 h-3 text-indigo-400" />
            </LinkNext>
            <LinkNext
              href="/free-audit"
              className="flex items-center justify-between px-3 py-2 rounded-md text-xs text-amber-300 hover:bg-amber-950/30 border border-amber-500/20"
            >
              <span className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                Free Risk Audit Tool
              </span>
              <ExternalLink className="w-3 h-3 text-amber-400" />
            </LinkNext>
          </div>

          {/* User Footer */}
          <div className="p-3 border-t border-slate-800 relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/60 transition text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-xs text-white">
                  {initials}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-slate-200 truncate">{shell.userName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{shell.userRole || "Member"}</p>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute bottom-16 left-3 right-3 bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
                <div className="px-2 py-1.5 border-b border-slate-800 text-[11px] text-slate-400">
                  Logged in as <strong className="text-slate-200">{shell.userEmail || shell.userName}</strong>
                </div>
                <LinkNext
                  href="/dashboard/settings"
                  className="flex items-center gap-2 px-2 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-md mt-1"
                >
                  <Settings className="w-3.5 h-3.5" /> Organization Settings
                </LinkNext>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs text-rose-400 hover:bg-rose-950/20 rounded-md"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#0B0F17] p-6">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
