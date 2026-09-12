# Security Policy & DPDP Compliance
## Gig Worker Social Security Compliance Platform

**Version:** 2.0
**Date:** 12 September 2026
**Classification:** Internal — Engineering & Compliance Team

> As-built posture. §5 contains an explicit known gap (plaintext phones) — do not present this document as claiming field-level encryption.

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
│  └── Secrets in env, never in code or git                      │
│                                                                 │
│  Layer 2: Authentication & Identity                              │
│  ├── Supabase Auth cookie sessions (no local passwords)         │
│  ├── Session refresh in proxy.ts on every matched request       │
│  ├── Work email domain gate at registration                     │
│  └── Password policy enforced server-side (8+, A-Z, digit)      │
│                                                                 │
│  Layer 3: Authorization                                          │
│  ├── PostgreSQL RLS on every table (tenant USING/WITH CHECK)    │
│  ├── Partner reads via can_access_org() grants                  │
│  └── No role gates beyond authentication (known limitation)      │
│                                                                 │
│  Layer 4: Data Protection                                        │
│  ├── Aadhaar masking pipeline (ingestion-level, enforced)       │
│  ├── ⚠️ Phones stored PLAINTEXT (known gap, §5)                 │
│  └── No raw Aadhaar in any storage layer                        │
│                                                                 │
│  Layer 5: Audit & Monitoring                                     │
│  ├── Append-only audit_logs (no UPDATE/DELETE policies)         │
│  ├── IP address and user agent tracking                          │
│  └── Audit write failures logged server-side                     │
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
| Hashing | Supabase Auth (server-side; no local hash column) |
| Storage | `auth.users` managed by Supabase — raw passwords never touch app code |
| Failed login lockout | Not implemented (Supabase default protections apply) |
| Password reset | Not implemented (no reset flow exists) |

### 2.2 — Session Specification

| Parameter | Value |
|---|---|
| Mechanism | Supabase Auth cookies (`sb-*`), refreshed in `src/proxy.ts` |
| Login | Browser `supabase.auth.signInWithPassword` (no login API route) |
| Logout | Browser `supabase.auth.signOut()` (no logout API route) |
| Server resolution | `getSessionData()`: `auth.users → profiles → organizations` |
| Registration | Service-role `auth.admin.createUser` with `email_confirm: true` (no verification email) |

### 2.3 — Roles (declared, not enforced)

| Role | Intended Scope |
|---|---|
| `ORG_ADMIN` | Full organization management (registration default) |
| `OPS_MANAGER` | Worker and roster management |
| `FINANCE_LEAD` | Financial data and filing management |
| `EXTERNAL_ADVISOR` | Delegated partner access |

> No route checks roles today — every data route enforces authentication + tenant scope only. Partner `access_level` is read, never enforced. Treat role-gated UI copy as aspirational.

### 2.4 — Tenant Isolation

Enforcement is two-deep: application scoping **plus** database RLS.

```typescript
// Every data route starts here — no session, no data
const tenant = await requireTenant(); // getSessionData() or 401
// ...then filters organization_id = tenant.organizationId
```

```sql
-- And the database enforces it independently, e.g.:
CREATE POLICY "workers_select_tenant" ON public.workers
  FOR SELECT TO authenticated USING (public.can_access_org(organization_id));
```

Partner reads pass through `can_access_org()` (own org **or** an unrevoked `partner_client_access` grant). There is no client-impersonation endpoint, so cross-tenant reads require a live grant row.

---

## 3. Data Classification

| Classification | Description | Examples | Storage Policy |
|---|---|---|---|
| **RESTRICTED** | Must never be stored raw | Raw 12-digit Aadhaar numbers | Masked at ingestion, never persisted |
| **CONFIDENTIAL** | Sensitive PII | Phone numbers | ⚠️ **Plaintext** in `phone_encrypted` (known gap — §5) |
| **INTERNAL** | Business data within tenant scope | Worker names, earnings, day counts | Plaintext, tenant-isolated via RLS |
| **PUBLIC** | Non-sensitive identifiers | e-Shram UAN, worker internal codes | Plaintext, indexed |

There are no bank-account/bank-IFSC columns anywhere in the schema.

---

## 4. Aadhaar Handling Policy

### 4.1 — Absolute Prohibitions

| Action | Status | Enforcement |
|---|---|---|
| Store raw 12-digit Aadhaar in database | ❌ **PROHIBITED** | Server-side masking before insert |
| Display full Aadhaar in UI | ❌ **PROHIBITED** | Only `XXXX-XXXX-1234` rendered |
| Log Aadhaar in application logs | ❌ **PROHIBITED** | `sanitizeLogMessage` helper available |
| Include Aadhaar in error messages | ❌ **PROHIBITED** | Error paths never echo inputs |
| Export raw Aadhaar in CSV reports | ❌ **PROHIBITED** | Export uses `maskedAadhaar` only |

### 4.2 — Masking Pipeline

```
Input: "2345 6789 1234" or "234567891234"
                    │
                    ▼
         ┌──────────────────┐
         │  Regex + length   │  ^[2-9]\d{11}$ (worker create)
         └────────┬─────────┘  last-4 slice (CSV path)
                  │
                  ▼
         ┌──────────────────┐
         │  Format Masked    │  "XXXX-XXXX-1234"
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Persist masked   │  masked_aadhaar = "XXXX-XXXX-1234"
         └──────────────────┘  (raw value never stored)
```

### 4.3 — Implementation Reference

```typescript
// src/lib/aadhaar-masking.ts (as implemented)
export function maskAadhaar(rawInput: string): string | null; // regex-gated, last-4
export function containsRawAadhaar(text: string): boolean;
export function sanitizeLogMessage(message: string): string;  // masks Aadhaar-like runs
export function validateUAN(uan: string): boolean;
```

---

## 5. Encryption Standards

### 5.1 — Field-Level Encryption: NOT IMPLEMENTED (known gap)

| Specification | Status |
|---|---|
| Algorithm | None deployed |
| Phone storage | **Plaintext** in `workers.phone_encrypted` (column name is a legacy misnomer) |
| Bank data | No bank columns exist |
| Key management | N/A — there is no `ENCRYPTION_KEY` and no crypto module |

Remediation options (pick one, then update this section): (a) wire AES-256-GCM via KMS-backed key for `phone_encrypted` + backfill, or (b) stop collecting phones. Until then, do not claim field-level encryption to customers or auditors.

### 5.2 — Data at Rest

| Layer | Encryption |
|---|---|
| PostgreSQL database | Cloud provider disk encryption (Supabase-managed) |
| Database backups | Provider-managed |
| Application secrets | Environment variables, never in code or version control |

Provider disk encryption is **not** a substitute for §5.1.

### 5.3 — Data in Transit

| Connection | Protocol |
|---|---|
| Client ↔ Server | TLS (HTTPS) |
| Server ↔ Supabase | TLS (HTTPS API + pooled Postgres SSL) |

---

## 6. API Security

### 6.1 — Rate Limiting (minimal, in-memory)

| Endpoint | Limit | Window | Response on Exceed |
|---|---|---|---|
| `POST /auth/register` | 10 requests | 1 minute / IP | `429 RATE_LIMITED` |
| `POST /free-audit` | 5 requests | 1 minute / IP | `429 RATE_LIMITED` |
| `POST /ledger/upload` | 10 requests | 1 minute / IP | `429 RATE_LIMITED` |

Enforced in `src/proxy.ts` with an in-memory fixed window: counters reset on redeploy and are not shared across instances. Move to Redis/Upstash before relying on it in multi-instance production. Authenticated data routes are not limited.

### 6.2 — Input Validation

- Request bodies are validated inline per route (required fields, 12-digit Aadhaar, non-negative days, sector enum, filing status enum). There is no Zod layer.
- SQL injection: all access goes through Supabase `supabase-js` parameterization — no raw SQL in app code; RLS bounds every row.
- XSS: React auto-escaping. No custom CSP headers are set.
- CSRF: Supabase `sb-*` cookies are HttpOnly; mutating routes should still add origin checks before handling real money-adjacent traffic.
- File uploads: CSV only (`accept=".csv"` + PapaParse validation); no virus scanning; no size cap enforced server-side.

### 6.3 — Security Headers

Set for all routes in `next.config.ts`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`. No custom CSP is configured (Supabase Auth/storage touch multiple HTTPS origins — add one deliberately after testing login + upload, not by default).

### 6.4 — Internal Endpoint Protection

One scheduled endpoint exists: `POST /api/v1/cron/evaluate-eligibility`.

1. Scheduler mode: `Authorization: Bearer <CRON_SECRET>` (global run).
2. Dashboard mode: caller Supabase session (org-scoped run).
3. Missing/invalid credentials in production → `401`.
4. Every run writes per-org `CRON_ELIGIBILITY_EVALUATED` audit rows.

---

## 7. Audit Logging Policy

### 7.1 — Events That Are Logged

| Event Category | Actual Events |
|---|---|
| **Data Ingestion** | `CSV_DAILY_LEDGER_INGESTED`, `CSV_BACKFILL_INGESTED` (with row counts + failures) |
| **Worker Management** | Declaration recorded (via `CRON_ELIGIBILITY_EVALUATED` transitions); worker create/update rely on row timestamps |
| **Filing Operations** | `FILING_DRAFT_CREATED`, `FILING_DRAFT_UPDATED`, `CHALLAN_LOCKED_AUDIT_PROOF` |
| **System Operations** | `CRON_ELIGIBILITY_EVALUATED` per org |
| **Not logged** | Logins, logouts, password events, exports, reads, role changes, invites (no such flows exist) |

### 7.2 — Audit Log Entry Structure

```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "actorEmail": "ops@quickdrop.in",
  "action": "CHALLAN_LOCKED_AUDIT_PROOF",
  "entityType": "Challan",
  "entityId": "uuid",
  "detailsJson": { "filingId": "uuid", "challanNumber": "...", "sha256Hash": "..." },
  "ipAddress": null,
  "userAgent": null,
  "createdAt": "2026-09-12T10:30:00.000Z"
}
```

Notes: `actor_email` (not `userId` FK — `profile_id` is separate and nullable); no before/after diff envelope; `ipAddress`/`userAgent` are null unless the caller supplies them (no route currently does).

### 7.3 — Log Integrity

- Append-only by RLS design: `audit_logs` has INSERT policies (`authenticated` own-org, `service_role`) and **no** UPDATE/DELETE policies — denial is structural, not GRANT-based.
- No hash chain exists. `logAuditEvent` failures are `console.error`-logged server-side and never break the request (audit has holes-by-design on DB outage — monitor logs).

---

## 8. Data Retention & Deletion

### 8.1 — Retention Periods (policy targets; no automated enforcement exists)

| Data Category | Retention Period | Legal Basis |
|---|---|---|
| Worker engagement records | FY + 8 years | Income Tax Act (7-year) + 1 year buffer |
| Filing records & challans | FY + 8 years | Same as above |
| Audit logs | FY + 8 years | Compliance audit requirement |
| Notification logs | 2 years | Operational reference |
| Marketing leads (`audit_leads`) | Until converted or deletion requested | Lead-gen purpose limitation |

> No cleanup cron, no report-expiry, and no uploaded-file retention flow exist (uploads are parsed in memory, never stored). The table above is the target, not the implementation.

### 8.2 — Deletion Procedures

- **Worker Data Deletion Request:** DPDP Act Section 12 flow is manual today — flag to the aggregator admin; statutory data is retained with legal notice.
- **Account Deletion:** manual (service role) — no self-serve closure flow exists.

---

## 9. DPDP Act 2023 Compliance Checklist

| # | Requirement | DPDP Section | Implementation Status | Notes |
|---|---|---|---|---|
| 1 | Lawful purpose for processing | Section 4 | ✅ Implemented | Statutory compliance under Code on Social Security |
| 2 | Purpose limitation | Section 5 | ✅ Implemented | Data used only for compliance calculations |
| 3 | Data minimization | Section 6 | ✅ Implemented | Only operational fields collected |
| 4 | Consent / notice | Section 6(1) | 🔲 Aggregator responsibility | No notice template ships with the product |
| 5 | Accuracy obligation | Section 8(3) | ✅ Implemented | Worker PATCH endpoints |
| 6 | Storage limitation | Section 8 | ⚠️ Partial | Retention targets set (§8) but no automated cleanup |
| 7 | Security safeguards | Section 8(4) | ⚠️ Partial | RLS + audit logging real; **field encryption missing (§5.1)** |
| 8 | Data breach notification | Section 8(6) | 🔲 Policy drafted | 72-hour notification to Data Protection Board |
| 9 | Right to access | Section 11 | ✅ Implemented | Workers CSV export |
| 10 | Right to correction | Section 12 | ✅ Implemented | Worker update endpoints |
| 11 | Right to erasure | Section 12 | ⚠️ Partial | Manual flow; statutory data retained with legal notice |
| 12 | Right to grievance redressal | Section 13 | 🔲 Policy drafted | Grievance officer designation pending |
| 13 | Cross-border data transfer | Section 16 | ✅ N/A | Supabase project region is the deployment decision — pin it to India |
| 14 | Significant data fiduciary | Section 10 | 🔲 Assessment pending | May apply at volume thresholds |

---

## 10. Incident Response

### 10.1 — Severity Classification

| Severity | Description | Response Time | Examples |
|---|---|---|---|
| **P0 — Critical** | Data breach, PII exposure, service outage affecting filing deadlines | Immediate (within 1 hour) | Aadhaar leak, service-role key compromise, missed deadline alert failure |
| **P1 — High** | Security vulnerability, partial service degradation | Within 4 hours | RLS policy gap, elevated access without authorization |
| **P2 — Medium** | Non-critical vulnerability, performance degradation | Within 24 hours | Missing security header, minor access control gap |
| **P3 — Low** | Informational security finding, hardening opportunity | Within 1 week | Dependency with known low-severity CVE |

### 10.2 — Data Breach Response Protocol

1. **Detection** (T+0): Automated alert or manual discovery.
2. **Containment** (T+1h): Isolate affected systems, revoke compromised credentials — **rotate `SUPABASE_SERVICE_ROLE_KEY` first** (it bypasses all RLS).
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
| **Database + Auth (Supabase)** | Encrypted at rest, SSL connections, automated backups |
| **DNS (Cloudflare)** | WAF, DDoS protection, DNSSEC |
| **Secrets Management** | Environment variables, never in code or git |

### 11.2 — Access Control

| Role | Database Access | Server Access | Secrets Access |
|---|---|---|---|
| Developer | Supabase Dashboard (dev project) | Vercel dashboard | `.env.local` only |
| DevOps / SRE | Supabase Dashboard (read-only prod) | Vercel + infra dashboards | Production secrets |
| CTO / Founder | Full access | All systems | All secrets |
| Application code | Anon key (RLS-bound) + service role (register/cron/seed only) | N/A | `process.env` (server) |

---

## 12. Third-Party Dependencies

### 12.1 — Dependency Security Policy

- Run `npm audit` before every deployment.
- No dependencies with known critical or high CVEs in production.
- Major versions are caret-pinned in `package.json`; review changelogs before upgrading.

### 12.2 — Key Dependencies & Security Posture

| Dependency | Purpose | Security Notes |
|---|---|---|
| `next` | Application framework | Regular security patches from Vercel |
| `react` / `react-dom` | UI runtime | Auto-escaping mitigates XSS |
| `@supabase/ssr` + `@supabase/supabase-js` | Auth + data access | Cookie sessions; RLS enforced server-side; **service-role key must never reach the browser** |
| `papaparse` | CSV parsing | Handles malformed CSV safely; uploads parsed in memory, never stored |
| `lucide-react` | Icons | No security surface |
| `next/font` | Font loading | Self-hosted fonts, no third-party stylesheet |

> Removed since v1.0 of this doc: `prisma`, `bcryptjs`, `jsonwebtoken`, `zod`, `puppeteer`, `resend`/`aws-ses`, Radix UI, `clsx`, `class-variance-authority` — none are installed or referenced.
