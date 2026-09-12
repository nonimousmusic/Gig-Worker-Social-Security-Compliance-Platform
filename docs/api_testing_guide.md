# GigCessHQ — API Testing & Verification Guide

This guide provides test commands (both PowerShell and cURL) with expected status codes and sample JSON responses for all 20 implemented API endpoints running on `http://localhost:3000`.

---

## 1. Authentication Endpoints

### 1.1 Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Description:** Authenticates user credentials, sets session cookie, and returns JWT access token.

#### PowerShell
```powershell
$body = @{
    email = "compliance@quickmove.in"
    password = "Password@123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

#### cURL
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"compliance@quickmove.in","password":"Password@123"}'
```

#### Expected Response (200 OK)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "user": {
      "id": "usr-admin-1",
      "email": "compliance@quickmove.in",
      "fullName": "Arjun Verma (Compliance Officer)",
      "role": "ADMIN",
      "organizationId": "org-quickmove-01",
      "organizationName": "QuickMove Technologies Private Limited",
      "sector": "LOGISTICS_DELIVERY"
    }
  }
}
```

---

### 1.2 Session Info
- **Endpoint:** `GET /api/v1/auth/me`

#### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/me" -Method GET
```

#### Expected Response (200 OK)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr-admin-1",
      "email": "compliance@quickmove.in",
      "fullName": "Arjun Verma (Compliance Officer)",
      "role": "ADMIN",
      "organizationId": "org-quickmove-01"
    }
  }
}
```

---

## 2. Dashboard Analytics Endpoints

### 2.1 Compliance Overview
- **Endpoint:** `GET /api/v1/dashboard/overview`
- **Description:** Returns aggregate workforce stats, Q2 cess financials, and statutory deadline countdown.

#### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/dashboard/overview" -Method GET
```

#### Expected Response (200 OK)
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalWorkers": 1850,
      "eligibleWorkers": 1410,
      "approachingWorkers": 182,
      "inactiveWorkers": 258,
      "eligiblePercentage": 76.2
    },
    "financials": {
      "turnoverQ2": 38500000,
      "payoutQ2": 21400000,
      "cessRatePercent": 1.5,
      "calculatedCessQ2": 577500,
      "payoutCapQ2": 1070000,
      "netCessPayableQ2": 577500,
      "totalCessPaidYTD": 2406000
    },
    "statutoryDeadline": {
      "filingName": "Form-XX (Quarterly Turnover Return)",
      "quarter": "Q2 (July–September 2025)",
      "dueDate": "2025-10-31",
      "daysRemaining": 49,
      "status": "UPCOMING"
    },
    "complianceScore": 94,
    "riskLevel": "LOW"
  }
}
```

---

### 2.2 Eligibility Engine Distribution
- **Endpoint:** `GET /api/v1/dashboard/eligibility`

#### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/dashboard/eligibility" -Method GET
```

---

## 3. Worker Directory & Declarations

### 3.1 List Workers (with Search & Filter)
- **Endpoint:** `GET /api/v1/workers?status=ELIGIBLE&search=Rajesh`

#### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/workers?status=ELIGIBLE" -Method GET
```

---

### 3.2 Add Worker (with Instant Aadhaar Masking)
- **Endpoint:** `POST /api/v1/workers`

#### PowerShell
```powershell
$newWorker = @{
    aggregatorWorkerId = "QM-DEL-9999"
    fullName = "Sunil Gavaskar"
    aadhaarNumber = "234567890123"
    uan = "101994821099"
    phone = "+91 98111 22233"
    sector = "LOGISTICS_DELIVERY"
    state = "DELHI"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/workers" `
    -Method POST `
    -Body $newWorker `
    -ContentType "application/json"
```

#### Expected Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "wrk-1726123456",
    "aggregatorWorkerId": "QM-DEL-9999",
    "fullName": "Sunil Gavaskar",
    "aadhaarLast4": "0123",
    "maskedAadhaar": "XXXX-XXXX-0123",
    "uan": "101994821099",
    "status": "INACTIVE"
  }
}
```

---

### 3.3 Multi-App Rule 28 Self-Declaration
- **Endpoint:** `POST /api/v1/workers/wrk-1003/declarations`

#### PowerShell
```powershell
$declaration = @{
    otherPlatformName = "Zomato Logistics"
    declaredDays = 15
    periodStart = "2025-04-01"
    periodEnd = "2025-06-30"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/workers/wrk-1003/declarations" `
    -Method POST `
    -Body $declaration `
    -ContentType "application/json"
```

---

## 4. Statutory Calculators

### 4.1 Section 114 Contribution Simulator
- **Endpoint:** `POST /api/v1/contributions/calculate`

#### PowerShell
```powershell
$calcInput = @{
    turnover = 400000000       # 40 Crores
    workerPayouts = 220000000  # 22 Crores
    customRatePercent = 1.5
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/contributions/calculate" `
    -Method POST `
    -Body $calcInput `
    -ContentType "application/json"
```

#### Expected Response (200 OK)
```json
{
  "success": true,
  "data": {
    "turnoverBasis": {
      "base": 400000000,
      "rate": 1.5,
      "amount": 6000000
    },
    "workerPaymentBasis": {
      "base": 220000000,
      "ceilingRate": 5,
      "amount": 11000000
    },
    "finalObligation": {
      "amount": 6000000,
      "basisUsed": "TURNOVER_RATE",
      "savings": 5000000
    }
  }
}
```

---

### 4.2 Late Payment Penalty & Compounding Estimator
- **Endpoint:** `POST /api/v1/contributions/penalties`

#### PowerShell
```powershell
$penaltyInput = @{
    cessAmount = 577500
    dueDate = "2025-07-31"
    paymentDate = "2025-09-30"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/contributions/penalties" `
    -Method POST `
    -Body $penaltyInput `
    -ContentType "application/json"
```

#### Expected Response (200 OK)
```json
{
  "success": true,
  "data": {
    "balancePayable": 577500,
    "daysOverdue": 61,
    "monthsOverdue": 3,
    "interestRate": 1,
    "penaltyAmount": 17325,
    "annualizedRate": 12,
    "legalReference": "Section 133 / Rule 49, Social Security (Central) Rules, 2026"
  }
}
```

---

## 5. Statutory Filings & Challan Lock

### 5.1 Create Form-XX Filing Draft
- **Endpoint:** `POST /api/v1/filings`

#### PowerShell
```powershell
$filing = @{
    financialYear = "2025-2026"
    quarter = "Q2"
    filingType = "FORM_XX_QUARTERLY"
    turnoverAmount = 38500000
    payoutAmount = 21400000
    ratePercent = 1.5
    eligibleWorkerCount = 1410
    totalWorkerCount = 1850
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/filings" `
    -Method POST `
    -Body $filing `
    -ContentType "application/json"
```

---

### 5.2 Upload Challan & Cryptographic Lock
- **Endpoint:** `POST /api/v1/filings/fl-q2-2025/challan`

#### PowerShell
```powershell
$challan = @{
    challanNumber = "CHL-2025-Q2-88219"
    bankName = "State Bank of India — Treasury Branch"
    utrNumber = "SBIN00918273645"
    amount = 577500
    paymentDate = "2025-09-12"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/filings/fl-q2-2025/challan" `
    -Method POST `
    -Body $challan `
    -ContentType "application/json"
```

#### Expected Response (200 OK)
```json
{
  "success": true,
  "data": {
    "challan": {
      "challanNumber": "CHL-2025-Q2-88219",
      "utrNumber": "SBIN00918273645",
      "amount": 577500,
      "verified": true,
      "sha256Hash": "a6f8b1c4e9..."
    },
    "filingStatus": "PAID",
    "auditLocked": true
  }
}
```

---

## 6. Audit & Exports

### 6.1 Workers CSV Export
- **Endpoint:** `GET /api/v1/exports/workers`
- **Output:** UTF-8 encoded CSV file with masked Aadhaar, UAN, active days, and compliance tier.

#### PowerShell
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/exports/workers" -OutFile "workers_compliance.csv"
```

---

### 6.2 Certified Statutory Audit Dossier
- **Endpoint:** `GET /api/v1/exports/audit-report`

#### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/exports/audit-report" -Method GET
```

---

## 7. Partner Portal & Lead Magnet

### 7.1 Multi-Client Partner Overview
- **Endpoint:** `GET /api/v1/partner/clients`

#### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/partner/clients" -Method GET
```

---

### 7.2 Free Compliance Risk Assessment
- **Endpoint:** `POST /api/v1/free-audit`

#### PowerShell
```powershell
$auditReq = @{
    companyName = "QuickRide Mobility Pvt Ltd"
    contactEmail = "legal@quickride.in"
    sector = "RIDE_HAILING"
    workerCount = 2500
    annualTurnover = 80000000
    annualPayout = 45000000
    currentFilingPractices = "SPREADSHEETS"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/free-audit" `
    -Method POST `
    -Body $auditReq `
    -ContentType "application/json"
```
