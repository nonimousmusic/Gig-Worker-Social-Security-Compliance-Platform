# Environment Setup & Developer Guide
## Gig Worker Social Security Compliance Platform

**Version:** 1.0  
**Date:** 12 September 2026

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

| Requirement | Minimum Version | Recommended | Purpose |
|---|---|---|---|
| **Node.js** | 18.x LTS | 20.x LTS | Runtime for Next.js and build tools |
| **npm** | 9.x | 10.x | Package management |
| **PostgreSQL** | 15.x | 16.x | Primary database |
| **Git** | 2.40+ | Latest | Version control |
| **Chromium / Chrome** | Latest stable | Latest stable | Puppeteer PDF generation (auto-downloaded) |

**Optional but recommended:**

| Tool | Purpose |
|---|---|
| **Prisma Studio** | Visual database browser (included with Prisma) |
| **Postman / Insomnia** | API testing and exploration |
| **pgAdmin / DBeaver** | PostgreSQL GUI management |
| **VS Code** | IDE with Prisma, ESLint, and Tailwind CSS IntelliSense extensions |

---

## 2. Repository Structure

```
freelance-wali-platform/
│
├── docs/                           # Project documentation (this folder)
│   ├── api_specification.md        # REST API specification
│   ├── user_flows.md               # User journey maps & flow diagrams
│   ├── regulatory_reference.md     # Legal/regulatory compliance mapping
│   ├── environment_setup.md        # This file
│   ├── security_policy.md          # Security & DPDP compliance policy
│   ├── glossary.md                 # Domain terminology reference
│   └── csv_templates/              # Sample CSV upload templates
│       ├── daily_ledger_template.csv
│       └── summary_backfill_template.csv
│
├── prd.md                          # Product Requirements Document
├── tech_spec_and_db_schema.md      # Technical architecture & Prisma schema
│
├── src/                            # Application source code (Next.js)
│   ├── app/                        # Next.js App Router pages & layouts
│   │   ├── (auth)/                 # Auth route group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── verify-email/
│   │   │   └── forgot-password/
│   │   ├── (dashboard)/            # Authenticated dashboard route group
│   │   │   ├── layout.tsx          # Dashboard shell with sidebar
│   │   │   ├── page.tsx            # Dashboard home / compliance overview
│   │   │   ├── workers/            # Worker management pages
│   │   │   ├── filings/            # Filing wizard & calendar
│   │   │   ├── calculator/         # Contribution calculator
│   │   │   ├── reports/            # Export & audit reports
│   │   │   ├── notifications/      # Alert center
│   │   │   └── settings/           # Org settings, team, partner access
│   │   ├── (partner)/              # Partner/advisor portal route group
│   │   │   ├── layout.tsx
│   │   │   └── clients/
│   │   ├── free-audit/             # Public lead-gen funnel
│   │   └── api/                    # API route handlers
│   │       └── v1/
│   │           ├── auth/
│   │           ├── workers/
│   │           ├── filings/
│   │           ├── contributions/
│   │           ├── notifications/
│   │           ├── exports/
│   │           ├── ingestion/
│   │           ├── partner/
│   │           ├── free-audit/
│   │           └── internal/
│   │               └── cron/
│   │
│   ├── components/                 # Reusable UI components
│   │   ├── ui/                     # Base UI primitives (Radix UI wrappers)
│   │   ├── dashboard/              # Dashboard-specific components
│   │   ├── forms/                  # Form components (filing wizard, upload)
│   │   ├── charts/                 # Data visualization components
│   │   └── layout/                 # Navigation, sidebar, header
│   │
│   ├── lib/                        # Shared utilities and business logic
│   │   ├── db.ts                   # Prisma client singleton
│   │   ├── auth.ts                 # JWT & session utilities
│   │   ├── encryption.ts           # AES-256-GCM encryption helpers
│   │   ├── aadhaar-masking.ts      # Aadhaar sanitization pipeline
│   │   ├── eligibility-engine.ts   # Day-count calculation logic
│   │   ├── contribution-calc.ts    # Contribution & ceiling calculator
│   │   ├── penalty-calc.ts         # Interest penalty computation
│   │   ├── csv-parser.ts           # CSV/XLSX ingestion & validation
│   │   ├── pdf-generator.ts        # Puppeteer PDF rendering
│   │   ├── email.ts                # Transactional email (Resend/SES)
│   │   ├── audit-logger.ts         # Audit log helper
│   │   ├── financial-year.ts       # FY calculation utilities
│   │   └── validators.ts           # Zod schemas for request validation
│   │
│   ├── types/                      # TypeScript type definitions
│   │   ├── api.ts                  # API request/response types
│   │   ├── domain.ts               # Domain model types
│   │   └── enums.ts                # Shared enum definitions
│   │
│   └── styles/                     # Global styles
│       └── globals.css             # TailwindCSS imports & custom styles
│
├── prisma/
│   ├── schema.prisma               # Database schema definition
│   ├── migrations/                 # Database migration history
│   └── seed.ts                     # Seed script for development data
│
├── public/                         # Static assets
│   ├── templates/                  # PDF form templates (Form-XX, Form-XXI)
│   └── images/
│
├── tests/                          # Test suites
│   ├── unit/                       # Unit tests
│   │   ├── eligibility-engine.test.ts
│   │   ├── contribution-calc.test.ts
│   │   ├── penalty-calc.test.ts
│   │   ├── aadhaar-masking.test.ts
│   │   └── csv-parser.test.ts
│   ├── integration/                # Integration tests
│   │   ├── api/                    # API endpoint tests
│   │   └── db/                     # Database operation tests
│   └── e2e/                        # End-to-end tests
│       ├── onboarding.spec.ts
│       ├── filing-wizard.spec.ts
│       └── free-audit.spec.ts
│
├── .env.example                    # Environment variable template
├── .env.local                      # Local environment variables (gitignored)
├── .gitignore
├── next.config.ts                  # Next.js configuration
├── tailwind.config.ts              # TailwindCSS configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json
└── README.md
```

---

## 3. Initial Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/gig-cess-platform.git
cd gig-cess-platform
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Copy Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your local configuration (see [Section 4](#4-environment-variables)).

### Step 4: Set Up PostgreSQL Database

```bash
# Create the database
createdb gigcess_dev

# Or via psql:
psql -U postgres -c "CREATE DATABASE gigcess_dev;"
```

### Step 5: Run Prisma Migrations

```bash
npx prisma migrate dev --name init
```

### Step 6: Seed Development Data (Optional)

```bash
npx prisma db seed
```

### Step 7: Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## 4. Environment Variables

### `.env.example`

```env
# ──────────────────────────────────────────
# DATABASE
# ──────────────────────────────────────────
DATABASE_URL="postgresql://postgres:password@localhost:5432/gigcess_dev?schema=public"

# ──────────────────────────────────────────
# AUTHENTICATION
# ──────────────────────────────────────────
JWT_SECRET="your-256-bit-secret-key-here"
JWT_ACCESS_EXPIRY="1h"
JWT_REFRESH_EXPIRY="7d"

# ──────────────────────────────────────────
# ENCRYPTION (DPDP Act PII Protection)
# ──────────────────────────────────────────
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY="64-character-hex-string-for-aes-256-gcm"

# ──────────────────────────────────────────
# EMAIL (Transactional Alerts)
# ──────────────────────────────────────────
# Option A: Resend
RESEND_API_KEY="re_xxxxxxxxxxxx"
EMAIL_FROM="alerts@gigcesshq.in"

# Option B: AWS SES
# AWS_SES_REGION="ap-south-1"
# AWS_SES_ACCESS_KEY_ID=""
# AWS_SES_SECRET_ACCESS_KEY=""

# ──────────────────────────────────────────
# CRON SECURITY
# ──────────────────────────────────────────
CRON_SECRET="random-secret-for-cron-endpoint-auth"

# ──────────────────────────────────────────
# APPLICATION
# ──────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="GigCessHQ"
NODE_ENV="development"

# ──────────────────────────────────────────
# FILE UPLOADS
# ──────────────────────────────────────────
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_MB="10"
MAX_FREE_AUDIT_ROWS="500"

# ──────────────────────────────────────────
# PDF GENERATION (Puppeteer)
# ──────────────────────────────────────────
# Leave blank to use bundled Chromium
PUPPETEER_EXECUTABLE_PATH=""
```

### Variable Reference

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens (min 32 chars) | Random hex string |
| `ENCRYPTION_KEY` | ✅ | AES-256 key for PII encryption (64 hex chars) | `node -e "..."` output |
| `RESEND_API_KEY` | ✅ (prod) | Resend API key for transactional emails | `re_xxxxxxxxxxxx` |
| `EMAIL_FROM` | ✅ (prod) | Sender email address for alerts | `alerts@gigcesshq.in` |
| `CRON_SECRET` | ✅ | Secret header value for cron endpoint auth | Random string |
| `NEXT_PUBLIC_APP_URL` | ✅ | Base URL of the application | `http://localhost:3000` |
| `UPLOAD_DIR` | ❌ | Directory for uploaded files | `./uploads` |
| `MAX_FILE_SIZE_MB` | ❌ | Maximum upload file size | `10` |
| `MAX_FREE_AUDIT_ROWS` | ❌ | Max CSV rows for free audit | `500` |

---

## 5. Database Setup

### Local Development

```bash
# Create database
createdb gigcess_dev

# Run migrations
npx prisma migrate dev

# Open Prisma Studio (visual database browser)
npx prisma studio
```

### Reset Database

```bash
# Drop all data and re-run all migrations
npx prisma migrate reset
```

### Generate Prisma Client (after schema changes)

```bash
npx prisma generate
```

### Create a New Migration

```bash
npx prisma migrate dev --name descriptive_migration_name
```

### Seed Data

The seed script creates:
- 1 sample aggregator organization
- 1 sample advisory partner organization
- Admin users for each
- 50 sample workers with engagement data
- Sample filing records
- Sample contribution rate configurations

```bash
npx prisma db seed
```

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
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |
| `npm test` | Run test suite |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run test:e2e` | Run end-to-end tests |
| `npx prisma studio` | Open Prisma database GUI |
| `npx prisma migrate dev` | Run pending migrations |
| `npx prisma db seed` | Seed development data |

---

## 7. Development Workflow

### Branch Naming

```
feature/   → New features           (feature/worker-bulk-upload)
fix/       → Bug fixes              (fix/eligibility-calc-off-by-one)
docs/      → Documentation changes  (docs/api-spec-update)
chore/     → Maintenance tasks      (chore/upgrade-prisma)
refactor/  → Code restructuring     (refactor/eligibility-engine)
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(workers): add bulk CSV upload with validation
fix(eligibility): correct 90-day threshold boundary condition
docs(api): add contribution calculator endpoint spec
chore(deps): upgrade prisma to 5.x
refactor(auth): extract JWT verification middleware
test(engine): add edge cases for multi-aggregator day count
```

### Pull Request Checklist

- [ ] All tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No lint warnings (`npm run lint`)
- [ ] Database migrations included if schema changed
- [ ] API documentation updated if endpoints changed
- [ ] Audit log events added for new state-changing operations
- [ ] Aadhaar masking verified if handling new PII fields
- [ ] RBAC permissions checked for new endpoints

---

## 8. Testing

### Unit Tests

Located in `tests/unit/`. Focus on business logic:

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npx vitest run tests/unit/eligibility-engine.test.ts

# Watch mode
npx vitest watch tests/unit/
```

**Critical unit test areas:**
- Eligibility engine: 90-day, 120-day boundary conditions, edge cases.
- Contribution calculator: Turnover vs. ceiling, rounding, zero-value handling.
- Penalty calculator: Month fractions, exact boundary dates.
- Aadhaar masking: All formats, malformed inputs, injection attempts.
- CSV parser: Valid/invalid rows, date formats, encoding issues.

### Integration Tests

Located in `tests/integration/`. Test API endpoints with database:

```bash
npm run test:integration
```

### E2E Tests

Located in `tests/e2e/`. Full browser-based tests:

```bash
npm run test:e2e
```

---

## 9. Deployment

### Recommended Infrastructure

| Component | Service | Rationale |
|---|---|---|
| **Application** | Vercel (Pro plan) | Native Next.js hosting, edge functions, cron jobs |
| **Database** | Supabase or Neon PostgreSQL | Managed PostgreSQL with backups |
| **File Storage** | AWS S3 / Cloudflare R2 | CSV uploads, challan receipts, generated PDFs |
| **Email** | Resend or AWS SES | Transactional email delivery |
| **Monitoring** | Sentry | Error tracking and performance monitoring |
| **DNS & CDN** | Cloudflare | DDoS protection, SSL, caching |

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET
# ... etc
```

### Cron Job Setup (Vercel)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/v1/internal/cron/daily-compliance-sweep",
      "schedule": "30 19 * * *"
    }
  ]
}
```

> **Note:** The cron schedule `30 19 * * *` is 19:30 UTC = 00:30 IST (India Standard Time = UTC+5:30).

---

## 10. Coding Standards & Conventions

### TypeScript

- Strict mode enabled (`"strict": true` in tsconfig).
- No `any` types — use proper generics or `unknown` with type guards.
- All API responses typed with Zod schemas for runtime validation.
- Use `const` assertions where applicable.

### File Naming

| Type | Convention | Example |
|---|---|---|
| Components | PascalCase | `WorkerTable.tsx`, `FilingWizard.tsx` |
| Utilities | kebab-case | `eligibility-engine.ts`, `csv-parser.ts` |
| API routes | kebab-case | `route.ts` (Next.js convention) |
| Types | PascalCase | `api.ts`, `domain.ts` |
| Tests | Same as source + `.test.ts` | `eligibility-engine.test.ts` |

### API Route Conventions

- All routes under `/api/v1/` for versioning.
- Use Next.js App Router route handlers (`route.ts`).
- Always validate request body with Zod schemas.
- Always check RBAC permissions before processing.
- Always log to `AuditLog` for state-changing operations.
- Always return consistent JSON response format.

### Database Conventions

- All tables use UUID primary keys (`@id @default(uuid())`).
- All tables have `createdAt` and `updatedAt` timestamps.
- Use `@@index` for frequently queried fields.
- Use `@@unique` for natural keys.
- Soft-delete via `isActive` flag rather than `DELETE` operations on Workers.
- Financial values use `Decimal` type with explicit precision.
