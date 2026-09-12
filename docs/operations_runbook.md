# GigCessHQ — Operations & Deployment Runbook

This runbook contains developer and DevOps operational guidelines for deploying, maintaining, and scaling the GigCessHQ platform (Next.js 16 + Supabase).

---

## 1. Local Environment Operations

### 1.1 Prerequisites
- Node.js: `v20.x` or `v22.x`
- npm: `v10.x` or higher
- A Supabase project (provides hosted Postgres + Auth; no local database needed)

### 1.2 Installation & Startup
```bash
# Navigate to application root
cd "c:\Users\admin\Desktop\work\freelance wali platform\app"

# Install dependencies
npm install

# Configure Supabase keys (see docs/environment_setup.md §4)
cp .env.example .env.local

# Apply SQL migrations + demo seed + demo user
supabase db push
supabase db seed   # or: psql "$SUPABASE_DB_URL" -f supabase/seed.sql
npm run supabase:seed

# Run in Development mode
npm run dev

# Or build & run Production bundle
npm run build
npm run start
```
The server listens on **`http://localhost:3000`**. Demo login: `compliance@quickmove.in` / `Compliance@2025` (overridable via `DEMO_EMAIL` / `DEMO_PASSWORD` when running the seed script).

---

## 2. Environment Variables & Secrets Configuration

All configuration is managed via `app/.env.local` (gitignored; template: `app/.env.example`):

| Variable | Type | Description | Production Guidance |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL | Supabase project URL | Copy from Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | String | Anon key (RLS-bound, browser-safe) | Same source; safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | String | Bypasses RLS — server-only | Never expose; rotate on suspected leak (full DB access) |
| `CRON_SECRET` | String | Bearer token for scheduler → cron route | Unique per environment, high entropy |
| `NEXT_PUBLIC_APP_URL` | URL | Public URL of the web platform | `https://app.gigcesshq.in` |
| `NEXT_PUBLIC_APP_NAME`| String | Application title | `GigCessHQ` |

There are no other secrets. Notably absent: no `DATABASE_URL` (Supabase client libraries only), no JWT secret (Supabase Auth), no encryption key (no field encryption — see security policy §5), no email/File/PDF configuration (those subsystems don't exist).

---

## 3. Database Schema & Supabase Operations

The schema is plain SQL in `app/supabase/migrations/` (no ORM):
- Multi-tenancy: `organizations`, `profiles` (id = `auth.users.id`), `partner_client_access`
- Worker lifecycle: `workers`, `daily_engagement_ledger`, `worker_annual_aggregates`, `worker_declarations`
- Compliance records: `filing_records`, `filing_challans`, `notification_logs`, `audit_logs` (append-only)
- Growth & leads: `audit_leads` (write-only funnel table)

RLS is enabled on every table with tenant `USING`/`WITH CHECK` policies; authenticated clients get **no** INSERT on `organizations`/`profiles` (service role only) and **no** UPDATE/DELETE on `audit_logs`.

### 3.1 Common Supabase Commands
```bash
# Apply pending migrations (from app/)
supabase db push

# New migration (review the SQL before pushing)
supabase migration new <descriptive_name>

# Inspect data visually
# → Supabase Dashboard → Table Editor (replaces Prisma Studio)

# Reset a preview branch database
supabase db reset
```

---

## 4. Automated Nightly Cron Job Setup

The platform exposes one scheduled endpoint — the eligibility sync:
- **Endpoint:** `POST /api/v1/cron/evaluate-eligibility`
- **Auth:** `Authorization: Bearer <CRON_SECRET>` (global run) — the dashboard button runs the same job org-scoped via session
- **Effect:** reconciles worker statuses against the shared 90/120/75 engine (both directions), writes per-org `CRON_ELIGIBILITY_EVALUATED` audit rows. Sends no email, accrues no penalties, scans no deadlines.

No schedule is committed in-repo. Example external scheduler:

### 4.1 Vercel Cron (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/v1/cron/evaluate-eligibility",
      "schedule": "30 0 * * *"
    }
  ]
}
```
(Vercel invokes the path without auth headers — set `CRON_SECRET` handling accordingly, or call it from an authenticated scheduler with the Bearer header as below.)

### 4.2 Linux / Crontab execution
```bash
0 0 * * * curl -X POST https://app.gigcesshq.in/api/v1/cron/evaluate-eligibility \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 5. Health Check & Route Verification

To verify key routes are operating normally (API data routes need a session cookie — log in via browser first, or test the public ones):
```powershell
$routes = @(
    "/", "/login", "/register",
    "/dashboard", "/dashboard/workers", "/dashboard/upload",
    "/dashboard/eligibility", "/dashboard/filings", "/dashboard/calculator",
    "/dashboard/challans", "/dashboard/alerts", "/dashboard/reports",
    "/dashboard/settings", "/partner", "/free-audit",
    "/api/v1/free-audit"
)
foreach ($r in $routes) {
    $resp = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing -Method GET
    Write-Host "$r -> $($resp.StatusCode)"
}
```
Full API inventory (19 route files) with shapes: `docs/api_specification.md`. Per-endpoint curl/PowerShell: `docs/api_testing_guide.md`.

---

## 6. Incident Response & Troubleshooting

### Problem: Port 3000 Collision
- **Symptom:** `Error: listen EADDRINUSE: address already in use :::3000`
- **Resolution:**
  ```powershell
  # Identify process using port 3000
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
  # Or start Next.js on an alternate port
  npx next dev -p 3001
  ```

### Problem: Supabase Env Missing
- **Symptom:** `Missing Supabase environment variables...` thrown from API routes
- **Resolution:** copy `app/.env.example` → `app/.env.local` and fill the three Supabase keys. (Checks are lazy — the build passes without keys; only live routes throw.)

### Problem: RLS Denies a Legitimate Query (empty results, no error)
- **Symptom:** Authenticated requests return `[]`/404 for rows that exist
- **Resolution:** check the caller's `profiles.organization_id` matches the row's org (or an unrevoked `partner_client_access` grant); verify the relevant `USING` policy in `0001_init.sql`. Service-role paths (register, cron, seed) bypass RLS by design.

### Problem: Seed Fails on Re-run
- **Symptom:** duplicate-key errors from `supabase/seed.sql`
- **Resolution:** the seed is idempotent by fixed UUIDs + `ON CONFLICT DO NOTHING` — a failure means a migration is missing (`supabase db push` first) or a hand-edited row collides. The file runs in one transaction, so partial state is not left behind.
