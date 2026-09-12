# Product Requirements Document
## Gig Worker Social Security Compliance Platform

| | |
|---|---|
| **Status** | Draft v1.0 |
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
1. As an ops lead, I can create an account (with work email verification) and upload or connect my gig-worker roster using either a daily activity ledger (for audit-proof tracking) or a historical summary backfill (CSV/XLSX).
2. As an ops lead, I can see, for each worker, their cumulative days-engaged count for the current financial year, correctly applying the 90-day single-aggregator threshold, and recording any worker-declared cross-platform days (clearly labeled as 'Self-Reported') for the 120-day multi-aggregator threshold.
3. As an ops lead, I can see which of my workers have registered e-Shram Universal Account Numbers (UAN) versus those with missing or pending registrations, with strict Aadhaar masking to the last 4 digits (DPDP Act compliant).
4. As an ops lead, I receive proactive alerts via daily automated sweeps with countdowns as the 30 June (provisional Form-XX) and 31 October (final return Form-XXI) deadlines approach, including calculated 1% monthly interest penalty forecasts if deadlines are missed.
5. As an ops lead, I can use a step-by-step filing wizard to generate pre-filled official Ministry Form-XX / Form-XXI PDFs, upload bank challans (BSR code, CIN, receipt), and lock an immutable audit record.
6. As a first-time visitor, I can complete a quick work email signup to run a free "compliance check" — upload a small worker sample and receive an immediate risk scorecard (e-Shram gaps, threshold breaches, estimated cess liability bracket) before upgrading.
7. As a law-firm channel partner (e.g. JSA, Lexplosion), I can access a consolidated Partner Portal with delegated RBAC permissions to oversee compliance and filings across multiple client aggregators.

**P1 — should have, post-MVP:**
8. As an ops lead, I can see an estimated contribution amount under both calculation bases (1–2% category turnover vs. 5% worker payments ceiling) through a versioned regulatory config matrix, displaying side-by-side comparative savings.
9. As an ops lead, I can connect via webhook/API so daily engagement ledger events sync automatically from internal dispatcher/payout systems.
10. As an ops lead, I receive early warning alerts when workers approach the 75-day and 85-day engagement marks, preventing unexpected statutory obligation surprises.

**P2 — nice to have, later phases:**
11. As an ops lead operating in Rajasthan or Karnataka, I can also track my state-specific welfare-board registration and obligations.
12. As an ops lead, I can initiate direct banking payment transfers for Form-XX/XXI challans via integrated payment gateway/banking APIs.
13. As an ops lead, I can file a refund claim (Form-XXII) for an overpaid provisional contribution, tracking the statutory 90-day government refund SLA.

---

## 7. Functional requirements by module

### 7.1 — Worker Registration & Identity Tracker (DPDP Compliant)
- Ingest worker rosters via CSV/XLSX in two supported formats:
  - **Daily Activity Ledger:** `(worker_id, date, earnings, reference_id)`
  - **Historical Summary Backfill:** `(worker_id, total_days_worked, total_payouts, declared_external_days)`
- **DPDP Act & Aadhaar Compliance:** Never persist raw 12-digit Aadhaar numbers. Automatically sanitize and mask Aadhaar to the last 4 digits (`XXXX-XXXX-1234`). Store the 12-digit e-Shram Universal Account Number (UAN) as the primary non-sensitive statutory identifier. Encrypt sensitive personal details (phone, bank info) using AES-256 field-level encryption.
- Track registration status: `REGISTERED_ON_ESHRAM`, `PENDING_SUBMISSION`, or `GAP_FLAGGED`.

### 7.2 — Days-Worked / Eligibility Engine
- **Calendar Day Rule:** A worker is deemed engaged on any calendar day where recorded earnings are greater than zero ($> 0$).
- **Single-Aggregator Threshold (90 Days):** Computes exact, authoritative days worked internally. Generates tiered alerts at 75 days (`APPROACHING_THRESHOLD`), 85 days (`AT_RISK_CRITICAL`), and 90 days (`ELIGIBLE`).
- **Multi-Aggregator Threshold (120 Days):** Resolves cross-platform visibility constraints using worker-submitted self-declarations (`WorkerDeclaration`), clearly tagging cross-platform days as `Self-Reported` in dashboards and audit exports to safeguard the aggregator from third-party liability.

### 7.3 — Filing Calendar & Lightweight Cron Alerting
- **Statutory Deadlines:**
  - **30 June:** Provisional Contribution Deposit (Form-XX).
  - **31 October:** Final Annual Return with balance contribution (Form-XXI).
- **Lightweight Cron Engine:** Scheduled daily database sweep runs at 00:30 IST. Dispatches transactional email reminders at 60, 30, 15, 7, 3, and 1 days before due dates.
- **Penalty Accrual Calculator:** Automatically calculates 1% per month (12% annually) simple interest on unpaid balances for overdue filings, showing actual financial liability on dashboard countdown banners and weekly alerts.

### 7.4 — Contribution Estimator & Statutory Ceiling (Section 114)
- **Versioned Config Matrix:** Category-based rates (1.0%–2.0% of turnover) configured per financial year and sector.
- **Statutory Ceiling Enforcement:** Automatically caps turnover-based liability at 5% of total annual payments made to gig workers.
- **Comparative Analysis:** Presents a side-by-side comparison between the turnover rate and the 5% worker payment basis, highlighting the lower statutory obligation.

### 7.5 — Step-by-Step Filing Wizard & Challan Locker
- Step-by-step wizard guides ops and finance leads through final calculations, turnover verification, and pre-fills official Form-XX and Form-XXI schedules.
- Generates pixel-perfect official Ministry PDF filings via headless PDF generation.
- Challan Locker: Ingests proof of deposit (CIN, BSR code, bank name, payment date, uploaded bank receipt PDF) and cryptographically locks the filing record with a SHA-256 digest for audit immutability.

### 7.6 — Free Compliance Check (Lead-Gen Funnel)
- Gated behind a fast work email verification and account creation.
- Visitor uploads a sample CSV of up to 500 workers.
- Generates an immediate interactive Risk Scorecard: e-Shram gap percentage, 90-day threshold breaches, estimated cess liability bracket, and deadline countdown with penalty estimates.
- Unlocks download of the full Diagnostic Compliance Audit Report (PDF) with direct conversion to paid plans.

### 7.7 — Multi-Tenant & Delegated Law-Firm Advisor Portal
- Strict tenant isolation for aggregators.
- Delegated Advisor Access: Employment and labour law firms (channel partners) log into a centralized Partner Portal to switch between client accounts with granular RBAC permissions (`AUDITOR_READ_ONLY`, `COMPLIANCE_MANAGER`).

---

## 8. Data model

See the complete PostgreSQL and Prisma schema specification in [`tech_spec_and_db_schema.md`](file:///c:/Users/admin/Desktop/work/freelance%20wali%20platform/tech_spec_and_db_schema.md).

```
Organization (Aggregator or Advisory Partner)
├── id, name, type, sector, cinOrRegistration, turnover, workerPayouts
├── Users[] (Role-based access: Org Admin, Ops Manager, Finance Lead, External Advisor)
├── PartnerClientAccess[] (Delegated access for law firms)
├── Workers[]
│   ├── id, workerInternalCode, fullName, uan (e-Shram 12-digit)
│   ├── maskedAadhaar ("XXXX-XXXX-1234"), phoneEncrypted (AES-256)
│   ├── registrationStatus, eligibilityStatus
│   ├── DailyEngagementLedger[] (date, grossEarnings, tripOrTaskId)
│   ├── WorkerAnnualAggregate[] (internalDays, declaredExternalDays, totalDays)
│   └── WorkerDeclarations[] (self-reported external platform days)
└── FilingRecords[]
    ├── id, financialYear, formType (Form-XX / Form-XXI / Form-XXII)
    ├── dueDate, status, turnover, payouts, assessedAmount, statutoryCeiling, balancePayable
    ├── accruedInterestPenalty (1% per month overdue)
    ├── lockedHashSha256
    └── FilingChallans[] (cin, bsrCode, bankName, depositDate, challanReceiptUrl)
```

---

## 9. Non-functional requirements

- **DPDP Act 2023 & UIDAI Strict Adherence:** Zero storage of raw 12-digit Aadhaar numbers. Strict client-side and ingestion-level masking to last 4 digits. AES-256 encryption on PII fields.
- **Audit Provenance:** Every calculation, data ingestion, and status change generates an immutable `AuditLog` entry capturing actor, IP, timestamp, and changes.
- **Data Provenance on Multi-Aggregator Days:** Cross-platform days are explicitly marked as "Self-Reported" with digital or document attestation to ensure zero legal liability on the aggregator for external data errors.
- **High Alert Reliability:** Lightweight cron runs daily; failure to deliver statutory alerts is treated as a critical P0 service event.
- **Config-Driven Regulation:** Contribution rates, statutory caps, and filing dates are stored in configuration tables (`ContributionRateConfig`), allowing instant regulatory updates without code deployments.

---

## 10. Success metrics

| Metric | MVP target (first 90 days post-launch) | Rationale |
|---|---|---|
| Free compliance checks run | 100+ | Top-of-funnel signal via gated work-email funnel |
| Check → paid conversion rate | Track from day 1 | Gated signup creates higher intent leads |
| Paying customers | 10–15 | Direct aggregators + law-firm channel partners |
| Customers correctly alerted ahead of 31 October deadline | 100% of active customers | Zero missed deadline policy |
| Calculation & statutory capping accuracy | 100% | Guaranteed adherence to Section 114 & Central Rules |

---

## 11. Rollout plan

- **Phase 1 (Weeks 1–2): Foundation & Security:** Next.js + PostgreSQL/Prisma setup, work-email auth, DPDP Aadhaar masking sanitizer, and base schema.
- **Phase 2 (Weeks 3–4): Hybrid Ingestion & Engine:** Daily activity ledger parser, historical backfill importer, 90-day calculation, and worker-declaration flow.
- **Phase 3 (Weeks 5–6): Filing Wizard & Challan Locker:** Form-XX/XXI step wizard, Puppeteer PDF generator, and BSR/CIN challan locking.
- **Phase 4 (Weeks 7–8): Daily Cron Alerting & Partner Console:** Daily sweep cron, 1% monthly interest accrual, SES transactional emails, and multi-client advisor portal.
- **Phase 5 (Weeks 9–10): Free Compliance Audit Launch:** Gated public lead-gen funnel, sample CSV audit scorecard, and pilot customer onboarding before the 31 October filing deadline.

---

## 12. Supporting Documents & Technical Specifications

- [`tech_spec_and_db_schema.md`](file:///c:/Users/admin/Desktop/work/freelance%20wali%20platform/tech_spec_and_db_schema.md) — Comprehensive technical architecture, calculation engine logic, privacy controls, and full PostgreSQL Prisma schema.
- `india-govt-startup-opportunities.md` — Market research and regulatory background.
- `gig-cess-2min-pitch.md` — Investor and partner pitch narrative.