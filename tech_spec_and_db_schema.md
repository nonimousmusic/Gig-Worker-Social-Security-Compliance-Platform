# Technical Architecture & Database Specification
## Gig Worker Social Security Compliance Platform (Code on Social Security, 2020)

**Document Version:** 1.0  
**Date:** 12 September 2026  
**Status:** Approved Technical Blueprint  
**Reference Document:** [Product Requirements Document](file:///c:/Users/admin/Desktop/work/freelance%20wali%20platform/prd.md)

---

## 1. Executive Technical Summary

This specification provides the engineering architecture, data pipelines, regulatory compliance safeguards (DPDP Act 2023 & UIDAI guidelines), computational engine algorithms, and PostgreSQL/Prisma database schema for the **Gig Worker Social Security Compliance Platform**.

The platform enables Indian aggregators (ride-hailing, food delivery, logistics, e-marketplaces, home services) to fulfill statutory compliance under the **Code on Social Security, 2020** and the **Social Security (Central) Rules, 2026** (notified 8 May 2026).

---

## 2. High-Level System Architecture

### 2.1 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Application Framework** | **Next.js (App Router) & TypeScript** | Unified full-stack architecture, high-performance server actions, serverless API routes, and SSR/client separation. |
| **Database & ORM** | **PostgreSQL + Prisma ORM** | Relational integrity, ACID guarantees for audit logs and ledger entries, strong type safety, and clean schema migrations. |
| **Styling & UI** | **TailwindCSS + Lucide Icons + Radix UI** | Modern, responsive, accessible enterprise design system with zero runtime CSS overhead. |
| **Document Engine** | **Puppeteer / Chromium Headless** | Server-side pixel-perfect rendering of official Ministry of Labour & Employment Form-XX/XXI PDF schedules and executive audit packages. |
| **Background Scheduling** | **Lightweight Node Cron / Vercel Cron Runner** | Daily database sweep executing deadline alerts, worker threshold triggers, and penalty interest accruals without heavyweight queue infrastructure. |
| **Transactional Email** | **Resend / AWS SES** | Reliable DKIM/SPF delivery for high-stakes statutory deadline alerts (60/30/15/7/3/1 days). |
| **Security & Cryptography** | **Node.js `crypto` (AES-256-GCM)** | Field-level encryption for sensitive PII (phone, bank, address) and client-side Aadhaar masking prior to persistence. |

### 2.2 System Architecture Diagram

```
                              ┌────────────────────────────────────────────────────────┐
                              │                    Browser Client                      │
                              │  - Aggregator Ops Portal                               │
                              │  - Advisor / Law Firm Multi-Client Console             │
                              │  - Free Compliance Audit Lead-Gen Funnel               │
                              └───────────────────────────┬────────────────────────────┘
                                                          │ HTTPS / Next.js Server Actions
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Next.js Full-Stack Application Layer                                                                            │
│                                                                                                                 │
│ ┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐  ┌───────────────────┐ │
│ │  Auth & Work Email Gate  │  │ Ingestion & Sanitizer    │  │ Eligibility Engine       │  │ Filing Wizard &   │ │
│ │  - Work email verify     │  │ - CSV / XLSX Parser      │  │ - 90-day Single Tenant   │  │ Challan Locker    │ │
│ │  - Session & RBAC        │  │ - Aadhaar auto-masking   │  │ - 120-day Self-Reported  │  │ - Form-XX / XXI   │ │
│ │  - Delegated Partner Acc.│  │ - Hybrid Ledger Ingest   │  │ - Threshold Warnings     │  │ - PDF Generator   │ │
│ └──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘  └───────────────────┘ │
│                                              │                                                                  │
│                                              ▼                                                                  │
│                        ┌───────────────────────────────────────────┐                                            │
│                        │ Contribution Calculator (Sec 114 Matrix)  │                                            │
│                        │ - 1%–2% Turnover Basis                    │                                            │
│                        │ - 5% Worker Payments Cap Enforcement      │                                            │
│                        └───────────────────────────────────────────┘                                            │
└──────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────┘
                                               │ Prisma Client
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PostgreSQL Storage & Data Vault                                                                                 │
│                                                                                                                 │
│  [Organizations]  ───<  [Users]             [Workers] ──────────< [DailyEngagementLedger]                      │
│        │                   │                    │                          │                                    │
│        └──< [PartnerAccess]│                    ├───< [WorkerDeclarations] │                                    │
│                            │                    │                          │                                    │
│  [ContributionRateConfigs] │                    └───< [AnnualAggregates]   │                                    │
│                            │                                               │                                    │
│  [FilingRecords] ───< [FilingChallans]      [NotificationLogs]             [AuditLogs]                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                ▲
                                │ Daily Cron Job (Nightly Sweep)
┌───────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────┐
│ Lightweight Scheduled Worker (Cron Engine)                                                                      │
│ - Scans statutory filing deadlines (Form-XX by 30 June, Form-XXI by 31 Oct)                                     │
│ - Calculates 1% monthly / 12% annual late filing interest penalties                                             │
│ - Flags workers crossing 75-day (warning), 85-day (critical), and 90-day (eligible) milestones                 │
│ - Dispatches transactional email reminders to Org Admins & Delegated Advisors                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Engine Specifications

### 3.1 Eligibility & Days-Worked Engine

#### Rule Formulation (Central Rules 2026, Rule 48/49)
1. **Definition of Engagement:** A worker is deemed "engaged" on any calendar date $d$ where recorded income $I(w, d) > 0$, regardless of shift duration or trip count.
2. **Single-Aggregator Threshold:**
   $$\text{Days}_{\text{internal}}(w, \text{FY}) = \sum_{d \in \text{FY}} \mathbb{I}(I_{\text{internal}}(w, d) > 0)$$
   - If $\text{Days}_{\text{internal}}(w, \text{FY}) \ge 90$: Worker status becomes `ELIGIBLE`.
   - If $85 \le \text{Days}_{\text{internal}}(w, \text{FY}) < 90$: Worker status becomes `AT_RISK_CRITICAL`.
   - If $75 \le \text{Days}_{\text{internal}}(w, \text{FY}) < 85$: Worker status becomes `APPROACHING_THRESHOLD`.
   - Otherwise: `NOT_YET_ELIGIBLE`.
3. **Multi-Aggregator 120-Day Threshold (Tenant-Isolated with Worker Declaration):**
   $$\text{Days}_{\text{total}}(w, \text{FY}) = \text{Days}_{\text{internal}}(w, \text{FY}) + \text{Days}_{\text{declared}}(w, \text{FY})$$
   - $\text{Days}_{\text{declared}}$ represents external platform days formally declared by the worker via self-certification.
   - If $\text{Days}_{\text{total}}(w, \text{FY}) \ge 120$: Worker status becomes `ELIGIBLE_MULTI_AGGREGATOR`.
   - The UI and exports distinctly tag these days with `provenance: "SELF_REPORTED_WORKER_DECLARATION"` to protect the aggregator from audit liability for third-party figures.

### 3.2 Contribution Calculator & Statutory Capping Engine (Section 114)

#### Calculation Logic
Aggregators pay a contribution determined by their gazetted sector rate applied to annual turnover, subject to an unconditional statutory ceiling of 5% of total payments made to gig workers:

$$\text{Contribution}_{\text{Turnover Basis}} = \text{Turnover}_{\text{FY}} \times \text{Rate}_{\text{sector}}$$
$$\text{Ceiling}_{\text{Statutory}} = \text{Total Worker Payments}_{\text{FY}} \times 0.05$$
$$\text{Statutory Obligation} = \min\left( \text{Contribution}_{\text{Turnover Basis}}, \text{Ceiling}_{\text{Statutory}} \right)$$

- **Side-by-Side Advisor Comparison:** The platform computes both the 1%–2% Turnover calculation and the direct 5% Payout comparison, displaying savings or ceiling relief clearly.
- **Dynamic Config Matrix:** Rates ($1.0\% - 2.0\%$) are read from `ContributionRateConfig` rows keyed by financial year and sector category (`RIDE_HAILING`, `FOOD_DELIVERY`, `LOGISTICS`, `MARKETPLACE_FREELANCE`, `HEALTHCARE_PERSONAL_SERVICES`).

### 3.3 Statutory Filing Lifecycle & Challan Locker

1. **Form-XX (Provisional Deposit - Due 30 June):**
   - Provisional turnover and estimated worker payments for the upcoming/current cycle.
   - System outputs pre-filled Ministry Form-XX PDF schedule.
   - Step wizard prompts aggregator to upload payment confirmation (Bank Challan, BSR code, CIN, deposit date).
   - Once confirmed, status moves to `PROVISIONALLY_FILED`.
2. **Form-XXI (Final Annual Return - Due 31 October):**
   - Ingests audited turnover and final actual worker payments for the closed financial year.
   - Computes:
     $$\text{Balance Due} = \text{Final Assessed Contribution} - \text{Provisional Deposited (Form-XX)}$$
   - **Late Penalty Computation:** If filed after 31 October:
     $$\text{Interest Penalty} = \text{Balance Due} \times \left(0.01 \times \lceil\text{Months Overdue}\rceil\right)$$
     *(Section 133 / Rule 49: 1% per month or fraction thereof, equivalent to 12% p.a.)*
   - Once final payment challan is uploaded, the filing record is **LOCKED** (hash-stamped with SHA-256 for audit immutability).
3. **Form-XXII (Refund Claims):**
   - If $\text{Balance Due} < 0$, system formats Form-XXII claim for the overpaid amount, displaying a 90-day government refund tracking SLA clock.

---

## 4. Privacy, Security & DPDP Act 2023 Implementation

1. **Aadhaar Masking Pipeline (Strict Ingestion Filter):**
   - Raw 12-digit Aadhaar numbers are prohibited from database persistence in accordance with UIDAI regulations.
   - The file ingestion parser checks Aadhaar regex (`^[2-9]{1}[0-9]{3}\\s?[0-9]{4}\\s?[0-9]{4}$`).
   - If present, it strips whitespace, retains only the last 4 digits, and stores it in `masked_aadhaar` as `XXXX-XXXX-1234`.
   - The raw data buffer is discarded from memory immediately following parsing.
2. **Primary Identity: e-Shram UAN:**
   - The 12-digit Universal Account Number issued by the Ministry of Labour is the non-sensitive statutory identifier (`uan`), formatted as `1234-5678-9012`.
3. **PII Field-Level Encryption:**
   - Sensitive personal information (`phone`, `bank_account_number`, `bank_ifsc`) is encrypted in PostgreSQL using AES-256-GCM envelope encryption with KMS-managed customer keys.
4. **Audit Provenance:**
   - Every creation, modification, calculation, export, and advisor view is logged to `AuditLog` with actor ID, IP address, timestamp, and before/after diffs.

---

## 5. Multi-Tenancy & Delegated Law-Firm Advisor Access

```
┌─────────────────────────────────────────┐
│     Law Firm / Compliance Advisory      │  (Organization: ADVISORY_PARTNER)
│          "JSA & Associates LLP"         │
└────────────────────┬────────────────────┘
                     │ Delegated Multi-Client Permissions
          ┌──────────┴──────────┐
          ▼                     ▼
┌───────────────────┐ ┌───────────────────┐
│  Aggregator A     │ │  Aggregator B     │  (Organizations: AGGREGATOR)
│ "QuickDrop Logistics"│ "UrbanChef Food"   │
└───────────────────┘ └───────────────────┘
```

- Each company operates as an isolated `Organization` with its own workers, ledgers, and filings.
- Channel partner law firms have an `ADVISORY_PARTNER` organization.
- Aggregators can grant delegated access to partner law firms via `PartnerClientAccess` records with granular roles:
  - `AUDITOR_READ_ONLY`: Can inspect day counts, run calculations, and download audit packages.
  - `COMPLIANCE_MANAGER`: Can upload rosters, verify e-Shram status, and draft Form-XX/XXI packages.
  - `BILLING_ADMIN`: Restricted from worker PII, only sees statutory liability totals.

---

## 6. Lead-Gen Funnel: Mandatory Quick Signup Free Audit

1. **Step 1 — Registration Gate:** Visitor lands on `/free-audit`. Must provide `work_email`, `company_name`, `sector`, and create a password before uploading data.
2. **Step 2 — Immediate Workspace Provisioning:** An `AGGREGATOR` organization is provisioned in `TRIAL_AUDIT` status.
3. **Step 3 — CSV Sample Ingestion:** Visitor uploads their worker sample (up to 500 rows).
4. **Step 4 — Instant Browser Risk Scorecard:**
   - Percentage of workers missing e-Shram UANs (immediate non-compliance exposure under Section 133).
   - Workers already exceeding 90 days.
   - Estimated cess liability bracket based on provided turnover/payout ranges.
   - Days remaining until 30 June / 31 October statutory deadlines with accrued interest penalty warning.
5. **Step 5 — Gated Full Executive Report:** Visitor can download the official stamped "Diagnostic Compliance Audit Report (PDF)" with one-click conversion to the paid subscription.

---

## 7. PostgreSQL Database Schema (Prisma Specification)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// -----------------------------------------------------------------------------
// 1. ORGANIZATIONS & MULTI-TENANCY
// -----------------------------------------------------------------------------

enum OrganizationType {
  AGGREGATOR
  ADVISORY_PARTNER
}

enum AggregatorSector {
  RIDE_HAILING
  FOOD_DELIVERY
  LOGISTICS_DELIVERY
  MARKETPLACE_FREELANCE
  HEALTHCARE_PERSONAL_SERVICES
  OTHER
}

model Organization {
  id              String            @id @default(uuid())
  name            String
  type            OrganizationType  @default(AGGREGATOR)
  sector          AggregatorSector?
  cinOrRegistration String?         // Corporate Identification Number / PAN
  gstin           String?
  annualTurnover  Decimal?          @db.Decimal(14, 2)
  annualWorkerPayouts Decimal?      @db.Decimal(14, 2)
  isTrialAudit    Boolean           @default(false)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  users           User[]
  workers         Worker[]
  filings         FilingRecord[]
  auditLogs       AuditLog[]
  notificationLogs NotificationLog[]

  // Channel Partner Delegated Access
  asClientAccesses  PartnerClientAccess[] @relation("ClientOrganization")
  asPartnerAccesses PartnerClientAccess[] @relation("PartnerOrganization")

  @@index([type])
  @@index([sector])
}

enum UserRole {
  ORG_ADMIN
  OPS_MANAGER
  FINANCE_LEAD
  EXTERNAL_ADVISOR
}

model User {
  id              String        @id @default(uuid())
  email           String        @unique
  fullName        String
  passwordHash    String
  role            UserRole      @default(ORG_ADMIN)
  organizationId  String
  organization    Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  isEmailVerified Boolean       @default(false)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  auditActions    AuditLog[]

  @@index([organizationId])
  @@index([email])
}

enum PartnerAccessLevel {
  AUDITOR_READ_ONLY
  COMPLIANCE_MANAGER
  FULL_ADMIN
}

model PartnerClientAccess {
  id                    String             @id @default(uuid())
  partnerOrganizationId String
  clientOrganizationId  String
  accessLevel           PartnerAccessLevel @default(AUDITOR_READ_ONLY)
  grantedAt             DateTime           @default(now())
  revokedAt             DateTime?

  partnerOrganization   Organization       @relation("PartnerOrganization", fields: [partnerOrganizationId], references: [id], onDelete: Cascade)
  clientOrganization    Organization       @relation("ClientOrganization", fields: [clientOrganizationId], references: [id], onDelete: Cascade)

  @@unique([partnerOrganizationId, clientOrganizationId])
  @@index([clientOrganizationId])
}

// -----------------------------------------------------------------------------
// 2. WORKERS & ENGAGEMENT LEDGER
// -----------------------------------------------------------------------------

enum RegistrationStatus {
  REGISTERED_ON_ESHRAM
  PENDING_SUBMISSION
  GAP_FLAGGED
}

enum EligibilityStatus {
  NOT_YET_ELIGIBLE
  APPROACHING_THRESHOLD  // 75 - 84 days
  AT_RISK_CRITICAL       // 85 - 89 days
  ELIGIBLE               // >= 90 days internal
  ELIGIBLE_MULTI_AGGREGATOR // >= 120 days cumulative
}

model Worker {
  id                  String             @id @default(uuid())
  organizationId      String
  organization        Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  workerInternalCode  String             // Aggregator's internal worker/driver ID
  fullName            String
  uan                 String?            // 12-digit e-Shram Universal Account Number
  maskedAadhaar       String?            // "XXXX-XXXX-1234" (UIDAI compliant)
  phoneEncrypted      String?            // AES-256 encrypted phone number
  
  registrationStatus  RegistrationStatus @default(PENDING_SUBMISSION)
  eligibilityStatus   EligibilityStatus  @default(NOT_YET_ELIGIBLE)
  
  onboardedDate       DateTime?
  exitDate            DateTime?
  isActive            Boolean            @default(true)
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  dailyEngagements    DailyEngagementLedger[]
  annualAggregates    WorkerAnnualAggregate[]
  externalDeclarations WorkerDeclaration[]

  @@unique([organizationId, workerInternalCode])
  @@index([organizationId, uan])
  @@index([organizationId, eligibilityStatus])
  @@index([organizationId, registrationStatus])
}

// Granular daily activity ledger (Hybrid ingestion foundation)
model DailyEngagementLedger {
  id              String       @id @default(uuid())
  workerId        String
  worker          Worker       @relation(fields: [workerId], references: [id], onDelete: Cascade)
  
  engagementDate  DateTime     @db.Date
  grossEarnings   Decimal      @db.Decimal(10, 2)
  tripOrTaskId    String?
  sourceBatchId   String?      // Links back to the upload CSV batch
  createdAt       DateTime     @default(now())

  @@unique([workerId, engagementDate, tripOrTaskId])
  @@index([workerId, engagementDate])
}

// Aggregated cache table refreshed after ingestion or daily sweep
model WorkerAnnualAggregate {
  id                  String       @id @default(uuid())
  workerId            String
  worker              Worker       @relation(fields: [workerId], references: [id], onDelete: Cascade)
  financialYear       String       // e.g. "2026-2027"
  
  internalDaysWorked  Int          @default(0)
  declaredExternalDays Int         @default(0)
  totalCumulativeDays Int          @default(0)
  totalGrossEarnings  Decimal      @default(0) @db.Decimal(12, 2)
  isEligible          Boolean      @default(false)
  lastCalculatedAt    DateTime     @default(now())

  @@unique([workerId, financialYear])
  @@index([workerId, financialYear])
}

// Self-reported external platform days declared by the worker
model WorkerDeclaration {
  id                  String       @id @default(uuid())
  workerId            String
  worker              Worker       @relation(fields: [workerId], references: [id], onDelete: Cascade)
  financialYear       String       // e.g. "2026-2027"
  
  externalAggregator  String?      // Name of external platform if disclosed
  declaredDaysCount   Int
  declarationDocUrl   String?      // Signed worker self-attestation file URL
  declaredDate        DateTime     @default(now())
  verifiedByUserId    String?

  @@index([workerId, financialYear])
}

// -----------------------------------------------------------------------------
// 3. CONTRIBUTION RULES & FILING CALENDAR
// -----------------------------------------------------------------------------

model ContributionRateConfig {
  id              String           @id @default(uuid())
  financialYear   String           // e.g. "2026-2027"
  sector          AggregatorSector
  ratePercentage  Decimal          @db.Decimal(5, 2) // e.g. 1.50 for 1.5%
  maxWorkerPayoutPct Decimal       @default(5.00) @db.Decimal(5, 2) // 5% statutory ceiling
  gazetteNotificationRef String?   // Legal gazette order number
  effectiveFrom   DateTime
  effectiveTo     DateTime?
  isActive        Boolean          @default(true)

  @@unique([financialYear, sector])
  @@index([financialYear, sector])
}

enum FormType {
  FORM_XX_PROVISIONAL
  FORM_XXI_FINAL
  FORM_XXII_REFUND
}

enum FilingStatus {
  NOT_STARTED
  IN_PROGRESS
  PRE_FILING_GENERATED
  CHALLAN_DEPOSITED
  FILED_LOCKED
  OVERDUE
}

model FilingRecord {
  id                  String           @id @default(uuid())
  organizationId      String
  organization        Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  financialYear       String           // e.g. "2026-2027"
  formType            FormType
  dueDate             DateTime         // 30 June (XX) or 31 October (XXI)
  status              FilingStatus     @default(NOT_STARTED)
  
  // Financial parameters
  reportedTurnover    Decimal          @db.Decimal(14, 2)
  reportedWorkerPayouts Decimal        @db.Decimal(14, 2)
  appliedRatePct      Decimal          @db.Decimal(5, 2)
  
  assessedContribution Decimal         @db.Decimal(14, 2)
  statutoryCeilingAmount Decimal       @db.Decimal(14, 2) // 5% of payouts
  finalLiabilityAmount  Decimal        @db.Decimal(14, 2) // min(assessed, ceiling)
  
  provisionalAdjusted Decimal          @default(0) @db.Decimal(14, 2) // For Form-XXI
  balancePayable      Decimal          @default(0) @db.Decimal(14, 2)
  accruedInterestPenalty Decimal       @default(0) @db.Decimal(14, 2) // 12% p.a.
  
  generatedFormPdfUrl String?
  lockedHashSha256    String?          // Tamper-proof digest once locked
  filedAt             DateTime?
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  challans            FilingChallan[]

  @@unique([organizationId, financialYear, formType])
  @@index([organizationId, financialYear])
  @@index([status, dueDate])
}

model FilingChallan {
  id              String       @id @default(uuid())
  filingRecordId  String
  filingRecord    FilingRecord @relation(fields: [filingRecordId], references: [id], onDelete: Cascade)
  
  cin             String       // Challan Identification Number
  bsrCode         String       // Bank Basic Statistical Returns Code
  bankName        String
  depositDate     DateTime
  amountDeposited Decimal      @db.Decimal(14, 2)
  challanReceiptUrl String     // Scanned PDF/Image of bank challan
  verifiedBy      String?
  createdAt       DateTime     @default(now())

  @@index([filingRecordId])
  @@index([cin])
}

// -----------------------------------------------------------------------------
// 4. ALERTS, CRON AUDIT & SYSTEM LOGS
// -----------------------------------------------------------------------------

enum NotificationType {
  DEADLINE_REMINDER_60D
  DEADLINE_REMINDER_30D
  DEADLINE_REMINDER_15D
  DEADLINE_REMINDER_7D
  DEADLINE_REMINDER_1D
  PENALTY_ACCRUAL_WARNING
  WORKER_THRESHOLD_MILESTONE
  REGISTRATION_GAP_ALERT
}

model NotificationLog {
  id              String           @id @default(uuid())
  organizationId  String
  organization    Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  recipientEmail  String
  type            NotificationType
  subject         String
  contentSummary  String
  sentAt          DateTime         @default(now())
  deliveryStatus  String           @default("SENT") // SENT, FAILED, DELIVERED

  @@index([organizationId, sentAt])
}

model AuditLog {
  id              String       @id @default(uuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId          String?
  user            User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  action          String       // e.g. "ROSTER_CSV_UPLOAD", "CHALLAN_LOCKED", "FORM_XXI_GENERATED"
  entityType      String       // "Worker", "FilingRecord", "Organization"
  entityId        String?
  detailsJson     Json?        // Structured diff or metadata
  ipAddress       String?
  userAgent       String?
  createdAt       DateTime     @default(now())

  @@index([organizationId, createdAt])
  @@index([action])
}
```

---

## 8. Ingestion Pipeline & Data Contracts

### 8.1 Daily Activity Ledger CSV Contract (`ledger_import.csv`)

Aggregators uploading granular engagement data must supply:

| Field | Header Name | Format / Validation | Purpose |
|---|---|---|---|
| Worker Internal ID | `worker_id` | String, Required (Max 64 chars) | Maps to existing worker or auto-creates |
| Full Name | `worker_name` | String, Optional | Worker identification |
| e-Shram UAN | `uan` | 12 digits (`^\d{12}$` or `^\d{4}-\d{4}-\d{4}$`), Optional | Statutory identification |
| Aadhaar (Client-masked) | `aadhaar_number` | 12 digits or `XXXX-XXXX-1234` | Sanitized to last 4 digits on ingest |
| Activity Date | `date` | `YYYY-MM-DD` or `DD/MM/YYYY`, Required | Calendar engagement date |
| Gross Earnings | `earnings` | Decimal $\ge 0$, Required | Determines $>0$ engagement & cess payout sum |
| Task / Trip Ref | `reference_id` | String, Optional | Prevents duplicate ledger row entry |

### 8.2 Historical Summary Backfill CSV Contract (`summary_backfill.csv`)

For rapid onboarding without historical daily records:

| Field | Header Name | Format / Validation | Purpose |
|---|---|---|---|
| Worker Internal ID | `worker_id` | String, Required | Unique identifier |
| Full Name | `worker_name` | String, Required | Identity |
| e-Shram UAN | `uan` | 12 digits, Optional | UAN registration cross-check |
| Historical Days Worked | `total_days_worked_in_fy` | Integer ($0 - 365$), Required | Seeds `WorkerAnnualAggregate.internalDaysWorked` |
| Total Payouts in FY | `total_payouts_in_fy` | Decimal $\ge 0$, Required | Seeds contribution base |
| Cross-Platform Days | `declared_external_days` | Integer ($0 - 365$), Optional | Seeds `declaredExternalDays` (`Self-Reported`) |

---

## 9. Lightweight Daily Cron Execution Specification

The platform executes a scheduled endpoint (e.g. `/api/cron/daily-compliance-sweep`) secured by `CRON_SECRET` once every 24 hours at 00:30 IST:

```typescript
// Pseudocode for Daily Compliance Sweep
export async function runDailyComplianceSweep() {
  const today = new Date();
  const currentFY = getCurrentFinancialYear(today);

  // 1. Scan Statutory Filing Deadlines (30 June & 31 October)
  const filings = await prisma.filingRecord.findMany({
    where: {
      status: { notIn: ['FILED_LOCKED'] },
      financialYear: currentFY
    },
    include: { organization: { include: { users: true } } }
  });

  for (const filing of filings) {
    const daysUntilDue = differenceInCalendarDays(filing.dueDate, today);
    
    // Check reminder intervals: 60, 30, 15, 7, 3, 1, 0 days
    if ([60, 30, 15, 7, 3, 1, 0].includes(daysUntilDue)) {
      await sendDeadlineReminderEmail(filing, daysUntilDue);
    } 
    // If Overdue, calculate accrued interest penalty (1% per month)
    else if (daysUntilDue < 0) {
      const monthsOverdue = Math.ceil(Math.abs(daysUntilDue) / 30);
      const interestAmount = Number(filing.balancePayable) * (0.01 * monthsOverdue);
      
      await prisma.filingRecord.update({
        where: { id: filing.id },
        data: { 
          status: 'OVERDUE', 
          accruedInterestPenalty: interestAmount 
        }
      });
      
      // Weekly penalty alert on Mondays
      if (today.getDay() === 1) {
        await sendOverduePenaltyEmail(filing, interestAmount, monthsOverdue);
      }
    }
  }

  // 2. Scan Worker Threshold Milestones
  // Identify workers crossing 75, 85, or 90 days today to alert ops leads
  await processWorkerThresholdMilestoneAlerts(currentFY);
}
```

---

## 10. Audit Export & Form-XX/XXI Generation

- **Format:** High-resolution PDF generated via Puppeteer.
- **Header:** Official declaration pursuant to Rule 48 & Rule 49 of the Social Security (Central) Rules, 2026.
- **Sections:**
  1. Aggregator Information & Registration Details (CIN, GSTIN, Sector).
  2. Summary of Total Engaged Workforce, Registered on e-Shram count, and Gap Count.
  3. Eligible Worker Rosters (90-day single and 120-day cumulative counts).
  4. Turnover Basis vs. Worker Payment Basis calculation table with statutory ceiling comparison.
  5. Form-XX / Form-XXI Annexure with Challan BSR/CIN reconciliation.
  6. Tamper-evident SHA-256 cryptographic verification seal.

---

## 11. Engineering Implementation Roadmap

| Phase | Duration | Scope | Deliverables |
|---|---|---|---|
| **Phase 1** | Weeks 1–2 | Database, Auth & Work Email Gate | Prisma migration, auth with work email verification, DPDP sanitization filters. |
| **Phase 2** | Weeks 3–4 | Hybrid Ingestion & Engine | CSV parsers for daily ledger and backfill, 90/120-day calculation engine, self-reporting tags. |
| **Phase 3** | Weeks 5–6 | Filing Wizard & PDF Form Generator | Form-XX/XXI step wizard, Puppeteer template rendering, challan locker. |
| **Phase 4** | Weeks 7–8 | Alerting Cron & Partner Portal | Daily sweep cron, transactional email dispatch, delegated advisor multi-client console. |
| **Phase 5** | Weeks 9–10 | Free Compliance Audit Lead Magnet | Public `/free-audit` funnel, risk scorecard generator, conversion workflow. |
