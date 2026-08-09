# List Filtering and Density Standard

This document specifies how list pages under `src/app/(dashboard)/**` must
filter, limit, and lay out data. It is a companion to `docs/page-standards.md`
— that doc governs page headers, empty states, loading/error boundaries, and
the card-grid-over-data-table decision; this doc governs what happens
*inside* a list page's body once those shells are in place. It does not
re-litigate anything `page-standards.md` already settled: card-grid stays the
default list display, breadcrumbs stay unadopted, and the shared
`PageHeader`/`EmptyState`/skeleton components are unchanged.

## Why this exists

An audit of every list page found the same root problem repeated with
different symptoms: `assets/page.tsx` is the one page with a real filter form
and a fetch cap, and every other list page skipped one or both. Four pages
(`service-jobs`, `inventory`, `users`, `notifications`) fetch their *entire*
collection with no limit at all and render it in one pass. `service-jobs`
re-invented filtering as client-side button state that doesn't survive a page
reload. `pm` hardcodes its one filter value instead of exposing it. None of
this was a deliberate design choice per page — it's what happens when "add
filtering" is solved locally, once, per feature, without a written contract.
This doc is that contract.

It deliberately does **not** solve real pagination. There is no cursor/offset
primitive anywhere in `src/domain/repositories/**` or `src/services/**` today
— every repository accepts a flat `limit: number` and nothing else. Building
that primitive is a backend-layer workstream with its own data-modeling
questions (Firestore cursor documents, composite index implications, stable
sort keys) and is explicitly out of scope for this round. What follows is the
best UI-level contract that works with the flat `limit` every repository
already has, not a simulation of real pagination.

## 1. Filter bar contract

### 1.1 The pattern being generalized

`src/app/(dashboard)/assets/page.tsx` +
`src/features/assets/components/asset-search-form.tsx` +
`src/features/assets/schemas/asset.schema.ts` (`assetSearchSchema`) already
implement the pattern correctly:

1. The **server page** reads Next 15's `searchParams` (a `Promise`), parses
   it through a per-feature Zod schema, and passes the parsed, typed
   `criteria` object to the service layer. The service/query layer never
   sees raw strings from the URL.
2. The **Zod schema** (named `<feature>SearchSchema`, colocated in
   `src/features/<feature>/schemas/<feature>.schema.ts` next to the
   feature's create/update schemas) is the single source of truth for what
   filters exist, their defaults, and their coercion rules:
   - Optional enum filters use an `"all"` sentinel value appended to the
     domain enum (`z.enum([...ASSET_STATUSES, "all"])`) rather than making
     the field `.optional()` — this keeps every `<select>` bindable to a
     concrete string with no `undefined`/empty-string ambiguity in the HTML.
   - Filters that are conceptually nullable (e.g. `warehouseId`) still enter
     as the `"all"` sentinel and transform to `null` inside the schema
     (`.transform((value) => (value === "all" ? null : value))`), so
     `"all"` never leaks past the schema boundary into service/repository
     code.
   - `limit` is `z.coerce.number().int().min(1).max(<cap>).default(<start>)`
     — `z.coerce` because URL search params are always strings.
   - Free-text query is `z.string().trim().max(<n>).default("")`.
3. The **client form** is a plain `<form action="/<route>" method="get">`
   with named `<input>`/`<select>` controls (`Input`/`Select` from
   `src/components/ui/**`) and no client-side routing — submission is a
   full GET navigation. This is what makes filter state shareable
   (bookmarkable URL), back-button-safe, and SSR-refetched on every change,
   with no client cache-invalidation logic to write or get wrong.
4. A form may *additionally* layer a debounced client-side autocomplete
   (assets' 300ms free-text suggestion dropdown hitting the list API
   directly) on top of the URL-submit flow — that's a UX enhancement local
   to one input, not a replacement for the GET-form contract, and it stays
   optional per page.

### 1.2 Should there be a shared `FilterBar`/`FilterSelect` component?

**Recommendation: no new shared component this round. Document the pattern
above as the standard and reuse the existing `Select`/`Input` primitives
directly in each feature's own search-form component.**

Reasoning:

- The four current filter forms (`AssetSearchForm`, the inline movements
  form, `service-jobs`' ad hoc buttons, `pm`'s absent one) don't actually
  share a common shape yet — they differ in field count (1 to 4), presence
  of an autocomplete overlay, and whether counts are shown inline next to
  options (assets' warehouse `<select>` interpolates live counts per
  option). A `FilterBar` abstracted from only one real example (`assets`)
  would either be a thin wrapper that saves nothing, or would over-fit to
  assets' shape and fight the other five pages during rollout.
- `page-standards.md` §4 already set the precedent for this kind of
  restraint: card-grid stays default and a `<DataTable>` is deferred until
  a specific dense-admin use case justifies it, rather than building the
  abstraction speculatively. The same judgment applies here — build the
  shared component once 2-3 pages have been retrofitted with the documented
  pattern and a genuine duplicate shape is visible, not before.
- What *is* worth extracting immediately, because it has zero design
  ambiguity, is a tiny presentational helper for the "all" `<option>` label
  and the load-more button (§2) — but these are convenience wrappers, not a
  filtering framework, and can be added inline per page without blocking
  rollout.

Revisit this recommendation after the §4 rollout is complete: if by then
three or more pages have hit the exact same `<select>`-plus-submit shape
with no per-page variation, extracting a `FilterBar` becomes a refactor with
real evidence behind it instead of a guess.

### 1.3 Required schema shape going forward

Every list page's `searchParams` handling must:

- Live in a `<feature>SearchSchema` in the feature's `schemas/` folder
  (never inline `z.object` in the page file — `movements/page.tsx`'s inline
  usage today is fine only because it is extracted to
  `src/features/warehouse/schemas/movement.schema.ts`; a raw inline object
  literal in the page component is not acceptable going forward).
- Default every optional filter so `assetSearchSchema.parse({})`-style calls
  with a fully-empty `params` object never throw.
- Include `limit` per §2 below, even on pages that today fetch unbounded.
- Be parsed once, at the top of the server page component, before any
  service calls — never re-derived ad hoc inside a client component from
  `useSearchParams()` the way `service-jobs` does today for `workType`.

## 2. "Don't show everything" contract — load-more, not pagination

### 2.1 The stopgap, precisely

Since no repository supports a cursor or offset — only a flat `limit` — the
UI-level stopgap is a **resubmit-with-larger-limit** pattern:

1. Every list schema's `limit` field gets a documented `start` value and a
   `step`, both feature-specific but drawn from this table as a default:

   | Page | `start` | `step` | hard `max` |
   |---|---|---|---|
   | assets | 50 (existing) | 50 | 100 (existing) |
   | service-jobs | 50 | 50 | 200 |
   | inventory | 50 | 50 | 200 |
   | users | 50 | 50 | 150 |
   | notifications | 30 | 30 | 150 |
   | pm | 50 | 50 | 200 |
   | warehouse/movements | 50 (currently 100 flat) | 50 | 150 |

   (`max` numbers are starting proposals, not measured — adjust once real
   record counts per collection are known; the point is that every page has
   a finite ceiling, not that the specific numbers are load-bearing.)

2. A **"Load more" button** renders under the list, inside the same
   server-rendered page, as a plain link/button that re-submits the current
   filter state with `limit` bumped by `step` (e.g. a `<Link>` to
   `?...currentFilters&limit=100`). Because filters already live in the URL
   (§1), this requires no new client state — it's the same GET-navigation
   mechanism the filter form already uses, just with one field changed.
3. **Visibility heuristic**: render the "Load more" control only when
   `results.length === criteria.limit` (the fetch returned exactly as many
   rows as requested, the same signal already implicit in `assets`' `limit:
   50` cap). If `results.length < criteria.limit`, hide the button — there
   is nothing more to load. This is explicitly a heuristic, not a
   correctness guarantee: if the true collection size exactly equals the
   requested limit, the button will incorrectly stay hidden for one boundary
   case. That is an acceptable, documented trade-off for a stopgap; it is
   not acceptable to describe this as "pagination" anywhere in code comments
   or UI copy.
4. Once `limit` reaches the page's hard `max`, replace the "Load more"
   button with a static, non-actionable note ("Showing the first `max`
   results — narrow your filters to see more" / Thai equivalent), so users
   at the ceiling get an explanation instead of a silently-vanished button.

### 2.2 Required "Showing N of M" summary line

Every list page renders a one-line summary directly above the card grid:

- If the service layer already computes a filtered total independent of
  `limit` (as `assets` does via `getWarehouseCounts`/`getCategoryCounts`),
  show `"Showing {results.length} of {total}"` (localized).
- If no independent total is available (most pages today — adding one is a
  service-layer change, not purely presentational, so it is *not* required
  as part of this round for pages that lack it), show
  `"Showing {results.length} results"` without an "of M" clause. Do not
  fabricate a total.
- This line is mandatory on every retrofitted page regardless of which
  variant applies — it is the single biggest low-cost signal that a list is
  capped rather than complete, which is precisely the "dumps the whole page"
  complaint this doc responds to.

### 2.3 Explicitly not this round

- No cursor/offset backend pagination. No `startAfter`/page-token concept
  added to any repository interface.
- No infinite scroll / intersection-observer auto-loading. The load-more
  control is an explicit click, matching the rest of the app's GET-form,
  server-driven philosophy (no hidden client fetch loops to debug).
- No client-side "page 1 / 2 / 3" numbered pagination UI — that would imply
  stable page boundaries the backend cannot currently guarantee.

## 3. Density and "enterprise feel" guidelines

These rules apply on top of the existing card-grid decision in
`page-standards.md` §4 — they are not a reason to reconsider a data table.

### 3.1 Field budget per card

- **Sparse card (3-4 fields visible)**: identifier/code, primary
  name/title, one status badge cluster, optionally a secondary line
  (location/date). This is the `assets` card shape today and is the
  target ceiling for list cards generally.
- **Cards currently showing 5+ fields at once** (`service-jobs`, `pm`,
  `inventory`) must drop to this budget by moving anything beyond
  identifier + name + status + one contextual line behind the existing
  detail link (`/service-jobs/[id]`, etc.) rather than inlining it. The
  card is a scan-and-navigate surface, not a summary report.
- Never duplicate the same figure in two places on one page (the audit
  flagged `inventory`'s low-stock banner repeating numbers also shown in
  the raw grid below it — collapse to one source of truth per number, per
  §4 rollout note for that page).
- Badges: status/condition-style badges (already using
  `src/components/shared/status-badge.tsx` conventions per `AssetStatusBadge`)
  may stack up to 2 per card without counting against the field budget —
  they're a single visual cluster, not separate fields.

### 3.2 Summary line

Same requirement as §2.2 — listed here too since it is as much a density
signal as a pagination one.

### 3.3 Quick-filter chip styling

`assets/page.tsx` already has two chip patterns worth standardizing rather
than reinventing per page:

- **Category chips** (`ASSET_CATEGORIES.map(...)`): a `Card` grid
  (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`), each chip a clickable
  `Link`-wrapped `Card` showing a label + count, with the active filter
  styled `border-primary bg-primary/5` and inactive `hover:bg-accent/40`.
  This exact class pairing is now the standard "quick filter chip" look —
  reuse the literal classes, don't invent a new active-state color per page.
- **Count-annotated `<select>` options** (`warehouseId`'s `(${count})`
  suffix per option): use this when a filter dimension has too many values
  for a chip grid (more than ~8) to still surface volume information
  without consuming card-grid space.
- Chips are for filter dimensions with a small, known, enumerable value set
  (asset category, service-job work type, PM status) — not for anything
  with unbounded cardinality (customer name, free text). Those stay
  `<select>` or the text `<Input>`.
- Chip rows sit between the filter form and the "Showing N of M" line,
  consistent with `assets`' current vertical order (search form → warehouse
  summary card → category chips → results).

### 3.4 What stays out

No data table, no breadcrumbs, no dense multi-column admin grid — consistent
with `page-standards.md` §4 and §6. "Enterprise feel" here means predictable
filtering, a stated result count, and disciplined per-card information
density — not a denser visual format.

## 4. Per-page rollout plan

Ordered by severity: pages fetching an **unbounded** collection today
(`service-jobs`, `inventory`, `users`, `notifications`) are worse than pages
that are merely missing filters but already cap their fetch (`pm`,
`warehouse/movements`). `assets` is the reference and needs no rollout work.

1. **`service-jobs`** (worst offender: unbounded fetch *and* filters that
   don't survive reload)
   - Convert the existing client-state (`useState`) status (7 options) and
     workType (4 options) button filters into URL `searchParams`, parsed by
     a new `serviceJobSearchSchema` (status enum + `"all"`, workType enum +
     `"all"`, `limit`). Only `workType` currently round-trips through the
     URL — status must join it.
   - **Decision: move free-text search server-side**, folded into the same
     schema as a `query` field, rather than keeping the current in-memory
     filter-after-unbounded-fetch. The in-memory approach is only "free"
     today because the fetch is already unbounded; once the fetch is capped
     per §2, in-memory text search would silently only search the loaded
     page instead of the full matching set, which is a worse regression
     than the effort of pushing it server-side.
   - Add `limit`/load-more per §2 table (`start: 50`, `step: 50`, `max:
     200`).
   - Reduce card fields to the §3.1 budget (currently 5 fields/card).

2. **`inventory`** (`InventoryManager`, unbounded fetch, no filter UI)
   - Add a status/category filter (align field names with whatever
     inventory-part shape already exposes) via a new `inventorySearchSchema`
     + GET form.
   - Add `limit`/load-more (`start: 50`, `step: 50`, `max: 200`).
   - Resolve the duplicate low-stock summary/grid overlap flagged in §3.1:
     the low-stock banner becomes the single summary source; the grid below
     it should not re-state the same aggregate figures, only per-item detail.

3. **`users`** (`UserList`, unbounded fetch, no filter UI at all)
   - Add a role/status filter (`userSearchSchema`: role enum + `"all"`,
     status/active enum + `"all"`).
   - Add `limit`/load-more (`start: 50`, `step: 50`, `max: 150`). User lists
     are typically the smallest collection in this app (internal staff, not
     customer-scale), so the low `max` is deliberate — confirm actual row
     count before implementation and adjust if it's already under 150 (in
     which case load-more may turn out to be unnecessary for this page —
     verify, don't assume).

4. **`notifications`** (unbounded fetch, no filter UI)
   - Add a type/read-status filter (`notificationSearchSchema`).
   - Add `limit`/load-more (`start: 30`, `step: 30`, `max: 150`) —
     notifications use a smaller `start` than other pages since cards here
     are typically shorter and users scan more of them per screen.

5. **`pm`** (already capped at 200, but status hardcoded to `"scheduled"`,
   no filter UI)
   - Replace the hardcoded status with a real `pmSearchSchema` status filter
     (enum + `"all"`), defaulting to `"scheduled"` to preserve current
     behavior for users who don't touch the filter.
   - Load-more already has a natural ceiling here since the fetch is
     already capped at 200 — align `start`/`step` to the §2 table (`start:
     50`, `step: 50`, keep `max: 200`).
   - Reduce card fields to the §3.1 budget (currently 5 fields/card).

6. **`warehouse/movements`** (already capped at 100, has one filter)
   - Lowest priority — already the second-best page after `assets`. Extract
     the inline filter form into a feature component (`MovementSearchForm`,
     mirroring `AssetSearchForm`'s file placement) purely for consistency,
     not because the current inline version is broken.
   - Add `limit`/load-more (`start: 50`, `step: 50`, `max: 150`) so the
     existing flat 100 cap gets the same "Showing N of M" treatment as
     everywhere else instead of being a silent, undocumented ceiling.

Each page in this list gets its own `<feature>SearchSchema` file, its own
GET-form filter component (not a shared `FilterBar`, per §1.2), the §2
load-more control, and the §2.2 summary line. None of this requires touching
`src/domain/repositories/**` beyond passing the existing `limit: number`
parameter through — no repository interface changes are needed for this
round.

## 5. Explicit non-goals

Consistent with `page-standards.md`'s own restraint, this round does **not**:

- Build a new shared `FilterBar`/`FilterSelect` component. Document and
  repeat the per-feature-schema-plus-GET-form pattern instead (§1.2); revisit
  after rollout if genuine duplication appears.
- Build real cursor/offset/page-token pagination in
  `src/domain/repositories/**` or `src/services/**`. The load-more pattern in
  §2 is a stopgap against the existing flat `limit`, not a substitute for
  this — it is a distinct, larger future workstream (data modeling for
  stable cursors, composite Firestore indexes, sort-key stability across
  writes during pagination) and must be scoped separately.
- Introduce a `<DataTable>` or any dense multi-column table view. Card-grid
  remains the default per `page-standards.md` §4.
- Add breadcrumbs. Unchanged from `page-standards.md` §6.
- Add infinite scroll or auto-loading. Load-more is an explicit click only
  (§2.3).
- Change any repository interface signatures. Every page in §4 works within
  the existing flat `limit: number` parameter already accepted everywhere.
