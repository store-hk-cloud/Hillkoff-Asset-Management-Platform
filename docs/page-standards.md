# Enterprise Page Standard

This document specifies the required structure for pages under
`src/app/(dashboard)/**`. It governs _new_ pages immediately and existing
pages as they are retrofitted. It is a companion to
`docs/localization-and-theme.md` (tokens/theme) — this doc covers page-level
layout contracts, not color or typography tokens.

## Why this exists

The design token system (`src/app/globals.css`) is unified, but individual
pages hand-roll their own header, empty-state, and form markup. A repo-wide
audit found real drift: some pages have a description line under the title
and others don't, some align the header row with `sm:items-center` and others
with `sm:items-end`, one empty state is missing its icon, and required-field
indicators are implemented two different ways across two forms. None of this
was a deliberate choice — it accumulated because there was no written
standard and no shared component enforcing one. This doc is that standard.

## 1. Page header

Every dashboard page renders, in order:

1. **Eyebrow** — the nav-section label (e.g. `t("nav.repairs")`),
   `text-muted-foreground text-sm`. Always present, even on pages without a
   description.
2. **Title** — `<h1 className="text-2xl font-semibold tracking-tight
sm:text-3xl">`.
3. **Description** — one sentence, translated, `text-muted-foreground text-sm
mt-1`. **Mandatory** — every page gets one, including list pages that
   currently omit it (`assets`, `inventory`, `technician`, `users`).
4. **Primary action** (optional) — a single `<Button asChild>` linking to the
   page's one creation/primary flow, right-aligned via a wrapping
   `flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between` (always
   `sm:items-end`, not `sm:items-center` — standardizes what `assets`/`users`
   currently do differently).

Read-only pages (e.g. `notifications`) omit the action entirely rather than
rendering a disabled button. Pages with no single primary action (e.g.
`warehouse`, which is itself a menu of action cards) omit it too.

The `dashboard` page's role-gated alternate view (non-privileged users) still
follows this same 3-part shape (eyebrow/title/description) — it should not
invent a second header shape.

Implemented in `src/components/shared/page-header.tsx` (`eyebrow`, `title`,
`description`, optional `action` props). Dashboard pages import the shared
component instead of copying the header block.

## 2. Empty state

```
<div className="rounded-lg border border-dashed p-10 text-center">
  <Icon aria-hidden="true" className="text-muted-foreground mx-auto mb-3 size-8" />
  <p className="text-muted-foreground text-sm">{message}</p>
</div>
```

Icon is a lucide-react icon matching the page's domain (already the pattern
in `installations`, `pm`, `inventory`, `notifications`, `repairs`). No
text-only empty states — the former icon-less `assets/page.tsx` variant has
been retrofitted as well.

Implemented in `src/components/shared/empty-state.tsx` (`icon`, `message`
props), including feature-level empty states used by lists and workspaces.

## 3. Loading and error states

The root `src/app/loading.tsx` and `src/app/error.tsx` remain the final
fallback. Approved list routes now provide route-level overrides under
`(dashboard)/**`.

Standard going forward:

- **List routes** with non-trivial fetch latency — `assets`, `repairs`,
  `installations`, `warehouse`, `pm`, `inventory`, `users` — get a route-level
  `loading.tsx` rendering a skeleton shaped like that page's card grid (not
  generic spinner text), and a route-level `error.tsx` with a contextual
  retry action.
- **Detail/edit routes** (`assets/[assetId]`, `repairs/[repairId]`, etc.) may
  continue to rely on the root fallback unless a specific route becomes a
  support pain point — do not blanket-add loading/error files to every
  dynamic segment speculatively.
- The root `loading.tsx`/`error.tsx` remain the final fallback and are not
  removed.

Implemented with the shared `src/components/shared/skeleton.tsx` primitive,
which route-level `loading.tsx` files compose while respecting reduced motion.

## 4. List data display

No current list page has a concrete desktop-only use case that warrants a
table. **Card-grid remains the default** for pages technicians use on phones
in the field (`assets`, `repairs`, `installations`). The unused `.data-table`
CSS was removed; a future `<DataTable>` should be introduced only with a
specific dense admin use case.

See `docs/list-filtering-and-density.md` for how individual list pages must
filter, cap, and paginate the data inside this card-grid shell.

## 5. Forms

- **Required fields** show a consistent indicator: a `text-destructive`
  asterisk driven by a `required` prop on a shared label/field wrapper — never
  hand-concatenated into the label string (current `AssetForm` pattern) and
  never silently omitted (current `ServiceJobIntakeForm` pattern).
- **Validation errors** render inline, next to the field they belong to,
  using the Zod schema each feature already defines
  (`src/features/*/schemas/*.schema.ts`) — not only as a single page-level
  error string caught from the submit handler. The page-level error string
  stays for server/network failures the schema can't catch client-side.
- **Submit button state** — keep the existing pattern (disable button, swap
  label to `t("status.loading")` while pending) — this is already consistent
  across forms and is not changing.
- **Native `<select>`/`<textarea>`** styling is currently copy-pasted per
  form and has already drifted (e.g. `disabled:opacity-50` present on some
  selects, missing on others). These are real shared primitives:
  `src/components/ui/select.tsx` and `src/components/ui/textarea.tsx`, added
  the same way as the existing shadcn-style primitives in that directory (see
  `src/components/ui/README.md`), plus `src/components/shared/form-field.tsx`
  wrapping label + required indicator + inline error.

## 6. Breadcrumbs

Not adopted. The routing tree is shallow (two levels deep at most) and the
existing eyebrow label already orients the user within a section. Adding a
hierarchical breadcrumb component would be complexity without a matching
navigation depth to justify it. This is a deliberate decision, not an
open gap.

## 7. Rollout and implementation status

This doc governs new pages immediately. The existing dashboard has been
retrofitted incrementally and verified with `tsc --noEmit`, `npm run lint`,
and `npm run build`:

1. List pages: shared headers, empty states, and approved loading/error boundaries
2. Forms: required-field indicators, inline Zod validation, shared controls
3. Detail and form routes: shared headers and contextual actions

Breadcrumbs and a generic DataTable remain intentionally out of scope until
their use cases justify them.
