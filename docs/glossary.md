# Glossary of Terms
## Gig Worker Social Security Compliance Platform

**Version:** 2.0 (as-built corrections)
**Date:** 12 September 2026

---

## Legal & Regulatory Terms

| Term | Definition | Reference |
|---|---|---|
| **Aggregator** | A digital intermediary or marketplace that connects buyers/users of a service with sellers/service providers. Under the Code, any platform connecting consumers to gig workers. | Section 2(2), Code on Social Security 2020 |
| **Code on Social Security, 2020** | The parent legislation (Act No. 36 of 2020) that consolidates and rationalizes India's social security laws, including new provisions for gig and platform workers under Chapter IX (Sections 112–114). | Parliament of India, notified 28 Sep 2020 |
| **Central Rules 2026** | Short form for the Social Security (Central) Rules, 2026 — the operating rules that specify registration mechanics, day-count calculation methods, filing timelines, and contribution structure under the Code. | Ministry of Labour and Employment, notified 8 May 2026 |
| **DPDP Act 2023** | The Digital Personal Data Protection Act, 2023 — India's comprehensive data privacy law governing collection, processing, storage, and erasure of personal data. | Parliament of India, notified 11 Aug 2023 |
| **e-Shram** | The Ministry of Labour and Employment's national portal for unorganized and gig worker registration. All gig workers must be registered here by their aggregator. | https://eshram.gov.in |
| **Financial Year (FY)** | The Indian statutory financial year running from 1 April to 31 March. All day counts, contributions, and filings are scoped to a financial year. | General statutory definition |
| **Form-XX** | The statutory quarterly contribution form. The platform implements it quarterly: Q1 due 31 Jul, Q2 due 31 Oct (start year); Q3 due 31 Jan, Q4 due 30 Apr (end year) — derived from the FY. | Platform filing lifecycle |
| **Form-XXI** | The statutory final annual return. The platform sets its due date to **30 June** of the end year and supports it via API (no UI wizard). | Platform filing lifecycle |
| **Form-XXII** | The statutory refund-claim form. **Not implemented** — no code references it. | P2 roadmap |
| **Gig Worker** | A person who performs work or participates in a work arrangement and earns from such activities outside of a traditional employer-employee relationship. | Section 2(35), Code on Social Security 2020 |
| **Gazette Notification** | An official government order published in the Gazette of India. Used to notify contribution rates, scheme details, and regulatory changes under Section 114. | Standard legislative mechanism |
| **Platform Worker** | A person engaged in work through an online platform that connects organizations or individuals to solve problems or provide services in exchange for payment. | Section 2(61), Code on Social Security 2020 |
| **Rule 48** | The Central Rule specifying how eligibility days are counted — definition of "engaged," 90-day single-aggregator threshold, 120-day multi-aggregator threshold. The app's day-count UI/API additionally cite **Rule 28** (eligibility), **Rule 31** (filings), and **Rule 32** (challan lock). | Central Rules 2026, Rule 48 (+ app citations) |
| **Rule 49** | The Central Rule specifying contribution deposit timelines, filing forms (XX/XXI/XXII), and late payment interest penalties. | Central Rules 2026, Rule 49 |
| **Section 114** | The section of the Code establishing the contribution obligation for aggregators — 1%–2% of turnover (category-based) or 5% of worker payments, whichever is lower. | Code on Social Security 2020, Section 114 |
| **Section 133** | The penal provision — fines for registration non-compliance (up to ₹1,00,000 per worker) and aggregator self-registration failure (up to ₹5,00,000). | Code on Social Security 2020, Section 133 |
| **UIDAI** | Unique Identification Authority of India — the body that administers the Aadhaar system and sets regulations on Aadhaar number storage and display. | Established under Aadhaar Act, 2016 |
| **Universal Account Number (UAN)** | A 12-digit unique identification number issued to each worker registered on e-Shram. Aadhaar-seeded (linked to Aadhaar for verification, but UAN itself is not sensitive personal data). | Ministry of Labour, e-Shram guidelines |

---

## Platform & Technical Terms

| Term | Definition | Context |
|---|---|---|
| **Aadhaar Masking** | The process of stripping a raw 12-digit Aadhaar number to retain only the last 4 digits, formatted as `XXXX-XXXX-1234`. Performed at the ingestion layer before any database write. Raw Aadhaar is never stored. | DPDP & UIDAI compliance |
| **AES-256-GCM** | Advanced Encryption Standard (Galois/Counter Mode). **Not deployed** — no encryption module exists; phones are stored plaintext (known gap). Listed here for reference only. | Encryption standard (undeployed) |
| **Annual Aggregate** | A cached summary record (`WorkerAnnualAggregate`) storing a worker's total internal days worked, declared external days, total cumulative days, and gross earnings for a given financial year. Refreshed after each data ingestion or daily cron sweep. | Database model |
| **Audit Lock** | Sealing a filing record with a SHA-256 hash at challan deposit, flipping it to `PAID`. Further PATCHes return `409 FILING_LOCKED`. Ensures tamper-evident compliance records. | Filing lifecycle |
| **BSR Code** | Bank Basic Statistical Returns Code — a 7-digit RBI branch code. **Not captured** — challan records hold challan number, bank name, UTR, amount, and date only. | Banking (not implemented) |
| **Challan** | A bank payment receipt confirming a contribution deposit. Records hold challan number, bank name, UTR, amount, payment date, SHA-256 hash, and lock timestamp. No CIN/BSR/receipt-file fields exist. | Contribution filing proof |
| **CIN** | Challan Identification Number — a unique identifier assigned to each tax/contribution challan when deposited at a bank. Also used: Corporate Identification Number (for company registration). Context determines meaning. | Banking / MCA |
| **Contribution Ceiling** | The statutory cap of **5% of total payments made to gig workers** — the aggregator's contribution obligation cannot exceed this amount, even if the turnover-based calculation yields a higher figure. | Section 114(5)(b) |
| **Cron Sweep** | The nightly eligibility sync (`POST /cron/evaluate-eligibility`, secret or session auth) that reconciles worker statuses and writes per-org audit rows. Sends no email and accrues no penalties. | Nightly job |
| **Daily Engagement Ledger** | The granular, date-level record of worker activity (`DailyEngagementLedger` model). Each row represents one calendar day of engagement with earnings data. This is the foundational data source for all day-count calculations. | Core data model |
| **Day-Count / Eligibility Engine** | `src/lib/eligibility-engine.ts`: 90-day single-aggregator → `ELIGIBLE`; 120 cumulative (with external days) → `ELIGIBLE_MULTI_AGGREGATOR`; 75+ → `APPROACHING`; else `INACTIVE`. Cron evaluates `max(rolling-90, FY internal)`; ingestion/declarations are promote-only. | Core business logic |
| **Delegated Advisor Access** | Partner law firms read granted client orgs via `partner_client_access` (`AUDITOR_READ_ONLY`, `COMPLIANCE_MANAGER`, `FULL_ADMIN` recorded but not enforced). Read-only console; no impersonation, switching, or grant UI. | Multi-tenant access |
| **Dry Run** | Not implemented — every valid CSV row persists on upload. | Data ingestion (absent) |
| **Eligibility Status** | `ELIGIBLE` (90+ single-platform days), `APPROACHING` (75–89), `INACTIVE` (under 75), `ELIGIBLE_MULTI_AGGREGATOR` (120+ cumulative with external days; folded into Eligible in directory UI). | Eligibility engine |
| **Engagement Day** | A calendar day with a `daily_engagement_ledger` row for the worker. Note: ingestion counts rows as days even at ₹0 payout — the "income > ₹0" rule is documented intent, not enforced code. | Day counting |
| **Filing Record** | One statutory filing per org/FY/form/quarter (`filing_records`): quarterly Form-XX drafts, annual Form-XXI via API, statuses `DRAFT/SUBMITTED/PAID/OVERDUE`. PAID rows reject PATCH (`409 FILING_LOCKED`). | Filing lifecycle |
| **Filing Wizard** | The 4-step UI (Period & Numbers → Cess Formula → Worker Census → Verification) that creates a Form-XX quarterly `DRAFT` via `POST /filings`. No PDF step, no annual wizard. | User interface |
| **Free Compliance Audit** | Public single-form estimator (company, contact, headcount, turnover, payouts, filing posture) returning a heuristic scorecard and storing an `audit_leads` row. No signup, CSV, PDF, or trial provisioning. | Growth / lead-gen |
| **GSTIN** | Goods and Services Tax Identification Number — a 15-character alphanumeric ID issued to businesses registered under GST in India. Captured in the organization profile for identification. | Company identification |
| **Historical Backfill** | The bulk import mode for seeding aggregate worker data (total days worked, total payouts) without individual daily engagement records. Used for rapid initial onboarding when granular historical data is unavailable. | Data ingestion |
| **Interest Penalty** | **1% per month** (fractions rounded up), 12% p.a. **simple** interest on unpaid balances (`penalty-calc.ts`). Computed on demand in the simulator (labeled illustrative); nothing accrues automatically. | Section 133 / Rule 49 |
| **Multi-Tenant** | The architecture where each aggregator organization operates in complete data isolation, with its own workers, ledgers, filings, and configurations. Partner law firms can access multiple tenants via delegated permissions. | Architecture |
| **Partner Portal** | The dedicated UI for law firm / advisory partner organizations to view and manage compliance across multiple client aggregators from a single dashboard. | Channel partner feature |
| **PII** | Personally Identifiable Information. In this platform: Aadhaar (masked at ingestion), phone (**plaintext** — known gap), name, UAN. No bank fields exist. | Privacy classification |
| **Provenance** | The origin of cross-platform day counts. Declarations return `status: "RECORDED"` (never auto-verified); no provenance tag column is stored. Directory UI shows a `+Nd Multi-App` chip. | Audit integrity |
| **Rate Config Matrix** | Does not exist as a table or admin panel. Rates are hardcoded (default 1.5%, simulator offers 1.0–2.0%). A data-driven matrix is roadmap, not reality. | Regulatory agility (planned) |
| **Registration Status** | The e-Shram registration status of a worker. Values: `REGISTERED_ON_ESHRAM` (has valid UAN and is registered), `PENDING_SUBMISSION` (onboarded but not yet registered), `GAP_FLAGGED` (active but missing/inconsistent on e-Shram). | Worker compliance tracking |
| **Risk Scorecard** | The heuristic compliance assessment returned by `POST /free-audit`: score, risk rating, eligible-worker estimate, cess estimate, penalty proxy, gaps, recommendations. Documented estimates, not statutory math. | Lead-gen output |
| **Self-Reported Declaration** | A worker's declared days on external platforms (`worker_declarations`: platform name, day count, FY). Stored without a provenance tag; API echoes `status: "RECORDED"`. | Cross-platform day counting |
| **SHA-256** | Secure Hash Algorithm 256-bit — the cryptographic hash function used to create tamper-evident seals on locked filing records. Any modification to the sealed data would produce a different hash, revealing tampering. | Audit integrity |
| **Source Batch ID** | One identifier per CSV upload (`csv-<epoch-ms>`), stored on each ingested ledger row for batch-level traceability. | Data traceability |
| **Statutory Ceiling** | See "Contribution Ceiling." The 5% of total worker payments cap that limits the aggregator's maximum contribution obligation. | Section 114(5)(b) |
| **Tenant Isolation** | Enforcement at two levels: every API route scopes to the caller's `organizationId` via `requireTenant()`, and PostgreSQL RLS policies independently bound every table (plus `can_access_org()` partner grants). | Security architecture |
| **Threshold Milestone** | A worker reaching 75 days (`APPROACHING`) or 90 days (`ELIGIBLE`), recomputed by ingestion and the nightly sync. Surfaced in-app (meters, alerts center); no email, no 85-day tier. | Alerting system |
| **Trial Audit** | `is_trial_audit` flag set on every registration. Not enforced anywhere (no feature gating) — metadata today, product decision pending. | Lead-gen lifecycle |
| **Turnover Basis** | One of two methods for calculating the aggregator's contribution: annual turnover × category rate (1%–2%). Compared against the 5% worker payment ceiling, and the lower of the two is the statutory obligation. | Contribution calculation |
| **Worker Declaration** | See "Self-Reported Declaration." | Data model term |
| **Work Email Gate** | The registration requirement that users must sign up with a work email domain (not gmail.com, yahoo.com, etc.). Ensures lead quality and organizational identity verification. | Authentication |

---

## Abbreviations

| Abbreviation | Full Form |
|---|---|
| **API** | Application Programming Interface |
| **BSR** | Basic Statistical Returns (bank branch code) |
| **CIN** | Challan Identification Number / Corporate Identification Number |
| **CSV** | Comma-Separated Values |
| **DPDP** | Digital Personal Data Protection |
| **FY** | Financial Year (1 April – 31 March) |
| **GSTIN** | Goods and Services Tax Identification Number |
| **HSTS** | HTTP Strict Transport Security |
| **IST** | India Standard Time (UTC+5:30) |
| **JWT** | JSON Web Token |
| **KMS** | Key Management Service |
| **MCA** | Ministry of Corporate Affairs |
| **MVP** | Minimum Viable Product |
| **ORM** | Object-Relational Mapping |
| **PAN** | Permanent Account Number |
| **PDF** | Portable Document Format |
| **PII** | Personally Identifiable Information |
| **RBAC** | Role-Based Access Control |
| **SLA** | Service Level Agreement |
| **SSR** | Server-Side Rendering |
| **TLS** | Transport Layer Security |
| **UAN** | Universal Account Number (e-Shram) |
| **UIDAI** | Unique Identification Authority of India |
| **UUID** | Universally Unique Identifier |
| **WAF** | Web Application Firewall |
| **XLSX** | Microsoft Excel Open XML Spreadsheet |
