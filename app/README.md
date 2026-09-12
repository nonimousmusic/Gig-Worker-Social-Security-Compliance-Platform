# GigCessHQ — Next.js Web Application

> Statutory compliance automation platform for gig economy aggregators under the **Code on Social Security, 2020** (Section 114, Rule 28, Rule 31, Rule 32) and the **Digital Personal Data Protection (DPDP) Act, 2023**.

Stack: Next.js 16 + React 19 + Supabase (PostgreSQL + Auth + RLS). No Prisma, no local JWT service, no email/PDF subsystems.

---

## 1. Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure Supabase keys
cp .env.example .env.local
# → fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Apply SQL migrations + demo data + demo user
supabase db push
supabase db seed        # or: psql "$SUPABASE_DB_URL" -f supabase/seed.sql
npm run supabase:seed   # compliance@quickmove.in / Compliance@2025

# 4. Development Server
npm run dev

# 5. Production Build & Start
npm run build
npm run start
```
The application will be accessible at: **`http://localhost:3000`**

---

## 2. Directory Structure

```
app/
├── package.json                   # Next.js 16, Supabase, Tailwind CSS v4
├── next.config.ts                 # Next.js configuration
├── tsconfig.json                  # TypeScript strict compiler options
├── .env.example                   # Supabase keys + CRON_SECRET template
├── supabase/
│   ├── migrations/                # 0001_init, 0002_address, 0003_leads (+ RLS)
│   └── seed.sql                   # Idempotent demo dataset (fixed UUIDs)
├── scripts/
│   └── seed-demo-user.mjs         # Demo login user (service role)
└── src/
    ├── proxy.ts                   # Session refresh + page guards (Next 16 proxy())
    ├── lib/                       # Core statutory engines + Supabase clients
    │   ├── supabase/              # browser / server (cookies) / service clients
    │   ├── session.ts             # getSessionData(): auth.users → profiles → orgs
    │   ├── data-access.ts         # requireTenant() + RLS-backed mappers
    │   ├── auth.ts                # Registration validators (work email, password)
    │   ├── eligibility-engine.ts  # Single 90/120/75 engine + rank helpers
    │   ├── contribution-calc.ts   # Section 114 (turnover rate vs 5% payout ceiling)
    │   ├── penalty-calc.ts        # Section 133 simple interest (1%/mo)
    │   ├── csv-parser.ts          # CSV validation for daily ledger & backfill
    │   ├── aadhaar-masking.ts     # Last-4 masking pipeline (XXXX-XXXX-1234)
    │   ├── audit-logger.ts        # Append-only audit_logs writer/reader
    │   ├── financial-year.ts      # Indian FY helpers
    │   └── types.ts               # Shared UI/API types + AnyRow
    └── app/                       # Next.js 16 App Router
        ├── page.tsx               # Dark-mode landing page
        ├── login/page.tsx         # Supabase browser-client sign-in
        ├── register/page.tsx      # Aggregator onboarding → POST auth/register
        ├── partner/page.tsx       # Advisory multi-client console (live KPIs)
        ├── free-audit/page.tsx    # Public estimator funnel + lead capture
        ├── dashboard/
        │   ├── layout.tsx         # Live org/user/deadline shell
        │   ├── page.tsx           # Overview: stats, deadline, recent filings
        │   ├── workers/page.tsx   # Directory, add-worker, activity modal
        │   ├── upload/page.tsx    # CSV Ingestion Studio (2 formats + templates)
        │   ├── eligibility/page.tsx # Meters, cron trigger, declaration modal
        │   ├── filings/page.tsx   # 4-step Form-XX wizard + filings table
        │   ├── calculator/page.tsx # Section 114 simulator + illustrative penalties
        │   ├── challans/page.tsx  # Deposit form (open filings) + locked vault
        │   ├── alerts/page.tsx    # Notifications + mark-all-read
        │   ├── reports/page.tsx   # Live audit dossier + CSV + print
        │   └── settings/page.tsx  # Org profile save + real team list
        └── api/v1/                # 19 REST API route files (cookie sessions)
            ├── auth/{register,me}/route.ts
            ├── organizations/route.ts
            ├── team/route.ts
            ├── dashboard/{overview,eligibility}/route.ts
            ├── workers/{route.ts,[id]/route.ts,[id]/declarations/route.ts}
            ├── ledger/upload/route.ts
            ├── filings/{route.ts,[id]/route.ts,[id]/challan/route.ts}
            ├── notifications/route.ts
            ├── exports/{workers,audit-report}/route.ts
            ├── partner/clients/route.ts
            ├── free-audit/route.ts
            └── cron/evaluate-eligibility/route.ts
```

---

## 3. Key NPM Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `next dev` | Start Next.js development server with hot-reload |
| `npm run build` | `next build` | Type-check + optimized production bundle (must stay green) |
| `npm run start` | `next start` | Launch production server on port 3000 |
| `npm run lint` | `eslint` | Lint — repo standard is zero errors, zero warnings |
| `npm run supabase:seed` | `node scripts/seed-demo-user.mjs` | Create demo login user via service role |

---

## 4. Documentation References

Comprehensive legal, technical, and operational specifications are available in `../docs`:
- [System Architecture](../docs/system_architecture.md)
- [API Specification](../docs/api_specification.md)
- [API Testing Guide](../docs/api_testing_guide.md)
- [Compliance Officer SOP Manual](../docs/compliance_officer_guide.md)
- [Operations Runbook](../docs/operations_runbook.md)
- [Regulatory Legal Reference](../docs/regulatory_reference.md)
- [User Journey Flows](../docs/user_flows.md)
- [Security & DPDP Policy](../docs/security_policy.md)
