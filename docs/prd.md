# Product Requirements Document
## Gig Worker Social Security Compliance Platform

| | |
|---|---|
| **Status** | v2.0 — as-built corrections (see §6–§9) |
| **Date** | 3 September 2026 |
| **Owner** | [Founder/PM name] |
| **Reviewers** | [Eng lead / Design lead] |

---

## 1. Summary

A SaaS platform that helps Indian "aggregators" (any app or platform connecting a customer to an independent gig/platform worker) comply with the Code on Social Security, 2020 and its finalized Central Rules (notified 8 May 2026). The platform tracks worker registration on the government's e-Shram portal, calculates each worker's day-count eligibility (90 days with one aggregator, or 120 days across multiple), and manages the recurring annual filing calendar — so a company never misses a government deadline or under-reports what it owes.

**One-sentence scope for engineering:** be the system of record for "which of our gig workers are registered, how many days have they worked, and what do we owe and when" — for companies too small to have a dedicated compliance team.

---

## 2. Problem statement

The Code on Social Security, 2020 came into force 21 November 2025. The Ministry of Labour and Employment finalized the operating rules — the Social Security (Central) Rules, 2026 — on 8 May 2026, and gave every aggregator 45 days to register all existing gig workers on the government's e-Shram portal via API or electronic mode, with a hard onboarding deadline of 21 June 2026. Ongoing obligations continue indefinitely: real-time reporting of worker onboarding/exits, a provisional contribution deposit by 30 June each year (Form-XX), and a final annual return by 31 October (Form-XXI). Late contributions attract 12% annual interest; registration non-compliance carries penal exposure under Section 133 of the Code.

Large platforms (Swiggy, Zomato, Ola, and similar) built or bought their own compliance tooling ahead of the June deadline. The much larger population of smaller aggregators — regional delivery apps, home-services platforms, freelance/task marketplaces, local logistics startups — mostly do not have this, and many either missed the June deadline or are unprepared for the 31 October final return. No dedicated software product for this was found in this research; the only current options are law-firm advisories or nothing.

One important nuance the product must be built around: the **exact contribution percentage** (1–2% of turnover, or 5% of worker payments, whichever basis an aggregator elects) is fixed in structure but the category-specific rates are still being operationalized through Section 114 scheme notifications as of this writing. Registration and reporting are mandatory now; contribution calculation is close but not fully locked.

**Full supporting research:** see the earlier gig-worker-cess research summarized in `india-govt-startup-opportunities.md`, and the pitch script in `gig-cess-2min-pitch.md`.

---

## 3. Goals

- **G1:** Let a company onboard its existing gig-worker roster and have it correctly registered/synced to the e-Shram portal, removing the manual, error-prone process most smaller aggregators are currently using (or failing to use).
- **G2:** Automatically and correctly calculate each worker's day-count eligibility under the 90-day single-aggregator / 120-day multi-aggregator rule, including the specific rule that a worker is "engaged" on any day they earn any income, counted cumulatively across platforms.
- **G3:** Ensure a customer never misses the two recurring statutory deadlines — the 30 June provisional deposit (Form-XX) and the 31 October final return (Form-XXI) — through a proactive alerting system, not a passive dashboard.
- **G4:** Provide an audit-ready record of registration status, day-counts, and filing history that a company can produce if questioned by the labour department, an auditor, or during fundraising due diligence.

## 4. Non-goals (explicitly out of scope)

- We are **not** a payroll platform and do not process worker payments directly — we consume payment/engagement data to calculate day-counts and contribution bases, we don't move money for wages.
- We are **not**, for MVP, providing legal advisory services or interpreting ambiguous cases (e.g., disputed worker classification) — we flag ambiguity and recommend the customer consult counsel, we don't resolve it ourselves.
- We do **not**, at MVP, target the top-tier aggregators (Swiggy, Zomato, Ola, Uber, and similar) who already have in-house compliance infrastructure — our wedge is the long tail of smaller aggregators.
- We are **not** committing to automated government-side contribution deposit/payment transfer in MVP — Rule 48/49's "assess and deposit" step involves real banking/treasury integration that carries higher regulatory and error-cost risk; MVP calculates and prepares the filing, the customer executes the actual payment. Automated deposit is a stated later-phase consideration, not assumed for v1.
- We are **not** building state-specific welfare-board registration (Rajasthan, Karnataka, and others going beyond the central floor) in MVP — this is explicitly P2, once the central-compliance core is validated with paying customers.

---

## 5. Target users and personas

| Persona | Role | What they need |
|---|---|---|
| **Primary buyer: Founder/Ops lead** | Smaller aggregator (regional delivery, home-services, freelance marketplace, local logistics) — company too small for a dedicated compliance hire | A simple way to know "are we compliant right now, and what's due next" without hiring someone |
| **Secondary user: HR/Finance lead** (where one exists) | Same company, slightly larger end of the target segment | Needs the day-count and contribution-basis numbers to actually file Form-XX/XXI accurately |
| **Channel partner: Employment/labour law firms** | Firms like JSA, Lexplosion, Bhatt & Joshi already advising clients on this exact rule | Want a tool to recommend or white-label to clients asking about this, rather than manually tracking each client's status themselves |

---

## 6. User stories (prioritized)

**P0 — must have for MVP:**
1. As an ops lead, I can create an account (work email + password, auto-confirmed) and upload my gig-worker roster via CSV using either a daily activity ledger or a historical summary backfill.
2. As an ops lead, I can see, for each worker, their rolling-90-day and cumulative FY day counts applying the 90-day single-aggregator threshold, and record worker-declared cross-platform days (promote-only) for the 120-day multi-aggregator threshold.
3. As an ops lead, I can see which of my workers have registered e-Shram Universal Account Numbers (UAN) versus those with missing or pending registrations, with strict Aadhaar masking to the last 4 digits (raw Aadhaar never stored).
4. As an ops lead, I see live deadline countdowns derived from my open filings, plus an in-app notification center — no email dispatch exists.
5. As an ops lead, I can use a 4-step filing wizard to create a Form-XX quarterly draft, deposit a challan (number + UTR), and lock an immutable audit record (PAID filings reject further edits).
6. As a first-time visitor, I can run a free "compliance check" — one public form, no signup — and receive an immediate heuristic risk scorecard; my contact is stored as a lead.
7. As a law-firm channel partner, I can access a consolidated read-only Partner Portal over my granted client orgs (no impersonation, switching, or enforced access levels).

**P1 — should have, post-MVP:**
8. As an ops lead, I can see an estimated contribution amount under both calculation bases (1–2% category turnover vs. 5% worker payments ceiling) with side-by-side comparative savings. (Rates are hardcoded today; a versioned config matrix is roadmap.)
9. As an ops lead, I can connect via webhook/API so daily engagement ledger events sync automatically from internal dispatcher/payout systems. (Not built — CSV upload only.)
10. As an ops lead, I receive early warning alerts when workers approach the 75-day engagement mark, preventing unexpected statutory obligation surprises.

**P2 — nice to have, later phases:**
11. As an ops lead operating in Rajasthan or Karnataka, I can also track my state-specific welfare-board registration and obligations.
12. As an ops lead, I can initiate direct banking payment transfers for Form-XX/XXI challans via integrated payment gateway/banking APIs.
13. As an ops lead, I can file a refund claim (Form-XXII) for an overpaid provisional contribution, tracking the statutory 90-day government refund SLA.

---

## 7. Functional requirements by module

### 7.1 — Worker Registration & Identity Tracker (DPDP Compliant)
- Ingest worker rosters via CSV in two supported formats (see `docs/csv_templates/` for exact headers):
  - **Daily Activity Ledger:** `(worker_id, worker_name, uan, aadhaar_last4, date, hours_worked, gross_payout, platform_turnover_attributed, trip_or_gig_count)`
  - **Historical Summary Backfill:** `(worker_id, worker_name, uan, aadhaar_last4, period_start, period_end, total_active_days, total_payout, other_platform_days)`
- **DPDP Act & Aadhaar Compliance:** Never persist raw 12-digit Aadhaar numbers. Server-side masking to the last 4 digits (`XXXX-XXXX-1234`). Store the 12-digit e-Shram Universal Account Number (UAN) as the primary non-sensitive statutory identifier. **Known gap:** phone numbers are stored plaintext (no field-level encryption); bank fields do not exist.
- Track registration status: `REGISTERED_ON_ESHRAM`, `PENDING_SUBMISSION`, or `GAP_FLAGGED`.

### 7.2 — Days-Worked / Eligibility Engine
- **Rolling + FY Day Rule:** The nightly job evaluates `max(rolling-90-day distinct count, FY internal days)`; ingestion counts ledger rows per worker.
- **Single-Aggregator Threshold (90 Days):** 90+ single-platform days → `ELIGIBLE`.
- **Approaching Band (75–89 Days):** `APPROACHING` — verify UAN linkage. There is no 85-day tier.
- **Multi-Aggregator Threshold (120 Days):** `internal + declared external ≥ 120` with external $> 0$ → `ELIGIBLE_MULTI_AGGREGATOR` (shown as Eligible). Ingestion/declaration updates are promote-only; only the nightly sync demotes.

### 7.3 — Filing Calendar & Nightly Sync
- **Statutory Deadlines (as implemented):**
  - **Form-XX (Quarterly):** Q1 due 31 Jul, Q2 due 31 Oct (start year); Q3 due 31 Jan, Q4 due 30 Apr (end year).
  - **Form-XXI (Annual):** due 30 Jun (end year); API-supported, no UI wizard.
- **Deadline surfacing:** live countdown cards computed from open filings across the dashboard, filings page, and layout banner (hidden when nothing is open) + in-app notification center. No email dispatch exists.
- **Penalty Calculator:** 1% per month simple interest (fractions rounded up) computed on demand in the simulator (labeled illustrative); nothing accrues automatically.

### 7.4 — Contribution Estimator & Statutory Ceiling (Section 114)
- **Hardcoded rates (no config matrix):** default 1.5% turnover rate; simulator offers 1.0%–2.0%.
- **Statutory Ceiling Enforcement:** Automatically caps turnover-based liability at 5% of total annual payments made to gig workers.
- **Comparative Analysis:** Presents a side-by-side comparison between the turnover rate and the 5% worker payment basis, highlighting the lower statutory obligation.

### 7.5 — Step-by-Step Filing Wizard & Challan Locker
- 4-step wizard (Period & Numbers → Cess Formula → Worker Census → Verification) guides ops and finance leads through quarterly numbers and creates a `DRAFT` filing (duplicates refresh).
- Challan Locker: records challan number + UTR (bank/amount/date defaulted) and cryptographically locks the filing with a SHA-256 digest (`PAID` rejects further PATCH with `409`). No receipt upload, no BSR/CIN fields, no PDF generation.

### 7.6 — Free Compliance Check (Lead-Gen Funnel)
- Public single-form estimator — no signup, no email verification, no CSV upload.
- Returns an immediate heuristic Risk Scorecard (score, risk rating, eligible-worker estimate, cess estimate, penalty proxy, gaps, recommendations) and stores an `audit_leads` row best-effort.
- No PDF report, no trial provisioning, no paid-plan flow.

### 7.7 — Multi-Tenant & Law-Firm Advisor Portal
- Strict tenant isolation for aggregators (application scoping + RLS; partner reads via `partner_client_access` grants).
- Advisor Portal: read-only multi-client console (live worker/filing aggregates, open liability, health score). No impersonation, client switching, enforced access levels, grant UI, or invite flow.

---

## 8. Data model

See the complete Supabase SQL schema in [`tech_spec_and_db_schema.md`](./tech_spec_and_db_schema.md) (§7) and `app/supabase/migrations/`.

```
Organization (Aggregator or Advisory Partner)
├── id, name, type, sector, cinOrRegistration, gstin, turnover, workerPayouts, registeredAddress
├── Profiles[] (id = auth.users.id; roles: Org Admin, Ops Manager, Finance Lead, External Advisor)
├── PartnerClientAccess[] (grants for law firms; access_level recorded, not enforced)
├── Workers[]
│   ├── id, workerInternalCode, fullName, uan (e-Shram 12-digit)
│   ├── maskedAadhaar ("XXXX-XXXX-1234"), phone (plaintext — known gap)
│   ├── registrationStatus, eligibilityStatus
│   ├── DailyEngagementLedger[] (date, grossEarnings, tripOrTaskId, sourceBatchId)
│   ├── WorkerAnnualAggregate[] (internalDays, declaredExternalDays, totalDays, isEligible)
│   └── WorkerDeclarations[] (platform name, day count, FY — no period/provenance columns)
└── FilingRecords[]
    ├── id, financialYear, quarter, formType (quarterly Form-XX / annual Form-XXI)
    ├── dueDate, status (DRAFT/SUBMITTED/PAID/OVERDUE), turnover, payouts, assessedAmount, statutoryCeiling, balancePayable
    ├── accruedInterestPenalty (computed on demand, not accrued)
    ├── lockedHashSha256
    └── FilingChallans[] (challanNumber, bankName, utrNumber, amount, paymentDate, sha256Hash — no CIN/BSR/receipt)
```

---

## 9. Non-functional requirements

- **DPDP Act 2023 & UIDAI Strict Adherence:** Zero storage of raw 12-digit Aadhaar numbers. Server-side masking to last 4 digits at ingestion. **Known gap:** phone numbers are stored plaintext; no field-level encryption exists (see tech spec §4).
- **Audit Provenance:** State-changing routes write append-only `audit_logs` rows (actor, timestamp, metadata). Audit write failures are server-logged, never request-breaking; there is no hash chain.
- **Data Provenance on Multi-Aggregator Days:** Declarations return `RECORDED` (never auto-verified); no provenance tag column is stored.
- **Alert Reliability:** The nightly eligibility sync reconciles statuses and writes per-org audit rows; in-app alerts reflect new states on next load. No email dispatch exists.
- **Config-Driven Regulation:** Aspirational — rates, caps, and due-date mappings are currently hardcoded (default 1.5%, 5% cap, FY-derived due dates).

---

## 10. Success metrics

| Metric | MVP target (first 90 days post-launch) | Rationale |
|---|---|---|
| Free compliance checks run | 100+ | Top-of-funnel signal via public estimator + lead capture |
| Check → paid conversion rate | Track from day 1 | Lead rows in `audit_leads`; no funnel analytics events yet |
| Paying customers | 10–15 | Direct aggregators + law-firm channel partners |
| Customers correctly alerted ahead of deadlines | 100% of active customers | Live countdowns from open filings; zero-email policy means in-app only |
| Calculation & statutory capping accuracy | 100% | Guaranteed adherence to Section 114 & Central Rules |

---

## 11. Rollout plan

- **Phase 1 (Weeks 1–2): Foundation & Security:** Next.js + Supabase (RLS) setup, work-email registration, Aadhaar masking sanitizer, and base schema.
- **Phase 2 (Weeks 3–4): Hybrid Ingestion & Engine:** Daily activity ledger parser, historical backfill importer, shared 90/120/75 calculation, and worker-declaration flow.
- **Phase 3 (Weeks 5–6): Filing Wizard & Challan Locker:** Form-XX 4-step wizard, SHA-256 challan lock with PAID immutability. (No PDF generation.)
- **Phase 4 (Weeks 7–8): Nightly Sync & Partner Console:** Eligibility sync job with per-org audit rows, read-only multi-client advisor portal. (No email dispatch, no RBAC enforcement.)
- **Phase 5 (Weeks 9–10): Free Compliance Audit Launch:** Public estimator funnel with heuristic scorecard + lead capture, and pilot customer onboarding.

---

## 12. Supporting Documents & Technical Specifications

- [`tech_spec_and_db_schema.md`](./tech_spec_and_db_schema.md) — Comprehensive technical architecture, calculation engine logic, privacy controls, and full Supabase SQL schema.
- `india-govt-startup-opportunities.md` — Market research and regulatory background.
- `gig-cess-2min-pitch.md` — Investor and partner pitch narrative.