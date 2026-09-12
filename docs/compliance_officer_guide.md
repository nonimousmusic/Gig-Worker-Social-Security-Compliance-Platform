# GigCessHQ — Compliance Officer Operational Manual

This manual provides standard operating procedures (SOPs) for Aggregator Compliance Officers, Legal Leads, and External Auditors managing obligations under the **Code on Social Security, 2020** and **Central Rules, 2026**.

---

## 1. Compliance Lifecycle Calendar

```
    DAY 1-89               DAY 80-89                DAY 90+             QUARTER END (Oct 31)
┌──────────────┐       ┌──────────────┐        ┌──────────────┐        ┌────────────────────┐
│ Daily Trip   │ ────> │ Warning Zone │  ────> │ Statutory    │  ────> │ Form-XX Filing     │
│ Logging via  │       │ Dispatched   │        │ Eligibility  │        │ & Challan Lock     │
│ CSV Dropzone │       │ (Verify UAN) │        │ Triggered    │        │ (SHA-256 Vault)    │
└──────────────┘       └──────────────┘        └──────────────┘        └────────────────────┘
```

---

## 2. Standard Operating Procedures (SOPs)

### SOP 1: Ingesting Daily Engagement Logs
1. Navigate to **CSV Ingestion Studio** (`/dashboard/upload`).
2. Download the `daily_ledger_template.csv` to ensure your dispatch export matches the expected header format:
   - `worker_id`, `worker_name`, `uan`, `aadhaar_last4`, `date`, `hours_worked`, `gross_payout`, `platform_turnover_attributed`, `trip_or_gig_count`.
3. Drag & drop your nightly CSV export into the dropzone.
4. Review the validation summary table:
   - **Valid rows (Green):** Ingested immediately.
   - **Invalid rows (Red):** Display specific validation errors (e.g. invalid date format, Aadhaar not 4 digits, hours > 24).
5. Click **Process & Ingest Batch**. The system updates worker active days and triggers the rolling window evaluation engine.

---

### SOP 2: Managing Worker Registration & Masked Aadhaar
1. Navigate to **Worker Compliance Directory** (`/dashboard/workers`).
2. Search workers by Name, Aggregator Worker ID, or e-Shram UAN.
3. Verify that all Aadhaar numbers display strictly in masked format: `XXXX-XXXX-1234`.
4. To register an individual new hire:
   - Click **Add Worker**.
   - Input Aggregator Worker ID, Name, 12-digit Aadhaar, and e-Shram UAN.
   - The client-side masking pipeline validates the Aadhaar checksum and retains only the last 4 digits in compliant storage.

---

### SOP 3: Monitoring 90-Day Rolling Window & 80-Day Warning Zone
1. Open **Statutory Eligibility Engine** (`/dashboard/eligibility`).
2. Review the workforce distribution:
   - **Statutory Eligible:** $\ge 90$ days in rolling 12 months OR $\ge 120$ cumulative days in FY.
   - **Approaching Threshold (80–89 Days):** Immediate action required.
3. For workers in the approaching zone:
   - Ensure the worker's e-Shram UAN is recorded.
   - Prompt the worker via SMS/WhatsApp to complete e-Shram registration before day 90 to prevent non-compliance penalties under Section 133.

---

### SOP 4: Processing Rule 28(2) Multi-App Worker Self-Declarations
For gig partners driving or delivering on multiple platforms simultaneously (e.g. Zomato + Swiggy or Uber + Ola):
1. Locate the worker in `/dashboard/eligibility` or `/dashboard/workers`.
2. Click **+ Add Multi-App Days**.
3. Select the other aggregator name (e.g. Zomato Logistics, Swiggy, Uber).
4. Enter the declared active days and date range as certified by the gig partner.
5. Click **Confirm & Aggregate**.
6. The engine recalculates cumulative days:
   $$\text{New Cumulative Days} = \text{Internal Days} + \text{Declared External Days}$$
   If $\ge 120$ days, the worker status flips automatically to `ELIGIBLE`.

---

### SOP 5: Preparing & Filing Form-XX (Quarterly Turnover Return)
Statutory deadlines:
- **Q1 (Apr–Jun):** Due July 31
- **Q2 (Jul–Sep):** Due October 31
- **Q3 (Oct–Dec):** Due January 31
- **Q4 (Jan–Mar):** Due April 30

#### Step-by-Step Filing Procedure:
1. Navigate to **Statutory Filings** (`/dashboard/filings`).
2. Click **New Form-XX Filing** to launch the 4-step wizard:
   - **Step 1 (Period & Numbers):** Input Platform Turnover and Aggregate Worker Payouts for the quarter.
   - **Step 2 (Cess Formula):** The system computes the 1.5% turnover cess and the 5% worker payout ceiling side-by-side, determining the lower statutory obligation.
   - **Step 3 (Worker Census):** Review the certified count of eligible workers linked to the filing return.
   - **Step 4 (Verification):** Review the draft summary and click **Save & Generate Form-XX Draft**.

---

### SOP 6: Depositing Cess & Cryptographic Challan Lock
1. Take the Net Cess Payable figure and deposit funds at the designated Treasury Bank (e.g. State Bank of India).
2. Receive the stamped Bank Challan and Transaction UTR Number.
3. Open **Challan Vault** (`/dashboard/challans`).
4. Click **Deposit Challan & Lock**.
5. Input:
   - Target Filing Return (e.g. Form-XX Q2).
   - Bank Challan Reference Number.
   - Bank Name & Branch.
   - Bank UTR Number.
   - Amount Remitted (INR).
   - Deposit Date.
6. Click **Verify & Lock Return**.
7. The platform generates an immutable SHA-256 cryptographic hash and locks the filing status to `PAID`.

---

### SOP 7: Generating Statutory Inspection Audit Dossier
1. Navigate to **Audit Reports** (`/dashboard/reports`).
2. The page renders a certified Section 114 & Rule 32 compliance dossier featuring:
   - Aggregator Corporate Details (CIN, GSTIN, Sector).
   - Worker Census (Total vs Eligible).
   - Quarterly Filings & Remittance Ledger.
   - Immutable Audit Trail with user timestamps.
3. Click **Print Dossier** to generate a clean, official PDF or printout for Ministry of Labour & Employment (MoLE) social security inspectors.
