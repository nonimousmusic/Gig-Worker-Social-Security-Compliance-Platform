# Security Policy & DPDP Compliance
## Gig Worker Social Security Compliance Platform

**Version:** 1.0  
**Date:** 12 September 2026  
**Classification:** Internal — Engineering & Compliance Team

---

## Table of Contents

1. [Security Architecture Overview](#1-security-architecture-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Data Classification](#3-data-classification)
4. [Aadhaar Handling Policy](#4-aadhaar-handling-policy)
5. [Encryption Standards](#5-encryption-standards)
6. [API Security](#6-api-security)
7. [Audit Logging Policy](#7-audit-logging-policy)
8. [Data Retention & Deletion](#8-data-retention--deletion)
9. [DPDP Act 2023 Compliance Checklist](#9-dpdp-act-2023-compliance-checklist)
10. [Incident Response](#10-incident-response)
11. [Infrastructure Security](#11-infrastructure-security)
12. [Third-Party Dependencies](#12-third-party-dependencies)

---

## 1. Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Network & Transport                                   │
│  ├── TLS 1.3 (HTTPS only, HSTS enforced)                       │
│  ├── Cloudflare WAF & DDoS protection                           │
│  └── Rate limiting per endpoint category                        │
│                                                                 │
│  Layer 2: Authentication & Identity                              │
│  ├── JWT (RS256) with short-lived access tokens (1h)            │
│  ├── Refresh token rotation                                     │
│  ├── Work email domain verification                              │
│  └── bcrypt password hashing (cost factor 12)                   │
│                                                                 │
│  Layer 3: Authorization (RBAC)                                   │
│  ├── Role-based access control (4 roles)                        │
│  ├── Tenant isolation (org-scoped queries)                      │
│  └── Delegated partner access with granular permissions         │
│                                                                 │
│  Layer 4: Data Protection                                        │
│  ├── Aadhaar masking pipeline (ingestion-level)                 │
│  ├── AES-256-GCM field-level encryption for PII                │
│  ├── No raw Aadhaar in any storage layer                        │
│  └── Encrypted backups                                          │
│                                                                 │
│  Layer 5: Audit & Monitoring                                     │
│  ├── Immutable audit log for all state changes                  │
│  ├── IP address and user agent tracking                          │
│  ├── Sentry error monitoring                                     │
│  └── Failed login attempt tracking                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Authorization

### 2.1 — Password Policy

| Requirement | Specification |
|---|---|
| Minimum length | 8 characters |
| Complexity | At least 1 uppercase letter, 1 digit |
| Hashing algorithm | bcrypt with cost factor 12 |
| Storage | `passwordHash` column only — raw passwords never stored |
| Failed login lockout | 5 failed attempts → 15-minute lockout |
| Password reset | Token-based, expires in 1 hour |

### 2.2 — JWT Token Specification

| Parameter | Value |
|---|---|
| Algorithm | HS256 (HMAC-SHA256) |
| Access token expiry | 1 hour |
| Refresh token expiry | 7 days |
| Token payload | `{ userId, organizationId, role, iat, exp }` |
| Refresh rotation | New refresh token issued on each refresh; old token invalidated |

### 2.3 — Role-Based Access Control (RBAC)

| Role | Description | Scope |
|---|---|---|
| `ORG_ADMIN` | Full organization management | All operations |
| `OPS_MANAGER` | Worker and roster management | Workers, uploads, dashboard |
| `FINANCE_LEAD` | Financial data and filing management | Filings, calculator, challans |
| `EXTERNAL_ADVISOR` | Delegated partner access | Per `PartnerClientAccess.accessLevel` |

### 2.4 — Tenant Isolation

Every database query MUST be scoped to the authenticated user's `organizationId`:

```typescript
// ✅ CORRECT: Always scope queries to organization
const workers = await prisma.worker.findMany({
  where: { organizationId: session.organizationId }
});

// ❌ WRONG: Never allow unscoped queries
const workers = await prisma.worker.findMany({
  where: { id: workerId }  // Missing org scope!
});
```

**Partner context switching:**
When an advisor switches to a client context, all subsequent queries use the `clientOrganizationId` from `PartnerClientAccess`, validated against the partner's permissions.

---

## 3. Data Classification

| Classification | Description | Examples | Storage Policy |
|---|---|---|---|
| **RESTRICTED** | Data that must never be stored in raw form | Raw 12-digit Aadhaar numbers | Masked at ingestion, never persisted |
| **CONFIDENTIAL** | Sensitive PII requiring encryption | Phone numbers, bank account details | AES-256-GCM encrypted at rest |
| **INTERNAL** | Business data within tenant scope | Worker names, earnings, day counts | Plaintext, tenant-isolated |
| **PUBLIC** | Non-sensitive identifiers | e-Shram UAN, worker internal codes | Plaintext, indexed |

---

## 4. Aadhaar Handling Policy

### 4.1 — Absolute Prohibitions

| Action | Status | Enforcement |
|---|---|---|
| Store raw 12-digit Aadhaar in database | ❌ **PROHIBITED** | Ingestion parser blocks persistence |
| Display full Aadhaar in UI | ❌ **PROHIBITED** | Only `XXXX-XXXX-1234` format allowed |
| Log Aadhaar in application logs | ❌ **PROHIBITED** | Log sanitizer strips numeric sequences |
| Include Aadhaar in error messages | ❌ **PROHIBITED** | Error handlers redact PII |
| Email Aadhaar to any recipient | ❌ **PROHIBITED** | Email templates have no Aadhaar fields |
| Include raw Aadhaar in audit logs | ❌ **PROHIBITED** | Audit logger receives only masked values |
| Export raw Aadhaar in CSV/PDF reports | ❌ **PROHIBITED** | Export engine uses `maskedAadhaar` only |

### 4.2 — Masking Pipeline

```
Input: "2345 6789 1234" or "234567891234"
                    │
                    ▼
         ┌──────────────────┐
         │  Regex Detection  │  Pattern: ^[2-9]\d{3}\s?\d{4}\s?\d{4}$
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Strip Whitespace │  "234567891234"
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Extract Last 4   │  "1234"
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Format Masked    │  "XXXX-XXXX-1234"
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Persist to DB    │  maskedAadhaar = "XXXX-XXXX-1234"
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Clear Raw Buffer │  Zero-fill memory buffer
         └──────────────────┘
```

### 4.3 — Implementation Reference

```typescript
// src/lib/aadhaar-masking.ts

const AADHAAR_REGEX = /^[2-9]\d{3}\s?\d{4}\s?\d{4}$/;

export function maskAadhaar(rawInput: string): string | null {
  const cleaned = rawInput.replace(/\s/g, '');
  
  if (!AADHAAR_REGEX.test(rawInput)) {
    return null; // Not a valid Aadhaar format
  }
  
  const lastFour = cleaned.slice(-4);
  return `XXXX-XXXX-${lastFour}`;
}

export function containsRawAadhaar(text: string): boolean {
  // Detect any 12-digit number that could be Aadhaar
  return /[2-9]\d{3}\s?\d{4}\s?\d{4}/.test(text);
}

export function sanitizeLogMessage(message: string): string {
  // Replace any potential Aadhaar-like sequences in log messages
  return message.replace(/[2-9]\d{3}\s?\d{4}\s?\d{4}/g, 'XXXX-XXXX-XXXX');
}
```

---

## 5. Encryption Standards

### 5.1 — Field-Level Encryption

| Specification | Value |
|---|---|
| Algorithm | AES-256-GCM |
| Key length | 256 bits (32 bytes) |
| IV (Initialization Vector) | 12 bytes, unique per encryption |
| Auth tag | 16 bytes |
| Key storage | Environment variable (`ENCRYPTION_KEY`) |
| Key format | 64-character hex string |

### 5.2 — Encrypted Field Storage Format

```
[12-byte IV][ciphertext][16-byte auth tag]
```

All stored as a single base64-encoded string in the database column.

### 5.3 — Implementation Reference

```typescript
// src/lib/encryption.ts

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function encrypt(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return Buffer.concat([iv, encrypted, authTag]).toString('base64');
}

export function decrypt(ciphertext: string, key: Buffer): string {
  const buffer = Buffer.from(ciphertext, 'base64');
  
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(buffer.length - AUTH_TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH, buffer.length - AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  return decipher.update(encrypted) + decipher.final('utf8');
}
```

### 5.4 — Data at Rest

| Layer | Encryption |
|---|---|
| PostgreSQL database | Cloud provider disk encryption (AES-256) |
| Database backups | Encrypted before storage |
| File uploads (S3/R2) | Server-side encryption (SSE-S3 or SSE-KMS) |
| Application secrets | Environment variables, never in code or version control |

### 5.5 — Data in Transit

| Connection | Protocol |
|---|---|
| Client ↔ Server | TLS 1.3 (HTTPS only, HSTS max-age=31536000) |
| Server ↔ Database | SSL required (`?sslmode=require` in connection string) |
| Server ↔ Email provider | TLS (API over HTTPS) |
| Server ↔ File storage | TLS (API over HTTPS) |

---

## 6. API Security

### 6.1 — Rate Limiting

| Endpoint Category | Limit | Window | Response on Exceed |
|---|---|---|---|
| Authentication | 10 requests | 1 minute | `429 RATE_LIMITED` |
| CSV Upload / Ingestion | 5 requests | 1 minute | `429 RATE_LIMITED` |
| PDF Generation | 3 requests | 1 minute | `429 RATE_LIMITED` |
| General API (authenticated) | 100 requests | 1 minute | `429 RATE_LIMITED` |
| Free Audit (public) | 3 requests | 1 minute | `429 RATE_LIMITED` |

### 6.2 — Input Validation

- All request bodies validated with **Zod schemas** before processing.
- SQL injection: Prevented by Prisma ORM parameterized queries (no raw SQL).
- XSS: React auto-escaping + Content-Security-Policy headers.
- CSRF: SameSite cookie attribute + origin validation.
- File uploads: Content-type validation, size limits, virus scanning (future).

### 6.3 — Security Headers

```typescript
// Next.js middleware
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
```

### 6.4 — Internal Endpoint Protection

Cron endpoints (`/api/v1/internal/cron/*`) are secured by:

1. `X-Cron-Secret` header matching the `CRON_SECRET` environment variable.
2. Reject requests without the correct secret with `401 Unauthorized`.
3. Log all cron executions to `AuditLog`.

---

## 7. Audit Logging Policy

### 7.1 — Events That Must Be Logged

| Event Category | Specific Events |
|---|---|
| **Authentication** | Login success, login failure, password reset, email verification |
| **Data Ingestion** | CSV upload, batch import completion, parsing errors |
| **Worker Management** | Worker created, updated, exited, declaration submitted |
| **Filing Operations** | Filing created, PDF generated, challan uploaded, filing locked |
| **Access Control** | Role changed, user invited, partner access granted/revoked |
| **Export Operations** | Audit report generated, CSV exported |
| **System Operations** | Cron execution, eligibility recalculation, rate config update |
| **Partner Operations** | Client context switched, partner data accessed |

### 7.2 — Audit Log Entry Structure

```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "userId": "uuid",
  "action": "CHALLAN_LOCKED",
  "entityType": "FilingRecord",
  "entityId": "filing-uuid",
  "detailsJson": {
    "before": { "status": "CHALLAN_DEPOSITED" },
    "after": { "status": "FILED_LOCKED", "lockedHashSha256": "abc123..." }
  },
  "ipAddress": "103.21.58.xxx",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2026-10-28T14:30:00.000Z"
}
```

### 7.3 — Log Integrity

- Audit logs are **append-only** — no UPDATE or DELETE operations permitted.
- Database user for the application has no DELETE permission on the `AuditLog` table.
- Periodic integrity checks: Hash chain verification on audit log sequences.

---

## 8. Data Retention & Deletion

### 8.1 — Retention Periods

| Data Category | Retention Period | Legal Basis |
|---|---|---|
| Worker engagement records | FY + 8 years | Income Tax Act (7-year record retention) + 1 year buffer |
| Filing records & challans | FY + 8 years | Same as above |
| Audit logs | FY + 8 years | Compliance audit requirement |
| Notification logs | 2 years | Operational reference |
| Uploaded CSV files | 90 days after processing | Temporary ingestion artifacts |
| Generated PDF reports | 1 year | Download window |
| Free audit trial data | 90 days if not converted | Lead-gen cleanup |

### 8.2 — Deletion Procedures

- **Worker Data Deletion Request:** Under DPDP Act Section 12, a data principal can request erasure. The platform flags the request and notifies the aggregator admin, who must confirm. Statutory data required for compliance is retained with a legal retention notice; non-essential PII is purged.
- **Account Deletion:** On account closure, all organization data is scheduled for deletion after the statutory retention period expires.
- **Automated Cleanup:** A weekly cron job removes expired temporary files (uploaded CSVs past 90 days, expired report download links).

---

## 9. DPDP Act 2023 Compliance Checklist

| # | Requirement | DPDP Section | Implementation Status | Notes |
|---|---|---|---|---|
| 1 | Lawful purpose for processing | Section 4 | ✅ Implemented | Statutory compliance under Code on Social Security |
| 2 | Purpose limitation | Section 5 | ✅ Implemented | Data used only for compliance calculations |
| 3 | Data minimization | Section 6 | ✅ Implemented | Only collect necessary fields |
| 4 | Consent / notice | Section 6(1) | 🔲 Aggregator responsibility | Platform provides notice template for aggregators to share with workers |
| 5 | Accuracy obligation | Section 8(3) | ✅ Implemented | Workers can request correction via aggregator |
| 6 | Storage limitation | Section 8 | ✅ Implemented | Retention policy with automated cleanup |
| 7 | Security safeguards | Section 8(4) | ✅ Implemented | AES-256 encryption, access controls, audit logging |
| 8 | Data breach notification | Section 8(6) | 🔲 Policy drafted | 72-hour notification to Data Protection Board |
| 9 | Right to access | Section 11 | ✅ Implemented | Data export API |
| 10 | Right to correction | Section 12 | ✅ Implemented | Worker update endpoints |
| 11 | Right to erasure | Section 12 | ⚠️ Partial | Non-statutory data erasable; statutory data retained with legal notice |
| 12 | Right to grievance redressal | Section 13 | 🔲 Policy drafted | Grievance officer designation pending |
| 13 | Cross-border data transfer | Section 16 | ✅ N/A for MVP | All data stored in India (ap-south-1 region) |
| 14 | Significant data fiduciary | Section 10 | 🔲 Assessment pending | May apply if platform crosses processing volume thresholds |

---

## 10. Incident Response

### 10.1 — Severity Classification

| Severity | Description | Response Time | Examples |
|---|---|---|---|
| **P0 — Critical** | Data breach, PII exposure, service outage affecting filing deadlines | Immediate (within 1 hour) | Aadhaar leak, database compromise, missed deadline alert failure |
| **P1 — High** | Security vulnerability, partial service degradation | Within 4 hours | XSS/injection discovery, elevated access without authorization |
| **P2 — Medium** | Non-critical vulnerability, performance degradation | Within 24 hours | Rate limiting bypass, minor access control gap |
| **P3 — Low** | Informational security finding, hardening opportunity | Within 1 week | Missing security header, dependency with known low-severity CVE |

### 10.2 — Data Breach Response Protocol

1. **Detection** (T+0): Automated alert or manual discovery.
2. **Containment** (T+1h): Isolate affected systems, revoke compromised credentials.
3. **Assessment** (T+4h): Determine scope of data exposed, affected organizations.
4. **Notification** (T+72h max):
   - Notify Data Protection Board of India (DPDP Act Section 8(6)).
   - Notify affected aggregator organizations.
   - Notify affected workers (through aggregator or directly if contact data available).
5. **Remediation** (T+1 week): Root cause analysis, fix deployed, post-mortem published.
6. **Review** (T+30 days): Process improvements, policy updates.

---

## 11. Infrastructure Security

### 11.1 — Production Environment

| Component | Security Measure |
|---|---|
| **Hosting (Vercel)** | SOC 2 Type II certified, automatic TLS |
| **Database (Supabase/Neon)** | Encrypted at rest, SSL connections, automated backups |
| **File Storage (S3/R2)** | Server-side encryption, private bucket ACLs |
| **DNS (Cloudflare)** | WAF, DDoS protection, DNSSEC |
| **Secrets Management** | Environment variables, never in code or git |

### 11.2 — Access Control

| Role | Database Access | Server Access | Secrets Access |
|---|---|---|---|
| Developer | Prisma Studio (dev only) | Vercel dashboard | `.env.local` only |
| DevOps / SRE | Read-only production DB | Vercel + infra dashboards | Production secrets |
| CTO / Founder | Full access | All systems | All secrets |
| Application code | Prisma client (scoped) | N/A | `process.env` |

---

## 12. Third-Party Dependencies

### 12.1 — Dependency Security Policy

- Run `npm audit` before every deployment.
- No dependencies with known critical or high CVEs in production.
- Pin major versions in `package.json` to prevent unexpected breaking changes.
- Review dependency changelogs before upgrading.

### 12.2 — Key Dependencies & Security Posture

| Dependency | Purpose | Security Notes |
|---|---|---|
| `next` | Application framework | Regular security patches from Vercel |
| `prisma` | ORM | Parameterized queries prevent SQL injection |
| `bcryptjs` | Password hashing | Industry-standard, constant-time comparison |
| `jsonwebtoken` | JWT handling | Verify with correct algorithm to prevent `alg: none` attacks |
| `zod` | Input validation | Runtime type checking prevents invalid data processing |
| `puppeteer` | PDF generation | Runs in sandboxed Chromium, no untrusted input rendering |
| `papaparse` | CSV parsing | Handles malformed CSV safely |
| `resend` / `@aws-sdk/client-ses` | Email | API keys rotated quarterly |
