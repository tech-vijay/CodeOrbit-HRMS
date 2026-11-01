# CodeOrbit HRMS — Commercial Multi-Tenant SaaS Platform

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
| **Automated Test Suites** | ✅ Complete | 12/12 passing integration tests (Jest + Supertest) |
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

# Generate Prisma Client & Run Migrations
npm run prisma:generate --workspace=apps/backend
npm run prisma:migrate --workspace=apps/backend

# Seed Permissions, Default Roles, and Demo Tenants
npm run prisma:seed --workspace=apps/backend
```

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
