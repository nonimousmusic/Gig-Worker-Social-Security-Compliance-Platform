# User Flows & Journey Maps
## Gig Worker Social Security Compliance Platform

**Version:** 1.0  
**Date:** 12 September 2026

---

## Table of Contents

1. [Flow 1 — New Aggregator Onboarding](#flow-1--new-aggregator-onboarding)
2. [Flow 2 — Worker Roster Upload (Daily Ledger)](#flow-2--worker-roster-upload-daily-ledger)
3. [Flow 3 — Worker Roster Upload (Historical Backfill)](#flow-3--worker-roster-upload-historical-backfill)
4. [Flow 4 — Eligibility Dashboard & Day-Count Monitoring](#flow-4--eligibility-dashboard--day-count-monitoring)
5. [Flow 5 — Worker Self-Declaration (Cross-Platform Days)](#flow-5--worker-self-declaration-cross-platform-days)
6. [Flow 6 — Form-XX Provisional Filing Wizard](#flow-6--form-xx-provisional-filing-wizard)
7. [Flow 7 — Form-XXI Final Return Filing Wizard](#flow-7--form-xxi-final-return-filing-wizard)
8. [Flow 8 — Challan Upload & Audit Lock](#flow-8--challan-upload--audit-lock)
9. [Flow 9 — Free Compliance Audit (Lead-Gen Funnel)](#flow-9--free-compliance-audit-lead-gen-funnel)
10. [Flow 10 — Law Firm Partner Portal](#flow-10--law-firm-partner-portal)
11. [Flow 11 — Compliance Audit Export](#flow-11--compliance-audit-export)
12. [Flow 12 — Deadline Alert Lifecycle](#flow-12--deadline-alert-lifecycle)
13. [Flow 13 — Team Member Invitation](#flow-13--team-member-invitation)
14. [Flow 14 — Contribution Calculation & Comparison](#flow-14--contribution-calculation--comparison)

---

## Flow 1 — New Aggregator Onboarding

**Persona:** Founder / Ops Lead  
**Entry Point:** Landing page → "Get Started" CTA

```mermaid
flowchart TD
    A["Landing Page"] --> B["Click 'Get Started'"]
    B --> C["Registration Form"]
    C --> C1["Enter Work Email"]
    C --> C2["Enter Company Name"]
    C --> C3["Select Sector"]
    C --> C4["Create Password"]
    C --> C5["Optional: CIN / GSTIN"]
    C --> D{"Submit Registration"}
    D --> E["Verification Email Sent"]
    E --> F["User clicks email link"]
    F --> G{"Email Verified?"}
    G -->|Yes| H["Redirect to Dashboard"]
    G -->|No| I["Show error / Resend option"]
    H --> J["Welcome Wizard"]
    J --> J1["Step 1: Confirm Company Profile"]
    J --> J2["Step 2: Enter Annual Turnover"]
    J --> J3["Step 3: Enter Annual Worker Payouts"]
    J --> J4["Step 4: Upload First Worker Roster"]
    J4 --> K{"Choose Upload Type"}
    K -->|Daily Ledger| L["Flow 2"]
    K -->|Historical Backfill| M["Flow 3"]
    K -->|Skip for now| N["Dashboard with empty state"]
```

**Key Screens:**
1. **Registration Form** — Work email, company name, sector dropdown, password, optional CIN/GSTIN.
2. **Email Verification** — Confirmation page with countdown and resend button.
3. **Welcome Wizard** — 4-step guided setup with progress bar.
4. **Dashboard Empty State** — Prompts to upload first roster with guided instructions.

**Validation Rules:**
- Work email: Block consumer domains (gmail.com, yahoo.com, outlook.com, hotmail.com).
- Password: Min 8 chars, 1 uppercase, 1 digit.
- Sector: Required selection from enum list.

**Audit Events:** `ACCOUNT_CREATED`, `EMAIL_VERIFIED`, `ONBOARDING_COMPLETED`.

---

## Flow 2 — Worker Roster Upload (Daily Ledger)

**Persona:** Ops Lead / Finance Lead  
**Entry Point:** Dashboard → "Upload Workers" → "Daily Activity Ledger"

```mermaid
flowchart TD
    A["Dashboard"] --> B["Click 'Upload Workers'"]
    B --> C["Select: Daily Activity Ledger"]
    C --> D["Download CSV Template"]
    C --> E["Drag & Drop or Browse CSV/XLSX"]
    E --> F{"File Validation"}
    F -->|Invalid format| G["Show error details per row"]
    F -->|Valid| H["Preview parsed data"]
    H --> H1["Show row count"]
    H --> H2["Show new vs existing workers"]
    H --> H3["Show Aadhaar masking warnings"]
    H --> H4["Show duplicate detection"]
    H --> I{"Confirm Import?"}
    I -->|No| J["Edit file & re-upload"]
    I -->|Yes| K["Process Import"]
    K --> L["Import Summary Report"]
    L --> L1["Workers created: X"]
    L --> L2["Engagement days recorded: Y"]
    L --> L3["Duplicates skipped: Z"]
    L --> L4["Errors: N rows"]
    L --> L5["Aadhaar masked: M records"]
    L --> M["Eligibility recalculation triggered"]
    M --> N["Dashboard refreshed with new data"]
```

**Aadhaar Masking Flow (within validation):**
```mermaid
flowchart LR
    A["Raw Aadhaar detected in CSV"] --> B["Regex match: 12-digit number"]
    B --> C["Strip whitespace"]
    C --> D["Extract last 4 digits"]
    D --> E["Store as XXXX-XXXX-1234"]
    E --> F["Discard raw buffer from memory"]
    F --> G["Log: AADHAAR_MASKED audit event"]
```

**CSV Column Mapping:**
| Expected Header | Aliases Accepted | Required |
|---|---|---|
| `worker_id` | `worker_code`, `driver_id`, `id` | ✅ |
| `worker_name` | `name`, `full_name`, `driver_name` | ❌ |
| `uan` | `eshram_uan`, `universal_account` | ❌ |
| `aadhaar_number` | `aadhaar`, `aadhar` | ❌ |
| `date` | `activity_date`, `engagement_date`, `work_date` | ✅ |
| `earnings` | `gross_earnings`, `amount`, `payout` | ✅ |
| `reference_id` | `trip_id`, `task_id`, `order_id` | ❌ |

**Error Handling:**
- Invalid dates: Show row number, value, and expected format.
- Missing required fields: Block import with clear instructions.
- Negative earnings: Warn but allow (could be adjustment/reversal).
- Duplicate entries (same worker + date + reference): Skip with warning.

---

## Flow 3 — Worker Roster Upload (Historical Backfill)

**Persona:** Ops Lead  
**Entry Point:** Dashboard → "Upload Workers" → "Historical Summary"

```mermaid
flowchart TD
    A["Dashboard"] --> B["Click 'Upload Workers'"]
    B --> C["Select: Historical Summary Backfill"]
    C --> D["Download Backfill Template"]
    C --> E["Upload CSV/XLSX"]
    E --> F{"Validation"}
    F -->|Valid| G["Preview with warnings"]
    G --> G1["Total days > 365 for any worker → Error"]
    G --> G2["External days present → Self-Reported tag warning"]
    G --> H{"Confirm?"}
    H -->|Yes| I["Create/Update WorkerAnnualAggregate records"]
    I --> J["Summary: X workers seeded for FY YYYY-YYYY"]
    J --> K["Dashboard shows populated data"]
    H -->|No| L["Return to edit"]
```

**Important Distinctions from Daily Ledger:**
- No individual engagement day entries are created — only aggregate records.
- Declared external days are tagged with `SELF_REPORTED_WORKER_DECLARATION` provenance.
- This mode is intended for rapid initial onboarding only; ongoing tracking should use the Daily Ledger.

---

## Flow 4 — Eligibility Dashboard & Day-Count Monitoring

**Persona:** Ops Lead  
**Entry Point:** Main dashboard (default view)

```mermaid
flowchart TD
    A["Dashboard Home"] --> B["Compliance Health Banner"]
    B --> B1["Overall compliance score"]
    B --> B2["Next deadline countdown"]
    B --> B3["Workers at risk count"]
    
    A --> C["Eligibility Summary Cards"]
    C --> C1["NOT_YET_ELIGIBLE: 63 workers"]
    C --> C2["APPROACHING (75-84d): 45 workers"]
    C --> C3["AT_RISK (85-89d): 12 workers"]
    C --> C4["ELIGIBLE (90+): 183 workers"]
    C --> C5["MULTI-AGG (120+): 15 workers"]
    
    C3 --> D["Click AT_RISK card"]
    D --> E["Filtered worker list"]
    E --> F["Click individual worker"]
    F --> G["Worker Detail Page"]
    G --> G1["Days worked timeline chart"]
    G --> G2["Earnings trend"]
    G --> G3["e-Shram registration status"]
    G --> G4["External declarations list"]
    G --> G5["Projected eligibility date"]
```

**Dashboard Components:**

| Component | Data Shown | Update Frequency |
|---|---|---|
| **Compliance Health Banner** | Overall score, next deadline, penalty exposure | Real-time on page load |
| **Eligibility Summary Cards** | Worker counts by status tier | After each upload or daily cron |
| **At-Risk Workers Table** | Workers within 5 days of 90-day threshold | After each upload or daily cron |
| **Registration Gap Alert** | Workers missing UAN or flagged | After each upload |
| **Filing Status Timeline** | Form-XX/XXI progress tracker | On filing status change |
| **Deadline Countdown** | Days/hours until next statutory due date | Real-time |

---

## Flow 5 — Worker Self-Declaration (Cross-Platform Days)

**Persona:** Ops Lead (on behalf of worker)  
**Entry Point:** Worker Detail Page → "Add External Platform Days"

```mermaid
flowchart TD
    A["Worker Detail Page"] --> B["Click 'Add External Platform Days'"]
    B --> C["Declaration Form"]
    C --> C1["Financial Year: auto-filled"]
    C --> C2["External Platform Name: free text"]
    C --> C3["Days Worked: integer input"]
    C --> C4["Upload signed self-attestation: optional PDF"]
    C --> D{"Submit Declaration"}
    D --> E["Confirmation Dialog"]
    E --> E1["⚠️ Warning: These days are tagged as 'Self-Reported'"]
    E --> E2["Your organization assumes no liability for accuracy"]
    E --> F{"Confirm?"}
    F -->|Yes| G["Save WorkerDeclaration record"]
    G --> H["Recalculate total cumulative days"]
    H --> I["Update eligibility status if 120-day threshold crossed"]
    I --> J["Worker Detail refreshed with new total"]
    J --> J1["Internal Days: 87 (Verified)"]
    J --> J2["External Days: 15 (Self-Reported ⚠️)"]
    J --> J3["Total: 102 days"]
```

**Provenance Display Rules:**
- Internal days: Always shown with ✅ "Verified" badge.
- External declared days: Always shown with ⚠️ "Self-Reported" badge.
- Audit exports and PDFs include the full provenance label: `"SELF_REPORTED_WORKER_DECLARATION"`.

---

## Flow 6 — Form-XX Provisional Filing Wizard

**Persona:** Finance Lead / Ops Lead  
**Entry Point:** Filing Calendar → "Prepare Form-XX" or Deadline Alert CTA

```mermaid
flowchart TD
    A["Filing Calendar"] --> B["Click 'Prepare Form-XX Provisional'"]
    B --> C["Step 1: Confirm Organization Details"]
    C --> C1["Company Name, CIN, GSTIN"]
    C --> C2["Sector classification"]
    C --> D["Step 2: Enter Provisional Financial Data"]
    D --> D1["Estimated Annual Turnover for FY"]
    D --> D2["Estimated Total Worker Payouts"]
    D --> E["Step 3: Review Calculation"]
    E --> E1["Turnover × Rate% = Amount A"]
    E --> E2["Payouts × 5% = Ceiling B"]
    E --> E3["Provisional Liability = min(A, B)"]
    E --> E4["Side-by-side comparison table"]
    E --> F["Step 4: Generate Form-XX PDF"]
    F --> G["Preview PDF in browser"]
    G --> H{"Download or Proceed to Challan?"}
    H -->|Download| I["Save PDF locally"]
    H -->|Upload Challan| J["Flow 8: Challan Upload"]
```

**Wizard Step Indicators:**
```
[1. Company Info] → [2. Financial Data] → [3. Review Calculation] → [4. Generate PDF] → [5. Upload Challan]
         ✅                  ✅                    🔵 Current              ⚪                    ⚪
```

---

## Flow 7 — Form-XXI Final Return Filing Wizard

**Persona:** Finance Lead / Ops Lead  
**Entry Point:** Filing Calendar → "Prepare Form-XXI" or Deadline Alert CTA

```mermaid
flowchart TD
    A["Filing Calendar"] --> B["Click 'Prepare Form-XXI Final Return'"]
    B --> C["Step 1: Confirm Company Details"]
    C --> D["Step 2: Enter Audited Financials"]
    D --> D1["Actual Audited Turnover"]
    D --> D2["Actual Total Worker Payouts"]
    D --> E["Step 3: System Pulls Eligible Workers"]
    E --> E1["Total eligible workers for FY"]
    E --> E2["90-day internal count"]
    E --> E3["120-day multi-aggregator count (Self-Reported noted)"]
    E --> F["Step 4: Review Final Calculation"]
    F --> F1["Final Assessed Contribution"]
    F --> F2["Less: Provisional Deposit (Form-XX)"]
    F --> F3["Balance Payable"]
    F --> F4["If overdue: Interest penalty calculation"]
    F --> G["Step 5: Generate Form-XXI PDF"]
    G --> H["Preview PDF"]
    H --> I{"Proceed to Challan Upload?"}
    I -->|Yes| J["Flow 8: Challan Upload"]
    I -->|Download only| K["Save PDF"]
```

**Late Filing Warning:**
If the current date is past 31 October, the wizard displays:
```
⚠️ OVERDUE FILING
This return was due on 31 October 2026.
You are [X] months overdue.
Accrued interest penalty: ₹[amount] (1% per month on balance of ₹[balance])
Section 133 / Rule 49 applies.
```

---

## Flow 8 — Challan Upload & Audit Lock

**Persona:** Finance Lead  
**Entry Point:** Filing Wizard Step 5 or Filing Detail Page

```mermaid
flowchart TD
    A["Filing Detail / Wizard Step 5"] --> B["Challan Upload Form"]
    B --> B1["Enter CIN (Challan Identification Number)"]
    B --> B2["Enter BSR Code"]
    B --> B3["Select Bank Name"]
    B --> B4["Enter Deposit Date"]
    B --> B5["Enter Amount Deposited"]
    B --> B6["Upload Scanned Challan Receipt (PDF/Image)"]
    B --> C{"Submit Challan?"}
    C --> D["Challan Saved - Status: CHALLAN_DEPOSITED"]
    D --> E["Reconciliation Check"]
    E --> E1["Amount deposited vs. balance payable"]
    E --> E2["If underpaid: Warning with shortfall amount"]
    E --> E3["If fully paid: Ready to lock"]
    E3 --> F{"Lock Filing Record?"}
    F --> G["Confirmation Dialog"]
    G --> G1["⚠️ This action is PERMANENT and IRREVERSIBLE"]
    G --> G2["The filing record will be hash-sealed for audit integrity"]
    G --> G3["No modifications can be made after locking"]
    G --> H{"Final Confirm?"}
    H -->|Yes| I["Generate SHA-256 Hash"]
    I --> J["Status → FILED_LOCKED"]
    J --> K["Audit Log: CHALLAN_LOCKED event"]
    K --> L["Filing Detail shows locked badge with hash"]
    H -->|No| M["Return to filing detail"]
```

**Post-Lock Display:**
```
✅ FILED & LOCKED
Form-XXI Final Return — FY 2025-2026
Filed on: 28 October 2026 at 14:30 IST
Integrity Hash (SHA-256): a1b2c3d4e5f6...
This record is permanently sealed and cannot be modified.
```

---

## Flow 9 — Free Compliance Audit (Lead-Gen Funnel)

**Persona:** First-time Visitor / Prospective Customer  
**Entry Point:** Landing page → "Free Compliance Check" CTA

```mermaid
flowchart TD
    A["Landing Page"] --> B["Click 'Free Compliance Check'"]
    B --> C["/free-audit Registration Page"]
    C --> C1["Enter Work Email"]
    C --> C2["Enter Company Name"]
    C --> C3["Select Sector"]
    C --> C4["Create Password"]
    C --> D{"Register & Verify Email"}
    D --> E["Email verification link"]
    E --> F["Click link → Account activated"]
    F --> G["Free Audit Upload Page"]
    G --> G1["Enter estimated annual turnover"]
    G --> G2["Enter estimated worker payouts"]
    G --> G3["Upload sample CSV (max 500 rows)"]
    G --> H{"Upload & Analyze"}
    H --> I["Processing spinner (3-5 seconds)"]
    I --> J["Risk Scorecard Page"]
    J --> J1["🔴 e-Shram Gap: 42.5% workers without UAN"]
    J --> J2["⚠️ 38 workers exceed 90-day threshold"]
    J --> J3["💰 Estimated cess liability: ₹1.5L - ₹3L"]
    J --> J4["📅 Next deadline: 31 Oct (49 days)"]
    J --> J5["⚖️ Penalty exposure: Section 133"]
    J --> K["Download Full Audit Report (PDF)"]
    J --> L["CTA: 'Upgrade to Full Platform'"]
    L --> M["Pricing page / Subscription flow"]
```

**Conversion Funnel Tracking:**
| Step | Event Name | Tracked Metric |
|---|---|---|
| Landing page visit | `funnel_landing_view` | Total visitors |
| Click "Free Check" | `funnel_cta_click` | Click-through rate |
| Registration submitted | `funnel_registration` | Registration rate |
| Email verified | `funnel_email_verified` | Verification rate |
| CSV uploaded | `funnel_csv_uploaded` | Upload completion |
| Scorecard viewed | `funnel_scorecard_view` | Scorecard delivery |
| Report downloaded | `funnel_report_download` | Report engagement |
| Upgrade clicked | `funnel_upgrade_click` | Conversion intent |
| Payment completed | `funnel_payment_complete` | Paid conversion |

---

## Flow 10 — Law Firm Partner Portal

**Persona:** Employment Law Firm / Compliance Advisory  
**Entry Point:** Partner login → Multi-client dashboard

```mermaid
flowchart TD
    A["Partner Login"] --> B["Multi-Client Dashboard"]
    B --> B1["Client List with compliance summaries"]
    B --> B2["Aggregate risk metrics across all clients"]
    B --> B3["Upcoming deadlines for all clients"]
    
    B1 --> C["Click Client: QuickDrop Logistics"]
    C --> D["Context Switch to Client Workspace"]
    D --> E["Client Dashboard (same as aggregator view)"]
    E --> E1["View workers & eligibility"]
    E --> E2["View filing status"]
    E --> E3["Download audit reports"]
    
    D --> F{"Access Level Check"}
    F -->|AUDITOR_READ_ONLY| G["Read-only: View data, download reports"]
    F -->|COMPLIANCE_MANAGER| H["Can upload rosters, manage filings"]
    F -->|FULL_ADMIN| I["Full access including user management"]
    
    E --> J["Switch Client: UrbanChef Food"]
    J --> D
```

**Partner Dashboard Components:**
1. **Client Health Grid** — Traffic-light status for each client (🟢 Compliant, 🟡 Action Needed, 🔴 Overdue).
2. **Upcoming Deadlines Panel** — All client deadlines in a unified calendar view.
3. **Aggregate Statistics** — Total workers managed, total filings pending, overall gap count.
4. **Quick Actions** — Download bulk reports, send client reminders.

**Access Grant Flow (from Aggregator side):**
```mermaid
flowchart LR
    A["Aggregator Admin"] --> B["Settings → Partner Access"]
    B --> C["Enter Partner Org ID or Email"]
    C --> D["Select Access Level"]
    D --> E["Send Invitation"]
    E --> F["Partner receives notification"]
    F --> G["Client appears in Partner Dashboard"]
```

---

## Flow 11 — Compliance Audit Export

**Persona:** Ops Lead / Finance Lead / External Advisor  
**Entry Point:** Dashboard → "Export Reports" or Filing Detail → "Download Audit Package"

```mermaid
flowchart TD
    A["Dashboard or Filing Detail"] --> B["Click 'Export Compliance Report'"]
    B --> C["Report Configuration"]
    C --> C1["Select Financial Year"]
    C --> C2["Select Format: PDF or CSV"]
    C --> C3["☑ Include worker details"]
    C --> C4["☑ Include filing history"]
    C --> C5["☑ Include challan reconciliation"]
    C --> D{"Generate Report"}
    D --> E["Server-side PDF generation (Puppeteer)"]
    E --> F["Report Ready"]
    F --> F1["Download link (expires in 24 hours)"]
    F --> F2["SHA-256 verification digest shown"]
    F --> G["Download PDF"]
```

**Report Sections (PDF):**
1. **Cover Page** — Company name, CIN, GSTIN, report period, generation timestamp.
2. **Executive Summary** — Total workforce, eligible count, registration compliance rate, filing status.
3. **Worker Roster** — Full table with internal code, UAN, masked Aadhaar, days worked, eligibility status, registration status.
4. **Eligibility Analysis** — 90-day and 120-day breakdown with self-reported provenance callouts.
5. **Contribution Calculation** — Turnover basis vs. worker payment basis with ceiling application.
6. **Filing History** — All Form-XX/XXI records with dates, amounts, and statuses.
7. **Challan Reconciliation** — CIN, BSR code, bank, amounts, and receipts.
8. **Cryptographic Seal** — SHA-256 hash for document integrity verification.

---

## Flow 12 — Deadline Alert Lifecycle

**Persona:** System → Ops Lead / Finance Lead  
**Trigger:** Daily cron job at 00:30 IST

```mermaid
flowchart TD
    A["Cron: 00:30 IST Daily"] --> B["Query all open FilingRecords"]
    B --> C["Calculate daysUntilDue for each"]
    
    C --> D{"Days = 60?"}
    D -->|Yes| E["📧 60-Day Reminder Email"]
    
    C --> F{"Days = 30?"}
    F -->|Yes| G["📧 30-Day Reminder Email"]
    
    C --> H{"Days = 15?"}
    H -->|Yes| I["📧 15-Day Reminder Email"]
    
    C --> J{"Days = 7?"}
    J -->|Yes| K["📧 7-Day URGENT Email"]
    
    C --> L{"Days = 3?"}
    L -->|Yes| M["📧 3-Day CRITICAL Email"]
    
    C --> N{"Days = 1?"}
    N -->|Yes| O["📧 FINAL DAY Email"]
    
    C --> P{"Days < 0?"}
    P -->|Yes| Q["Calculate interest penalty"]
    Q --> R["Update FilingRecord penalty amount"]
    R --> S{"Monday?"}
    S -->|Yes| T["📧 Weekly Overdue Penalty Email"]
    
    E & G & I & K & M & O & T --> U["Log to NotificationLog"]
    U --> V["Update in-app alert center"]
```

**Email Content Template (Example: 7-Day Alert):**
```
Subject: ⚠️ 7 DAYS — Form-XXI Final Return Due 31 October 2026

Dear Rajesh,

Your Form-XXI final annual return for FY 2025-2026 is due in 7 days.

📊 Current Status:
- Eligible workers: 198
- Balance payable: ₹1,00,000
- Filing status: IN_PROGRESS

⚠️ If missed, late filing attracts 1% monthly interest (₹1,000/month)
   under Section 133 / Rule 49 of the Social Security (Central) Rules, 2026.

👉 Complete your filing now: [Dashboard Link]

— GigCessHQ Compliance Platform
```

---

## Flow 13 — Team Member Invitation

**Persona:** Org Admin  
**Entry Point:** Settings → Team Management → "Invite Member"

```mermaid
flowchart TD
    A["Settings → Team"] --> B["Click 'Invite Team Member'"]
    B --> C["Invitation Form"]
    C --> C1["Enter email address"]
    C --> C2["Enter full name"]
    C --> C3["Select role: OPS_MANAGER / FINANCE_LEAD"]
    C --> D{"Send Invitation"}
    D --> E["Invitation email sent"]
    E --> F["Invitee clicks email link"]
    F --> G["Set Password page"]
    G --> H["Account activated"]
    H --> I["Invitee lands on dashboard with assigned role"]
```

**Role Permissions Matrix:**

| Action | ORG_ADMIN | OPS_MANAGER | FINANCE_LEAD | EXTERNAL_ADVISOR |
|---|---|---|---|---|
| View dashboard & workers | ✅ | ✅ | ✅ | ✅ |
| Upload worker rosters | ✅ | ✅ | ❌ | Per access level |
| Manage worker records | ✅ | ✅ | ❌ | Per access level |
| View financial data | ✅ | ❌ | ✅ | Per access level |
| Create/manage filings | ✅ | ❌ | ✅ | Per access level |
| Upload challans | ✅ | ❌ | ✅ | ❌ |
| Lock filing records | ✅ | ❌ | ✅ | ❌ |
| Export audit reports | ✅ | ✅ | ✅ | ✅ |
| Manage team members | ✅ | ❌ | ❌ | ❌ |
| Grant partner access | ✅ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ | ❌ |
| Configure org settings | ✅ | ❌ | ❌ | ❌ |

---

## Flow 14 — Contribution Calculation & Comparison

**Persona:** Finance Lead / Ops Lead  
**Entry Point:** Dashboard → "Calculate Contribution" or Filing Wizard Step 3

```mermaid
flowchart TD
    A["Calculator Page"] --> B["Pre-filled from Organization data"]
    B --> B1["Annual Turnover: ₹5,00,00,000"]
    B --> B2["Total Worker Payouts: ₹1,20,00,000"]
    B --> B3["Sector: LOGISTICS_DELIVERY"]
    B --> B4["Applied Rate: 1.50% (per gazette notification)"]
    
    B --> C["Calculation Results"]
    C --> D["Side-by-Side Comparison Table"]
    
    D --> D1["BASIS 1: Turnover Rate"]
    D1 --> D1a["₹5Cr × 1.50% = ₹7,50,000"]
    
    D --> D2["BASIS 2: Worker Payment Ceiling (5%)"]
    D2 --> D2a["₹1.2Cr × 5% = ₹6,00,000"]
    
    D --> E["✅ LOWER OBLIGATION: Worker Payment Ceiling"]
    E --> E1["Your statutory obligation: ₹6,00,000"]
    E --> E2["Savings vs turnover basis: ₹1,50,000"]
    
    C --> F["Rate Config Source"]
    F --> F1["Gazette Notification: GSR-xxxx(E)"]
    F --> F2["Effective from: 01 April 2026"]
    F --> F3["Status: CONFIRMED / PENDING"]
    
    C --> G{"Rate Status = PENDING?"}
    G -->|Yes| H["⚠️ Disclaimer: Rates pending Section 114 notification"]
    G -->|No| I["Proceed to filing wizard"]
```

**Comparison Table Display:**
```
┌─────────────────────────────────┬──────────────────┬──────────────────┐
│                                 │  Turnover Basis   │  5% Payout Cap   │
├─────────────────────────────────┼──────────────────┼──────────────────┤
│ Base Amount                     │  ₹5,00,00,000    │  ₹1,20,00,000   │
│ Applied Rate                    │  1.50%            │  5.00%           │
│ Calculated Contribution         │  ₹7,50,000       │  ₹6,00,000      │
├─────────────────────────────────┼──────────────────┼──────────────────┤
│ YOUR OBLIGATION                 │                  │  ✅ ₹6,00,000   │
│ Savings                         │                  │  ₹1,50,000      │
└─────────────────────────────────┴──────────────────┴──────────────────┘
```
