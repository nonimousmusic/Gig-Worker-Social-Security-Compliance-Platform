# API Specification
## Gig Worker Social Security Compliance Platform

**Version:** 1.0  
**Base URL:** `https://api.gigcesshq.in/v1` (production) | `http://localhost:3000/api/v1` (development)  
**Authentication:** Bearer JWT (issued via `/auth/login`)  
**Content-Type:** `application/json` (unless file upload)  
**Date:** 12 September 2026

---

## Table of Contents

1. [Authentication & Sessions](#1-authentication--sessions)
2. [Organizations](#2-organizations)
3. [Users & RBAC](#3-users--rbac)
4. [Workers](#4-workers)
5. [Daily Engagement Ledger](#5-daily-engagement-ledger)
6. [Eligibility Engine](#6-eligibility-engine)
7. [Filing Records & Challans](#7-filing-records--challans)
8. [Contribution Calculator](#8-contribution-calculator)
9. [Alerts & Notifications](#9-alerts--notifications)
10. [Audit Logs & Exports](#10-audit-logs--exports)
11. [Partner / Advisor Portal](#11-partner--advisor-portal)
12. [Free Compliance Audit (Lead-Gen)](#12-free-compliance-audit-lead-gen)
13. [CSV Upload & Ingestion](#13-csv-upload--ingestion)
14. [Cron & Internal Endpoints](#14-cron--internal-endpoints)
15. [Error Codes & Response Format](#15-error-codes--response-format)

---

## 1. Authentication & Sessions

### `POST /auth/register`

Create a new account with work email verification.

**Request Body:**
```json
{
  "email": "ops@quickdrop.in",
  "fullName": "Rajesh Kumar",
  "password": "••••••••",
  "companyName": "QuickDrop Logistics Pvt. Ltd.",
  "sector": "LOGISTICS_DELIVERY",
  "cinOrRegistration": "U74999MH2024PTC123456",
  "gstin": "27AABCQ1234A1Z5"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "organizationId": "uuid",
    "email": "ops@quickdrop.in",
    "emailVerificationSent": true,
    "message": "Verification email sent. Please confirm your work email to activate your account."
  }
}
```

**Validation Rules:**
- `email`: Must be a work email domain (blocks gmail.com, yahoo.com, outlook.com, etc. for paid accounts).
- `password`: Minimum 8 characters, at least 1 uppercase, 1 digit.
- `sector`: Must be a valid `AggregatorSector` enum value.
- `cinOrRegistration`: Optional. If provided, validated against MCA 21-digit CIN format or 10-character PAN.

---

### `POST /auth/verify-email`

Confirm work email via token sent in registration email.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "emailVerified": true,
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 3600
  }
}
```

---

### `POST /auth/login`

Authenticate and receive JWT tokens.

**Request Body:**
```json
{
  "email": "ops@quickdrop.in",
  "password": "••••••••"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 3600,
    "user": {
      "id": "uuid",
      "email": "ops@quickdrop.in",
      "fullName": "Rajesh Kumar",
      "role": "ORG_ADMIN",
      "organizationId": "uuid",
      "organizationName": "QuickDrop Logistics Pvt. Ltd."
    }
  }
}
```

---

### `POST /auth/refresh`

Refresh an expired access token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

---

### `POST /auth/forgot-password`

Initiate password reset flow.

**Request Body:**
```json
{
  "email": "ops@quickdrop.in"
}
```

---

### `POST /auth/reset-password`

Complete password reset with token.

**Request Body:**
```json
{
  "token": "reset-token",
  "newPassword": "••••••••"
}
```

---

## 2. Organizations

### `GET /organizations/me`

Get current user's organization profile.

**Headers:** `Authorization: Bearer <token>`

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "QuickDrop Logistics Pvt. Ltd.",
    "type": "AGGREGATOR",
    "sector": "LOGISTICS_DELIVERY",
    "cinOrRegistration": "U74999MH2024PTC123456",
    "gstin": "27AABCQ1234A1Z5",
    "annualTurnover": 50000000.00,
    "annualWorkerPayouts": 12000000.00,
    "isTrialAudit": false,
    "createdAt": "2026-09-01T10:00:00.000Z",
    "stats": {
      "totalWorkers": 342,
      "activeWorkers": 318,
      "registeredOnEshram": 285,
      "gapFlagged": 33,
      "eligibleWorkers": 198,
      "approachingThreshold": 45,
      "atRiskCritical": 12
    }
  }
}
```

---

### `PATCH /organizations/me`

Update organization financial and profile data.

**Request Body:**
```json
{
  "annualTurnover": 55000000.00,
  "annualWorkerPayouts": 14500000.00,
  "gstin": "27AABCQ1234A1Z5"
}
```

**Authorization:** `ORG_ADMIN` or `FINANCE_LEAD` only.

---

## 3. Users & RBAC

### `GET /users`

List all users in the current organization.

**Headers:** `Authorization: Bearer <token>`  
**Authorization:** `ORG_ADMIN` only.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "ops@quickdrop.in",
      "fullName": "Rajesh Kumar",
      "role": "ORG_ADMIN",
      "isEmailVerified": true,
      "createdAt": "2026-09-01T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "email": "finance@quickdrop.in",
      "fullName": "Priya Sharma",
      "role": "FINANCE_LEAD",
      "isEmailVerified": true,
      "createdAt": "2026-09-05T14:00:00.000Z"
    }
  ]
}
```

---

### `POST /users/invite`

Invite a team member to the organization.

**Request Body:**
```json
{
  "email": "operations-lead@quickdrop.in",
  "fullName": "Anil Verma",
  "role": "OPS_MANAGER"
}
```

**Authorization:** `ORG_ADMIN` only.

---

### `PATCH /users/:userId/role`

Update a user's role within the organization.

**Request Body:**
```json
{
  "role": "FINANCE_LEAD"
}
```

**Authorization:** `ORG_ADMIN` only.

---

### `DELETE /users/:userId`

Remove a user from the organization.

**Authorization:** `ORG_ADMIN` only. Cannot remove self.

---

## 4. Workers

### `GET /workers`

List workers with filtering, search, and pagination.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `page` | Integer | Page number (default: 1) |
| `limit` | Integer | Results per page (default: 50, max: 200) |
| `search` | String | Search by name, internal code, or UAN |
| `registrationStatus` | Enum | Filter: `REGISTERED_ON_ESHRAM`, `PENDING_SUBMISSION`, `GAP_FLAGGED` |
| `eligibilityStatus` | Enum | Filter: `NOT_YET_ELIGIBLE`, `APPROACHING_THRESHOLD`, `AT_RISK_CRITICAL`, `ELIGIBLE`, `ELIGIBLE_MULTI_AGGREGATOR` |
| `isActive` | Boolean | Filter active/exited workers |
| `sortBy` | String | `name`, `daysWorked`, `eligibilityStatus`, `registrationStatus` |
| `sortOrder` | String | `asc` or `desc` |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "workers": [
      {
        "id": "uuid",
        "workerInternalCode": "DRV-0042",
        "fullName": "Suresh Yadav",
        "uan": "123456789012",
        "maskedAadhaar": "XXXX-XXXX-4567",
        "registrationStatus": "REGISTERED_ON_ESHRAM",
        "eligibilityStatus": "AT_RISK_CRITICAL",
        "isActive": true,
        "onboardedDate": "2026-04-15",
        "currentFY": {
          "financialYear": "2026-2027",
          "internalDaysWorked": 87,
          "declaredExternalDays": 15,
          "totalCumulativeDays": 102,
          "totalGrossEarnings": 145230.00
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalRecords": 342,
      "totalPages": 7
    }
  }
}
```

---

### `GET /workers/:workerId`

Get a single worker's full profile with engagement history.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workerInternalCode": "DRV-0042",
    "fullName": "Suresh Yadav",
    "uan": "123456789012",
    "maskedAadhaar": "XXXX-XXXX-4567",
    "registrationStatus": "REGISTERED_ON_ESHRAM",
    "eligibilityStatus": "AT_RISK_CRITICAL",
    "isActive": true,
    "onboardedDate": "2026-04-15",
    "exitDate": null,
    "annualAggregates": [
      {
        "financialYear": "2026-2027",
        "internalDaysWorked": 87,
        "declaredExternalDays": 15,
        "totalCumulativeDays": 102,
        "totalGrossEarnings": 145230.00,
        "isEligible": false,
        "lastCalculatedAt": "2026-09-12T00:30:00.000Z"
      }
    ],
    "externalDeclarations": [
      {
        "id": "uuid",
        "financialYear": "2026-2027",
        "externalAggregator": "Swiggy",
        "declaredDaysCount": 15,
        "declarationDocUrl": "/uploads/declarations/dec-xyz.pdf",
        "declaredDate": "2026-08-20",
        "provenance": "SELF_REPORTED_WORKER_DECLARATION"
      }
    ],
    "recentEngagements": [
      {
        "engagementDate": "2026-09-11",
        "grossEarnings": 1850.00,
        "tripOrTaskId": "TRIP-20260911-042"
      }
    ]
  }
}
```

---

### `POST /workers`

Manually create a single worker record.

**Request Body:**
```json
{
  "workerInternalCode": "DRV-0099",
  "fullName": "Amit Patel",
  "uan": "987654321098",
  "aadhaarNumber": "234567891234",
  "phone": "+919876543210",
  "onboardedDate": "2026-09-01"
}
```

> **Note:** `aadhaarNumber` is masked to `XXXX-XXXX-1234` on ingestion. `phone` is encrypted with AES-256-GCM before persistence. Raw values are never stored.

---

### `PATCH /workers/:workerId`

Update worker details.

**Request Body:**
```json
{
  "uan": "987654321098",
  "registrationStatus": "REGISTERED_ON_ESHRAM",
  "isActive": true
}
```

---

### `POST /workers/:workerId/exit`

Record a worker exit event.

**Request Body:**
```json
{
  "exitDate": "2026-09-10",
  "reason": "Contract ended"
}
```

---

### `POST /workers/:workerId/declarations`

Submit a worker's self-reported external platform engagement days.

**Request Body (multipart/form-data):**

| Field | Type | Description |
|---|---|---|
| `financialYear` | String | e.g. `"2026-2027"` |
| `externalAggregator` | String | Name of external platform |
| `declaredDaysCount` | Integer | Number of days worked on external platform |
| `declarationDoc` | File | Signed self-attestation PDF/image (optional) |

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "declaredDaysCount": 15,
    "provenance": "SELF_REPORTED_WORKER_DECLARATION",
    "warning": "These days are tagged as 'Self-Reported' in all dashboards and audit exports. Your organization assumes no liability for third-party data accuracy."
  }
}
```

---

## 5. Daily Engagement Ledger

### `GET /workers/:workerId/engagements`

Get engagement day log for a worker.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `financialYear` | String | Filter by FY (e.g. `"2026-2027"`) |
| `startDate` | Date | Start of date range (YYYY-MM-DD) |
| `endDate` | Date | End of date range (YYYY-MM-DD) |
| `page` | Integer | Page number |
| `limit` | Integer | Results per page (max: 365) |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "workerId": "uuid",
    "financialYear": "2026-2027",
    "engagements": [
      {
        "id": "uuid",
        "engagementDate": "2026-09-11",
        "grossEarnings": 1850.00,
        "tripOrTaskId": "TRIP-20260911-042",
        "sourceBatchId": "BATCH-20260912-001"
      }
    ],
    "summary": {
      "totalDaysInRange": 164,
      "totalEarningsInRange": 145230.00
    },
    "pagination": { "page": 1, "limit": 50, "totalRecords": 164, "totalPages": 4 }
  }
}
```

---

### `POST /workers/:workerId/engagements`

Add a single engagement day entry.

**Request Body:**
```json
{
  "engagementDate": "2026-09-12",
  "grossEarnings": 2100.50,
  "tripOrTaskId": "TRIP-20260912-042"
}
```

---

## 6. Eligibility Engine

### `GET /eligibility/dashboard`

Get organization-wide eligibility summary for the current financial year.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "financialYear": "2026-2027",
    "asOfDate": "2026-09-12",
    "summary": {
      "totalActiveWorkers": 318,
      "notYetEligible": 63,
      "approachingThreshold": 45,
      "atRiskCritical": 12,
      "eligible": 183,
      "eligibleMultiAggregator": 15
    },
    "thresholdBreakdown": {
      "singleAggregator90Day": {
        "totalEligible": 183,
        "avgDaysWorked": 112
      },
      "multiAggregator120Day": {
        "totalEligible": 15,
        "note": "Cross-platform days are Self-Reported worker declarations. Your organization is not liable for third-party accuracy."
      }
    },
    "atRiskWorkers": [
      {
        "workerId": "uuid",
        "workerInternalCode": "DRV-0042",
        "fullName": "Suresh Yadav",
        "internalDaysWorked": 87,
        "daysUntilThreshold": 3,
        "projectedEligibilityDate": "2026-09-15"
      }
    ]
  }
}
```

---

### `POST /eligibility/recalculate`

Force recalculation of all worker eligibility statuses.

**Authorization:** `ORG_ADMIN` only.

**Response `202 Accepted`:**
```json
{
  "success": true,
  "data": {
    "message": "Eligibility recalculation initiated for 318 active workers.",
    "estimatedCompletionSeconds": 12
  }
}
```

---

## 7. Filing Records & Challans

### `GET /filings`

List all filing records for the organization.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `financialYear` | String | Filter by FY |
| `formType` | Enum | `FORM_XX_PROVISIONAL`, `FORM_XXI_FINAL`, `FORM_XXII_REFUND` |
| `status` | Enum | Filing status filter |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "financialYear": "2026-2027",
      "formType": "FORM_XX_PROVISIONAL",
      "dueDate": "2027-06-30",
      "status": "NOT_STARTED",
      "daysUntilDue": 291,
      "assessedContribution": null,
      "finalLiabilityAmount": null,
      "balancePayable": null,
      "accruedInterestPenalty": 0
    }
  ]
}
```

---

### `POST /filings`

Initialize a new filing record for a financial year and form type.

**Request Body:**
```json
{
  "financialYear": "2025-2026",
  "formType": "FORM_XXI_FINAL",
  "reportedTurnover": 50000000.00,
  "reportedWorkerPayouts": 12000000.00
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "financialYear": "2025-2026",
    "formType": "FORM_XXI_FINAL",
    "dueDate": "2026-10-31",
    "status": "IN_PROGRESS",
    "appliedRatePct": 1.50,
    "assessedContribution": 750000.00,
    "statutoryCeilingAmount": 600000.00,
    "finalLiabilityAmount": 600000.00,
    "provisionalAdjusted": 500000.00,
    "balancePayable": 100000.00,
    "calculation": {
      "turnoverBasis": 750000.00,
      "workerPaymentBasis": 600000.00,
      "appliedAmount": 600000.00,
      "basisUsed": "WORKER_PAYMENT_5PCT_CEILING",
      "savings": 150000.00
    }
  }
}
```

---

### `POST /filings/:filingId/generate-pdf`

Generate the pre-filled official Form-XX or Form-XXI PDF.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "pdfUrl": "/api/v1/filings/uuid/download-pdf",
    "generatedAt": "2026-09-12T10:30:00.000Z",
    "formType": "FORM_XXI_FINAL",
    "pageCount": 4
  }
}
```

---

### `GET /filings/:filingId/download-pdf`

Download the generated Form PDF.

**Response:** Binary PDF file with `Content-Type: application/pdf`.

---

### `POST /filings/:filingId/challans`

Upload a bank challan proof for a filing.

**Request Body (multipart/form-data):**

| Field | Type | Description |
|---|---|---|
| `cin` | String | Challan Identification Number |
| `bsrCode` | String | Bank BSR Code |
| `bankName` | String | Name of the depositing bank |
| `depositDate` | Date | Date of deposit |
| `amountDeposited` | Decimal | Amount deposited |
| `challanReceipt` | File | Scanned bank challan PDF/image |

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "cin": "1234567890123456789",
    "bsrCode": "0400128",
    "amountDeposited": 100000.00,
    "depositDate": "2026-10-28",
    "challanReceiptUrl": "/uploads/challans/challan-xyz.pdf"
  }
}
```

---

### `POST /filings/:filingId/lock`

Lock a filing record after all challans are uploaded. This action is irreversible.

**Authorization:** `ORG_ADMIN` or `FINANCE_LEAD` only.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "FILED_LOCKED",
    "lockedHashSha256": "a1b2c3d4e5f6...",
    "filedAt": "2026-10-28T14:30:00.000Z",
    "message": "Filing record is now permanently locked and tamper-evident. This action cannot be reversed."
  }
}
```

---

## 8. Contribution Calculator

### `POST /contributions/calculate`

Calculate contribution under both statutory bases for a given financial year.

**Request Body:**
```json
{
  "financialYear": "2025-2026",
  "annualTurnover": 50000000.00,
  "totalWorkerPayouts": 12000000.00,
  "sector": "LOGISTICS_DELIVERY"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "financialYear": "2025-2026",
    "sector": "LOGISTICS_DELIVERY",
    "appliedRate": {
      "percentage": 1.50,
      "gazetteRef": "GSR-xxxx(E) dated dd/mm/2026",
      "status": "NOTIFIED"
    },
    "turnoverBasis": {
      "turnover": 50000000.00,
      "rate": 1.50,
      "amount": 750000.00
    },
    "workerPaymentBasis": {
      "totalPayouts": 12000000.00,
      "ceilingRate": 5.00,
      "amount": 600000.00
    },
    "finalObligation": {
      "amount": 600000.00,
      "basisUsed": "WORKER_PAYMENT_5PCT_CEILING",
      "savingsOverTurnover": 150000.00,
      "note": "The 5% worker payment ceiling is lower and has been applied as your statutory obligation."
    },
    "rateStatus": "CONFIRMED",
    "disclaimer": "Rates are based on the latest Section 114 gazette notification. Verify with your legal advisor before filing."
  }
}
```

---

### `GET /contributions/rate-config`

Get the current contribution rate configuration matrix.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "sector": "RIDE_HAILING",
      "financialYear": "2026-2027",
      "ratePercentage": 2.00,
      "maxWorkerPayoutPct": 5.00,
      "gazetteNotificationRef": "GSR-1234(E)",
      "effectiveFrom": "2026-04-01",
      "isActive": true
    },
    {
      "sector": "FOOD_DELIVERY",
      "financialYear": "2026-2027",
      "ratePercentage": 1.50,
      "maxWorkerPayoutPct": 5.00,
      "gazetteNotificationRef": "GSR-1234(E)",
      "effectiveFrom": "2026-04-01",
      "isActive": true
    }
  ]
}
```

---

## 9. Alerts & Notifications

### `GET /notifications`

Get notification history for the organization.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `type` | Enum | Filter by notification type |
| `startDate` | Date | Start of date range |
| `endDate` | Date | End of date range |
| `page` | Integer | Page number |
| `limit` | Integer | Results per page |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "DEADLINE_REMINDER_30D",
        "subject": "⚠️ 30 Days Until Form-XXI Final Return Deadline",
        "contentSummary": "Your Form-XXI final annual return for FY 2025-2026 is due by 31 October 2026. You have 198 eligible workers and an estimated balance payable of ₹1,00,000. Late filing attracts 1% monthly interest (₹1,000/month).",
        "recipientEmail": "ops@quickdrop.in",
        "sentAt": "2026-10-01T00:30:00.000Z",
        "deliveryStatus": "DELIVERED"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "totalRecords": 45, "totalPages": 3 }
  }
}
```

---

### `GET /notifications/upcoming-deadlines`

Get a summary of upcoming statutory deadlines and countdowns.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "deadlines": [
      {
        "formType": "FORM_XXI_FINAL",
        "financialYear": "2025-2026",
        "dueDate": "2026-10-31",
        "daysRemaining": 49,
        "status": "IN_PROGRESS",
        "estimatedPenaltyIfMissed": {
          "balancePayable": 100000.00,
          "monthlyInterest": 1000.00,
          "annualizedRate": "12%",
          "section": "Section 133 / Rule 49"
        }
      },
      {
        "formType": "FORM_XX_PROVISIONAL",
        "financialYear": "2026-2027",
        "dueDate": "2027-06-30",
        "daysRemaining": 291,
        "status": "NOT_STARTED",
        "estimatedPenaltyIfMissed": null
      }
    ]
  }
}
```

---

## 10. Audit Logs & Exports

### `GET /audit-logs`

Query the immutable audit trail.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `action` | String | Filter by action type (e.g. `ROSTER_CSV_UPLOAD`, `CHALLAN_LOCKED`) |
| `entityType` | String | Filter by entity (e.g. `Worker`, `FilingRecord`) |
| `userId` | String | Filter by acting user |
| `startDate` | DateTime | Start of range |
| `endDate` | DateTime | End of range |
| `page` | Integer | Page number |
| `limit` | Integer | Results per page |

**Authorization:** `ORG_ADMIN` only.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "action": "CHALLAN_LOCKED",
        "entityType": "FilingRecord",
        "entityId": "uuid",
        "userId": "uuid",
        "userEmail": "ops@quickdrop.in",
        "detailsJson": {
          "before": { "status": "CHALLAN_DEPOSITED" },
          "after": { "status": "FILED_LOCKED", "lockedHashSha256": "a1b2c3..." }
        },
        "ipAddress": "103.21.58.xxx",
        "createdAt": "2026-10-28T14:30:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 50, "totalRecords": 1245, "totalPages": 25 }
  }
}
```

---

### `POST /exports/compliance-report`

Generate and download a full compliance audit report.

**Request Body:**
```json
{
  "financialYear": "2025-2026",
  "format": "PDF",
  "includeWorkerDetails": true,
  "includeFilingHistory": true,
  "includeChallanReconciliation": true
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "reportUrl": "/api/v1/exports/download/report-uuid",
    "format": "PDF",
    "generatedAt": "2026-09-12T11:00:00.000Z",
    "expiresAt": "2026-09-13T11:00:00.000Z",
    "sha256Digest": "abc123...",
    "sections": [
      "Aggregator Registration Details",
      "Workforce Summary & e-Shram Status",
      "Eligibility Roster (90-Day & 120-Day)",
      "Contribution Calculation Comparison",
      "Filing History & Challan Reconciliation",
      "Cryptographic Verification Seal"
    ]
  }
}
```

---

### `POST /exports/worker-csv`

Export worker roster as CSV.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `financialYear` | String | Filter by FY |
| `registrationStatus` | Enum | Filter by status |
| `eligibilityStatus` | Enum | Filter by eligibility |

**Response:** CSV file download.

---

## 11. Partner / Advisor Portal

### `GET /partner/clients`

List all client organizations the partner has access to.

**Authorization:** Users belonging to an `ADVISORY_PARTNER` organization only.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "clientOrganizationId": "uuid",
      "clientName": "QuickDrop Logistics Pvt. Ltd.",
      "sector": "LOGISTICS_DELIVERY",
      "accessLevel": "COMPLIANCE_MANAGER",
      "grantedAt": "2026-08-01T00:00:00.000Z",
      "complianceSummary": {
        "totalWorkers": 342,
        "eligibleWorkers": 198,
        "gapFlagged": 33,
        "nextDeadline": "2026-10-31",
        "daysUntilDeadline": 49,
        "filingStatus": "IN_PROGRESS"
      }
    }
  ]
}
```

---

### `POST /partner/clients/:clientOrgId/switch`

Switch the advisor's active session context to a client organization.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "activeClientOrgId": "uuid",
    "activeClientName": "QuickDrop Logistics Pvt. Ltd.",
    "accessLevel": "COMPLIANCE_MANAGER",
    "message": "You are now viewing QuickDrop Logistics. All subsequent API calls will operate in this client context."
  }
}
```

---

### `POST /organizations/me/grant-partner-access`

Grant a partner organization access to your data.

**Request Body:**
```json
{
  "partnerOrganizationId": "uuid",
  "accessLevel": "AUDITOR_READ_ONLY"
}
```

**Authorization:** `ORG_ADMIN` of the client organization.

---

### `DELETE /organizations/me/revoke-partner-access/:partnerOrgId`

Revoke a partner's access.

**Authorization:** `ORG_ADMIN` of the client organization.

---

## 12. Free Compliance Audit (Lead-Gen)

### `POST /free-audit/register`

Register for the free compliance audit. Creates a trial organization.

**Request Body:**
```json
{
  "email": "founder@newdelivery.in",
  "fullName": "Vikram Singh",
  "password": "••••••••",
  "companyName": "NewDelivery Express",
  "sector": "LOGISTICS_DELIVERY"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "organizationId": "uuid",
    "isTrialAudit": true,
    "emailVerificationSent": true,
    "maxSampleRows": 500
  }
}
```

---

### `POST /free-audit/upload-sample`

Upload a sample CSV for the free compliance audit (max 500 rows).

**Request Body (multipart/form-data):**

| Field | Type | Description |
|---|---|---|
| `sampleFile` | File | CSV file with worker data (max 500 rows) |
| `annualTurnoverEstimate` | Decimal | Estimated annual turnover |
| `annualWorkerPayoutsEstimate` | Decimal | Estimated annual worker payouts |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "workersProcessed": 127,
    "riskScorecard": {
      "overallRiskLevel": "HIGH",
      "eshramGapPercentage": 42.5,
      "workersWithoutUAN": 54,
      "workersExceeding90Days": 38,
      "workersApproachingThreshold": 12,
      "estimatedCessLiabilityBracket": {
        "low": 150000,
        "high": 300000,
        "note": "Based on estimated turnover and pending Section 114 rate notifications."
      },
      "nextStatutoryDeadline": {
        "formType": "FORM_XXI_FINAL",
        "dueDate": "2026-10-31",
        "daysRemaining": 49
      },
      "penaltyExposure": {
        "section133Registration": "Up to ₹1,00,000 per unregistered worker",
        "lateFilingInterest": "1% per month (12% p.a.) on unpaid contributions"
      }
    }
  }
}
```

---

### `POST /free-audit/generate-report`

Generate the full diagnostic compliance audit PDF for download.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "reportUrl": "/api/v1/free-audit/download-report/uuid",
    "generatedAt": "2026-09-12T11:00:00.000Z"
  }
}
```

---

## 13. CSV Upload & Ingestion

### `POST /ingestion/upload`

Upload a CSV/XLSX file for bulk worker and engagement data ingestion.

**Request Body (multipart/form-data):**

| Field | Type | Description |
|---|---|---|
| `file` | File | CSV or XLSX file |
| `importType` | Enum | `DAILY_LEDGER` or `SUMMARY_BACKFILL` |
| `financialYear` | String | Target FY (e.g. `"2026-2027"`) |
| `dryRun` | Boolean | If `true`, validate only without persisting |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "batchId": "BATCH-20260912-001",
    "importType": "DAILY_LEDGER",
    "totalRowsProcessed": 1245,
    "newWorkersCreated": 12,
    "existingWorkersUpdated": 318,
    "newEngagementDaysRecorded": 1245,
    "duplicatesSkipped": 23,
    "errors": [
      {
        "row": 47,
        "field": "date",
        "value": "32/13/2026",
        "error": "Invalid date format. Expected YYYY-MM-DD or DD/MM/YYYY."
      }
    ],
    "aadhaarMaskingApplied": 156,
    "warnings": [
      "3 workers have Aadhaar numbers that were auto-masked to last 4 digits per DPDP Act compliance."
    ]
  }
}
```

---

### `GET /ingestion/batches`

List all past import batches.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "batchId": "BATCH-20260912-001",
      "importType": "DAILY_LEDGER",
      "financialYear": "2026-2027",
      "fileName": "sept-engagement-log.csv",
      "totalRows": 1245,
      "successRows": 1222,
      "errorRows": 23,
      "uploadedBy": "ops@quickdrop.in",
      "uploadedAt": "2026-09-12T09:15:00.000Z"
    }
  ]
}
```

---

## 14. Cron & Internal Endpoints

These endpoints are internal-only and secured by a `CRON_SECRET` header.

### `POST /internal/cron/daily-compliance-sweep`

**Headers:** `X-Cron-Secret: <CRON_SECRET>`

Triggers the nightly compliance sweep:
1. Scans all open filing records for deadline proximity.
2. Dispatches email reminders at 60, 30, 15, 7, 3, 1, 0 day intervals.
3. Calculates and updates accrued interest penalties for overdue filings.
4. Flags workers crossing 75, 85, or 90-day thresholds.
5. Logs all actions to `NotificationLog` and `AuditLog`.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "executedAt": "2026-09-12T00:30:00.000Z",
    "deadlineAlertsDispatched": 3,
    "overdueFilingsUpdated": 1,
    "workerMilestonesTriggered": 7,
    "totalEmailsSent": 10,
    "executionTimeMs": 2340
  }
}
```

---

### `POST /internal/cron/recalculate-aggregates`

Force recalculation of all `WorkerAnnualAggregate` rows from the underlying `DailyEngagementLedger`.

**Headers:** `X-Cron-Secret: <CRON_SECRET>`

---

## 15. Error Codes & Response Format

### Standard Error Response

All errors follow a consistent JSON structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description of the error.",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid work email address."
      }
    ],
    "requestId": "req-uuid"
  }
}
```

### Error Code Reference

| HTTP Status | Error Code | Description |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Request body validation failed |
| `400` | `INVALID_CSV_FORMAT` | Uploaded CSV does not match expected schema |
| `400` | `AADHAAR_RAW_REJECTED` | Raw Aadhaar submission detected and blocked |
| `400` | `DUPLICATE_ENTRY` | Record already exists (e.g. duplicate challan CIN) |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT token |
| `401` | `EMAIL_NOT_VERIFIED` | Account exists but email not yet confirmed |
| `403` | `FORBIDDEN` | User role does not permit this action |
| `403` | `PARTNER_ACCESS_DENIED` | Advisor does not have access to this client |
| `403` | `FILING_LOCKED` | Attempting to modify a locked filing record |
| `404` | `NOT_FOUND` | Requested resource does not exist |
| `409` | `FILING_ALREADY_EXISTS` | Filing record for this FY/form type already exists |
| `413` | `FILE_TOO_LARGE` | Uploaded file exceeds size limit (10MB) |
| `422` | `RATE_NOT_CONFIGURED` | No contribution rate config found for sector/FY |
| `429` | `RATE_LIMITED` | Too many requests — try again later |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

### Rate Limits

| Endpoint Category | Rate Limit |
|---|---|
| Authentication | 10 requests / minute |
| CSV Upload / Ingestion | 5 requests / minute |
| PDF Generation | 3 requests / minute |
| General API | 100 requests / minute |
| Free Audit (unauthenticated) | 3 requests / minute |

---

## Appendix: API Authentication Flow

```
┌──────────┐          ┌────────────┐          ┌──────────────┐
│  Client   │          │  API Server │          │  PostgreSQL  │
└─────┬────┘          └──────┬─────┘          └──────┬───────┘
      │  POST /auth/register  │                       │
      │──────────────────────>│  Create User + Org    │
      │                       │──────────────────────>│
      │                       │  Send verification    │
      │  <email with token>   │  email                │
      │<──────────────────────│                       │
      │                       │                       │
      │  POST /auth/verify    │                       │
      │──────────────────────>│  Mark verified        │
      │                       │──────────────────────>│
      │  { accessToken, ...}  │                       │
      │<──────────────────────│                       │
      │                       │                       │
      │  GET /workers         │                       │
      │  Authorization: Bearer│                       │
      │──────────────────────>│  Verify JWT + RBAC    │
      │                       │──────────────────────>│
      │  { workers: [...] }   │                       │
      │<──────────────────────│                       │
```
