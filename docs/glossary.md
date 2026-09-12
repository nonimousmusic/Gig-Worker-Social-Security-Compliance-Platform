# Glossary of Terms
## Gig Worker Social Security Compliance Platform

**Version:** 1.0  
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
| **Form-XX** | The statutory form for provisional contribution deposit, due by **30 June** each year. Filed with estimated turnover and worker payment figures for the current/upcoming cycle. | Rule 49(1)–(3), Central Rules 2026 |
| **Form-XXI** | The statutory form for the final annual return and balance contribution payment, due by **31 October** each year. Filed with audited/actual figures for the closed financial year. | Rule 49(4)–(6), Central Rules 2026 |
| **Form-XXII** | The statutory form for claiming a refund when the provisional deposit (Form-XX) exceeds the final assessed contribution (Form-XXI). Government has a 90-day processing SLA. | Rule 49(7)–(9), Central Rules 2026 |
| **Gig Worker** | A person who performs work or participates in a work arrangement and earns from such activities outside of a traditional employer-employee relationship. | Section 2(35), Code on Social Security 2020 |
| **Gazette Notification** | An official government order published in the Gazette of India. Used to notify contribution rates, scheme details, and regulatory changes under Section 114. | Standard legislative mechanism |
| **Platform Worker** | A person engaged in work through an online platform that connects organizations or individuals to solve problems or provide services in exchange for payment. | Section 2(61), Code on Social Security 2020 |
| **Rule 48** | The Central Rule specifying how eligibility days are counted — definition of "engaged," 90-day single-aggregator threshold, 120-day multi-aggregator threshold. | Central Rules 2026, Rule 48 |
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
| **AES-256-GCM** | Advanced Encryption Standard with 256-bit key length in Galois/Counter Mode — the encryption algorithm used for sensitive PII fields (phone, bank details). Provides both confidentiality and authentication. | Encryption standard |
| **Annual Aggregate** | A cached summary record (`WorkerAnnualAggregate`) storing a worker's total internal days worked, declared external days, total cumulative days, and gross earnings for a given financial year. Refreshed after each data ingestion or daily cron sweep. | Database model |
| **Audit Lock** | The irreversible action of sealing a filing record with a SHA-256 cryptographic hash after all challans are uploaded. Once locked, no modifications can be made. Ensures tamper-evident compliance records. | Filing lifecycle |
| **BSR Code** | Bank Basic Statistical Returns Code — a 7-digit code assigned by the RBI to each bank branch. Used to identify the depositing branch on challan records. | Banking/challan system |
| **Challan** | A bank payment receipt confirming that a contribution deposit has been made. Includes a Challan Identification Number (CIN), BSR code, bank name, deposit date, and amount. | Contribution filing proof |
| **CIN** | Challan Identification Number — a unique identifier assigned to each tax/contribution challan when deposited at a bank. Also used: Corporate Identification Number (for company registration). Context determines meaning. | Banking / MCA |
| **Contribution Ceiling** | The statutory cap of **5% of total payments made to gig workers** — the aggregator's contribution obligation cannot exceed this amount, even if the turnover-based calculation yields a higher figure. | Section 114(5)(b) |
| **Cron Sweep** | The lightweight daily scheduled job (00:30 IST) that scans all open filing records for deadline proximity, calculates interest penalties, flags worker threshold milestones, and dispatches email alerts. | Alerting system |
| **Daily Engagement Ledger** | The granular, date-level record of worker activity (`DailyEngagementLedger` model). Each row represents one calendar day of engagement with earnings data. This is the foundational data source for all day-count calculations. | Core data model |
| **Day-Count / Eligibility Engine** | The computational module that counts distinct calendar days where a worker earned income (>₹0) and applies the 90-day single-aggregator and 120-day multi-aggregator thresholds to determine eligibility status. | Core business logic |
| **Delegated Advisor Access** | The RBAC mechanism allowing law firm / advisory partners to access client aggregator data with granular permissions (`AUDITOR_READ_ONLY`, `COMPLIANCE_MANAGER`, `FULL_ADMIN`). Managed via `PartnerClientAccess`. | Multi-tenant access |
| **Dry Run** | A CSV import mode where data is validated but not persisted to the database. Used to preview import results, catch errors, and verify data quality before committing. | Data ingestion |
| **Eligibility Status** | The computed status of a worker relative to the statutory day thresholds. Values: `NOT_YET_ELIGIBLE` (0–74 days), `APPROACHING_THRESHOLD` (75–84), `AT_RISK_CRITICAL` (85–89), `ELIGIBLE` (90+), `ELIGIBLE_MULTI_AGGREGATOR` (120+ cumulative). | Eligibility engine |
| **Engagement Day** | A single calendar day on which a worker earned any income (>₹0) from the aggregator. The fundamental unit of the day-count calculation. Even ₹1 on a date counts as one full engagement day. | Rule 48 implementation |
| **Filing Record** | The database record (`FilingRecord` model) representing one statutory filing — either a Form-XX provisional deposit, a Form-XXI final return, or a Form-XXII refund claim — for a specific aggregator and financial year. | Filing lifecycle |
| **Filing Wizard** | The step-by-step UI workflow that guides an ops or finance lead through the process of preparing a statutory filing — confirming company details, entering financial data, reviewing calculations, generating the PDF, and uploading challans. | User interface |
| **Free Compliance Audit** | The lead-generation funnel where prospective customers register with a work email, upload a sample CSV (max 500 rows), and receive an instant Risk Scorecard showing compliance gaps and estimated liability. Gated behind mandatory signup. | Growth / lead-gen |
| **GSTIN** | Goods and Services Tax Identification Number — a 15-character alphanumeric ID issued to businesses registered under GST in India. Captured in the organization profile for identification. | Company identification |
| **Historical Backfill** | The bulk import mode for seeding aggregate worker data (total days worked, total payouts) without individual daily engagement records. Used for rapid initial onboarding when granular historical data is unavailable. | Data ingestion |
| **Interest Penalty** | The statutory late-filing penalty of **1% per month** (or fraction thereof) on the unpaid balance, equivalent to **12% per annum** simple interest. Calculated and accrued automatically by the platform for overdue filings. | Section 133 / Rule 49 |
| **Multi-Tenant** | The architecture where each aggregator organization operates in complete data isolation, with its own workers, ledgers, filings, and configurations. Partner law firms can access multiple tenants via delegated permissions. | Architecture |
| **Partner Portal** | The dedicated UI for law firm / advisory partner organizations to view and manage compliance across multiple client aggregators from a single dashboard. | Channel partner feature |
| **PII** | Personally Identifiable Information — data that can identify a specific individual. In this platform: Aadhaar (masked), phone (encrypted), bank details (encrypted), name, UAN. | Privacy classification |
| **Provenance** | The origin and audit trail of a data point. Used specifically for cross-platform day counts to distinguish `"VERIFIED"` (internal ledger data) from `"SELF_REPORTED_WORKER_DECLARATION"` (worker-declared external days). | Audit integrity |
| **Rate Config Matrix** | The `ContributionRateConfig` database table storing category-based contribution rates (1%–2%) per financial year and sector. Fully data-driven — rate changes are configuration updates, not code changes. | Regulatory agility |
| **Registration Status** | The e-Shram registration status of a worker. Values: `REGISTERED_ON_ESHRAM` (has valid UAN and is registered), `PENDING_SUBMISSION` (onboarded but not yet registered), `GAP_FLAGGED` (active but missing/inconsistent on e-Shram). | Worker compliance tracking |
| **Risk Scorecard** | The instant, browser-rendered compliance assessment shown to free audit users. Displays e-Shram gap percentage, threshold breaches, estimated cess liability bracket, and deadline countdown. | Lead-gen output |
| **Self-Reported Declaration** | A worker's formal statement of days worked on external platforms, submitted via `WorkerDeclaration`. Always tagged with provenance `"SELF_REPORTED_WORKER_DECLARATION"` in all UI, exports, and PDFs. The aggregator assumes no liability for the accuracy of this data. | Cross-platform day counting |
| **SHA-256** | Secure Hash Algorithm 256-bit — the cryptographic hash function used to create tamper-evident seals on locked filing records. Any modification to the sealed data would produce a different hash, revealing tampering. | Audit integrity |
| **Source Batch ID** | A unique identifier (`BATCH-YYYYMMDD-NNN`) assigned to each CSV upload import. Links individual engagement ledger entries back to the specific upload they originated from, enabling batch-level auditing and rollback. | Data traceability |
| **Statutory Ceiling** | See "Contribution Ceiling." The 5% of total worker payments cap that limits the aggregator's maximum contribution obligation. | Section 114(5)(b) |
| **Tenant Isolation** | The database-level enforcement that every query is scoped to the authenticated user's `organizationId`, preventing any cross-tenant data access. | Security architecture |
| **Threshold Milestone** | A worker reaching 75 days (approaching), 85 days (critical), or 90 days (eligible) — each triggers a notification to the aggregator's ops lead. | Alerting system |
| **Trial Audit** | An organization provisioned in `isTrialAudit = true` status via the free compliance audit funnel. Has limited features until converted to a paid subscription. | Lead-gen lifecycle |
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
