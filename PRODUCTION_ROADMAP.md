# Chatterjee Enterprize: Production-Ready Roadmap

## Overview
Based on a senior developer audit, this roadmap transforms the "Flex Printing" app into a robust, scalable, and professional system. Our primary focus is modernizing the **State & Data Fetching** architecture to ensure data integrity and a seamless user experience.

---

## Phase 1: Modern State & Data Fetching (Primary Focus)
**Goal:** Migrate from manual `fetch` calls to **TanStack Query (React Query)**.

### 1.1 Infrastructure Setup
- Install `@tanstack/react-query` and `@tanstack/react-query-devtools`.
- Setup a global `QueryClient` with standard retry policies (e.g., 3 retries for transient network errors).

### 1.2 Resource-Based Query Hooks
- Create a `src/hooks/queries/` directory for organized data access.
- **`useInventory()`**: Manage raw materials and products with automatic background refreshes.
- **`useTransactions()`**: Replace manual transaction fetching with paginated and filtered queries.
- **`useStores()`**: Fetch outlet data with high cache persistence.

### 1.3 Optimistic Mutations
- Implement `useMutation` for the POS checkout flow.
- **Optimistic Updates**: Immediately reflect stock deductions in the UI before the server responds. Roll back automatically if the API fails.
- Invalidate relevant queries (e.g., inventory stock) upon successful sales to ensure data is always fresh.

---

## Phase 2: Security & Backend Hardening
**Goal:** Protect business data and ensure API reliability.

### 2.1 Request Validation
- Implement **Zod** or **Joi** schemas on the Express backend (`api/index.ts`).
- Validate every incoming POS sale, purchase record, and user registration.

### 2.2 Supabase RLS Reinforcement
- Audit all PostgreSQL Row Level Security (RLS) policies.
- Ensure `store_manager` roles can *only* see transactions for their own `store_id`, while `owner` can see all.

### 2.3 Rate Limiting
- Add middleware to the Express server to rate-limit auth attempts (PIN/Email) to prevent brute-force attacks.

---

## Phase 3: Error Monitoring & Quality Assurance
**Goal:** Zero-crash production environment.

### 3.1 Global Error Handling
- Integrate `react-error-boundary` at the app root to catch UI crashes gracefully.
- Add a custom "System Recovering..." screen with an automatic session reset option.

### 3.2 Production Logging
- Setup **Sentry** (or similar) to capture client-side and server-side errors in production.

### 3.3 Automated Testing (Critical Path)
- **Unit Tests (Vitest)**: Test the BOM (Bill of Materials) calculation logic.
- **E2E Tests (Playwright)**: Automate the "Happy Path" for POS sales—Select Product -> Apply Customer -> Complete Sale -> Verify Stock Deduction.

---

## Phase 4: CI/CD & Performance
**Goal:** Rapid, safe deployments.

### 4.1 GitHub Actions Pipeline
- Automatically run `npm run lint` and `npm run test` on every Pull Request.
- Block merges if tests fail or if there are major performance regressions.

### 4.2 Bundle Optimization
- Refine code splitting to ensure heavy libraries (like `jspdf` or `recharts`) are only loaded when needed.
- Optimize Tailwind CSS 4 builds for minimal CSS payload.
