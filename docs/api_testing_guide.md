# GigCessHQ — API Testing & Verification Guide

Test commands (PowerShell and cURL) with expected status codes and sample responses for the implemented API endpoints on `http://localhost:3000`. Full shapes: `docs/api_specification.md`.

> **Auth model first:** all data routes use Supabase **cookie sessions** — there is no `POST /auth/login` route and no bearer tokens (except the cron secret). The reliable way to test authenticated endpoints from a terminal is:
> 1. Register a user via the public `POST /api/v1/auth/register` (below).
> 2. Sign in once in the browser at `http://localhost:3000/login`.
> 3. Copy the `sb-*-auth-token` cookie value (DevTools → Application → Cookies).
> 4. Pass it on every call: PowerShell `-Headers @{ Cookie = "sb-...=..." }` / cURL `-H "Cookie: ..."`.
>
> Below, `$Cookie` / `$COOKIE` means that header. Unauthenticated calls return `401 { success:false, error:{ code:"UNAUTHORIZED", message:"Not authenticated" } }`.

Seed the demo org first if you want the bundled dataset: `supabase db seed` in `app/`, then `npm run supabase:seed` (creates `compliance@quickmove.in` / `Compliance@2025`, role `ORG_ADMIN`, org `00000000-0000-0000-0000-000000000001`).

---

## 1. Authentication Endpoints

### 1.1 Register (public)

- **Endpoint:** `POST /api/v1/auth/register`
- **Description:** Creates auth user + organization + profile. Email must be a work domain; password needs 8+ chars, 1 uppercase, 1 digit. No verification email is sent.

#### PowerShell
```powershell
$body = @{
    email = "ops@quickdrop.in"
    password = "Compliance@2025"
    fullName = "Rajesh Kumar"
    companyName = "QuickDrop Logistics Pvt. Ltd."
    sector = "LOGISTICS_DELIVERY"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

#### cURL
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"ops@quickdrop.in","password":"Compliance@2025","fullName":"Rajesh Kumar","companyName":"QuickDrop Logistics Pvt. Ltd.","sector":"LOGISTICS_DELIVERY"}'
```

#### Expected Response (200 OK)
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

Duplicate email → `409 EMAIL_TAKEN`. Weak password → `400 WEAK_PASSWORD`. Personal email → `400 WORK_EMAIL_REQUIRED`.

> There is **no login/logout API**. Sign-in happens in the browser (`supabase.auth.signInWithPassword`); sign-out calls `supabase.auth.signOut()`. Export the session cookie as described above for the calls below.

---

### 1.2 Session Info

- **Endpoint:** `GET /api/v1/auth/me`

#### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/me" -Method GET -Headers @{ Cookie = $Cookie }
```

#### Expected Response (200 OK)
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
      "cin": null,
      "gstin": null,
      "sector": "LOGISTICS_DELIVERY",
      "annualTurnover": null,
      "annualWorkerPayouts": null,
      "isTrialAudit": true
    }
  }
}
```

---

## 2. Dashboard Analytics Endpoints

### 2.1 Compliance Overview
- **Endpoint:** `GET /api/v1/dashboard/overview`
- **Description:** Workforce stats, latest-filing financials, and the next open deadline (nullable when nothing is open).

#### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/dashboard/overview" -Method GET -Headers @{ Cookie = $Cookie }
```

#### Expected shape (200 OK)
`{ success, data: { stats: { totalWorkers, eligibleWorkers, approachingWorkers, inactiveWorkers, eligiblePercentage }, financials: { turnoverQ2, payoutQ2, cessRatePercent, calculatedCessQ2, payoutCapQ2, netCessPayableQ2, totalCessPaidYTD }, statutoryDeadline: { filingName|null, quarter|null, dueDate|null, daysRemaining|null, status, penaltyRiskRate }, recentFilings[≤3], complianceScore, riskLevel } }`

---

### 2.2 Eligibility Engine Distribution
- **Endpoint:** `GET /api/v1/dashboard/eligibility`

#### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/dashboard/eligibility" -Method GET -Headers @{ Cookie = $Cookie }
```

Returns `{ total, counts: { eligible, approaching, inactive, crossPlatformDeclared }, workers: [...], statutoryRule }`; each worker carries `daysInLast90`, `cumulativeDaysFY`, `progressTo90/120`.

---

## 3. Worker Directory & Declarations

### 3.1 List Workers (with Search & Filter)
- **Endpoint:** `GET /api/v1/workers?status=ELIGIBLE&search=Rajesh`
- Params: `search` (name/ID/UAN/Aadhaar-last-4 substring), `status` (`ELIGIBLE|APPROACHING|INACTIVE`), `sector`. No pagination.

#### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/workers?status=ELIGIBLE" -Method GET -Headers @{ Cookie = $Cookie }
```

---

### 3.2 Add Worker (with Instant Aadhaar Masking)
- **Endpoint:** `POST /api/v1/workers`
- Requires worker ID, full name, 12-digit Aadhaar (stored masked only; `phone` is stored as-is).

#### PowerShell
```powershell
$newWorker = @{
    aggregatorWorkerId = "QM-DEL-9999"
    fullName = "Sunil Gavaskar"
    aadhaarNumber = "234567890123"
    uan = "101994821099"
    phone = "+91 98111 22233"
    state = "DELHI"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/workers" `
    -Method POST `
    -Body $newWorker `
    -ContentType "application/json" `
    -Headers @{ Cookie = $Cookie }
```

#### Expected Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "aggregatorWorkerId": "QM-DEL-9999",
    "fullName": "Sunil Gavaskar",
    "aadhaarLast4": "0123",
    "maskedAadhaar": "XXXX-XXXX-0123",
    "uan": "101994821099",
    "status": "INACTIVE"
  }
}
```

---

### 3.3 Worker Detail, Update & Declaration
- `GET /api/v1/workers/:id` → `{ worker, recentEngagementDays[30 real ledger days], declarations }`
- `PATCH /api/v1/workers/:id` → partial update (`uan`, `state`, `isActive`, …)
- `POST /api/v1/workers/:id/declarations` → JSON `{ otherPlatformName, declaredDays, periodStart?, periodEnd? }`; promote-only status update; declaration `status` is `"RECORDED"`

#### PowerShell
```powershell
$declaration = @{
    otherPlatformName = "Zomato Logistics"
    declaredDays = 15
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/workers/<worker-uuid>/declarations" `
    -Method POST `
    -Body $declaration `
    -ContentType "application/json" `
    -Headers @{ Cookie = $Cookie }
```

---

## 4. Organization & Team

- `GET /api/v1/organizations` → own org profile.
- `PATCH /api/v1/organizations` → `{ legalName?, sector?, cin?, gstin?, registeredAddress? }` (sector validated; `400` on bad value).
- `GET /api/v1/team` → `{ members: [{ id, name, email, role }] }` (read-only; no invite/role endpoints exist).

---

## 5. Statutory Filings & Challan Lock

### 5.1 Create Form-XX Filing Draft
- **Endpoint:** `POST /api/v1/filings`
- Due dates derive from the FY (Q1→31 Jul, Q2→31 Oct start-year; Q3→31 Jan, Q4→30 Apr end-year; annual→30 Jun). Re-posting an existing (FY, form, quarter) refreshes the draft.

#### PowerShell
```powershell
$filing = @{
    financialYear = "2025-2026"
    quarter = "Q2"
    filingType = "FORM_XX_QUARTERLY"
    turnoverAmount = 38500000
    payoutAmount = 21400000
    ratePercent = 1.5
    eligibleWorkerCount = 1410
    totalWorkerCount = 1850
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/filings" `
    -Method POST `
    -Body $filing `
    -ContentType "application/json" `
    -Headers @{ Cookie = $Cookie }
```

`GET /api/v1/filings` lists newest-first. `GET/PATCH /api/v1/filings/:id` reads/updates one; PATCH on a PAID filing → `409 FILING_LOCKED`.

---

### 5.2 Upload Challan & Cryptographic Lock
- **Endpoint:** `POST /api/v1/filings/:id/challan` (use a real filing UUID from §5.1 — e.g. the seeded Q2 DRAFT `10000000-0000-0000-0000-000000000102` before it is locked)

#### PowerShell
```powershell
$challan = @{
    challanNumber = "CHL-2025-Q2-88219"
    bankName = "State Bank of India — Treasury Branch"
    utrNumber = "SBIN00918273645"
    amount = 577500
    paymentDate = "2025-09-12"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/filings/<filing-uuid>/challan" `
    -Method POST `
    -Body $challan `
    -ContentType "application/json" `
    -Headers @{ Cookie = $Cookie }
```

#### Expected Response (200 OK)
```json
{
  "success": true,
  "data": {
    "challan": {
      "challanNumber": "CHL-2025-Q2-88219",
      "utrNumber": "SBIN00918273645",
      "amount": 577500,
      "verified": true,
      "sha256Hash": "a6f8b1c4e9..."
    },
    "filingStatus": "PAID",
    "auditLocked": true
  }
}
```

---

## 6. Ledger Upload, Audit & Exports

### 6.1 CSV Upload
- **Endpoint:** `POST /api/v1/ledger/upload` (`multipart/form-data`: `file` = CSV, `format` = `daily_ledger|summary_backfill`). Column contracts: `docs/csv_templates/` (headers must match `app/src/lib/csv-parser.ts`).
- Returns `{ filename, format, totalRows, validCount, errorCount, failedCount, ingestErrors, preview[10] }`. Missing file → `400 NO_FILE`.

### 6.2 Workers CSV Export
- **Endpoint:** `GET /api/v1/exports/workers` (cookie auth; streams CSV)

#### PowerShell
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/exports/workers" -OutFile "workers_compliance.csv" -Headers @{ Cookie = $Cookie }
```

### 6.3 Certified Statutory Audit Dossier
- **Endpoint:** `GET /api/v1/exports/audit-report` → live JSON dossier (org header incl. `registeredAddress`, summary, filings, challans, last-20 audit rows).

---

## 7. Notifications, Partner & Lead Magnet

### 7.1 Notifications
- `GET /api/v1/notifications` → `{ notifications, unreadCount, total }` (newest first).
- `PATCH /api/v1/notifications` with `{}` marks all read; with `{ "id" }` marks one.

### 7.2 Multi-Client Partner Overview
- **Endpoint:** `GET /api/v1/partner/clients` → `{ partnerFirm, totalClients, clients: [{ id, legalName, sector, cin, activeWorkers, eligibleWorkers, nextFilingDue|null, complianceStatus, riskScore, openCessLiability }] }`. Empty grants → `"clients": []`. No switch/grant/revoke endpoints exist.

### 7.3 Free Compliance Risk Assessment (public, no auth)
- **Endpoint:** `POST /api/v1/free-audit`

#### PowerShell
```powershell
$auditReq = @{
    companyName = "QuickRide Mobility Pvt Ltd"
    contactEmail = "legal@quickride.in"
    sector = "RIDE_HAILING"
    workerCount = 2500
    annualTurnover = 80000000
    annualPayout = 45000000
    currentFilingPractices = "SPREADSHEETS"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/free-audit" `
    -Method POST `
    -Body $auditReq `
    -ContentType "application/json"
```

Returns `{ lead, scorecard }` (heuristic estimator; also stores an `audit_leads` row best-effort).

---

## 8. Cron (scheduler only)

- **Endpoint:** `POST /api/v1/cron/evaluate-eligibility`
- **Auth:** `Authorization: Bearer <CRON_SECRET>` (global run). The dashboard button runs it session-scoped instead.
- Returns `{ evaluatedWorkers, updatedWorkers, newlyEligibleCount, timestamp, statutoryReference }`.

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/cron/evaluate-eligibility" `
    -Method POST -Headers @{ Authorization = "Bearer $env:CRON_SECRET" }
```

> Deleted since v1.0 docs: `POST /auth/login`, `POST /auth/logout`, `POST /contributions/*`, `GET /ledger`, PDF/email/XLSX/`users`/batch/switch/grant endpoints. The Section 114 simulator is client-side (`/dashboard/calculator`); there is no rate limiting and no pagination anywhere.
