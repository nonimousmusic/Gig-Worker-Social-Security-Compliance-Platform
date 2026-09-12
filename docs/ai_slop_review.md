# Code Review — AI Slop & Quality Report

**App:** GigCessHQ (`app/`) — Next.js 16 + Supabase migration
**Date:** 2026-09-12
**Scope:** every route, page, lib module, both SQL migrations, seed, scripts, config
**Method:** full read-through of all source files + `grep` sweeps (stale refs, dead exports, mock markers, silent catches) + `npm run build` / `npm run lint`

**Verdict:** the Supabase migration itself is structurally sound (RLS on all 12 tables, tenant scoping on every data route, build passes). But the codebase carries a heavy layer of AI-generated filler: fabricated data presented as real records, ~500 lines of dead code, unused dependencies, deceptive UI (buttons that lie), and **one P0 that breaks worker creation at runtime**. No `TODO`s or `console.log`s — the slop here is the polished kind: it compiles, looks finished, and quietly lies.

**Counts:** 1 × P0 broken · 6 × P1 wrong-behavior · 18 × P2 fabricated/placeholder · 12 × P3 dead code/deps · 10 × P4 nits. Lint: 6 errors (pre-existing) + 57 warnings (~40 unused imports).

---

## P0 — Broken at runtime

### 1. `POST /api/v1/workers` can never succeed — `organization_id` omitted from insert
- `src/app/api/v1/workers/route.ts:85-98` — `const orgId` is declared and then **never used** (lint flags it). The insert payload built by `upsertWorkerInput(body, tenant, {...})` contains no `organization_id`, but `workers.organization_id` is `NOT NULL` (`0001_init.sql:168`). Every Add-Worker call fails the not-null constraint → 500 `"Failed to create worker"`.
- Root cause: `upsertWorkerInput` (`src/lib/data-access.ts:117-129`) accepts `tenant` and never reads it — a dead parameter. Fix: default `organization_id: tenant.organizationId` inside the helper (it has exactly one caller).

---

## P1 — Wrong behavior / data integrity

### 2. Declarations POST can demote an ELIGIBLE worker to APPROACHING
- `src/app/api/v1/workers/[id]/declarations/route.ts:59` — `newStatus = newCumulative >= 120 ? "ELIGIBLE" : "APPROACHING"`. The 90-day single-aggregator rule is ignored: a worker with 95 internal days (ELIGIBLE) who submits a 0-day declaration gets rewritten to APPROACHING. It also stamps `APPROACHING` on workers who may be INACTIVE.
- Same route uses `getCurrentFinancialYear()` (today → `2026-2027`) while all demo aggregates live in `2025-2026`. The declaration therefore creates a **new** FY row instead of updating the worker's current one — and since `getWorkerRecords` displays the *latest* FY aggregate, the worker's displayed `cumulativeDaysFY` collapses after declaring. FY handling needs one consistent rule.

### 3. `lastActiveDate` is wrong for most workers
- `src/lib/data-access.ts:77-86` — the "latest engagement per worker" query orders the whole ledger DESC and applies `.limit(workers.length)` — that's N rows *total*, not N per worker. Workers with dense histories crowd everyone else out; the rest fall back to `onboarded_date`. Needs a per-worker query (or `DISTINCT ON` via RPC).

### 4. Three different eligibility formulas in three routes
- Upload route: `>= 120 → ELIGIBLE`, else keep existing (`ledger/upload/route.ts:134,155` — 90-day rule ignored).
- Declarations route: `>= 120 → ELIGIBLE`, else `APPROACHING` (demotes, see #2).
- Cron + `eligibility-engine.ts`: 90/120 with multi-aggregator branch — and the engine module itself has **zero callers** (see §P3). There is no single source of truth; pick one (the engine) and call it everywhere.

### 5. Free-audit scorecard is numerology
- `src/app/api/v1/free-audit/route.ts:29-44,57,63` — base score `85`, deductions `-35`/`-15`, eligible ratio `×0.76`, penalty `×0.12` — all unjustified magic numbers. The variable is even misnamed `riskScore` while holding a *compliance* score. The `// 12% compounding` comment is false: it's a flat multiply, not compounding.

### 6. Filings PATCH can rewrite PAID/locked filings, and masks errors as 404
- `src/app/api/v1/filings/[id]/route.ts:64-96` — any field (status, amounts, dates) is patchable on any filing including PAID ones the challan flow just locked (`locked_hash_sha256` is even directly writable, defeating the audit lock). Any DB error (e.g. bad enum) returns `NOT_FOUND`/404 instead of 400/500. Same 404-masking pattern in workers PATCH (`workers/[id]/route.ts:132-137`).

---

## P2 — Fabricated / placeholder data presented as real

### 7. Challan vault invents bank receipts
- `src/app/dashboard/challans/page.tsx:63-77` — every PAID filing is rendered with a hardcoded bank (`State Bank of India — Central Treasury Branch`), a hardcoded UTR (`SBIN00293819283`), a hardcoded SHA-256 (`e3b0c4…`), and `/sample-challan-q1.pdf`, ignoring the real challan rows `mapFiling` already provides. A compliance vault displaying invented UTRs is the most dangerous slop in the repo.

### 8. Ledger API invents engagement history
- `src/app/api/v1/ledger/route.ts:52-78` — with no rows it returns 15 synthetic entries (`"Rajesh Kumar"`, 850/1420, 7.5h, 9 trips, `VERIFIED`). With real rows it still fabricates `hoursWorked: 7.5`, `tripCount: 9`, and `platformTurnover = earnings × 1.67` (magic number). Nothing marks these as synthetic.

### 9. Worker detail API invents a 30-day calendar
- `src/app/api/v1/workers/[id]/route.ts:60-72` — `recentEngagementDays` is `i % 3` arithmetic (`650 + (i % 200)` payouts), never touching `daily_engagement_ledger`. Declarations come back with hardcoded `verified: true`. (Also: this GET has no frontend caller — only the declarations POST is used.)

### 10. Overview API ships a frozen Q2-2025 world
- `src/app/api/v1/dashboard/overview/route.ts:27-50,66-73` — hardcoded fallback financials (3.85 Cr / 577500), hardcoded `dueDate: "2025-10-31"`, hardcoded labels (`"Q2 (July–September 2025)"`, `status: "UPCOMING"`). The deadline is in the past, so `daysRemaining` is permanently 0 and the banner is permanently stale.

### 11. Dashboard shell is hardcoded to the demo tenant
- `src/app/dashboard/layout.tsx:54-68,85,95,121,163-177` — every organization sees "Form-XX Q2 … due in **49 days**", "QuickMove Tech Pvt Ltd", CIN `U72900DL2021…`, user "Arjun Verma / compliance@quickmove.in", a hardcoded alerts badge `"2"`, and `v2.4`. None of it reads the session.

### 12. Filings wizard narrates a fixed story
- `src/app/dashboard/filings/page.tsx:380,390,404,408` — step 3 always claims "**1,410** workers … 100% UIDAI masked" and step 4 always shows "Q2 FY 2025-26 … October 31, 2025" regardless of the user's inputs. Step 2's heading hardcodes "1.5%" while the rate selector next to it is adjustable. The status column only knows PAID vs DRAFT — SUBMITTED/OVERDUE render as DRAFT (`:203-212`).

### 13. Partner portal KPIs ignore the API
- `src/app/partner/page.tsx:93-114` — "3 Aggregators / 6,000 Gig Workers / ₹17.42 Lakh / 3 Filings Due / 49 days" are static strings; the fetched `clients` array is only used below them. Firm name "Singhania & Partners LLP" hardcoded; every "Manage Client" button links to generic `/dashboard` with no client context.

### 14. Settings page lies about saving
- `src/app/dashboard/settings/page.tsx:19-30,135-137` — Save only flips local state and shows "Organization settings saved successfully" while persisting nothing (`/api/v1/auth/me` exists but is unwired; no update endpoint is called). The Invite button has no handler. The hardcoded team carries roles (`ADMIN`, `COMPLIANCE_OFFICER`) that don't exist in the DB enum (`ORG_ADMIN`, `OPS_MANAGER`, `FINANCE_LEAD`, `EXTERNAL_ADVISOR`).

### 15. Partner API fallback + zeroed field
- `src/app/api/v1/partner/clients/route.ts:68-107` — a hardcoded 3-client demo list (`org-quickmove-01…`) served whenever no grants exist, indistinguishable from real data. In the live path `cessLiabilityQ2` is hardcoded `0` (`:63`), so real cards show ₹0.00L.

### 16. Threshold copy contradicts itself
- "Approaching (80-89d)" labels (`workers/page.tsx:150`, `eligibility/page.tsx:165,181`) vs engine threshold 75 (`eligibility-engine.ts:24`); "preceding **12-month** rolling cycle" (`eligibility/page.tsx:155`, route `statutoryRule`) vs the 90-day window the code computes. Pick the real rule and use it in all four places.

### 17. Sentinel strings inside data fields
- `uan: w.uan || "Pending Linkage"` (`dashboard/eligibility/route.ts:37`) puts display text where a UAN-or-null belongs; the frontend then can't distinguish "no UAN" from a UAN literally reading "Pending Linkage".

### 18. Free-audit lead funnel goes nowhere
- `free-audit/page.tsx` + route collect company/email/phone and then… nothing. No lead table, no email, no CRM hook. As a marketing surface it captures zero value; either store it or stop asking.

---

## P3 — Dead code & dead dependencies

19. **Whole modules, zero callers:** `eligibility-engine.ts` (entire engine, labels, colors, thresholds) · `encryption.ts` (`encrypt`/`decrypt`/`hashSHA256`) · `getAuthSession` / `SessionPayload` / `getSession` alias (`auth.ts`) · `getCookieOptions` (`session.ts`) · `getFYStartDate`, `getFYEndDate`, `getFormXXDueDate`, `getFormXXIDueDate`, `formatCurrency`, `formatCurrencyDecimal` (`financial-year.ts` — note the filings POST hardcodes due dates instead of using the helpers) · `formatPenaltyWarning` (`penalty-calc.ts`).
20. **The DPDP story is theater.** `phone_encrypted` stores **plaintext** phone numbers everywhere (`workers/route.ts:93`, `ledger/upload/route.ts`, seed data `+91 …`), while the module that would encrypt them (`encryption.ts`) is never called — yet `.env.example` advertises "ENCRYPTION (DPDP Act PII Protection)". Either wire it up or delete the claim.
21. **Dead routes** (no frontend caller): `auth/login` (worse — it returns the Supabase `accessToken` JWT in the response body; kill it, the page uses the browser client), `auth/me`, `auth/logout`, `workers/[id]` GET, `contributions/calculate` + `contributions/penalties` (calculator calls the lib directly), `ledger` GET.
22. **Dead table:** `contribution_rate_configs` — never seeded, never read; the 1.5%/5% figures live in code instead.
23. **Dead reads:** `mapWorkerRow` reads `row.sector`, a column that doesn't exist on `workers` (`workers/[id]/route.ts:15`); `partner/page.tsx` declares `loading` and never renders it.
24. **Unused dependencies** (zero imports anywhere, no `components/` dir — template leftovers): `@radix-ui/react-dialog`, `-dropdown-menu`, `-select`, `-slot`, `-tabs`, `-toast`, `-tooltip`, `class-variance-authority`, `clsx`. (`papaparse`, `lucide-react` are genuinely used.)
25. **Import slop:** ~40 unused lucide imports across pages; `import Link from "next/navigation"` in `dashboard/layout.tsx:4` — **wrong module** (`next/navigation` exports no `Link`; it's unused so the build survives); unused `req` params in `auth/me` + `auth/logout`; `window.location.href` full-page reloads for internal nav (`login/page.tsx:30`, `dashboard/layout.tsx:48` — already flagged by lint).
26. **Dead link:** login links to `/forgot-password`, which doesn't exist → 404. Notification `actionUrl: "/regulatory-reference"` (`data-access.ts:242`) likewise points at nothing. Challan `document_url: /uploads/challans/…` (`challan/route.ts:63`) — no upload happens (JSON-only endpoint) and no such serving route exists.

---

## P4 — Robustness nits (fix opportunistically)

27. **27 silent `catch {}` blocks** — every page fetch and most routes swallow errors with a comment (`// Fallback`, `// Handled gracefully`). At minimum log; pages should surface a toast/empty-state.
28. **Upload route:** per-row `` `csv-daily-${Date.now()}` `` batch ids defeat batch grouping (one id per upload, hoisted out of the loop); insert errors never checked so partial/duplicate re-uploads fail silently; sequential per-row awaits (4+ queries/row) make the advertised "Maximum 50,000 rows per batch" (`upload/page.tsx:183`) a timeout guarantee; CSV-created workers get hardcoded `state: "DELHI"`; mis-indented loop (`ledger/upload/route.ts:65-67`).
29. **`contributions/*` accept NaN** — `parseFloat("abc")` flows straight into a `success: true` response.
30. **RLS over-permissive corners:** `orgs_insert_own ... WITH CHECK (true)` lets any authenticated user mint organizations (registration uses the service role, so this policy is pure exposure); `profiles_insert_own` checks `id = auth.uid()` but not `organization_id`, so a user could attach their profile row to an arbitrary org.
31. **`is_trial_audit: true` on every registration, enforced nowhere.**
32. `declaration.id` falls back to `` `dec-${Date.now()}` `` on insert failure (masks the failure it just had).
33. `zoho.com` in the personal-email blocklist (`auth.ts:36-43`) — Zoho is a business-mail provider; that block is wrong.
34. Filings POST due dates are hardcoded 2025/2026 strings (`filings/route.ts:59-60`), and Q4 maps to `"2026-01-31"` while the wizard copy says Q4 is due Apr 30.
35. `// Fake due date 60 days ago` (`calculator/page.tsx:38-41`) — the comment literally says fake, and it's stale (the code subtracts *months*, not 60 days). Penalty should derive from a real filing due date.
36. Audit events fail silently — `logAuditEvent` returns `null` on error and no caller checks, so the "immutable audit trail" can have holes with nobody noticing.

---

## What's actually clean (credit where due)

- RLS enabled on all 12 tables with coherent tenant/partner policies; service-role usage confined to register/cron/seed script.
- Every data route enforces `requireTenant()` + `organization_id` filtering; no cross-tenant reads found.
- Contract audit (previous session): all 16 frontend fetch sites resolve to real routes with matching field shapes.
- `npm run build` passes; migration files are ordered, seed is idempotent, `uq_filing` is quarter-aware.
- `csv-parser.ts`, `contribution-calc.ts`, `aadhaar-masking.ts` are tight, validated, and genuinely used.

## Suggested fix order

1. **P0 #1** — one-line-ish fix, unblocks Add Worker entirely.
2. **P1 #2–#4** — single eligibility helper used by all routes; fix FY rule alongside.
3. **P2 #7–#9** — stop fabricating compliance records (legal-surface risk, not just cosmetic).
4. **P3 #20 + #21** — either encrypt PII or drop the DPDP claim; delete dead auth routes (esp. the token-leaking login route).
5. **P2 #11, #13, #14 + P4 #27** — de-lie the UI shell and error paths.
6. Everything else opportunistically; **P3 #24** (`npm uninstall` the Radix/cva/clsx set) is free.

---

## Remediation log — 2026-09-12 (all 36 items fixed)

`npm run build` passes. `npm run lint` is fully clean (was: 6 errors + 57 warnings → now: **0 errors, 0 warnings**). 48 packages removed.

- **P0 #1** — `upsertWorkerInput` now defaults `organization_id` from the tenant; Add Worker works.
- **P1 #2** — declarations use the worker's latest FY aggregate, engine status, promote-only (no more demotions); `declInsert` failure → 500 (no `dec-Date.now` fallback); response status `"RECORDED"`, not `"VERIFIED"`.
- **P1 #3** — `lastActiveDate` derived from each worker's 90-day date set; the broken `.limit(N)` query is gone.
- **P1 #4** — `eligibility-engine.ts` is now the single source of truth: cron (full sync, `max(rolling90, fyInternal)`), CSV ingestion + backfill + declarations (promote-only). Dead no more.
- **P1 #5** — free-audit magic numbers are named constants; `riskScore` → `complianceScore`; bogus "compounding" comment fixed; NaN inputs guarded.
- **P1 #6** — filings PATCH rejects PAID filings with 409 `FILING_LOCKED`, validates status enum (400), and returns 500 (not 404) on DB errors.
- **P2 #7** — challan vault renders real bank/UTR/hash/payment fields via extended `FilingItem`; honest `"—"` / `"Not yet deposited"` fallbacks only.
- **P2 #8** — ledger GET returns real rows only (no invented hours/trips/turnover); empty array when empty.
- **P2 #9** — worker detail builds its 30-day calendar from real ledger rows; declaration `verified` reflects `verified_by_profile_id`; dead `row.sector` read removed. Profile modal now fetches this endpoint (30-day activity strip + declarations).
- **P2 #10** — overview deadline/financials computed from real filings (nearest open due date, OVERDUE detection, zeros + `NO_OPEN_FILINGS` when empty); overview page renders them null-safely with a real recent-filings list.
- **P2 #11** — dashboard shell loads org/user/deadline/unread-count from `auth/me`, overview, notifications (best-effort with static fallbacks); wrong `next/navigation` Link import removed.
- **P2 #12** — wizard steps 2–4 use live `formData` values and FY-derived quarter labels/due dates; status column covers SUBMITTED/OVERDUE; deadline banner computed from filings; quarter options generated per selected FY.
- **P2 #13** — partner KPIs computed from the client list; firm name from the API; empty state added.
- **P2 #14** — settings Save PATCHes `/api/v1/organizations` (new route, sector-validated); team list loads real profiles via new `/api/v1/team`; dead Invite button removed; error surfacing added.
- **P2 #15** — demo fallback list deleted; per-client open liability, next-due, and derived status computed live (`openCessLiability` replaces `cessLiabilityQ2` in route + page).
- **P2 #16** — all threshold copy aligned to 75–89 / rolling 90-day window (pages, gauges, route text).
- **P2 #17** — eligibility API returns `uan: null`; the page renders the "Pending linkage" fallback as display text.
- **P2 #18** — new `audit_leads` table (`0003`) + best-effort insert in the free-audit route; anon/authenticated INSERT-only RLS.
- **P3 #19–#21** — deleted: `encryption.ts`, `auth/login`, `auth/logout`, `contributions/*`, ledger GET, `contribution_rate_configs` table + policies, `getAuthSession`/`SessionPayload`/`getSession`, `getCookieOptions`, 6 dead FY/currency helpers, `formatPenaltyWarning`. `ENCRYPTION_KEY` dropped from `.env.example`.
- **P3 #22–#25** — 48 packages uninstalled (all Radix, cva, clsx); ~40 dead imports removed; `Link` fixed to `next/link` (layout); `useRouter` replaces `window.location`; dead `/forgot-password` link, `/regulatory-reference` action URL, and fake challan `document_url` removed.
- **P3 #26 (RLS)** — dropped `orgs_insert_own (WITH CHECK (true))` and `profiles_insert_own` (unbound org); registration/seed use the service role and are unaffected.
- **P4 #27–#28, #32, #36** — page catches log via `console.error`; upload hoists one batch id per file and surfaces per-row failures (`failedCount`/`ingestErrors`); declaration fallback id removed; audit failures log loudly server-side.
- **P4 #29** — moot (contributions routes deleted); free-audit inputs NaN-guarded.
- **P4 #30** — see P3 #26.
- **P4 #31** — `is_trial_audit` left as metadata: enforcing trial gating is a product decision, not a cleanup call. Only item intentionally deferred.
- **P4 #33–#35** — `zoho.com` unblocked; filings due dates derived from FY years; calculator "Fake due date" comment + hypothetical caption fixed.

One judgment call worth knowing: `workers/[id]` GET was listed as dead, but instead of deleting it I made its data real and wired the worker profile modal to it — it now earns its keep.

## Docs remediation — 2026-09-12

The `docs/` suite described a phantom system (Prisma, JWT, emails, PDFs, 40+ endpoints), so it was brought to as-built in the same pass:
- Rewritten: `api_specification.md` (19 real routes, cookie auth, real envelopes/codes), `tech_spec_and_db_schema.md` (+ root mirror: Supabase arch, SQL schema, honest PII gap), `environment_setup.md`, `security_policy.md` (honest RLS + plaintext-phone gap, no rate limiting/headers), `system_architecture.md`, `operations_runbook.md`, `api_testing_guide.md` (cookie-jar auth procedure, real creds, no deleted routes), `user_flows.md` (14 flows as-built), `app/README.md`.
- Surgically fixed: root `README.md`, `compliance_officer_guide.md` (SOP 2/3/4/6 + calendar band), `glossary.md` (form dates, enum values, AES/BSR/cron/provenance rows), `prd.md` (+ root mirror: stories, modules, NFRs, roadmap), `regulatory_reference.md` (platform-implementation cells only — statute left intact), both CSV templates (headers now match `csv-parser.ts`).
- Verified with repo-wide grep: no doc still claims `DATABASE_URL`/`JWT_SECRET`/Prisma/bcrypt/PDF/email/XLSX/`users`-CRUD/batch/switch flows except in explicit "does not exist / removed" notes.
