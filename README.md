# CodeOrbit-HRMS — Commercial Multi-Tenant SaaS Platform

> **Next-Generation Autonomous Human Resource Management System for Modern Enterprises.**  
> Built with strict multi-tenant isolation, defense-in-depth Role-Based Access Control (RBAC), OWASP-grade security, and a modern visual presentation inspired by Wipronix.

---

## 🏛️ Architecture Overview

CodeOrbit HRMS is engineered as a commercially viable, horizontally scalable multi-tenant SaaS application:

* **Frontend:** React 18 + Vite + TypeScript, Tailwind CSS, Redux Toolkit, React Router DOM, React Hook Form, Zod, Axios with automatic token refresh, Recharts, Lucide Icons, GSAP + ScrollTrigger, Motion for React, and Lenis smooth scrolling.
* **Backend:** Node.js, Express.js (Modular Monolith), TypeScript, Prisma ORM, Zod validation, Argon2id password hashing, JWT access tokens with rotating HTTP-only refresh tokens, and rate-limiting.
* **Database:** PostgreSQL with multi-tenant scoped schemas, composite uniqueness constraints, and comprehensive audit trails.
* **Multi-Tenancy:** Guaranteed organization isolation where server-side membership authorization enforces tenant boundaries on every single query.

---

## 🚀 Phase 1 Implementation Status: Foundation (Complete)

| Module / Requirement | Status | Verification |
| :--- | :--- | :--- |
| **Monorepo Structure** | ✅ Complete | npm workspaces (`apps/frontend`, `apps/backend`) |
| **PostgreSQL & Prisma** | ✅ Complete | Fully typed Prisma Client with 14 relational tables |
| **Organization Registration** | ✅ Complete | `/api/v1/auth/register-organization` |
| **User Authentication** | ✅ Complete | Argon2id + JWT + HTTP-only Cookie Refresh Rotation |
| **Token Reuse Detection** | ✅ Complete | Invalidation of entire token family upon replay attempt |
| **Tenant Context Isolation** | ✅ Complete | Verified server-side membership middleware (`x-tenant-id`) |
| **RBAC Engine** | ✅ Complete | 20+ granular permissions & 5 initial system roles |
| **Immutable Audit Logging** | ✅ Complete | Action, actor, IP, timestamp, old/new value capture |
| **Organization Management** | ✅ Complete | Profile, departments, designations, staff invitations |
| **Automated Test Suites** | ✅ Complete | Jest + Supertest integration and focused security tests |
| **Public Marketing Website** | ✅ Complete | Wipronix-inspired dark aesthetic, Lenis scroll & Motion |
| **HRMS Dashboard UI** | ✅ Complete | Real-time analytics, self-attendance, tenant switcher |

---

## 🔑 Default Seed Credentials (Development)

The database seed provides two pre-configured accounts:

| Role | Email | Password | Organization Slug |
| :--- | :--- | :--- | :--- |
| **Company Administrator** | `admin@codeorbit.demo` | `CodeOrbit@2026!` | `codeorbit-demo` |
| **Employee Self-Service** | `riya.patel@codeorbit.demo` | `CodeOrbit@2026!` | `codeorbit-demo` |
| **Platform SuperAdmin** | `superadmin@codeorbit.io` | `CodeOrbit@2026!` | N/A (Platform Scope) |

---

## 🛠️ Getting Started

### 1. Prerequisites
* Node.js `>= 18.0.0`
* PostgreSQL 16/17 (Listening on port `5434` or configured in `.env`)

### 2. Installation
```bash
# Clone and install dependencies
npm install

# Generate Prisma Client & apply migrations
npm run prisma:generate --workspace=apps/backend
npm run prisma:migrate:deploy

# Seed Permissions, Default Roles, and Demo Tenants
npm run prisma:seed --workspace=apps/backend
```

On an existing development database, rerun the seed command to safely backfill
employee profiles for both demo tenant users. Attendance and leave self-service
also links an unassigned same-tenant employee profile by email or creates one
when no profile exists.

The checked-in initial migration is a baseline for a new database. For an existing
database, back it up and verify that it matches the baseline before marking that
migration as applied:

```bash
npx prisma migrate resolve --applied 20261107000000_initial_baseline --schema apps\backend\prisma\schema.prisma
```

Do not mark the baseline as applied to an older or partially migrated database;
review and apply an incremental migration for that database instead.

### Production configuration

Production startup requires `DATABASE_URL`, `CORS_ORIGIN`, `JWT_SECRET`,
`REFRESH_TOKEN_SECRET`, and `COOKIE_SECRET`. Each secret must be a distinct,
random value of at least 32 characters. The development-only fallback secrets
and example placeholders are rejected in production. Keep `.env` out of source
control and use your deployment platform's secret manager.

### Deploying with Vercel and Render

The repository includes a Vercel configuration for the React SPA (`vercel.json`)
and a Render Blueprint for the API (`render.yaml`). Deploy the repository root
on both platforms; do not set either service's root directory to an `apps`
subdirectory.

1. Create a production PostgreSQL database and set Render's `DATABASE_URL` to
   its connection string. Use the provider's internal connection URL when the
   database and API are in the same Render region.
2. Deploy the Render Blueprint. Set `CORS_ORIGIN` to the exact production
   frontend origin (scheme and hostname, no path or trailing slash), and set
   distinct random values of at least 32 characters for `JWT_SECRET`,
   `REFRESH_TOKEN_SECRET`, and `COOKIE_SECRET`. Render runs Prisma migrations
   before starting the API and checks `/api/health`.
3. Configure `VITE_API_URL` in the Vercel project as
   `https://<your-render-service>.onrender.com/api/v1`, then deploy. This is a
   public frontend build variable, not a secret. The production frontend build
   fails if it is missing, rather than producing a site whose API calls silently
   go to Vercel.
4. For reliable refresh-cookie behavior across browsers, use custom frontend and
   API domains under the same site, for example `hr.example.com` and
   `api.example.com`. The API allows credentialed CORS only from `CORS_ORIGIN`.
   The production refresh cookie is `Secure` and `SameSite=None`.

The initial Prisma migration is a full baseline for a new production database.
Do not run the development seed against production; it creates demo accounts.
Render's local filesystem is ephemeral, so uploaded employee, expense, and
resume files will not survive service replacement/restarts. Configure private
object storage before relying on uploads in production.

### Invitations and file uploads

Organization invitations use a one-time setup link that expires after 72 hours.
Until an email provider is configured, an administrator must copy and deliver
the link manually. Private employee, expense, and recruitment files require
tenant authentication and permission checks; applicant resume uploads are
limited to PDF files and rate-limited. Files are stored on local disk, so
production deployments should use private object storage, malware scanning,
retention limits, and backups.

When creating an employee with portal access, provide an initial password.
The employee account is created with the Employee role and linked to the new
employee profile; existing user accounts should be added through invitations.

### 3. Running Dev Servers
```bash
# Run both Backend (:5000) and Frontend (:5173) concurrently
npm run dev

# Or run individually
npm run dev:backend
npm run dev:frontend
```

### 4. Running Integration Tests
```bash
npm test --workspace=apps/backend
```

---

## 🔒 Security & Tenant Isolation Rules

1. **Never Trust Frontend Organization IDs:** The tenant ID passed in `x-tenant-id` header or URL is strictly validated against the user's active membership record in the database before granting access.
2. **Replay & Theft Defense:** Refresh tokens use rotating token families. If an invalidated refresh token is reused, all active sessions belonging to that token family are revoked immediately.
3. **Audit Trail:** Critical operations (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGIN_FAILED`, `ORGANIZATION_SWITCH`) generate immutable audit log records with actor metadata.
