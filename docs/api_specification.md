# API Specification
## Gig Worker Social Security Compliance Platform

**Version:** 2.0
**Base URL:** `http://localhost:3000/api/v1` (development)
**Authentication:** Supabase cookie sessions (no JWT bearer tokens — see §0)
**Content-Type:** `application/json` (except `POST /ledger/upload`, which is `multipart/form-data`)
**Date:** 12 September 2026

> This document describes the API **as implemented**. There are 19 route files under `app/src/app/api/v1/`. Anything not listed here does not exist — in particular there is no `POST /auth/login`, no `POST /auth/logout`, no `/contributions/*`, no `GET /ledger`, no PDF/email/XLSX endpoints, and no `users` CRUD.

---

## Table of Contents

0. [Authentication Model](#0-authentication-model)
1. [Authentication & Sessions](#1-authentication--sessions)
2. [Organizations](#2-organizations)
3. [Team](#3-team)
4. [Dashboard](#4-dashboard)
5. [Workers](#5-workers)
6. [Ledger Upload](#6-ledger-upload)
7. [Filings & Challans](#7-filings--challans)
8. [Notifications](#8-notifications)
9. [Exports](#9-exports)
10. [Partner Portal](#10-partner-portal)
11. [Free Compliance Audit](#11-free-compliance-audit)
12. [Cron](#12-cron)
13. [Eligibility Rules (shared)](#13-eligibility-rules-shared)
14. [Error Codes & Response Format](#14-error-codes--response-format)

---

## 0. Authentication Model

All data routes authenticate via **Supabase Auth cookie sessions**. The browser holds `sb-*` cookies (set by `signInWithPassword` on the login page); server routes resolve them with `getSessionData()` (`auth.users → profiles → organizations`) and scope every query to the caller's `organization_id` under PostgreSQL RLS.

- The login page calls `supabase.auth.signInWithPassword` **directly from the browser** — there is no `POST /auth/login` route.
- Sign-out calls `supabase.auth.signOut()` from the browser — there is no `POST /auth/logout` route.
- The **only** endpoint that uses an `Authorization` header is the cron job (§12).

**Standard envelope:**

```json
{ "success": true, "data": { "...": "..." } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Human-readable description." } }
```

There is no `requestId`, no `details[]` array, and no pagination object on any endpoint.

---

## 1. Authentication & Sessions

### `POST /auth/register`

Create auth user + organization + profile (all via the service role; partial failures roll back).

**Request Body:**

```json
{
  "email": "ops@quickdrop.in",
  "password": "••••••••",
  "fullName": "Rajesh Kumar",
  "companyName": "QuickDrop Logistics Pvt. Ltd.",
  "sector": "LOGISTICS_DELIVERY",
  "cinOrRegistration": "U74999MH2024PTC123456",
  "gstin": "27AABCQ1234A1Z5"
}
```

**Validation Rules:**
- `email` + `companyName` required. Email must be a work domain (blocks gmail, yahoo, outlook, hotmail, aol, icloud, mail, protonmail, yandex, rediffmail) → `400 WORK_EMAIL_REQUIRED`.
- `password`: min 8 chars, ≥1 uppercase, ≥1 digit → `400 WEAK_PASSWORD`.
- Duplicate email → `409 EMAIL_TAKEN`. New orgs are created with `is_trial_audit: true`; email is auto-confirmed (no verification email is sent).

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "ops@quickdrop.in",
      "fullName": "Rajesh Kumar",
      "role": "ORG_ADMIN",
      "organizationId": "uuid"
    }
  }
}
```

### `GET /auth/me`

Current session user + organization (cookie auth; `401` when signed out).

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "ops@quickdrop.in",
      "fullName": "Rajesh Kumar",
      "role": "ORG_ADMIN",
      "organizationId": "uuid"
    },
    "organization": {
      "id": "uuid",
      "legalName": "QuickDrop Logistics Pvt. Ltd.",
      "cin": "U74999MH2024PTC123456",
      "gstin": "27AABCQ1234A1Z5",
      "sector": "LOGISTICS_DELIVERY",
      "annualTurnover": 128000000,
      "annualWorkerPayouts": 74500000,
      "isTrialAudit": true
    }
  }
}
```

---

## 2. Organizations

### `GET /organizations`

Own organization profile (used by Settings).

**Response `200 OK`:** `{ success: true, data: { id, legalName, sector, cin, gstin, registeredAddress, annualTurnover } }`

### `PATCH /organizations`

Update own organization. Accepts `legalName`, `sector`, `cin`, `gstin`, `registeredAddress` (all optional; empty strings clear to null). `sector` must be one of `RIDE_HAILING`, `FOOD_DELIVERY`, `LOGISTICS_DELIVERY`, `MARKETPLACE_FREELANCE`, `HEALTHCARE_PERSONAL_SERVICES`, `OTHER` → else `400 VALIDATION_ERROR`. No role check beyond authentication. Returns the updated profile shape.

---

## 3. Team

### `GET /team`

Compliance team = `profiles` rows attached to the caller's organization.

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "members": [{ "id": "uuid", "name": "Rajesh Kumar", "email": "ops@quickdrop.in", "role": "ORG_ADMIN" }]
  }
}
```

There are no invite / role-change / remove endpoints; membership is created at registration.

---

## 4. Dashboard

### `GET /dashboard/overview`

Workforce stats, latest-filing financial snapshot, and the next open deadline.

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalWorkers": 8,
      "eligibleWorkers": 4,
      "approachingWorkers": 3,
      "inactiveWorkers": 1,
      "eligiblePercentage": 50
    },
    "financials": {
      "turnoverQ2": 38500000,
      "payoutQ2": 21400000,
      "cessRatePercent": 1.5,
      "calculatedCessQ2": 577500,
      "payoutCapQ2": 1070000,
      "netCessPayableQ2": 577500,
      "totalCessPaidYTD": 2406000
    },
    "statutoryDeadline": {
      "filingName": "Form-XX (Quarterly Turnover Return)",
      "quarter": "Q2 FY 2025-2026",
      "dueDate": "2025-10-31",
      "daysRemaining": 49,
      "status": "UPCOMING",
      "penaltyRiskRate": "1% compounding per month under Section 114(4)"
    },
    "recentFilings": [],
    "complianceScore": 75,
    "riskLevel": "MEDIUM"
  }
}
```

Notes: `financials` reflect the most recent filing (zeros when none exist). `statutoryDeadline` tracks the nearest-due open filing; when nothing is open, all date fields are `null` and `status` is `"NO_OPEN_FILINGS"`. `recentFilings` holds up to 3 `FilingItem` objects (§7).

### `GET /dashboard/eligibility`

Workforce with day counts, progress gauges, and counts.

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "total": 8,
    "counts": { "eligible": 4, "approaching": 3, "inactive": 1, "crossPlatformDeclared": 2 },
    "workers": [
      {
        "id": "uuid",
        "aggregatorWorkerId": "QM-DEL-8901",
        "fullName": "Rajesh Kumar",
        "maskedAadhaar": "XXXX-XXXX-4921",
        "uan": "101239847102",
        "daysInLast90": 92,
        "cumulativeDaysFY": 145,
        "otherPlatformDays": 0,
        "status": "ELIGIBLE",
        "progressTo90": 100,
        "progressTo120": 100,
        "crossPlatformDeclared": false,
        "lastActiveDate": "2026-09-12"
      }
    ],
    "statutoryRule": "Rule 28 — Engagement threshold of 90 days in the rolling 90-day window or 120 cumulative days across aggregators"
  }
}
```

`uan` is `null` when unlinked. Directory `status` is `ELIGIBLE | APPROACHING | INACTIVE` (`ELIGIBLE_MULTI_AGGREGATOR` is folded into `ELIGIBLE` for display).

---

## 5. Workers

### `GET /workers`

**Query Parameters:** `search` (name, worker ID, UAN, Aadhaar last-4 — substring), `status` (`ELIGIBLE | APPROACHING | INACTIVE | ALL`-ish; exact match on directory status), `sector`. No pagination.

**Response `200 OK`:** `{ success: true, data: { workers: WorkerRecord[], total: number } }`

`WorkerRecord`: `id, aggregatorWorkerId, fullName, aadhaarLast4, maskedAadhaar, uan?, phone?, sector` (org sector), `state, status, daysInLast90, cumulativeDaysFY, grossPayoutFY, otherPlatformDays, lastActiveDate, crossPlatformDeclared, registeredAt`.

### `POST /workers`

```json
{
  "aggregatorWorkerId": "QM-DEL-9102",
  "fullName": "Ramesh Kumar",
  "aadhaarNumber": "234567891234",
  "uan": "101994821099",
  "phone": "+91 98111 22233",
  "state": "DELHI"
}
```

Worker ID (`workerInternalCode` or `aggregatorWorkerId`), full name, and a 12-digit `aadhaarNumber` are required (`400 VALIDATION_ERROR`, `400 INVALID_AADHAAR`). Aadhaar is stored masked only; `phone` is stored as-is in `phone_encrypted` (**plaintext** — there is no field encryption). The worker starts `INACTIVE` with one seeded active day. Returns the created `WorkerRecord` (`200 OK`).

### `GET /workers/:id`

```json
{
  "success": true,
  "data": {
    "worker": {
      "id": "uuid",
      "aggregatorWorkerId": "QM-DEL-8901",
      "fullName": "Rajesh Kumar",
      "aadhaarLast4": "4921",
      "maskedAadhaar": "XXXX-XXXX-4921",
      "state": "DELHI",
      "status": "ELIGIBLE",
      "registrationStatus": "REGISTERED_ON_ESHRAM",
      "isActive": true,
      "registeredAt": "2024-04-10"
    },
    "recentEngagementDays": [{ "date": "2026-09-12", "active": true, "payout": 950 }],
    "declarations": [
      { "id": "uuid", "platformName": "Zomato Logistics", "daysReported": 15, "period": "2025-2026", "verified": false, "submittedAt": "..." }
    ]
  }
}
```

The 30-day calendar is built from real ledger rows (days with rows are active; hours/trip counts are not captured and never invented). `verified` reflects whether a profile verified the declaration. `404 NOT_FOUND` for other tenants' workers.

### `PATCH /workers/:id`

Partial update: `fullName`, `workerInternalCode`, `uan`, `maskedAadhaar`, `phone`, `state`, `registrationStatus`, `eligibilityStatus`/`status`, `isActive`. Returns the mapped worker. Unknown IDs (or other tenants') → `404`.

### `POST /workers/:id/declarations`

Record cross-platform declared days (JSON, no file upload).

```json
{ "otherPlatformName": "Zomato Logistics", "declaredDays": 15, "periodStart": "2025-04-01", "periodEnd": "2025-06-30" }
```

`declaredDays` must be a non-negative number (`400 VALIDATION_ERROR`). The declaration lands on the worker's **latest** FY aggregate; eligibility is recomputed with the shared engine and applied **promote-only** (a declaration never demotes). `periodStart/End` are echoed, not stored (the table has no such columns).

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "worker": { "id": "uuid", "aggregatorWorkerId": "QM-DEL-8901", "status": "ELIGIBLE", "cumulativeDaysFY": 160, "otherPlatformDays": 15, "crossPlatformDeclared": true },
    "declaration": { "id": "uuid", "workerId": "uuid", "otherPlatformName": "Zomato Logistics", "declaredDays": 15, "status": "RECORDED", "statutoryRule": "Rule 28(2) Cross-Platform Day Aggregation" }
  }
}
```

---

## 6. Ledger Upload

### `POST /ledger/upload`

`multipart/form-data` with `file` (CSV only) and `format` (`daily_ledger` | `summary_backfill`). FY is server-derived; one `source_batch_id` per upload. Insert failures are reported, not hidden.

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "filename": "sept-week2.csv",
    "format": "daily_ledger",
    "totalRows": 120,
    "validCount": 118,
    "errorCount": 2,
    "failedCount": 0,
    "ingestErrors": [],
    "preview": [{ "rowNumber": 1, "workerId": "QM-DEL-9901", "...": "..." }]
  }
}
```

Accepted daily columns: `worker_id, worker_name, uan, aadhaar_last4|aadhaar, date|engagement_date, hours_worked|hours, gross_payout|payout, platform_turnover_attributed|turnover, trip_or_gig_count|trips`. Backfill columns: `worker_id, worker_name, uan, aadhaar_last4, period_start, period_end, total_active_days, total_payout, other_platform_days`. Missing file → `400 NO_FILE`; processing failure → `500 INGESTION_ERROR`.

---

## 7. Filings & Challans

`FilingItem`: `id, financialYear, quarter?, filingType (FORM_XX_QUARTERLY | FORM_XXI_ANNUAL), turnoverAmount, payoutAmount, ratePercent, calculatedCess, payoutCapAmount, finalCessPayable, eligibleWorkerCount, totalWorkerCount, dueDate, status (DRAFT | SUBMITTED | PAID | OVERDUE), submittedAt?, challanId?, challanNumber?, challanUrl?, bankName?, utrNumber?, sha256Hash?, paymentDate?, challanVerified?`.

### `GET /filings`

`{ success: true, data: { filings: FilingItem[], total: number } }` — newest first, no filters.

### `POST /filings`

```json
{
  "financialYear": "2025-2026",
  "quarter": "Q2",
  "filingType": "FORM_XX_QUARTERLY",
  "turnoverAmount": 38500000,
  "payoutAmount": 21400000,
  "ratePercent": 1.5,
  "eligibleWorkerCount": 1410,
  "totalWorkerCount": 1850
}
```

Creates a `DRAFT` filing with server-computed cess (`min(turnover × rate, payouts × 5%)`). Due dates derive from the FY: annual → 30 Jun (end year); Q1 → 31 Jul, Q2 → 31 Oct (start year); Q3 → 31 Jan, Q4 → 30 Apr (end year). Re-posting an existing `(org, FY, form, quarter)` refreshes that draft instead of duplicating. Returns the `FilingItem` (`200 OK`).

### `GET /filings/:id`

Returns one `FilingItem` with its latest challan attached. `404 NOT_FOUND` otherwise.

### `PATCH /filings/:id`

Partial update (`status`, `financialYear`, `quarter`, `filingType`, `dueDate`, amounts, counts, `filedAt`, `lockedHashSha256`). `status` outside the enum → `400 VALIDATION_ERROR`. **PAID filings are locked** → `409 FILING_LOCKED`. Unknown IDs → `404`.

### `POST /filings/:id/challan`

Deposit a challan (JSON, no file upload — `document_url` stays null).

```json
{
  "challanNumber": "CHL-2025-Q2-78192",
  "bankName": "State Bank of India — Treasury Branch",
  "utrNumber": "SBIN00918273645",
  "amount": 577500,
  "paymentDate": "2025-09-12"
}
```

Only `challanNumber` + `utrNumber` are required (`400`); `amount` defaults to the filing's liability, `paymentDate` to today. The challan is SHA-256-hashed (`challan:utr:amount:date:timestamp`), the filing flips to `PAID`, and an audit event is logged.

**Response `200 OK`:** `{ success: true, data: { challan: ChallanItem, filingStatus: "PAID", auditLocked: true } }`

`ChallanItem`: `id, filingId, challanNumber, bankName, utrNumber, amount, paymentDate, verified, lockedAt, sha256Hash, documentUrl`.

---

## 8. Notifications

### `GET /notifications`

`{ success: true, data: { notifications: NotificationItem[], unreadCount, total } }` — newest first, no filters.

`NotificationItem`: `id, title, message, type (STATUTORY_DEADLINE | WORKER_THRESHOLD | PAYMENT_CONFIRMATION | REGULATORY_UPDATE), read, createdAt, actionUrl?` (regulatory updates carry no action URL).

### `PATCH /notifications`

Body `{ "id": "<optional>" }` — with `id`, marks one notification read (returns it); without, marks all read. Returns `{ success: true, ... }`.

---

## 9. Exports

### `GET /exports/workers`

CSV download (`Content-Disposition: attachment`) of the compliance roster: worker ID, name, masked Aadhaar, UAN, phone, sector, state, status, 90-day/FY counts, payouts, cross-platform days. No parameters.

### `GET /exports/audit-report`

Live JSON dossier for inspectors/print:

```json
{
  "success": true,
  "data": {
    "reportGeneratedAt": "...",
    "statutoryReference": "Section 114 & Rule 32 of the Code on Social Security 2020",
    "organization": { "id": "uuid", "legalName": "...", "cin": "...", "gstin": "...", "sector": "...", "annualTurnover": 0, "registeredAddress": "..." },
    "summary": { "totalRegisteredWorkers": 0, "eligibleWorkersCount": 0, "totalFilingsCompleted": 0, "totalCessPaidINR": 0, "complianceScore": 0, "auditStatus": "COMPLIANT | REVIEW_REQUIRED" },
    "filings": [],
    "challans": [],
    "immutableAuditTrail": []
  }
}
```

---

## 10. Partner Portal

### `GET /partner/clients`

Client organizations with active, unrevoked grants for the caller's org. No demo fallback — empty grants return `"clients": []`.

```json
{
  "success": true,
  "data": {
    "partnerFirm": "Calling Org Legal Name",
    "totalClients": 1,
    "clients": [
      {
        "id": "uuid",
        "legalName": "...",
        "sector": "...",
        "cin": "...",
        "activeWorkers": 0,
        "eligibleWorkers": 0,
        "nextFilingDue": "2025-10-31",
        "complianceStatus": "COMPLIANT | ATTENTION_REQUIRED | OVERDUE",
        "riskScore": 0,
        "openCessLiability": 0
      }
    ]
  }
}
```

`nextFilingDue` is `null` when the client has no open filings. `complianceStatus` derives from open/overdue filings. There are no client-switch, grant, or revoke endpoints (grants are managed directly in `partner_client_access`).

---

## 11. Free Compliance Audit

### `POST /free-audit`

Public marketing estimator (no auth). Persists a lead row best-effort; a lead failure never fails the audit.

```json
// Request
{
  "companyName": "QuickRide Mobility Pvt Ltd",
  "contactEmail": "legal@quickride.in",
  "contactPhone": "+91 98111 22233",
  "sector": "RIDE_HAILING",
  "workerCount": 2500,
  "annualTurnover": 80000000,
  "annualPayout": 45000000,
  "currentFilingPractices": "SPREADSHEETS"
}

// Response 200 OK
{
  "success": true,
  "data": {
    "lead": { "companyName": "...", "contactEmail": "...", "contactPhone": "...", "sector": "..." },
    "scorecard": {
      "complianceScore": 70,
      "riskRating": "MEDIUM RISK",
      "estimatedEligibleWorkers": 1900,
      "annualTurnover": 80000000,
      "estimatedAnnualCess": 1200000,
      "payoutCap": 2250000,
      "isCappedByPayout": false,
      "potentialPenaltyRiskAnnual": 144000,
      "identifiedGaps": ["..."],
      "recommendations": ["...", "...", "..."]
    }
  }
}
```

The scorecard is a documented heuristic (baseline 85, −35 no-filings / −15 manual tracking, 0.76 eligible share, 12% interest proxy) — not a statutory determination.

---

## 12. Cron

### `POST /cron/evaluate-eligibility`

Nightly eligibility sync. Two auth modes: server-to-server with `Authorization: Bearer <CRON_SECRET>`, or a signed-in user's session (dashboard "Trigger Nightly Audit Job" button) — session runs are scoped to the caller's org, secret runs are global. No schedule is committed in-repo (no `vercel.json`); wire your scheduler to this path.

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "evaluatedWorkers": 8,
    "updatedWorkers": 1,
    "newlyEligibleCount": 1,
    "timestamp": "2026-09-12T00:30:00.000Z",
    "statutoryReference": "Section 114 / Rule 28 Nightly Rolling Threshold Job"
  }
}
```

The job reconciles stored statuses against the shared engine (§13) in **both** directions and writes a per-org `CRON_ELIGIBILITY_EVALUATED` audit row. It sends no emails and accrues no penalties.

---

## 13. Eligibility Rules (shared)

Single source of truth: `app/src/lib/eligibility-engine.ts`, used by the cron job, CSV ingestion, and declarations.

| Condition | Status |
|---|---|
| `internalDays ≥ 90` | `ELIGIBLE` |
| `internalDays + declaredExternal ≥ 120` **and** `declaredExternal > 0` | `ELIGIBLE_MULTI_AGGREGATOR` |
| `internalDays ≥ 75` | `APPROACHING` |
| otherwise | `INACTIVE` |

The cron evaluates `max(rolling-90-day count, FY internal days)` as the single-platform figure. Ingestion and declaration paths are **promote-only** (they add information, so they never demote); only the cron syncs both ways.

---

## 14. Error Codes & Response Format

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Human-readable description." } }
```

| HTTP Status | Error Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Bad body: missing fields, bad enum, negative declared days |
| `400` | `WORK_EMAIL_REQUIRED` | Non-corporate email at registration |
| `400` | `WEAK_PASSWORD` | Password policy failure (reasons joined in message) |
| `400` | `INVALID_AADHAAR` | Aadhaar not exactly 12 digits |
| `400` | `NO_FILE` | Upload without a file part |
| `401` | `UNAUTHORIZED` | No session (`"Not authenticated"`) or bad cron secret |
| `404` | `NOT_FOUND` | Unknown ID (always org-scoped — other tenants' rows 404) |
| `409` | `EMAIL_TAKEN` | Duplicate registration email |
| `409` | `FILING_LOCKED` | PATCH on a PAID filing |
| `429` | `RATE_LIMITED` | Fixed-window cap hit on public POST routes (register 10/min, free-audit 5/min, ledger upload 10/min per IP; in-memory, single-instance) |
| `500` | `INTERNAL_ERROR` | Unexpected failure (DB message included where safe) |
| `500` | `INGESTION_ERROR` | CSV processing failure |
| `500` | `AUDIT_FAILED` | Free-audit computation failure |
| `500` | `ORG_CREATE_FAILED` / `PROFILE_CREATE_FAILED` | Registration rollback path |

There is **minimal rate limiting** (in-memory fixed window in `src/proxy.ts`, single-instance only): `POST /auth/register` 10/min, `POST /free-audit` 5/min, `POST /ledger/upload` 10/min per IP. There is no `requestId`, no `details[]`, no pagination envelope, and no `403`/`413`/`422` codes.
