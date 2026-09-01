# Blackcountry HR System — People operations & payroll

All-in-one HR command center for Nigerian businesses: people ops, payroll, compliance, and Omni Co-Pilot insights.

Full-stack HR payroll system for Nigerian businesses with accurate statutory calculations (PAYE, pension, NHF, NSITF), payroll run workflow, payslip PDF generation, leave management, and reporting.

> **Note:** This is a separate product fork from OmniPeople (`hr-payroll-ng`). Use its own database, Vercel project, and OAuth apps.

## Tech Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **PostgreSQL** + Prisma ORM
- **NextAuth.js** (credentials + RBAC)
- **@react-pdf/renderer** for payslips
- **Recharts** for dashboards
- **Vitest** for payroll engine unit tests

## Quick Start

### 1. Install dependencies

```bash
cd blackcountry-hr
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit DATABASE_URL and NEXTAUTH_SECRET
```

### 3. Set up database

```bash
npm run db:push
npm run db:seed
```

### 4. Run tests (payroll engine)

```bash
npm test
```

### 5. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

The app **needs** these environment variables in your Vercel project (**Settings → Environment Variables**). Apply to Production, Preview, and Development. Mark `NEXTAUTH_SECRET` and `DATABASE_URL` as Sensitive — the app reads them at runtime (not at build).

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | Transaction pooler URL (port 6543) | Falls back to `POSTGRES_PRISMA_URL` / `POSTGRES_URL` if unset |
| `NEXTAUTH_SECRET` | output of `openssl rand -base64 32` | **Required at runtime** (`AUTH_SECRET` is an alias) |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your production URL (or preview URL for previews) |
| `SIGNUP_ENABLED` | `true` | Optional. Public signup is **off in production** unless this is `true` |
| `GOOGLE_CLIENT_ID` | from Google Cloud Console | Optional — Workspace Drive/Sheets sync |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud Console | Optional — pair with client ID |
| `GOOGLE_DRIVE_FOLDER_ID` | Shared Drive folder ID | Optional HR root folder |
| `GOOGLE_WORKSPACE_DOMAIN` | `yourcompany.com` | Optional auto-share with domain |

### Google Workspace sync

Keeps a shared HR area in Drive/Sheets:

- Folder tree: `Blackcountry HR / Staff`, `Payroll`, `Exports`
- **Staff Database** Google Sheet (live employee roster)
- **Payroll Database** Google Sheet (all payslip rows)
- CSV snapshots in **Exports**

Setup:

1. Google Cloud Console → enable **Drive API** and **Sheets API**
2. Create OAuth **Web** client with redirect:
   `https://blackcountry-hr.vercel.app/api/integrations/google-drive/callback`
3. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (and optional domain/folder) in Vercel → redeploy
4. Super Admin → **Settings** → **Connect Google Workspace** → **Sync staff + payroll now**
5. Share the `Blackcountry HR` folder with HR/Finance in Workspace (or rely on domain sharing)

On Employees / Payroll pages you can also **Sync Sheet** or **Save file to Drive**.

### Microsoft 365 / OneDrive sync

Same company workflow as Google, using Microsoft Graph + OneDrive:

- Folder tree: `Blackcountry HR / Staff`, `Payroll`, `Exports`
- **Staff Database** and **Payroll Database** Excel workbooks (`.xlsx`)
- CSV snapshots can be uploaded to **Exports**

Setup:

1. Azure Portal → **App registrations** → New registration (accounts in any org / personal as needed)
2. Add Web redirect URI:
   `https://blackcountry-hr.vercel.app/api/integrations/microsoft-workspace/callback`
3. API permissions (delegated): `User.Read`, `Files.ReadWrite`, `offline_access`
4. Create a **client secret**
5. Set `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` (optional `MICROSOFT_TENANT_ID`) in Vercel → redeploy
6. Super Admin → **Settings** → **Connect Microsoft 365** → **Sync staff + payroll now**

After connecting the repo:

1. Add the env vars above in Vercel.
2. Redeploy.
3. Run schema + seed against the production database once:
   ```bash
   DATABASE_URL="your-prod-url" npm run db:push
   DATABASE_URL="your-prod-url" npm run db:seed
   ```

The build script runs `prisma generate` automatically before `next build`.

## Demo Accounts

Blackcountry Group workspace plus Blackcountry Foods as a sub-company. Password is `password123` for all.

| User | Email | Password |
|------|-------|----------|
| Super Admin | admin@blackcountry.africa | password123 |
| HR | hr@blackcountry.africa | password123 |
| Finance | finance@blackcountry.africa | password123 |
| Business head | head@blackcountry.africa | password123 |
| Staff | adaeze@blackcountry.africa | password123 |

## Core Features

- **Employee management** — profiles, compensation structure, bank/statutory IDs
- **Payroll engine** — pure, testable Nigerian statutory calculations (configurable tax bands)
- **Payroll runs** — Draft → Under Review → Approved → Paid (immutable after approval)
- **Payslips** — PDF generation with YTD summary (HR / Super Admin)
- **Leave management** — Staff apply; HR can also record leave. Unpaid leave → payroll deductions
- **Staff portal** — own details, leave, company requests, and approved payslips (no admin tools)
- **Reports** — remittances, department breakdown, employer cost
- **Exports** — staff & payroll CSV download, optional Google Drive upload
- **HR Ask / Desk** — policy queries, lifecycle, change-request review

## Tax Configuration

Statutory rates and PAYE bands live in the database (`StatutoryConfig`, `TaxBand`), not hardcoded. The seed uses **NTA 2025** bands effective January 2026:

| Annual income | Rate |
|---------------|------|
| First ₦800,000 | 0% |
| Next ₦2,200,000 | 15% |
| Next ₦9,000,000 | 18% |
| Next ₦13,000,000 | 21% |
| Next ₦25,000,000 | 23% |
| Above ₦50,000,000 | 25% |

Legacy CRA mode is also supported via `taxReliefMode: "CRA"` in company settings.

> **Important:** Verify current bands against FIRS/State IRS guidance before production use. Tax law changes with each Finance Act.

## Project Structure

```
src/
  lib/payroll/          # Pure payroll calculation engine + tests
  app/
    api/                # REST API routes
    dashboard/          # Admin overview
    employees/          # Employee CRUD
    payroll/            # Payroll run workflow
    leave/              # Leave requests
    reports/            # Charts & remittances
    staff/              # Staff portal (details, leave, requests, payslips)
    my/                 # Redirects to /staff
    settings/           # Statutory config (Super Admin)
prisma/
  schema.prisma         # Data model
  seed.ts               # Demo data
```

## Non-Negotiables Implemented

- Payroll calculations unit-tested before UI integration
- Approved payroll runs are immutable (reverse & re-run only)
- Employees can only access their own payroll data
- All money stored as kobo (`BigInt`) — no floats
- Audit log on key actions
- Configurable statutory rates in database

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm test` | Run payroll engine tests |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed demo data |
| `npm run db:migrate` | Create migration |
