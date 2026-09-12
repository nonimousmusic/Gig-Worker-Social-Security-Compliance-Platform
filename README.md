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
| [`tech_spec_and_db_schema.md`](./tech_spec_and_db_schema.md) | Technical architecture, calculation engines, Prisma database schema |

### Full Documentation Suite (`docs/`)
| Document | Description |
|---|---|
| [`docs/system_architecture.md`](./docs/system_architecture.md) | System Architecture & Implementation Reference — full codebase layout, core engines, and runtime flow |
| [`docs/api_specification.md`](./docs/api_specification.md) | REST API specification — 40+ endpoints, request/response schemas, error codes |
| [`docs/api_testing_guide.md`](./docs/api_testing_guide.md) | API Testing & Verification Guide — ready-to-run cURL & PowerShell commands for all 20 API endpoints |
| [`docs/compliance_officer_guide.md`](./docs/compliance_officer_guide.md) | Compliance Officer Operational Manual — step-by-step SOPs for daily, quarterly, and annual obligations |
| [`docs/operations_runbook.md`](./docs/operations_runbook.md) | Operations & Deployment Runbook — setup, Prisma commands, cron configuration, and troubleshooting |
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
| Database & ORM | PostgreSQL + Prisma ORM |
| Styling & UI | TailwindCSS + Radix UI + Lucide Icons |
| PDF Generation | Puppeteer (headless Chromium) |
| Background Jobs | Lightweight cron (Vercel Cron / Node Cron) |
| Email Alerts | Resend / AWS SES |
| PII Encryption | AES-256-GCM (Node.js crypto) |

---

## Key Features

### P0 — MVP
- **Worker Registration Tracker** — CSV/XLSX upload with automatic Aadhaar masking (DPDP compliant)
- **90/120-Day Eligibility Engine** — Authoritative internal day count + self-reported cross-platform declarations
- **Filing Wizard** — Pre-filled Form-XX/XXI PDF generation with challan upload and SHA-256 audit lock
- **Deadline Alerting** — Daily cron sweep with 60/30/15/7/3/1-day email reminders and penalty forecasts
- **Free Compliance Audit** — Gated lead-gen funnel with instant Risk Scorecard
- **Multi-Tenant Partner Portal** — Delegated RBAC access for law firms managing multiple clients

### P1 — Post-MVP
- Contribution calculator with Section 114 rate config matrix
- API/webhook sync for automated daily engagement ingestion
- 75/85-day early warning threshold alerts

### P2 — Future
- State-specific welfare board overlays (Rajasthan, Karnataka)
- Direct banking payment transfers for challan deposits
- Form-XXII refund claim processing

---

## Statutory Compliance Calendar

```
Financial Year: 1 April — 31 March

   April                    30 June               31 October              March
     │                         │                      │                      │
     FY Start               Form-XX Due            Form-XXI Due          FY End
                          (Provisional)           (Final Return)
                                
Late penalty: 1% per month (12% p.a.) — Section 133 / Rule 49
Registration non-compliance: Up to ₹1,00,000 per worker — Section 133
```

---

## Getting Started

```bash
# 1. Clone
git clone https://github.com/your-org/gig-cess-platform.git
cd gig-cess-platform

# 2. Install
npm install

# 3. Configure
cp .env.example .env.local
# Edit .env.local with your database URL, encryption key, etc.

# 4. Database
createdb gigcess_dev
npx prisma migrate dev

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
                       │ Prisma Client
                       ▼
              ┌─────────────────┐
              │   PostgreSQL    │
              │   (Encrypted)   │
              └────────┬────────┘
                       │
              Daily Cron (00:30 IST)
              ├── Deadline alerts
              ├── Penalty accrual
              └── Threshold milestones
```

---

## License

Proprietary — All rights reserved.
