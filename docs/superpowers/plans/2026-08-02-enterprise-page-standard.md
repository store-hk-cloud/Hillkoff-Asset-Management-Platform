# Enterprise Page Standard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Retrofit all dashboard page headers, empty/loading/error states, shared form controls, and affected forms to the approved Enterprise Page Standard without changing the dashboard layout or adopting breadcrumbs.

**Architecture:** Add small shared presentation primitives under `src/components/shared/` and `src/components/ui/`, then migrate dashboard routes and feature forms to those primitives. Keep Card-grid as the default data presentation, add route-level loading/error boundaries only for the approved list routes, and retain root fallbacks for detail routes.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, lucide-react, Zod, Vitest, existing shadcn-style primitives.

## Global Constraints

- Dashboard scope is `src/app/(dashboard)/**`.
- Every page header uses eyebrow, translated one-sentence description, and `sm:items-end` alignment.
- Breadcrumbs are deliberately not adopted.
- Card-grid remains the default for field-use pages; DataTable is reserved for dense admin screens.
- Required-field indicators use a shared `required` prop; inline validation remains alongside page-level server/network errors.
- Preserve the existing submit loading-label pattern and dashboard top-navigation layout.
- Verify each implementation group with `npm run typecheck`, `npm run lint`, and `npm run build` where practical.

---

### Task 1: Add regression coverage for shared page-standard primitives

**Files:**

- Create: `tests/unit/page-standards.components.test.tsx`

**Interfaces:**

- Tests will render `PageHeader`, `EmptyState`, and `FormField` with `react-dom/server` in the existing Node Vitest environment.

- [ ] **Step 1: Write the failing tests**

  Assert that `PageHeader` renders eyebrow, `h1`, description, and optional action; `EmptyState` renders an accessible icon and message; and `FormField` renders the required indicator and inline error.

- [ ] **Step 2: Run the focused test and confirm it fails because the components do not exist**

  Run: `npm test -- tests/unit/page-standards.components.test.tsx`

- [ ] **Step 3: Keep the failing test as the acceptance contract for Task 2**

---

### Task 2: Implement shared page and form primitives

**Files:**

- Create: `src/components/shared/page-header.tsx`
- Create: `src/components/shared/empty-state.tsx`
- Create: `src/components/shared/skeleton.tsx`
- Create: `src/components/shared/form-field.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/textarea.tsx`
- Modify: `src/components/ui/label.tsx`
- Test: `tests/unit/page-standards.components.test.tsx`

**Interfaces:**

- `PageHeader({ eyebrow, title, description, action? })` accepts translated strings and a `ReactNode` action.
- `EmptyState({ icon: Icon, message })` accepts a lucide-compatible component and translated message.
- `Skeleton({ className? })` provides reduced-motion-safe visual placeholders.
- `FormField({ htmlFor, label, required?, error?, children })` wraps a label, required indicator, control, and inline error.
- `Select` and `Textarea` mirror native component props and apply shared form styling.

- [ ] **Step 1: Implement the minimum components to make the focused test pass**
- [ ] **Step 2: Run the focused test and confirm it passes**
- [ ] **Step 3: Refactor only after green, keeping public props small and accessible**

---

### Task 3: Add route-level loading and error boundaries

**Files:**

- Create: `src/app/(dashboard)/assets/loading.tsx`, `error.tsx`
- Create: `src/app/(dashboard)/repairs/loading.tsx`, `error.tsx`
- Create: `src/app/(dashboard)/installations/loading.tsx`, `error.tsx`
- Create: `src/app/(dashboard)/warehouse/loading.tsx`, `error.tsx`
- Create: `src/app/(dashboard)/pm/loading.tsx`, `error.tsx`
- Create: `src/app/(dashboard)/inventory/loading.tsx`, `error.tsx`
- Create: `src/app/(dashboard)/users/loading.tsx`, `error.tsx`

**Interfaces:**

- Each `loading.tsx` composes `Skeleton` to match the route's existing card-grid shape.
- Each `error.tsx` is a client component with contextual text, `reset()`, and a retry button.

- [ ] **Step 1: Add the list-route loading/error files**
- [ ] **Step 2: Run typecheck and lint for the route boundary additions**
- [ ] **Step 3: Review that dynamic detail routes still use root fallback**

---

### Task 4: Retrofit dashboard page headers and empty states

**Files:**

- Modify all dashboard `page.tsx` files that currently hand-roll headers, including `dashboard`, `assets`, `repairs`, `installations`, `warehouse`, `pm`, `inventory`, `users`, `technician`, `notifications`, `profile`, `terms`, `assets/new`, `assets/[assetId]`, `assets/[assetId]/edit`, `assets/[assetId]/identity`, `repairs/new`, `repairs/[repairId]`, `installations/schedule`, `installations/[installationId]`, `pm/schedule`, `pm/history`, `pm/calendar`, `pm/[pmId]`, `users/new`, `users/[userId]`, `technicians/[technicianId]`, and `warehouse/movements`, `warehouse/transfer`, `warehouse/sale`.

**Interfaces:**

- Every migrated page imports `PageHeader` and supplies a translated description.
- Existing actions retain their permissions and links.
- Existing domain icons are passed to `EmptyState`.

- [ ] **Step 1: Replace list-page header blocks and hand-copied empty states**
- [ ] **Step 2: Replace alternate dashboard headers while preserving role-specific content and actions**
- [ ] **Step 3: Replace detail/form-page heading blocks with the same contract where a page header exists**
- [ ] **Step 4: Run typecheck and lint and inspect the diff for preserved permissions and links**

---

### Task 5: Retrofit feature forms to shared controls and inline validation

**Files:**

- Modify: `src/features/assets/components/asset-form.tsx`
- Modify: `src/features/assets/components/asset-search-form.tsx`
- Modify: `src/features/repairs/components/create-repair-form.tsx`
- Modify: `src/features/repairs/components/repair-work-form.tsx`
- Modify: `src/features/repairs/components/assign-repair-form.tsx`
- Modify: `src/features/installations/components/installation-work-form.tsx`
- Modify: `src/features/installations/components/schedule-installation-form.tsx`
- Modify: `src/features/inventory/components/inventory-manager.tsx`
- Modify: `src/features/pm/components/pm-completion-form.tsx`
- Modify: `src/features/pm/components/schedule-pm-form.tsx`
- Modify: `src/features/technician/components/technician-select.tsx`
- Modify: `src/features/warehouse/components/movement-form.tsx`
- Modify: `src/features/user-profile/components/profile-form.tsx`
- Modify: `src/features/users/components/user-form.tsx`

**Interfaces:**

- Native selects/textareas use shared `Select`/`Textarea`.
- Field labels and errors use `FormField` or the equivalent shared required-label pattern.
- Existing Zod parse results map issue paths to field errors; server/network errors remain page-level.

- [ ] **Step 1: Replace duplicated select/textarea styling and manual required asterisks**
- [ ] **Step 2: Add field-error state derived from existing Zod schemas where client validation already runs**
- [ ] **Step 3: Preserve submit/loading behavior and existing server calls**
- [ ] **Step 4: Run focused unit tests, typecheck, and lint**

---

### Task 6: Resolve data-table CSS and shared status badge duplication

**Files:**

- Modify: `src/app/globals.css` only if no concrete DataTable adopts `.data-table`
- Modify: `src/features/assets/components/asset-status-badge.tsx` or affected consumers to consolidate with `src/components/shared/status-badge.tsx`

- [ ] **Step 1: Confirm that Card-grid remains the default and identify any genuinely dense admin list**
- [ ] **Step 2: If no table is adopted, remove unused `.data-table` rules; otherwise keep them with a concrete consumer**
- [ ] **Step 3: Remove duplicate asset badge logic without changing displayed status meaning**

---

### Task 7: Verify the integrated retrofit

**Files:**

- Review: all task files and `git diff`

- [ ] **Step 1: Run `npm test`**
- [ ] **Step 2: Run `npm run typecheck`**
- [ ] **Step 3: Run `npm run lint`**
- [ ] **Step 4: Run `npm run build`**
- [ ] **Step 5: Run `git status`, review staged scope, and confirm no secrets/generated artifacts are included**
- [ ] **Step 6: Commit only the task-related files and push the current branch to its configured remote**
