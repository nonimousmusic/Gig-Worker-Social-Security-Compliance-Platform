# User Flows & Journey Maps
## Gig Worker Social Security Compliance Platform

**Version:** 2.0
**Date:** 12 September 2026

> As-built flows. No email, no PDFs, no XLSX, no invite/impersonation flows exist. Where the UI shows a button that goes nowhere, the flow says so.

---

## Table of Contents

1. [Flow 1 — New Aggregator Onboarding](#flow-1--new-aggregator-onboarding)
2. [Flow 2 — Worker Roster Upload (Daily Ledger)](#flow-2--worker-roster-upload-daily-ledger)
3. [Flow 3 — Worker Roster Upload (Historical Backfill)](#flow-3--worker-roster-upload-historical-backfill)
4. [Flow 4 — Eligibility Dashboard & Day-Count Monitoring](#flow-4--eligibility-dashboard--day-count-monitoring)
5. [Flow 5 — Worker Self-Declaration (Cross-Platform Days)](#flow-5--worker-self-declaration-cross-platform-days)
6. [Flow 6 — Form-XX Filing Wizard (Quarterly)](#flow-6--form-xx-filing-wizard-quarterly)
7. [Flow 7 — Annual Filing (Form-XXI — API only)](#flow-7--annual-filing-form-xxi--api-only)
8. [Flow 8 — Challan Deposit & Audit Lock](#flow-8--challan-deposit--audit-lock)
9. [Flow 9 — Free Compliance Audit (Lead Funnel)](#flow-9--free-compliance-audit-lead-funnel)
10. [Flow 10 — Law Firm Partner Portal](#flow-10--law-firm-partner-portal)
11. [Flow 11 — Compliance Audit Export](#flow-11--compliance-audit-export)
12. [Flow 12 — Deadline Alerts & Nightly Sync](#flow-12--deadline-alerts--nightly-sync)
13. [Flow 13 — Team Management (Read-Only)](#flow-13--team-management-read-only)
14. [Flow 14 — Contribution Calculation & Comparison](#flow-14--contribution-calculation--comparison)

---

## Flow 1 — New Aggregator Onboarding

**Persona:** Founder / Ops Lead
**Entry Point:** Landing page → "Get Started" CTA

```mermaid
flowchart TD
    A["Landing Page"] --> B["Click 'Get Started'"]
    B --> C["Registration Form"]
    C --> C1["Enter Work Email (corporate domains only)"]
    C --> C2["Enter Company Name + Sector"]
    C --> C3["Create Password (8+, A-Z, digit)"]
    C --> C4["Optional: CIN / GSTIN"]
    C --> D{"Submit Registration"}
    D --> E["POST /auth/register (service role)"]
    E --> F["Auth user + Organization + ORG_ADMIN profile created"]
    F --> G["Success screen → Sign In"]
    G --> H["Login (Supabase browser session, no verification email)"]
    H --> I["Dashboard (empty until first upload)"]
```

**Key Screens:**
1. **Registration Form** — Work email, company name, sector dropdown, password, optional CIN/GSTIN.
2. **Account Created** — Inline success card linking to `/login`.
3. **Dashboard Empty State** — Zero-stats and empty tables until data is ingested.

**Validation Rules:**
- Work email: blocks gmail, yahoo, outlook, hotmail, aol, icloud, mail, protonmail, yandex, rediffmail.
- Password: min 8 chars, 1 uppercase, 1 digit.
- Sector: must be a valid enum value.

**Audit Events:** none on this path (registration writes are service-role inserts, not audit-logged).

---

## Flow 2 — Worker Roster Upload (Daily Ledger)

**Persona:** Ops Lead / Finance Lead
**Entry Point:** Dashboard → CSV Ingestion Studio → "Daily Engagement Ledger"

```mermaid
flowchart TD
    A["Dashboard"] --> B["CSV Ingestion Studio"]
    B --> C["Select: Daily Engagement Ledger"]
    C --> D["Download Sample CSV (headers match the parser)"]
    C --> E["Browse a .csv file (CSV only, no XLSX)"]
    E --> F["POST /ledger/upload {file, format}"]
    F --> G["Row validation (10-row preview returned)"]
    G --> H["Ingest: ledger row + FY aggregate bump per valid row"]
    H --> I["Result: validCount / errorCount / failedCount + first errors"]
    I --> J["Dashboard data live on next page load"]
```

**CSV Column Mapping (only these are read):**

| Expected Header | Aliases Accepted | Required |
|---|---|---|
| `worker_id` | — | ✅ |
| `worker_name` | — | ✅ |
| `uan` | `UAN` | ❌ |
| `aadhaar_last4` | `aadhaar`, `Aadhaar` | ❌ (last 4 kept, `0000` fallback) |
| `date` | `engagement_date`, `Date` | ✅ valid date |
| `hours_worked` | `hours` | 0–24 |
| `gross_payout` | `payout` | ≥ 0 (negative is an error) |
| `platform_turnover_attributed` | `turnover` | ❌ |
| `trip_or_gig_count` | `trips` | ❌ (default 1) |

**Error Handling:**
- Invalid rows are listed with row number + reason; valid rows still ingest.
- Re-uploads conflict on `(worker, date, trip)` and surface as `failedCount`, not silent duplicates.
- Unknown `worker_id` auto-creates an `INACTIVE` worker. Eligibility updates are promote-only.

---

## Flow 3 — Worker Roster Upload (Historical Backfill)

**Persona:** Ops Lead
**Entry Point:** Dashboard → CSV Ingestion Studio → "Quarterly Summary Backfill"

```mermaid
flowchart TD
    A["Dashboard"] --> B["CSV Ingestion Studio"]
    B --> C["Select: Quarterly Summary Backfill"]
    C --> D["Download Sample CSV"]
    C --> E["Upload .csv"]
    E --> F["Validation (active days 0–366, payout ≥ 0)"]
    F --> G["Merge into FY aggregate (internal=max, externals/earnings accumulate)"]
    G --> H["Result summary with failed rows, if any"]
```

**Columns:** `worker_id, worker_name, uan, aadhaar_last4, period_start, period_end, total_active_days, total_payout, other_platform_days` — anything else is ignored (notably there is **no** provenance/tag column and no dry-run mode).

**Important Distinctions from Daily Ledger:**
- No individual engagement day entries are created — only aggregate records.
- External days carry no stored provenance tag.
- Intended for rapid initial onboarding; ongoing tracking uses the Daily Ledger.

---

## Flow 4 — Eligibility Dashboard & Day-Count Monitoring

**Persona:** Ops Lead
**Entry Point:** `/dashboard/eligibility` (meters) + `/dashboard` (overview)

```mermaid
flowchart TD
    A["Dashboard Home"] --> B["Live deadline card (nearest open filing)"]
    A --> C["Eligibility Summary Cards"]
    C --> C1["ELIGIBLE"]
    C --> C2["APPROACHING (75–89d)"]
    C --> C3["INACTIVE (under 75d)"]
    C --> C4["Multi-App Declared count"]
    C --> D["Per-worker meters: 90-day bar + 120-day bar"]
    D --> E["Declaration modal → Flow 5"]
    D --> F["Trigger Nightly Audit Job → cron, org-scoped"]
```

**Dashboard Components:**

| Component | Data Shown | Update Frequency |
|---|---|---|
| **Deadline card** | Nearest open filing, days left, recent filings | On page load |
| **Eligibility cards** | Worker counts by tier | On page load |
| **Worker meters** | 90-day + cumulative progress per worker | On page load |
| **Alerts center** | In-app notifications, mark-all-read | On page load |

There are no projected-eligibility dates, no earnings charts, and no worker-detail page — the worker profile is a modal with a 30-day activity strip.

---

## Flow 5 — Worker Self-Declaration (Cross-Platform Days)

**Persona:** Ops Lead (on behalf of worker)
**Entry Point:** Eligibility page → per-worker "Add Multi-App Days"

```mermaid
flowchart TD
    A["Eligibility worker row"] --> B["Declaration modal"]
    B --> C["Platform: fixed select (5 options)"]
    C --> D["Declared days (≥ 0) + optional period dates"]
    D --> E["POST /workers/:id/declarations"]
    E --> F["Lands on worker's latest FY aggregate"]
    F --> G["Engine recompute, promote-only"]
    G --> H["Response status RECORDED — never auto-VERIFIED"]
```

- No file upload, no confirmation dialog, no Verified/Self-Reported badges in UI (only the `+Nd Multi-App` chip in the directory).
- `periodStart/End` are echoed in the response, not stored (no such columns).
- A declaration can promote to `ELIGIBLE`/`ELIGIBLE_MULTI_AGGREGATOR` but never demotes.

---

## Flow 6 — Form-XX Filing Wizard (Quarterly)

**Persona:** Finance Lead / Ops Lead
**Entry Point:** `/dashboard/filings` → "New Form-XX Filing"

```mermaid
flowchart TD
    A["Filings table (DRAFT/SUBMITTED/PAID/OVERDUE badges)"] --> B["4-step wizard"]
    B --> C["Step 1: Period & Numbers (FY + quarter + turnover + payouts)"]
    C --> D["Step 2: Cess Formula (turnover×rate vs 5% cap, live)"]
    D --> E["Step 3: Worker Census (live counts from form)"]
    E --> F["Step 4: Verification + Save & Generate Form-XX Draft"]
    F --> G["POST /filings → DRAFT (or refreshes duplicate)"]
    G --> H["Due dates derived from FY (Q1→31 Jul … Q4→30 Apr)"]
    H --> I["Pay from Challan Vault → Flow 8"]
```

No org-details step, no PDF preview/download, no Form-XXI wizard in the UI (the API accepts `FORM_XXI_ANNUAL`, due 30 Jun end-year).

---

## Flow 7 — Annual Filing (Form-XXI — API only)

There is **no Form-XXI wizard** in the UI. Annual returns are created via `POST /filings` with `filingType: "FORM_XXI_ANNUAL"` (quarter null, due 30 Jun of the end year) and paid/locked through the same challan flow. No balance-payable netting or overdue wizard warnings exist.

---

## Flow 8 — Challan Deposit & Audit Lock

**Persona:** Finance Lead
**Entry Point:** Challan Vault → "Deposit Challan & Lock" (filing dropdown lists real open filings)

```mermaid
flowchart TD
    A["Challan Vault (paid filings + real bank/UTR/hash)"] --> B["Deposit form"]
    B --> B1["Target filing (open filings only)"]
    B --> B2["Challan number* + UTR* (+ bank/amount/date, defaulted)"]
    B --> C["POST /filings/:id/challan"]
    C --> D["SHA-256 hash → filing PAID → audit event"]
    D --> E["Filing PATCH now 409 FILING_LOCKED"]
```

No CIN/BSR/receipt fields, no file upload (`document_url` stays null), no reconciliation check, no confirmation dialog — the lock is immediate and permanent.

---

## Flow 9 — Free Compliance Audit (Lead Funnel)

**Persona:** First-time Visitor / Prospective Customer
**Entry Point:** Landing page → "Free Compliance Check" CTA

```mermaid
flowchart TD
    A["Landing Page"] --> B["Click 'Free Compliance Check'"]
    B --> C["/free-audit single form (no signup, no verification)"]
    C --> C1["Company + contact + sector"]
    C --> C2["Headcount + turnover + payouts + filing posture"]
    C --> D["POST /free-audit"]
    D --> E["Heuristic scorecard + best-effort audit_leads row"]
    E --> F["Scorecard: score/rating/eligible estimate/cess/penalty/gaps/actions"]
    F --> G["CTA: Onboard on GigCessHQ Platform → /register"]
```

No CSV upload, no 500-row sample, no PDF report, no pricing page, no `funnel_*` analytics events. The estimator constants (85/−35/−15/0.76/0.12) are documented estimates, not statutory math.

---

## Flow 10 — Law Firm Partner Portal

**Persona:** Employment Law Firm / Compliance Advisory
**Entry Point:** `/partner` (same login session)

```mermaid
flowchart TD
    A["/partner"] --> B["Firm name + live KPI cards (computed from grants)"]
    B --> C["Client cards: workers, open liability, health score, next due"]
    C --> D["Manage Client → own /dashboard (no impersonation)"]
    C --> E["No grants → honest empty state"]
```

- `access_level` is read, never enforced. There is no context switch, no grant/revoke UI or API, no Settings → Partner Access page — grants are managed directly in `partner_client_access`.
- No unified deadline calendar, no bulk-report download, no client reminders.

---

## Flow 11 — Compliance Audit Export

**Persona:** Ops Lead / Finance Lead / External Advisor
**Entry Point:** Reports page → "Workers CSV" / "Print Dossier"

```mermaid
flowchart TD
    A["Reports page"] --> B["GET /exports/audit-report → live JSON dossier"]
    B --> C["Org header / 4 metrics / filings ledger / audit trail"]
    C --> D["Print Dossier → window.print()"]
    A --> E["GET /exports/workers → CSV download"]
```

No report configuration, no Puppeteer PDF, no expiring links, no digests, no BSR/CIN/seal sections, no standalone audit-log query endpoint (last 20 rows ride inside the dossier).

---

## Flow 12 — Deadline Alerts & Nightly Sync

**Persona:** System → Ops Lead
**Trigger:** External scheduler → `POST /cron/evaluate-eligibility` (or the dashboard button, org-scoped)

```mermaid
flowchart TD
    A["Scheduler (Bearer CRON_SECRET) or dashboard button (session)"] --> B["Recompute all in-scope workers (max rolling-90, FY internal)"]
    B --> C["Full both-ways sync + newly-eligible count"]
    C --> D["Per-org CRON_ELIGIBILITY_EVALUATED audit rows"]
    D --> E["In-app alerts center reflects new states on next load"]
```

No email is sent (no mail provider), no 60/30/15/7/3/1 schedule exists, no penalty accrual runs, no Monday digest. In-app alerts are read/marked-read via `GET/PATCH /notifications`.

---

## Flow 13 — Team Management (Read-Only)

**Persona:** Org Admin
**Entry Point:** Settings → Compliance Team

The panel lists real `profiles` rows for the organization (`GET /team`). There is **no Invite button, no invitation email, no role editor, and no permission matrix enforcement** — membership is created at registration only. The settings form itself (name/sector/CIN/GSTIN/address) does persist via `PATCH /organizations`.

---

## Flow 14 — Contribution Calculation & Comparison

**Persona:** Finance Lead / Ops Lead
**Entry Point:** Dashboard → Section 114 Simulator (client-side; no API call)

```mermaid
flowchart TD
    A["Simulator sliders (turnover/payouts/rate 1.0–2.0%)"] --> B["calculateContribution() locally"]
    B --> C["Turnover basis vs 5% cap, lower wins, savings shown"]
    C --> D["Optional 1% state overlay (illustrative)"]
    D --> E["Penalty tab: 1%/mo simple vs hypothetical due date (labeled illustrative)"]
```

Defaults (₹40 Cr / ₹22 Cr / 1.5%) are starting slider positions, not org data. Rates are hardcoded — there is no rate-config table, gazette tracker, CONFIRMED/PENDING flow, or webhook/API ingestion.
