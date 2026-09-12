# GigCessHQ — Operations & Deployment Runbook

This runbook contains developer and DevOps operational guidelines for deploying, maintaining, and scaling the GigCessHQ platform.

---

## 1. Local Environment Operations

### 1.1 Prerequisites
- Node.js: `v20.x` or `v22.x`
- npm: `v10.x` or higher
- PostgreSQL (Optional for live database): `v15.x` or `v16.x`

### 1.2 Installation & Startup
```bash
# Navigate to application root
cd "c:\Users\admin\Desktop\work\freelance wali platform\app"

# Install dependencies
npm install

# Generate Prisma ORM client
npx prisma generate

# Run in Development mode
npm run dev

# Or build & run Production bundle
npm run build
npm run start
```
The server listens on **`http://localhost:3000`**.

---

## 2. Environment Variables & Secrets Configuration

All configuration is managed via `.env` in `app/.env`:

| Variable | Type | Description | Production Guidance |
|---|---|---|---|
| `DATABASE_URL` | String (URI) | PostgreSQL connection string | Use pooling (e.g. Supabase / AWS Aurora) |
| `JWT_SECRET` | String | 32+ char secret for JWT signatures | Rotate every 90 days via key versioning |
| `ENCRYPTION_KEY` | Hex String | 64-char hex string (32 bytes) for AES-256-GCM | Store in AWS KMS / HashiCorp Vault |
| `CRON_SECRET` | String | Bearer authorization token for cron jobs | Unique per environment |
| `NEXT_PUBLIC_APP_URL` | URL | Public URL of the web platform | `https://app.gigcesshq.in` |
| `NEXT_PUBLIC_APP_NAME`| String | Application title | `GigCessHQ` |

---

## 3. Database Schema & Prisma Operations

The Prisma schema is located at `app/prisma/schema.prisma` and contains 12 models:
- Multi-tenancy: `Organization`, `AggregatorProfile`, `User`, `PartnerAccess`
- Worker Lifecycle: `Worker`, `EngagementDay`, `WorkerDeclaration`
- Compliance Records: `FilingRecord`, `Challan`, `AuditLog`, `Notification`
- Growth & Leads: `FreeAuditLead`

### 3.1 Common Prisma Commands
```bash
# Re-generate Prisma client after schema changes
npx prisma generate

# Push schema changes to database (Development)
npx prisma db push

# Create and apply migrations (Production)
npx prisma migrate dev --name <migration_name>
npx prisma migrate deploy

# Open visual database browser
npx prisma studio
```

---

## 4. Automated Nightly Cron Job Setup

The platform features an automated eligibility engine endpoint:
- **Endpoint:** `POST /api/v1/cron/evaluate-eligibility`
- **Schedule:** Nightly at 00:00 UTC (05:30 IST)

### 4.1 Vercel Cron (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/v1/cron/evaluate-eligibility",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### 4.2 Linux / Crontab execution
```bash
0 0 * * * curl -X POST https://api.gigcesshq.in/api/v1/cron/evaluate-eligibility \
  -H "Authorization: Bearer dev-cron-secret"
```

---

## 5. Health Check & Route Verification

To verify that all 35 routes are operating normally:
```powershell
$routes = @(
    "/", "/login", "/register",
    "/dashboard", "/dashboard/workers", "/dashboard/upload",
    "/dashboard/eligibility", "/dashboard/filings", "/dashboard/calculator",
    "/dashboard/challans", "/dashboard/alerts", "/dashboard/reports",
    "/dashboard/settings", "/partner", "/free-audit",
    "/api/v1/dashboard/overview", "/api/v1/workers", "/api/v1/filings"
)
foreach ($r in $routes) {
    $resp = Invoke-WebRequest -Uri "http://localhost:3000$r" -UseBasicParsing
    Write-Host "$r -> $($resp.StatusCode)"
}
```

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

### Problem: Prisma Client Types Missing
- **Symptom:** `error TS2305: Module '@prisma/client' has no exported member 'PrismaClient'`
- **Resolution:**
  Run `npx prisma generate` inside the `app/` directory to build TypeScript types into `node_modules/@prisma/client`.
