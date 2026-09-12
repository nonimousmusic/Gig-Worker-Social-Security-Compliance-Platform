# Technical Architecture & Database Specification
## Gig Worker Social Security Compliance Platform (Code on Social Security, 2020)

**Document Version:** 2.0
**Date:** 12 September 2026
**Status:** As-built (post Supabase migration)
**Reference Document:** [Product Requirements Document](../prd.md)

---

## 1. Executive Technical Summary

This specification describes the engineering architecture, data pipelines, privacy safeguards, computational engines, and Supabase/PostgreSQL schema of the **Gig Worker Social Security Compliance Platform** **as implemented**.

The platform enables Indian aggregators (ride-hailing, food delivery, logistics, e-marketplaces, home services) to fulfill statutory compliance under the **Code on Social Security, 2020** and the **Social Security (Central) Rules, 2026**.

The data layer is **Supabase**: PostgreSQL with Row-Level Security on every table, Supabase Auth cookie sessions, and three server-approved client roles (browser / server / service-role). There is no Prisma, no custom JWT service, and no field-level encryption module.

---

## 2. High-Level System Architecture

### 2.1 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Application Framework** | **Next.js 16 (App Router) & TypeScript** (React 19) | Unified full-stack architecture, server route handlers, SSR/client separation. |
| **Database & Auth** | **Supabase (PostgreSQL + Auth + RLS)** via `@supabase/ssr` + `@supabase/supabase-js` | Hosted Postgres, cookie sessions, tenant isolation enforced in the database. |
| **Styling & UI** | **TailwindCSS v4 + Lucide Icons** (+ `next/font`) | Utility-first dark enterprise UI with zero runtime CSS overhead. |
| **CSV Parsing** | **PapaParse** | Header-tolerant CSV validation for both ingestion formats. |
| **Background Scheduling** | **External scheduler → `POST /cron/evaluate-eligibility`** | No in-repo scheduler; any cron provider hits one endpoint with `CRON_SECRET`. |
| **Email** | **None** | No transactional email exists. Alerts are in-app (`notification_logs`). |
| **PII posture** | **Aadhaar masking only** | Last-4 masking at ingestion; phones stored **plaintext** (known gap — see §4.3). |

### 2.2 System Architecture Diagram

```
                              ┌────────────────────────────────────────────────────────┐
                              │                    Browser Client                      │
                              │  - Aggregator Ops Portal                               │
                              │  - Advisory Partner Multi-Client Console               │
                              │  - Free Compliance Audit Funnel                        │
                              └───────────────────────────┬────────────────────────────┘
                                                          │ HTTPS
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Next.js 16 Full-Stack Application (app/src)                                                                     │
│                                                                                                                 │
│ ┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐  ┌───────────────────┐ │
│ │  Auth (Supabase)         │  │ Ingestion & Sanitizer    │  │ Eligibility Engine       │  │ Filing Wizard &   │ │
│ │  - Work email gate       │  │ - CSV-only PapaParse     │  │ - 90-day rolling window  │  │ Challan Locker    │ │
│ │  - Cookie sessions       │  │ - Aadhaar auto-masking   │  │ - 120-day cumulative     │  │ - Form-XX / XXI   │ │
│ │  - proxy.ts guard        │  │ - Hybrid ledger ingest   │  │ - Promote-only updates   │  │ - SHA-256 lock    │ │
│ └──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘  └───────────────────┘ │
│                                              │                                                                  │
│                                              ▼                                                                  │
│                        ┌───────────────────────────────────────────┐                                            │
│                        │ Contribution Calculator (Sec 114 Matrix)  │                                            │
│                        │ - 1%–2% Turnover Basis (default 1.5%)     │                                            │
│                        │ - 5% Worker Payments Cap Enforcement      │                                            │
│                        └───────────────────────────────────────────┘                                            │
└──────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────┘
                                               │ supabase-js (RLS-enforced)
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Supabase PostgreSQL & Data Vault                                                                                │
│                                                                                                                 │
│  [organizations]  ───<  [profiles]           [workers] ──────────< [daily_engagement_ledger]                   │
│        │                     │                    │                          │                                    │
│        └──< [partner_client_access]              ├───< [worker_declarations] │                                   │
│                                                  │                          │                                    │
│  [filing_records] ───< [filing_challans]        └───< [worker_annual_aggregates]                                 │
│                                                                                                                 │
│  [notification_logs]   [audit_logs] (append-only)   [audit_leads] (marketing funnel)                            │
│                                                                                                                 │
│  RLS: tenant USING/WITH CHECK on every table · service_role bypasses RLS (register/cron/seed only)             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                 ▲
                                 │ Nightly eligibility sync (cron secret or session)
┌────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────┐
│ POST /cron/evaluate-eligibility                                                                                 │
│ - Reconciles stored statuses against the shared engine (both directions)                                        │
│ - Writes per-org CRON_ELIGIBILITY_EVALUATED audit rows · sends no email · accrues no penalties                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Request Authentication Flow

```
Browser ──signInWithPassword──▶ Supabase Auth ── sb-* cookies ──▶ Next.js route
                                                                       │
                                              getSessionData(): getUser │
                                                → profiles → organizations
                                                                       │
                                              requireTenant() ──▶ RLS-scoped queries
```

Session refresh + dashboard/partner page guards live in `src/proxy.ts` (`export function proxy()`, Next 16 convention). API routes rely on `requireTenant()` (401 `"Not authenticated"` when signed out).

---

## 3. Core Engine Specifications

### 3.1 Eligibility & Days-Worked Engine

Single source of truth: `src/lib/eligibility-engine.ts`, consumed by the cron job (full sync), CSV ingestion and declarations (promote-only).

1. **Definition of Engagement:** a worker is "engaged" on any calendar date with a ledger row. (Note: ingestion counts ledger rows as days even at ₹0 payout — the `> ₹0` rule from earlier specs is **not** enforced in code.)
2. **Single-platform figure:** the cron evaluates `max(rolling-90-day distinct count, FY internal days)`; ingestion paths use FY internal days.
3. **Statuses:**

| Condition | Status |
|---|---|
| `internal ≥ 90` | `ELIGIBLE` |
| `internal + external ≥ 120` **and** `external > 0` | `ELIGIBLE_MULTI_AGGREGATOR` |
| `internal ≥ 75` | `APPROACHING` |
| otherwise | `INACTIVE` |

There is no 85-day / `AT_RISK_CRITICAL` tier and no `NOT_YET_ELIGIBLE` / `APPROACHING_THRESHOLD` values anywhere in code or schema. The directory UI folds `ELIGIBLE_MULTI_AGGREGATOR` into `ELIGIBLE`.

### 3.2 Contribution Calculator & Statutory Capping Engine (Section 114)

`src/lib/contribution-calc.ts` — pure function, also used by the dashboard simulator directly:

$$\text{Contribution}_{\text{Turnover Basis}} = \text{Turnover}_{\text{FY}} \times \text{Rate}_{\text{sector}}$$
$$\text{Ceiling}_{\text{Statutory}} = \text{Total Worker Payments}_{\text{FY}} \times 0.05$$
$$\text{Statutory Obligation} = \min\left( \text{Contribution}_{\text{Turnover Basis}}, \text{Ceiling}_{\text{Statutory}} \right)$$

Rates are **hardcoded** (default 1.5%, simulator offers 1.0–2.0%). There is no `ContributionRateConfig` table, no admin rate panel, and no gazette-driven recalculation — §5.2 of the regulatory reference notwithstanding, treat any "config matrix" language as aspirational.

### 3.3 Statutory Filing Lifecycle & Challan Locker

1. **Form-XX (Quarterly):** due dates derive from the FY — Q1 → 31 Jul, Q2 → 31 Oct (start year); Q3 → 31 Jan, Q4 → 30 Apr (end year). The 4-step wizard creates a `DRAFT` filing with server-computed cess.
2. **Form-XXI (Annual):** due 30 Jun (end year). Supported by the API; the UI wizard only creates quarterly filings.
3. **Challan lock:** JSON-only deposit (`challanNumber` + `utrNumber` required; amount defaults to liability). The payload is SHA-256-hashed (`challan:utr:amount:date:timestamp`), the filing flips to `PAID`, and `PATCH` on PAID filings returns `409 FILING_LOCKED`. No receipt file is uploaded (`document_url` stays null); there is no BSR/CIN/receipt model and no Form-XXII flow.
4. **Late penalty:** 1% per month, fractions rounded up (12% p.a. **simple**) — `src/lib/penalty-calc.ts`. (The overview API's `penaltyRiskRate` string says "compounding"; the math is simple. Trust the math.)

---

## 4. Privacy, Security & DPDP Act 2023 Implementation

1. **Aadhaar Masking Pipeline (enforced):**
   - Raw 12-digit Aadhaar is validated (`^[2-9]\d{11}$`) and reduced to `XXXX-XXXX-1234` server-side at worker creation; CSV ingestion keeps only the last 4 characters. Raw values are never persisted. Implemented in `src/lib/aadhaar-masking.ts`, `src/lib/csv-parser.ts`.
2. **Primary Identity: e-Shram UAN:** the 12-digit UAN is the non-sensitive statutory identifier, stored plaintext and indexed.
3. **PII Field-Level Encryption: NOT IMPLEMENTED.** Phone numbers are stored **plaintext** in `phone_encrypted`. There is no encryption module, no `ENCRYPTION_KEY`, no KMS, and no bank columns at all. The column name is a legacy misnomer. Any doc claiming AES-256 field encryption is wrong — this is the top security gap.
4. **Audit Provenance:** state-changing routes log to append-only `audit_logs` (no UPDATE/DELETE RLS policies). `logAuditEvent` failures are console-logged server-side; there is no hash chain and no before/after diff envelope.

---

## 5. Multi-Tenancy & Partner Access

- Each company is an isolated `organizations` row (type `AGGREGATOR` or `ADVISORY_PARTNER`); every data table carries `organization_id` (directly or via join) with RLS `USING`/`WITH CHECK` against `current_org_id()`.
- Partner reads additionally pass through `can_access_org()` (own org **or** an unrevoked `partner_client_access` grant).
- The partner portal lists granted clients with live worker/filing aggregates. There is **no client impersonation/switching, no grant/revoke API, no invite flow, and `access_level` is read but not enforced** — grants are managed directly in the table.
- Roles in use: `ORG_ADMIN` (registration default), plus `OPS_MANAGER`, `FINANCE_LEAD`, `EXTERNAL_ADVISOR` enum values. No route enforces role gates beyond authentication; there is no team invite or role-change UI/API.

---

## 6. Lead-Gen Funnel: Public Free Audit

1. Visitor opens `/free-audit` (no account, no email verification, no CSV upload).
2. One JSON form (company, contact, sector, headcount, turnover, payouts, filing posture) → `POST /free-audit`.
3. Server returns a heuristic scorecard (baseline 85, −35 no-filings / −15 manual tracking, 0.76 eligible share, 12% interest proxy) and best-effort persists an `audit_leads` row.
4. No PDF report, no 500-row sample, no trial provisioning, no pricing flow.

---

## 7. PostgreSQL Schema (Supabase SQL — source of truth)

Migrations live in `app/supabase/migrations/` (`0001_init.sql`, `0002_org_registered_address.sql`, `0003_audit_leads.sql`), applied with `supabase db push` from `app/`. Seed data in `app/supabase/seed.sql` (idempotent fixed-UUID demo org + workers + filings). Demo login user via `npm run supabase:seed` (`scripts/seed-demo-user.mjs`, default `compliance@quickmove.in` / `Compliance@2025`).

Key tables (see migration files for full DDL + RLS policies):

- `organizations(id, name, type, sector, cin_or_registration, gstin, annual_turnover, annual_worker_payouts, is_trial_audit, registered_address)` — `sector` enum includes `OTHER`; `type` is `AGGREGATOR | ADVISORY_PARTNER`.
- `profiles(id = auth.users.id, organization_id, email, full_name, role, is_email_verified)` — no local password hash; **no INSERT policy for authenticated clients** (registration/seed use the service role).
- `partner_client_access(partner_organization_id, client_organization_id, access_level, granted_at, revoked_at)` — `access_level`: `AUDITOR_READ_ONLY | COMPLIANCE_MANAGER | FULL_ADMIN`.
- `workers(..., worker_internal_code, full_name, uan, masked_aadhaar, phone_encrypted [plaintext], state, registration_status [REGISTERED_ON_ESHRAM | PENDING_SUBMISSION | GAP_FLAGGED], eligibility_status [ELIGIBLE | APPROACHING | INACTIVE | ELIGIBLE_MULTI_AGGREGATOR, default INACTIVE], onboarded_date, exit_date, is_active)` — unique `(organization_id, worker_internal_code)`.
- `daily_engagement_ledger(worker_id, engagement_date, gross_earnings, trip_or_task_id, source_batch_id)` — unique `(worker_id, engagement_date, trip_or_task_id)`.
- `worker_annual_aggregates(worker_id, financial_year, internal_days_worked, declared_external_days, total_cumulative_days, total_gross_earnings, is_eligible)` — unique `(worker_id, financial_year)`.
- `worker_declarations(worker_id, financial_year, external_aggregator, declared_days_count, declaration_doc_url, declared_date, verified_by_profile_id)` — no period columns, no provenance tag column.
- `filing_records(..., financial_year, quarter (nullable; NULL = annual), form_type [FORM_XX_QUARTERLY | FORM_XXI_ANNUAL | FORM_XXII_REFUND], due_date, status [DRAFT | SUBMITTED | PAID | OVERDUE], reported_turnover, reported_worker_payouts, applied_rate_pct, assessed_contribution, statutory_ceiling_amount, final_liability_amount, provisional_adjusted, balance_payable, accrued_interest_penalty, eligible_worker_count, total_worker_count, generated_form_pdf_url, locked_hash_sha256, filed_at)` — unique `(organization_id, financial_year, form_type, COALESCE(quarter,''))`.
- `filing_challans(filing_record_id, challan_number, bank_name, utr_number, amount_deposited, payment_date, verified, locked_at, sha256_hash, document_url)` — no CIN/BSR/receipt columns.
- `notification_logs(organization_id, recipient_email, type [STATUTORY_DEADLINE | WORKER_THRESHOLD | PAYMENT_CONFIRMATION | REGULATORY_UPDATE], subject, content_summary, sent_at, delivery_status, read)`.
- `audit_logs(organization_id, profile_id, actor_email, action, entity_type, entity_id, details_json, ip_address, user_agent)` — append-only by policy absence.
- `audit_leads(company_name, contact_email, contact_phone, sector, worker_count, annual_turnover, annual_payout, filing_practices, compliance_score)` — anon/authenticated INSERT-only.

There is no `ContributionRateConfig`, no `User.passwordHash`, no email/digest/PDF pipeline tables.

---

## 8. Ingestion Pipeline & Data Contracts

### 8.1 Daily Activity Ledger CSV

| Header (aliases) | Validation |
|---|---|
| `worker_id` | Required; matches existing worker or auto-creates (`INACTIVE`) |
| `worker_name` | Required |
| `uan` | Optional |
| `aadhaar_last4` (`aadhaar`) | Optional; last 4 chars kept (`0000` fallback) |
| `date` (`engagement_date`) | Required, valid date |
| `hours_worked` (`hours`) | 0–24 |
| `gross_payout` (`payout`) | ≥ 0 (negative is an error, not an adjustment) |
| `platform_turnover_attributed` (`turnover`) | Optional, ≥ 0 |
| `trip_or_gig_count` (`trips`) | Optional int, default 1 |

Unknown workers are auto-created. Each valid row inserts one ledger row (`trip_or_task_id = workerId-date`) and bumps the FY aggregate; eligibility updates are promote-only. Re-uploads conflict on the unique key and surface as `failedCount`, not silent duplicates. One `source_batch_id` (`csv-<epoch-ms>`) per upload. CSV only (no XLSX), no dry-run mode, no batch listing endpoint. Canonical templates: `docs/csv_templates/`.

### 8.2 Historical Summary Backfill CSV

Headers: `worker_id, worker_name, uan, aadhaar_last4, period_start, period_end, total_active_days (0–366), total_payout (≥ 0), other_platform_days`. Merges into the FY aggregate (internal takes the max, externals/earnings accumulate). No provenance tag is stored for external days.

---

## 9. Nightly Eligibility Sync

`POST /api/v1/cron/evaluate-eligibility` — auth via `Authorization: Bearer <CRON_SECRET>` (global) or caller session (org-scoped, powers the dashboard button). No schedule is committed in-repo; point any scheduler at this path. The job recomputes every in-scope worker with the shared engine (single-platform figure = `max(rolling-90, FY internal)`), writes changes both ways, counts newly-eligible transitions, and logs per-org `CRON_ELIGIBILITY_EVALUATED` rows. It sends no email, accrues no penalties, and scans no filing deadlines.

---

## 10. Exports & Audit Dossier

- `GET /exports/workers` — CSV roster download, no parameters.
- `GET /exports/audit-report` — live JSON dossier (org header incl. `registeredAddress`, summary metrics, filings, challans, last 20 audit rows); the Reports page prints it via `window.print()`.
- There is no PDF generator (no Puppeteer), no expiring download links, no digest files, no BSR/CIN reconciliation section, and no standalone audit-log query endpoint.

---

## 11. Engineering Roadmap (as-built status)

| Phase | Scope | Status |
|---|---|---|
| **Phase 1** | Supabase schema + RLS, work-email registration, Aadhaar masking | ✅ Done |
| **Phase 2** | CSV ingestion (daily + backfill), shared 90/120 engine, declarations | ✅ Done |
| **Phase 3** | Filing wizard, challan SHA-256 lock, PAID immutability | ✅ Done (no PDF generation) |
| **Phase 4** | Nightly eligibility sync, partner read console | ✅ Done (no email dispatch, no RBAC enforcement) |
| **Phase 5** | Public free-audit estimator + lead capture | ✅ Done (no gating, no PDF, no trial provisioning) |
| **Next** | Field-level PII encryption, e-Shram sync (pending gov API), Form-XXII, XLSX/dry-run ingestion, rate limiting, PDF dossier | ❌ Open |
