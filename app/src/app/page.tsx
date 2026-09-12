import Link from "next/link";
import {
  Shield,
  Users,
  Calendar,
  FileText,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  BarChart3,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-text-primary">GigCessHQ</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
            <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-text-primary transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-text-primary transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost">Log In</Link>
            <Link href="/register" className="btn-primary">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-500/10 rounded-full blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium mb-8 animate-fade-in">
              <Zap className="w-4 h-4" />
              Code on Social Security, 2020 — Central Rules 2026 Compliant
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 animate-slide-up">
              Never Miss a
              <span className="gradient-text"> Gig Worker Compliance</span> Deadline Again
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              Track e-Shram registrations, calculate 90/120-day eligibility thresholds,
              prepare Form-XX/XXI filings, and stay ahead of statutory penalties —
              all in one platform built for Indian aggregators.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Link href="/free-audit" className="btn-primary text-base px-8 py-3.5">
                Free Compliance Check <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/register" className="btn-secondary text-base px-8 py-3.5">
                Start Free Trial
              </Link>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto animate-slide-up" style={{ animationDelay: "0.3s" }}>
            {[
              { value: "₹1L+", label: "Per worker penalty for non-registration", icon: AlertTriangle },
              { value: "12%", label: "Annual interest on late contributions", icon: Clock },
              { value: "90 days", label: "Single-aggregator eligibility threshold", icon: Calendar },
              { value: "2 filings", label: "Annual statutory returns (Form-XX/XXI)", icon: FileText },
            ].map((stat, i) => (
              <div key={i} className="card text-center">
                <stat.icon className="w-5 h-5 text-primary-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-text-primary">{stat.value}</div>
                <div className="text-xs text-text-muted mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need for Compliance</h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              From worker registration tracking to statutory filing — a complete system of record
              so you know exactly where you stand at all times.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: "Worker Registration Tracker",
                desc: "Upload worker rosters (CSV/XLSX) with automatic Aadhaar masking. Track e-Shram UAN registration status for every worker.",
                badge: "DPDP Compliant",
              },
              {
                icon: BarChart3,
                title: "90/120-Day Eligibility Engine",
                desc: "Authoritative day-count calculation with tiered alerts at 75, 85, and 90 days. Self-reported cross-platform declarations clearly tagged.",
                badge: "Rule 48/49",
              },
              {
                icon: Calendar,
                title: "Filing Calendar & Alerts",
                desc: "Proactive email reminders at 60, 30, 15, 7, 3, and 1 day before Form-XX (30 June) and Form-XXI (31 October) deadlines.",
                badge: "Zero Missed Deadlines",
              },
              {
                icon: FileText,
                title: "Filing Wizard & Challan Locker",
                desc: "Step-by-step wizard generates pre-filled Ministry PDFs. Upload bank challans and lock records with SHA-256 tamper-proof seals.",
                badge: "Audit Ready",
              },
              {
                icon: Shield,
                title: "Contribution Calculator",
                desc: "Side-by-side comparison: 1-2% turnover rate vs. 5% worker payment ceiling. Instantly see which statutory basis saves you more.",
                badge: "Section 114",
              },
              {
                icon: AlertTriangle,
                title: "Penalty Forecaster",
                desc: "Real-time calculation of 1% monthly interest penalties on overdue balances. Know exactly what a missed deadline will cost.",
                badge: "Section 133",
              },
            ].map((feature, i) => (
              <div key={i} className="card-hover group">
                <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center mb-4 group-hover:bg-primary-500/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary-400" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-text-primary">{feature.title}</h3>
                </div>
                <span className="badge-emerald text-[10px] mb-3">{feature.badge}</span>
                <p className="text-sm text-text-secondary leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-surface-2/50 border-t border-border/30">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Get Compliant in 3 Steps</h2>
            <p className="text-text-secondary">From zero to audit-ready in under an hour.</p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Upload Your Worker Roster",
                desc: "Import your gig workers via CSV — daily activity ledger or historical summary. Aadhaar numbers are automatically masked to last 4 digits.",
              },
              {
                step: "02",
                title: "See Your Compliance Dashboard",
                desc: "Instantly view worker eligibility status, e-Shram registration gaps, approaching thresholds, and countdown to your next statutory deadline.",
              },
              {
                step: "03",
                title: "File & Lock Your Returns",
                desc: "Generate pre-filled Form-XX/XXI PDFs, upload bank challans, and seal your filing record with a tamper-proof cryptographic hash.",
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-6 items-start card animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 flex items-center justify-center">
                  <span className="text-xl font-black gradient-text">{step.step}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-border/30">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="card p-12 glow">
            <h2 className="text-3xl font-bold mb-4">
              The 31 October Deadline Is{" "}
              <span className="text-accent-amber">Approaching</span>
            </h2>
            <p className="text-text-secondary mb-8 max-w-xl mx-auto">
              Run a free compliance check right now — see your registration gaps,
              eligibility exposure, and estimated cess liability in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/free-audit" className="btn-primary text-base px-10 py-4">
                <CheckCircle2 className="w-5 h-5" />
                Free Compliance Check
              </Link>
              <Link href="/register" className="btn-secondary text-base px-10 py-4">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-text-primary">GigCessHQ</span>
            </div>
            <p className="text-xs text-text-muted">
              © 2026 GigCessHQ. Compliance platform for the Code on Social Security, 2020.
              Not legal advice — consult your employment law counsel.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
