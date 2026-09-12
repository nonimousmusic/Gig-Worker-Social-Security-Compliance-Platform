# Environment Setup & Developer Guide
## Gig Worker Social Security Compliance Platform

**Version:** 2.0
**Date:** 12 September 2026

> Stack: Next.js 16 + React 19 + Supabase (Postgres + Auth + RLS). No Prisma, no local Postgres, no Puppeteer, no email service. You need a Supabase project before the app can run.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Structure](#2-repository-structure)
3. [Initial Setup](#3-initial-setup)
4. [Environment Variables](#4-environment-variables)
5. [Database Setup](#5-database-setup)
6. [Running the Application](#6-running-the-application)
7. [Development Workflow](#7-development-workflow)
8. [Testing](#8-testing)
9. [Deployment](#9-deployment)
10. [Coding Standards & Conventions](#10-coding-standards--conventions)

---

## 1. Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| **Node.js** | 20.x LTS or 22.x | Runtime for Next.js and build tools |
| **npm** | 10.x+ | Package management |
| **Git** | 2.40+ | Version control |
| **Supabase project** | Any (Postgres 15+) | Hosted database + Auth (provides URL + anon/service-role keys) |
| **Supabase CLI** (optional) | Latest | `supabase db push`, local inspect |

**Optional but recommended:**

| Tool | Purpose |
|---|---|
| **Postman / Insomnia** | API testing and exploration |
| **Supabase Dashboard** | Visual database browser (Table Editor replaces Prisma Studio) |
| **VS Code** | IDE with ESLint + Tailwind CSS IntelliSense |

No local PostgreSQL, Chromium, Redis, or mail server is required.

---

## 2. Repository Structure

```
freelance-wali-platform/
│
├── docs/                           # Project documentation (this folder)
│   ├── ai_slop_review.md           # Code-quality review + remediation log
│   ├── api_specification.md        # REST API specification (19 routes, as-built)
│   ├── api_testing_guide.md        # curl/PowerShell commands per endpoint
│   ├── compliance_officer_guide.md # Step-by-step user manual
│   ├── environment_setup.md        # This file
│   ├── glossary.md                 # Domain terminology reference
│   ├── operations_runbook.md       # Operations, migrations & maintenance
│   ├── prd.md                      # Product Requirements Document
│   ├── regulatory_reference.md     # Legal mapping to Code on Social Security 2020
│   ├── security_policy.md          # Auth, RLS, DPDP posture (as-built)
│   ├── system_architecture.md      # Architecture & implementation reference
│   ├── tech_spec_and_db_schema.md  # Engines, privacy, SQL schema
│   ├── user_flows.md               # User journey maps for every persona
│   └── csv_templates/              # Canonical CSV upload templates
│       ├── daily_ledger_template.csv
│       └── summary_backfill_template.csv
│
├── prd.md                          # (Mirror of docs/prd.md)
├── tech_spec_and_db_schema.md      # (Mirror of docs/tech_spec_and_db_schema.md)
│
└── app/                            # Production Next.js application
    ├── package.json                # Deps & scripts (dev/build/start/lint/supabase:seed)
    ├── next.config.ts              # Next.js configuration
    ├── tsconfig.json               # Strict TypeScript configuration
    ├── postcss.config.mjs          # PostCSS / TailwindCSS v4 plugin
    ├── .env.example                # Env template (Supabase keys + CRON_SECRET)
    ├── supabase/
    │   ├── migrations/             # SQL migrations (0001_init, 0002_address, 0003_leads)
    │   └── seed.sql                # Idempotent demo data (fixed UUIDs)
    ├── scripts/
    │   └── seed-demo-user.mjs      # Creates demo login user (service role)
    └── src/
        ├── proxy.ts                # Session refresh + page guards (Next 16 proxy())
        ├── lib/
        │   ├── supabase/           # client (browser), server (cookies), service (admin), middleware helper
        │   ├── session.ts          # getSessionData(): auth.users → profiles → organizations
        │   ├── data-access.ts      # requireTenant() + RLS-backed mappers
        │   ├── auth.ts             # Registration validators only (work email, password)
        │   ├── eligibility-engine.ts # Single 90/120/75 engine + rank helpers
        │   ├── contribution-calc.ts  # Section 114 min(turnover×rate, payouts×5%)
        │   ├── penalty-calc.ts       # 1%/mo simple interest
        │   ├── csv-parser.ts         # PapaParse validators (daily + backfill)
        │   ├── aadhaar-masking.ts    # Last-4 masking pipeline
        │   ├── audit-logger.ts       # Append-only audit_logs writer/reader
        │   ├── financial-year.ts     # Indian FY helpers
        │   └── types.ts              # Shared UI/API types (WorkerRecord, FilingItem, …)
        └── app/                    # Next.js 16 App Router pages & APIs
            ├── page.tsx            # Landing page
            ├── login/page.tsx      # Supabase browser-client sign-in
            ├── register/page.tsx   # → POST /api/v1/auth/register
            ├── partner/page.tsx    # Advisory multi-client console
            ├── free-audit/page.tsx # Public estimator funnel
            ├── dashboard/
            │   ├── layout.tsx      # Live org/user/deadline shell
            │   ├── page.tsx        # Overview (stats, deadline, recent filings)
            │   ├── workers/        # Directory + add + profile modal w/ activity strip
            │   ├── upload/         # CSV Ingestion Studio (2 formats + templates)
            │   ├── eligibility/    # Meters, cron trigger, declaration modal
            │   ├── filings/        # 4-step Form-XX wizard + filings table
            │   ├── calculator/     # Section 114 simulator + illustrative penalties
            │   ├── challans/       # Deposit form (open filings) + locked vault
            │   ├── alerts/         # Notifications + mark-all-read
            │   ├── reports/        # Live audit dossier + CSV + print
            │   └── settings/       # Org profile save + real team list
            └── api/v1/             # 19 route files (see api_specification.md)
                ├── auth/{register,me}/route.ts
                ├── organizations/route.ts
                ├── team/route.ts
                ├── dashboard/{overview,eligibility}/route.ts
                ├── workers/route.ts
                ├── workers/[id]/{route.ts,declarations/route.ts}
                ├── ledger/upload/route.ts
                ├── filings/{route.ts,[id]/route.ts,[id]/challan/route.ts}
                ├── exports/{workers,audit-report}/route.ts
                ├── notifications/route.ts
                ├── partner/clients/route.ts
                ├── free-audit/route.ts
                └── cron/evaluate-eligibility/route.ts
```

---

## 3. Initial Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/gig-cess-platform.git
cd gig-cess-platform/app
```

> All app commands run from `app/`.

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Copy Environment Variables

```bash
cp .env.example .env.local
```

Fill in your Supabase project URL + anon key + service-role key (see [Section 4](#4-environment-variables)).

### Step 4: Apply Database Migrations

```bash
supabase db push
```

This applies `supabase/migrations/0001_init.sql` (tables, enums, RLS), `0002_org_registered_address.sql`, and `0003_audit_leads.sql`.

### Step 5: Load Demo Data (Optional)

```bash
# SQL seed: demo org (fixed UUID), workers, aggregates, ledger, filings, challans
supabase db seed
# or: psql "$SUPABASE_DB_URL" -f supabase/seed.sql

# Demo login user (compliance@quickmove.in / Compliance@2025 by default)
npm run supabase:seed
```

### Step 6: Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## 4. Environment Variables

### `.env.example` (complete — this is the entire list)

```env
# SUPABASE (Authentication + PostgreSQL + RLS)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Server-only service role key (NEVER expose to the browser).
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# CRON SECURITY
CRON_SECRET="change-this-cron-secret"

# APPLICATION
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="GigCessHQ"
```

### Variable Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL (Dashboard → Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon key (RLS-bound, safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Bypasses RLS — server-only (register, cron, seed script) |
| `CRON_SECRET` | ✅ (prod) | `Authorization: Bearer` value for scheduler → cron route |
| `NEXT_PUBLIC_APP_URL` | ✅ | Base URL of the application |
| `NEXT_PUBLIC_APP_NAME` | ❌ | Display name (`GigCessHQ`) |

There is no `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, email, upload-dir, or Puppeteer configuration — none of those subsystems exist.

---

## 5. Database Setup

Everything is plain SQL + RLS; there is no ORM client to generate.

```bash
# Apply pending migrations to the linked project
supabase db push

# New migration (numbered, idempotent DDL preferred)
supabase migration new <descriptive_name>
# ... then review the SQL file before pushing
```

### Seed Data

`supabase/seed.sql` is idempotent (fixed UUIDs + `ON CONFLICT DO NOTHING` + a `NOT EXISTS` guard on the generated ledger) and creates:
- Demo org `00000000-0000-0000-0000-000000000001` (QuickMove) with registered address
- 8 workers, FY aggregates, rolling-window ledger rows, 3 filings (1 open DRAFT), 1 challan, 4 notifications, 3 audit rows

`npm run supabase:seed` then creates the demo login user and attaches its profile to the demo org (`DEMO_EMAIL` / `DEMO_PASSWORD` env overrides supported).

---

## 6. Running the Application

### Development Mode

```bash
npm run dev
# → http://localhost:3000
```

### Production Build

```bash
npm run build
npm start
```

### Useful Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Type-check + production build (must stay green) |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint (repo standard: **zero** errors, **zero** warnings) |
| `npm test` | Run unit tests once (`vitest run`) |
| `npm run test:watch` | Re-run unit tests on file changes |
| `npm run supabase:seed` | Create demo login user via service role |

---

## 7. Development Workflow

### Branch Naming

```
feature/   → New features           (feature/worker-bulk-upload)
fix/       → Bug fixes              (fix/eligibility-calc-off-by-one)
docs/      → Documentation changes  (docs/api-spec-update)
chore/     → Maintenance tasks      (chore/upgrade-next)
refactor/  → Code restructuring     (refactor/eligibility-engine)
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(workers): add bulk CSV upload with validation
fix(eligibility): correct 90-day threshold boundary condition
docs(api): document organizations PATCH endpoint
chore(deps): upgrade next to 16.x
refactor(auth): move session resolution to getSessionData
```

### Pull Request Checklist

- [ ] `npm run build` passes (includes type-check)
- [ ] `npm run lint` is clean (zero warnings)
- [ ] SQL migration included if schema changed (numbered, idempotent)
- [ ] API documentation updated if endpoints changed
- [ ] Audit log events added for new state-changing operations
- [ ] Aadhaar masking verified if handling new PII fields
- [ ] RLS policies cover new tables (deny-by-default; service role only where justified)

---

## 8. Testing

Unit tests live next to the modules they cover (`src/lib/*.test.ts`, run with Vitest):

```bash
npm test          # single run (37 tests)
npm run test:watch # watch mode
```

**Covered (all pure functions):**
- Eligibility engine: 75/90/120 boundaries, multi-aggregator gate, labels/colors, rank helpers.
- Contribution calculator: turnover vs. ceiling branches, custom ceiling rate, rounding, zeros.
- Penalty calculator: non-overdue zeros, month-rounding-up, statutory metadata.
- Aadhaar masking: valid/invalid ranges, masked passthrough, log sanitization, UAN validate/format.
- CSV parser: valid rows, per-field failures, header aliases, backfill bounds.
- Financial year: 1-April boundary, calendar-day diffs.

**Not covered:** API routes (need a live Supabase project + session cookies), React pages, RLS policies. The highest-value next addition is route-level tests against a preview-branch database.

---

## 9. Deployment

### Recommended Infrastructure

| Component | Service | Rationale |
|---|---|---|
| **Application** | Vercel | Native Next.js hosting |
| **Database + Auth** | Supabase (the same project from §4) | Managed Postgres, Auth, backups |
| **Monitoring** | Sentry (future) | Error tracking — not yet wired |

No file storage, email provider, or PDF service is used — there is nothing to provision for them.

### Vercel Deployment

```bash
npm i -g vercel
vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add CRON_SECRET
```

### Cron Job Setup

No schedule is committed in-repo (there is no `vercel.json`). Point any scheduler at the eligibility sync:

```bash
curl -X POST https://app.gigcesshq.in/api/v1/cron/evaluate-eligibility \
  -H "Authorization: Bearer $CRON_SECRET"
```

Vercel Cron example (`vercel.json`):

```json
{
  "crons": [{ "path": "/api/v1/cron/evaluate-eligibility", "schedule": "30 0 * * *" }]
}
```

(The dashboard also exposes a session-authenticated "Trigger Nightly Audit Job" button that runs the same job org-scoped.)

---

## 10. Coding Standards & Conventions

### TypeScript

- Strict mode enabled (`"strict": true` in tsconfig); `npm run build` must pass.
- Untyped Supabase rows use the shared `AnyRow` alias (`src/lib/types.ts`) — do not sprinkle bare `any`.
- Single eligibility source: `src/lib/eligibility-engine.ts` — never reimplement thresholds inline.
- Ingestion/declaration paths are **promote-only**; only the cron syncs both ways.

### File Naming

| Type | Convention | Example |
|---|---|---|
| Pages/layouts | Next.js convention | `page.tsx`, `layout.tsx`, `route.ts` |
| Utilities | kebab-case | `eligibility-engine.ts`, `csv-parser.ts` |
| Supabase migrations | Numbered SQL | `0003_audit_leads.sql` |

### API Route Conventions

- All routes under `/api/v1/` for versioning; Next.js App Router handlers (`route.ts`).
- Authenticate via `requireTenant()` (`src/lib/data-access.ts`) — every data route, no exceptions.
- Tenant-scope every query (`organization_id`); rely on RLS as the backstop, never as the only check.
- Log to `audit_logs` for state-changing operations (best-effort; failures must not break the request).
- Return the standard envelope: `{ success: true, data }` / `{ success: false, error: { code, message } }`.
- Never invent data: return empty arrays/nulls when there is nothing to show.

### Database Conventions

- All tables use UUID primary keys (`uuid PRIMARY KEY DEFAULT gen_random_uuid()`).
- All tables have `created_at` / `updated_at` (with `touch_updated_at` trigger where updated).
- Every table has RLS enabled with tenant `USING`/`WITH CHECK` policies; audit tables are append-only (no UPDATE/DELETE policies).
- Financial values use `numeric(14, 2)`; day counts are integers.
- Soft-deactivate workers via `is_active`, never `DELETE` business rows.
