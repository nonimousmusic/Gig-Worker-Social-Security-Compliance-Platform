# GigCessHQ — Next.js Web Application

> Statutory compliance automation platform for gig economy aggregators under the **Code on Social Security, 2020** (Section 114, Section 113, Rule 28, Rule 31, Rule 32) and the **Digital Personal Data Protection (DPDP) Act, 2023**.

---

## 1. Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma ORM client
npx prisma generate

# 3. Development Server
npm run dev

# 4. Production Build & Start
npm run build
npm run start
```
The application will be accessible at: **`http://localhost:3000`**

---

## 2. Directory Structure

```
app/
├── package.json                   # Next.js 15, Prisma 6, Tailwind CSS v4
├── next.config.ts                 # Next.js configuration
├── tsconfig.json                  # TypeScript strict compiler options
├── prisma/
│   └── schema.prisma              # 12 models: User, Worker, FilingRecord, Challan, etc.
└── src/
    ├── lib/                       # Core statutory & security engines
    │   ├── aadhaar-masking.ts     # UIDAI masking pipeline (XXXX-XXXX-1234)
    │   ├── auth.ts                # JWT authentication & bcrypt passwords
    │   ├── contribution-calc.ts   # Section 114 (1.5% turnover vs 5% payout ceiling)
    │   ├── eligibility-engine.ts  # Rule 28 (90-day rolling window / 120-day cumulative)
    │   ├── penalty-calc.ts        # Section 133 late payment compounding interest
    │   ├── encryption.ts          # AES-256-GCM symmetric encryption
    │   ├── csv-parser.ts          # Batch CSV parsing for daily ledger & backfill
    │   ├── audit-logger.ts        # Cryptographic immutable audit logging
    │   ├── data-store.ts          # Pre-seeded in-memory store with Prisma fallback
    │   └── db.ts                  # Prisma Client singleton
    └── app/                       # Next.js App Router
        ├── page.tsx               # High-converting dark-mode landing page
        ├── login/page.tsx         # Authentication screen
        ├── register/page.tsx      # Aggregator onboarding
        ├── partner/page.tsx       # CA / legal advisory multi-client portal
        ├── free-audit/page.tsx    # Lead-gen compliance risk audit tool
        ├── dashboard/
        │   ├── layout.tsx         # Statutory countdown banner & navigation shell
        │   ├── page.tsx           # Compliance overview & Section 114 KPI breakdown
        │   ├── workers/page.tsx   # Worker directory with masked Aadhaar
        │   ├── upload/page.tsx    # CSV Ingestion Studio (drag-and-drop dropzone)
        │   ├── eligibility/page.tsx # 90/120-day eligibility engine & Rule 28(2) modal
        │   ├── filings/page.tsx   # 4-step Form-XX preparation wizard
        │   ├── calculator/page.tsx # Section 114 simulation sliders & penalty tab
        │   ├── challans/page.tsx  # Challan Vault with bank UTR & SHA-256 lock
        │   ├── alerts/page.tsx    # Statutory deadlines & threshold alerts
        │   ├── reports/page.tsx   # Certified statutory audit dossier exporter
        │   └── settings/page.tsx  # Corporate entity & compliance team RBAC
        └── api/v1/                # 20 REST API endpoints
            ├── auth/              # login, register, me
            ├── dashboard/         # overview, eligibility
            ├── workers/           # CRUD, search, cross-platform declarations
            ├── ledger/            # daily logs, CSV batch upload
            ├── filings/           # Form-XX drafts, challan deposit & lock
            ├── contributions/     # calculate, penalties
            ├── notifications/     # alerts stream & read status
            ├── exports/           # workers CSV, audit-report JSON
            ├── partner/           # multi-client portfolio
            ├── free-audit/        # instant risk evaluation
            └── cron/              # nightly eligibility recalculation
```

---

## 3. Key NPM Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `next dev` | Start Next.js development server with hot-reload |
| `npm run build` | `next build` | Create optimized production bundle with Turbopack |
| `npm run start` | `next start` | Launch production server on port 3000 |
| `npx tsc --noEmit` | `tsc --noEmit` | Run strict TypeScript validation across the entire codebase |
| `npx prisma generate` | `prisma generate` | Generate Prisma client type definitions |

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
