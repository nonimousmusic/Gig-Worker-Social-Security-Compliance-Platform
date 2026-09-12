# Regulatory Reference Guide
## Code on Social Security, 2020 — Platform Compliance Mapping

**Version:** 2.0 (platform-implementation cells corrected)
**Date:** 12 September 2026  
**Purpose:** Map every statutory obligation to the platform feature that addresses it, with exact section/rule references.

---

## Table of Contents

1. [Legislation Overview](#1-legislation-overview)
2. [Key Definitions](#2-key-definitions)
3. [Registration Obligations](#3-registration-obligations)
4. [Eligibility & Day-Count Rules](#4-eligibility--day-count-rules)
5. [Contribution Obligations](#5-contribution-obligations)
6. [Filing Calendar & Forms](#6-filing-calendar--forms)
7. [Penalties & Interest](#7-penalties--interest)
8. [Data Privacy — DPDP Act 2023 & UIDAI](#8-data-privacy--dpdp-act-2023--uidai)
9. [State-Level Overlays](#9-state-level-overlays)
10. [Gazette Notifications Tracker](#10-gazette-notifications-tracker)
11. [Open Regulatory Questions](#11-open-regulatory-questions)

---

## 1. Legislation Overview

| Legislation | Notification Date | Effective Date | Relevance |
|---|---|---|---|
| **Code on Social Security, 2020** (Act No. 36 of 2020) | 28 September 2020 | 21 November 2025 | Parent statute creating social security framework for gig and platform workers |
| **Social Security (Central) Rules, 2026** | 8 May 2026 | 8 May 2026 | Operating rules specifying registration mechanics, day-count calculation, filing timelines, and contribution structure |
| **Digital Personal Data Protection Act, 2023** | 11 August 2023 | Phased enforcement 2024–2026 | Governs processing of worker personal data (Aadhaar, phone, bank details) |
| **UIDAI Aadhaar (Sharing of Information) Regulations, 2016** | 2016 (as amended) | Ongoing | Restricts storage and display of Aadhaar numbers |

---

## 2. Key Definitions

### 2.1 — "Aggregator" (Section 2(2) of the Code)

> *"Aggregator" means a digital intermediary or a market place for a buyer or user of a service to connect with the seller or the service provider.*

**Platform Relevance:** This is our target customer. Any app or platform connecting consumers to gig workers is an "aggregator" under the Code, regardless of size.

**Edge Cases (Open):**
- B2B logistics platforms that connect businesses (not consumers) to drivers — may or may not qualify.
- Freelance/task marketplaces where work is project-based rather than trip/task-based.
- Platforms that occasionally use gig labor but are not primarily gig-economy businesses.

---

### 2.2 — "Gig Worker" (Section 2(35) of the Code)

> *"Gig worker" means a person who performs work or participates in a work arrangement and earns from such activities outside of traditional employer-employee relationship.*

---

### 2.3 — "Platform Worker" (Section 2(61) of the Code)

> *"Platform worker" means a person engaged in or undertaking platform work [i.e., work in which organisations or individuals use an online platform to access other organisations or individuals to solve specific problems or to provide specific services or any such other activities which may be notified by the Central Government, in exchange for payment].*

---

### 2.4 — "Engaged" / Day of Engagement

Per the Central Rules, 2026, a worker is deemed **"engaged"** on any calendar day where they earn **any income** from the aggregator, regardless of:
- Shift duration (even 1 minute counts)
- Number of trips/tasks completed
- Amount earned (even ₹1 counts)

**Platform Implementation:** `DailyEngagementLedger.grossEarnings > 0` on a given `engagementDate`.

---

## 3. Registration Obligations

### 3.1 — Aggregator Self-Registration

| Requirement | Legal Basis | Deadline | Platform Feature |
|---|---|---|---|
| Every aggregator must register itself on e-Shram | Section 114(1), Rule 46 | Within 30 days of commencing operations (or 45 days from rule notification for existing aggregators) | Organization setup captures CIN/PAN/GSTIN for self-registration tracking |
| Report registration details including sector, worker count, turnover | Rule 46(2) | At registration | Organization profile fields |

### 3.2 — Worker Registration on e-Shram

| Requirement | Legal Basis | Deadline | Platform Feature |
|---|---|---|---|
| Register all existing gig workers on e-Shram portal | Section 114(2), Rule 47 | Within 45 days of rule notification (deadline: 21 June 2026) | Worker Registration Tracker (Module 7.1) |
| Register new workers within 15 days of onboarding | Rule 47(3) | 15 days from engagement start date | `onboardedDate` tracking + `PENDING_SUBMISSION` status alert |
| Report worker exits within 15 days | Rule 47(4) | 15 days from exit date | `exitDate` tracking + exit reporting flow |
| Worker must have Aadhaar-seeded Universal Account Number (UAN) | Rule 47(1) | At registration | `uan` field on Worker record |

### 3.3 — e-Shram Portal Status

| Status | Meaning | Platform Mapping |
|---|---|---|
| Registered | Worker has a valid UAN and is registered on e-Shram | `REGISTERED_ON_ESHRAM` |
| Pending | Worker has been onboarded but not yet registered | `PENDING_SUBMISSION` |
| Gap | Worker is active in platform data but missing/inconsistent on e-Shram | `GAP_FLAGGED` |

**Open Question:** Is there a public API for e-Shram aggregator registration/sync? As of September 2026, no confirmed public API has been identified. The platform relies on customer-reported registration status for MVP. Automated sync is a potential P1/P2 feature pending government API availability.

---

## 4. Eligibility & Day-Count Rules

### 4.1 — Single-Aggregator 90-Day Threshold

| Rule | Legal Basis | Platform Implementation |
|---|---|---|
| A gig worker becomes eligible for social security benefits after 90 single-aggregator days (platform evaluates `max(rolling-90-day count, FY internal days)`) | Section 114(3)(a), Rule 48(1) | `calculateEligibility()` → `ELIGIBLE` |
| "Working" means earning any income on a calendar day | Rule 48(2) | Ledger rows count as engaged days (note: ingestion counts rows even at ₹0 — the >₹0 rule is not enforced in code) |
| Financial year: 1 April to 31 March | General statutory definition | FY tracking via `financial_year` field (e.g., "2026-2027") |

**Platform Thresholds (single `APPROACHING` band — no 85-day tier):**

| Days Worked | Status | Alert Level |
|---|---|---|
| 0–74 | `INACTIVE` | No alert |
| 75–89 | `APPROACHING` | ℹ️ Informational alert |
| 90+ | `ELIGIBLE` | ✅ Eligible — included in contribution base |

### 4.2 — Multi-Aggregator 120-Day Threshold

| Rule | Legal Basis | Platform Implementation |
|---|---|---|
| A gig worker becomes eligible after working 120 days cumulatively across **all** aggregators in a financial year | Section 114(3)(b), Rule 48(3) | `internal + external >= 120` **and** `external > 0` → `ELIGIBLE_MULTI_AGGREGATOR` |
| Days are counted cumulatively — a day worked on multiple platforms still counts as one day | Rule 48(4) | Worker self-declaration; platform sums without dedup (see Q2 below) |

**Cross-Platform Visibility Constraint:**

No aggregator has natural visibility into another aggregator's data. The platform resolves this through:

1. **Authoritative Internal Count:** Days on the current platform are computed from `daily_engagement_ledger` rows.
2. **Worker Self-Declaration:** The worker (or ops lead on their behalf) declares days worked on other platforms via `worker_declarations` (platform name + day count; no file, no stored provenance tag).
3. **No Liability Transfer (intent):** Self-reported data should be treated as unverified; the API echoes `status: "RECORDED"`, never verified.

---

## 5. Contribution Obligations

### 5.1 — Contribution Structure (Section 114)

| Parameter | Legal Basis | Value | Platform Implementation |
|---|---|---|---|
| Contribution basis option 1 | Section 114(5)(a) | 1%–2% of aggregator's annual turnover (rate varies by category) | Hardcoded rate (default 1.5%; simulator offers 1.0–2.0%) — no rate table exists |
| Contribution basis option 2 / ceiling | Section 114(5)(b) | 5% of total payments made to gig workers | Hardcoded 5% in `contribution-calc.ts` |
| Statutory obligation | Section 114(5) | Lesser of (turnover rate) and (5% worker payments) | `min(turnoverBasis, workerPaymentCeiling)` |
| Category-specific rates | Section 114(6), pending gazette notification | Varies by sector (1.0%–2.0%) | No config table or admin panel — code change required |

### 5.2 — Rate Configuration Status

| Sector | Expected Rate | Gazette Status (as of Sep 2026) |
|---|---|---|
| Ride-hailing | ~2.0% | Pending final notification |
| Food delivery | ~1.5% | Pending final notification |
| Logistics/delivery | ~1.5% | Pending final notification |
| Freelance/marketplace | ~1.0% | Pending final notification |
| Healthcare/personal services | ~1.0% | Pending final notification |

> **⚠️ Important:** Category-specific rates under Section 114(6) are still being operationalized as of this document's date. The platform currently hardcodes rates — there is no `ContributionRateConfig` table or admin panel. Until confirmed, all calculations are clearly labeled as estimates.

---

## 6. Filing Calendar & Forms

### 6.1 — Form-XX: Quarterly Contribution Filings (as implemented)

| Parameter | Detail | Legal Basis |
|---|---|---|
| **Due Dates** | Q1 → 31 Jul, Q2 → 31 Oct (start year); Q3 → 31 Jan, Q4 → 30 Apr (end year) — derived from the FY | Platform mapping |
| **Content** | Quarterly turnover and worker payouts with server-computed cess | Filing wizard |
| **Action Required** | Deposit contribution with designated bank, lock via challan (number + UTR) | Rule 49(3) |
| **Platform Feature** | 4-step wizard → `DRAFT`; challan JSON deposit; `PAID` lock | Module 7.5 |

### 6.2 — Form-XXI: Final Annual Return (API-supported)

| Parameter | Detail | Legal Basis |
|---|---|---|
| **Due Date** | 30 June of the end year (as implemented) | Platform mapping |
| **Content** | Annual turnover, worker payments, assessed contribution | `POST /filings` with `FORM_XXI_ANNUAL` |
| **Action Required** | Pay balance contribution, file return with challan proof | Rule 49(6) |
| **Platform Feature** | API-supported; no UI wizard | Module 7.5 |

### 6.3 — Form-XXII: Refund Claim

| Parameter | Detail | Legal Basis |
|---|---|---|
| **Trigger** | Provisional deposit exceeds final assessed contribution | Rule 49(7) |
| **Content** | Claim for refund of overpaid amount | Rule 49(8) |
| **Government SLA** | 90 days from claim submission | Rule 49(9) |
| **Platform Feature** | Automatic detection of negative balance, Form-XXII generation, 90-day SLA tracker | P2 feature |

### 6.4 — Annual Filing Timeline (as implemented)

```
Financial Year: 1 April 2026 — 31 March 2027

Apr ────── Jul 31 ──── Oct 31 ──── Jan 31 ──── Apr 30 ──── Jun 30
 │           │            │            │            │            │
 │        Q1 due        Q2 due       Q3 due       Q4 due     XXI annual
 │     (Form-XX)    (Form-XX)    (Form-XX)    (Form-XX)      return

In-app: live countdown cards from open filings + notification center.
No email schedule exists.
```

---

## 7. Penalties & Interest

### 7.1 — Late Filing Interest

| Penalty | Rate | Legal Basis | Platform Implementation |
|---|---|---|---|
| Interest on late contribution deposit | 1% per month (or fraction thereof) | Section 133(1), Rule 49(10) | `FilingRecord.accruedInterestPenalty = balancePayable × 0.01 × ceil(monthsOverdue)` |
| Annualized equivalent | 12% per annum (simple interest) | Derived | Displayed in dashboard and alerts |

### 7.2 — Registration Non-Compliance

| Penalty | Legal Basis | Details |
|---|---|---|
| Failure to register workers on e-Shram | Section 133(2) | Fine up to ₹1,00,000 per unregistered worker |
| Failure to self-register as aggregator | Section 133(3) | Fine up to ₹5,00,000 |
| Continued non-compliance after notice | Section 133(4) | Additional ₹1,000 per day of continued default |

### 7.3 — Penalty Calculator in Platform

The platform calculates and displays penalty exposure in:
- **Dashboard:** Countdown cards show the statutory rate; overdue filings are badged.
- **Simulator:** Illustrative 1%/mo estimate against a hypothetical due date (labeled as such).
- **Free Audit Scorecard:** Registration gap penalty exposure estimate (heuristic).
- **Audit Reports:** Filing and challan history (no accrued-penalty ledger exists).

**Formula Displayed to User:**
```
Interest Penalty = Balance Payable × 1% × ⌈Months Overdue⌉

Example:
  Balance payable: ₹1,00,000
  Days overdue: 45 (= 2 months, fraction rounded up)
  Interest: ₹1,00,000 × 1% × 2 = ₹2,000
```

---

## 8. Data Privacy — DPDP Act 2023 & UIDAI

### 8.1 — DPDP Act 2023 Compliance

| Principle | DPDP Section | Platform Implementation |
|---|---|---|
| **Lawful Purpose** | Section 4 | Processing worker data for statutory compliance under Code on Social Security, 2020 — legitimate purpose |
| **Purpose Limitation** | Section 5 | Data collected only for day-count calculation, registration tracking, and filing preparation |
| **Data Minimization** | Section 6 | Only collect what is needed: worker ID, name, UAN, engagement dates, earnings. No unnecessary personal data. |
| **Storage Limitation** | Section 8 | Retain data for statutory period (financial year + 7 years for audit) then schedule deletion |
| **Accuracy** | Section 8(3) | Workers can request correction of their records |
| **Security Safeguards** | Section 8(4) | Aadhaar masking, RLS tenant isolation, append-only audit logging. **Gap:** no field-level encryption (phones plaintext) |
| **Consent** | Section 6 | Aggregator provides notice to workers that data is being processed for statutory compliance |
| **Data Principal Rights** | Section 11–14 | Workers can request access to and correction of their data through the aggregator |

### 8.2 — Aadhaar Storage Restrictions (UIDAI)

| Requirement | Regulation | Platform Implementation |
|---|---|---|
| **No full Aadhaar storage** | UIDAI Circular 2017/2019, Aadhaar Act Section 29 | Ingestion parser masks Aadhaar to last 4 digits before any database write |
| **Display masking** | UIDAI guidelines | Only `XXXX-XXXX-1234` format shown in UI |
| **No Aadhaar in logs** | UIDAI guidelines | Aadhaar is never written to log files, audit trails, or error messages |
| **Use UAN as primary** | Ministry of Labour guidelines | 12-digit e-Shram UAN is the primary statutory identifier |

### 8.3 — PII Handling Specification (as implemented)

| Field | Sensitivity | Handling | Storage |
|---|---|---|---|
| `uan` | Low (statutory ID) | None (plaintext) | Indexed for search |
| `maskedAadhaar` | Low (last 4 only) | Masked at ingestion | Display only |
| `phone` | Medium | **None — plaintext (known gap)** | `phone_encrypted` column (legacy name) |
| `fullName` | Low | None (plaintext) | Indexed for search |
| `workerInternalCode` | Low | None (plaintext) | Indexed for lookup |

There are no bank-account/bank-IFSC columns and no encryption module. Do not represent otherwise.

---

## 9. State-Level Overlays

> **Note:** State-specific compliance is explicitly P2 (out of scope for MVP). This section documents known state-level obligations for future reference.

### 9.1 — Rajasthan Platform Based Gig Workers (Registration and Welfare) Act, 2023

| Obligation | Details | Status |
|---|---|---|
| Register with Rajasthan state welfare board | In addition to central e-Shram | Active |
| State-level welfare cess | Additional state contribution | Rate pending |
| State worker ID card | Separate from central UAN | Operational |

### 9.2 — Karnataka (Draft Rules, 2024)

| Obligation | Details | Status |
|---|---|---|
| State gig worker welfare board registration | Under consideration | Draft |
| State-level reporting requirements | Monthly instead of annual | Proposed |

### 9.3 — Other States

Maharashtra, Tamil Nadu, and Kerala have announced intentions to create state-level gig worker welfare frameworks. Monitor for developments.

---

## 10. Gazette Notifications Tracker

This table tracks all relevant gazette notifications that affect platform configuration:

| Notification ID | Date | Subject | Impact on Platform | Status |
|---|---|---|---|---|
| S.O. xxxx(E) | 8 May 2026 | Social Security (Central) Rules, 2026 | Full platform scope — registration, filing, day-count rules | ✅ Active |
| GSR-xxxx(E) | Pending | Section 114(6) — Category-specific contribution rates | Code change required (rates hardcoded; no config table) | ⏳ Pending |
| GSR-xxxx(E) | Pending | Section 114 — Scheme notification for benefit categories | Worker benefit entitlement definitions | ⏳ Pending |

**Update Procedure:**
1. Monitor the Ministry of Labour & Employment gazette section weekly.
2. When a new notification is published, update the hardcoded defaults and document the change.
3. Notify all affected aggregators (no email dispatch exists — in-app notice only).

---

## 11. Open Regulatory Questions

### Q1: e-Shram API Availability
**Question:** Is there a public API for aggregators to programmatically register workers on e-Shram and query registration status?  
**Current Status:** No confirmed public API as of September 2026.  
**Impact:** Module 7.1 relies on customer-reported status for MVP.  
**Resolution Path:** Direct inquiry to Ministry of Labour IT cell; monitor eSHRAM portal for API documentation.

### Q2: Cross-Platform Day Deduplication
**Question:** When a worker works for two aggregators on the same calendar day, does that count as 1 day or 2 days toward the 120-day threshold?  
**Our Interpretation:** 1 calendar day, regardless of how many platforms engaged the worker.  
**Basis:** Rule 48(4) states "cumulatively across all aggregators" — implying unique calendar days.  
**Impact:** Worker self-declarations may double-count overlapping days. Platform warns but does not auto-deduplicate (no reliable mechanism without cross-aggregator data sharing).

### Q3: "Aggregator" Definition Edge Cases
**Question:** Do B2B logistics platforms, occasional gig-labor users, or marketplaces with both employees and independent contractors qualify?  
**Current Status:** No definitive guidance for edge cases.  
**Impact:** Affects target customer definition and sales messaging.  
**Recommendation:** Consult employment law counsel before making definitive claims.

### Q4: Worker Classification Disputes
**Question:** If a worker disputes their classification as a "gig worker" vs. employee, does the platform need to handle this?  
**Current Approach:** Platform flags ambiguity and recommends legal consultation. Does not resolve classification disputes.  
**Legal Basis:** Section 2(35) and Section 2(61) definitions are broad but do not cover all edge cases.

### Q5: Retrospective Compliance
**Question:** For aggregators who missed the 21 June 2026 registration deadline, can they register retroactively without penalty?  
**Current Status:** No explicit amnesty provision found in the Rules.  
**Impact:** Late registrants may face Section 133 penalties. Platform should track and disclose this risk.
