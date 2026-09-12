# GigCessHQ — Gig Worker Social Security Compliance Platform

> The system of record for **"which of our gig workers are registered, how many days have they worked, and what do we owe and when"** — for Indian aggregators too small to have a dedicated compliance team.

---

## What This Is

A SaaS platform helping Indian aggregators (delivery apps, home-services platforms, freelance marketplaces, logistics startups) comply with the **Code on Social Security, 2020** and the **Social Security (Central) Rules, 2026**.

The platform tracks worker registration on e-Shram, calculates day-count eligibility (90-day single / 120-day multi-aggregator thresholds), manages the Form-XX / Form-XXI filing calendar, and ensures no statutory deadline is missed.

---

## Quick Links

### Core Documents
| Document | Description |
|---|---|
| [`prd.md`](./prd.md) | Product Requirements Document — goals, personas, user stories, functional requirements |
| [`tech_spec_and_db_schema.md`](./tech_spec_and_db_schema.md) | Technical architecture, calculation engines, SQL database schema |

### Full Documentation Suite (`docs/`)
| Document | Description |
|---|---|
| [`docs/system_architecture.md`](./docs/system_architecture.md) | System Architecture & Implementation Reference — full codebase layout, core engines, and runtime flow |
| [`docs/api_specification.md`](./docs/api_specification.md) | REST API specification — 19 endpoints, request/response schemas, error codes |
| [`docs/api_testing_guide.md`](./docs/api_testing_guide.md) | API Testing & Verification Guide — ready-to-run cURL & PowerShell commands for all API endpoints |
| [`docs/compliance_officer_guide.md`](./docs/compliance_officer_guide.md) | Compliance Officer Operational Manual — step-by-step SOPs for daily, quarterly, and annual obligations |
| [`docs/operations_runbook.md`](./docs/operations_runbook.md) | Operations & Deployment Runbook — setup, Supabase ops, cron configuration, and troubleshooting |
| [`docs/user_flows.md`](./docs/user_flows.md) | User journey maps — 14 detailed flows with Mermaid diagrams for every persona |
| [`docs/regulatory_reference.md`](./docs/regulatory_reference.md) | Legal compliance mapping — every statutory obligation mapped to platform features |
| [`docs/environment_setup.md`](./docs/environment_setup.md) | Developer guide — prerequisites, repo structure, env vars, database setup, deployment |
| [`docs/security_policy.md`](./docs/security_policy.md) | Security & DPDP Act 2023 compliance — encryption, Aadhaar handling, audit logging, incident response |
| [`docs/glossary.md`](./docs/glossary.md) | Glossary — all legal, regulatory, and technical terms defined |

### Templates
| File | Description |
|---|---|
| [`docs/csv_templates/daily_ledger_template.csv`](./docs/csv_templates/daily_ledger_template.csv) | Sample CSV for daily worker activity ledger upload |
| [`docs/csv_templates/summary_backfill_template.csv`](./docs/csv_templates/summary_backfill_template.csv) | Sample CSV for historical summary backfill upload |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Application Framework | Next.js (App Router) + TypeScript |
| Database & Auth | Supabase (PostgreSQL + Auth + RLS) |
| Styling & UI | TailwindCSS v4 + Lucide Icons (+ next/font) |
| PDF Generation | None (live JSON dossier + browser print) |
| Background Jobs | External scheduler → eligibility sync endpoint |
| Email Alerts | None (in-app notification center) |
| PII Encryption | Aadhaar masking only — phones stored plaintext (known gap) |

---

## Key Features

### P0 — MVP
- **Worker Registration Tracker** — CSV upload with automatic Aadhaar masking (raw Aadhaar never stored)
- **90/120-Day Eligibility Engine** — Authoritative day count + self-reported cross-platform declarations (promote-only; nightly full sync)
- **Filing Wizard** — Form-XX quarterly drafts with challan upload and SHA-256 audit lock (PAID filings immutable)
- **Deadline Alerting** — Live deadline cards from open filings + in-app notification center (no email dispatch)
- **Free Compliance Audit** — Public estimator funnel with instant heuristic scorecard + lead capture
- **Multi-Tenant Partner Portal** — Read-only multi-client console over `partner_client_access` grants

### P1 — Post-MVP
- Contribution calculator with Section 114 rate config matrix
- API/webhook sync for automated daily engagement ingestion
- 75-day early warning threshold alerts

### P2 — Future
- State-specific welfare board overlays (Rajasthan, Karnataka)
- Direct banking payment transfers for challan deposits
- Form-XXII refund claim processing

---

## Statutory Compliance Calendar

```
Financial Year: 1 April — 31 March

   Form-XX (quarterly): Q1→31 Jul, Q2→31 Oct, Q3→31 Jan, Q4→30 Apr
   Form-XXI (annual): 30 June (end year)

Late penalty: 1% per month simple (12% p.a.) — Section 133 / Rule 49
Registration non-compliance: Up to ₹1,00,000 per worker — Section 133
```

---

## Getting Started

```bash
# 1. Clone
git clone https://github.com/your-org/gig-cess-platform.git
cd gig-cess-platform/app

# 2. Install
npm install

# 3. Configure (Supabase URL + anon key + service-role key)
cp .env.example .env.local

# 4. Database (Supabase SQL migrations + demo data + demo user)
supabase db push
supabase db seed
npm run supabase:seed

# 5. Run
npm run dev
# → http://localhost:3000
```

See [`docs/environment_setup.md`](./docs/environment_setup.md) for the full developer guide.

---

## Architecture Overview

```
Browser (Aggregator / Advisor / Free Audit)
    │
    │ HTTPS / Next.js Server Actions
    ▼
┌────────────────────────────────────────────────────┐
│  Next.js Application Layer                          │
│  Auth → Ingestion → Eligibility → Filing → Alerts  │
└──────────────────────┬─────────────────────────────┘
                       │ supabase-js (RLS-enforced)
                       ▼
              ┌─────────────────┐
              │ Supabase        │
              │ Postgres + Auth │
              └────────┬────────┘
                       │
              Nightly eligibility sync (scheduler → cron endpoint)
              ├── Status reconciliation (promote + demote)
              └── Per-org audit rows (no email, no penalty accrual)
```

---

## License

Proprietary — All rights reserved.
