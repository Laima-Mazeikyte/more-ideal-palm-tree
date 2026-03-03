# Product Roadmap

Sequencing guide for all Journey Tracker development. Organized into four shippable phases, each a coherent increment. Every phase respects the core brand direction: accumulation over completion, no shame mechanics, warm/steady/humane.

---

## Current State (Baseline)

**What exists:**
- Step CRUD (create, complete by tap, delete) backed by Supabase
- Anonymous + email auth with anonymous-to-authenticated migration (`claim_anonymous_todos` RPC)
- Journey assignment per Step (5 default journeys seeded per user via DB trigger)
- Journey color system via CSS custom properties (`data-journey-slug` pattern)
- Steps grouped by Journey with color-coded headers
- Completion expressed as reduced opacity (no checkboxes)
- Progress counter: "X steps today"
- Timestamp display (relative for today, date for older)
- Mobile-first responsive layout, Source Sans 3 + Fraunces typography

**Scaffolded but no UI:**
- `milestones` table (`journey_id`, `name`, `sort_order`)
- `paths` table (`name` only, no journey association)
- No `step_paths` junction table

**Priority alignment (from visualization spec):**

| Priority | Components | Status |
|----------|-----------|--------|
| P0 | Step Tile, Journey Color System, Step Stack, Progress Counter | Built |
| P1 | Paths, Milestones, Trail View, Zoom Nav | Phase 2 |
| P2 | Journey Balance Wheel, PERMA Signal Bars | Phase 3 |
| P3 | Ikigai Path Indicator | Phase 4 |

---

## Phase 1 — Refine the Foundation

*Codify the design principles that govern every future decision. Refine the empty state. Align all documentation.*

### Goals

1. Establish the three core design principles: hemisphere separation, interaction weight constraint, no self-assessment
2. Align all existing documentation to these principles
3. Refine the empty state to reflect brand voice
4. Ensure the existing Today view is a clean foundation for Phase 2

### Key Deliverables

**Documentation Alignment**
- Add Design Principles section to `product-vision.md`
- Rewrite this roadmap to remove quality tags, duration tracking, momentum line, and satisfaction prompts
- Update `framework-reference.md` to use behavioral inference only
- Update `visualization-spec.md` to remove self-assessment and comparison mechanics
- Add guardrails to `brand-art-direction.md`

**Empty State**
- Brand-voice copy: "Every journey starts with a single step."
- Subtle visual warmth via `--font-family-heading` (Fraunces)

### Technical Tasks

**`src/main.js`**
- Update empty state copy in `renderSteps()`

**`src/style.css`**
- Update `.todo-empty` with `font-family: var(--font-family-heading)`

### Success Criteria

- [ ] All documentation references to quality tags, duration_minutes, satisfaction ratings, and momentum comparisons have been removed or corrected
- [ ] Design Principles section exists in `product-vision.md`
- [ ] Empty state reads "Every journey starts with a single step." in Fraunces
- [ ] Existing Step tile, Journey picker, and all CRUD operations work unchanged
- [ ] Passes emotion-first checklist from `brand-art-direction.md`

### Brand Guard

No self-assessment prompts. No performance comparisons on the Today view. The Today view accepts exactly one input: step text.

---

## Phase 2 — Paths, Milestones, and Trail View

*Give daily Steps a home in a larger story. Introduce the second and third data tiers with usable UI and build the first cross-day view.*

### Goals

1. Users can create and manage Paths — named personal contexts spanning Journeys
2. Steps can be optionally associated with a Path (many-to-many)
3. Milestones group Steps with visible progress bars and pace estimates
4. Trail View (week-level) shows linear trail per Path with frequency sparklines
5. Zoom navigation: Today ↔ This Week with breadcrumbs

### Key Deliverables

**Path Data Model + UI**
- Path CRUD (create, rename, archive)
- `step_paths` junction table (many-to-many)
- Path picker on Step creation form and existing tile (reuse journey picker pattern)
- Path badge on tile Layer 2 (shown only when association exists)
- Path management screen

**Milestone Data Model + UI**
- Milestone CRUD under a Journey, with optional target count and description
- Step-to-Milestone association via existing `milestone_id` FK
- Milestone picker on creation form (filtered by selected Journey)
- Milestone proximity indicator on tile Layer 2: compact progress bar
- Milestones list view with progress bars and recent contributing steps

**Trail View**
- Week-level view showing all active Paths
- Per-Path linear trail: `●` = Step, `⚑` = completed Milestone, `○` = current position
- Weekly sparkline (8-week history, inline SVG, no library dependency) — visual pattern only, no evaluative labels

**Zoom Navigation**
- Two-button tab strip: "Today" / "This Week"
- JS view-state toggle (`let currentView = 'today'`), CSS fade/slide transition
- Breadcrumb on tiles with hierarchy: `Vitality › Novel Writing › 50K Draft`
- Tappable breadcrumb segments for drill-down

### Technical Tasks

**New modules:**
- `src/paths.js` — Path CRUD functions
- `src/milestones.js` — Milestone CRUD functions
- `src/views.js` — View state management (`setView`, `getView`)
- `src/trail-view.js` — Trail View renderer (SVG trail + sparkline)

**`src/main.js` changes:**
- Import and wire new modules
- Add Path + Milestone pickers to creation form
- Update `addStep()` to insert into `step_paths` and set `milestone_id`
- Update `loadSteps()` to join `step_paths → paths` and `milestones`
- Render Layer 2 content (Path label, Milestone proximity) on tiles
- Zoom navigation handler + breadcrumb builder

**`src/style.css` additions:**
- `.trail-view`, `.path-trail`, `.sparkline`
- `.breadcrumb` strip (Journey › Path › Milestone)
- `.milestone-progress-bar`, `.milestone-proximity`
- `.view-nav`, `.view-nav__tab`

### Database Migration

```sql
-- step_paths junction table
create table public.step_paths (
  step_id uuid not null references public.steps(id) on delete cascade,
  path_id uuid not null references public.paths(id) on delete cascade,
  primary key (step_id, path_id)
);
alter table public.step_paths enable row level security;
create policy "Users can manage own step_paths"
  on public.step_paths for all
  using (exists (select 1 from public.steps s where s.id = step_paths.step_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.steps s where s.id = step_paths.step_id and s.user_id = auth.uid()));
create index step_paths_path_id on public.step_paths (path_id);
create index step_paths_step_id on public.step_paths (step_id);

-- extend paths table
alter table public.paths
  add column description  text,
  add column is_archived  boolean not null default false;

-- extend milestones table
alter table public.milestones
  add column description   text,
  add column target_count  integer check (target_count > 0),
  add column target_date   date,
  add column completed_at  timestamptz;
```

### Success Criteria

- [ ] Create a Path and assign a Step to it in under 5 seconds
- [ ] Path badge appears on tile only when association exists; nothing when absent
- [ ] Milestone progress bar shows compact visual (no percentage number on tile)
- [ ] Trail View renders linear trail per active Path with sparkline
- [ ] View switching is smooth and maintains Today scroll position on return
- [ ] Breadcrumb `Pursuits › Novel Writing › 50K Draft` appears on fully-associated tiles
- [ ] All existing Step CRUD works unchanged; Path/Milestone always optional

### Brand Guard

The trail shows where you've been, not scores performance. No evaluative labels like "Accelerating" or "Slowing" — the sparkline speaks for itself.

Milestone progress bars never show a warning state. A milestone at 10% is 10% further than 0%. The bar fills; it never depletes.

---

## Phase 3 — Framework Visualizations (Wheel + PERMA)

*Surface the meaning layer. Behavioral data becomes a coherent picture of life balance and well-being — without questionnaires.*

### Goals

1. Satellite View (quarter-level) introduces the Journey Balance Wheel
2. PERMA signal bars derived entirely from behavioral data
3. Topographic View (month-level) shows Milestone network with pace estimates
4. Zoom stack complete: Street → Trail → Topographic → Satellite

### Key Deliverables

**Journey Balance Wheel**
- Five-spoke radial SVG, one spoke per Journey
- Spoke length proportional to Step count for selected period
- Period selector: This Week / This Month / This Quarter
- Ghost outline of previous period for trend comparison
- Activity summary per Journey below wheel
- "Low activity" flag when Journey falls below 15% of total (text only: "Connections has been quieter this quarter.")

**PERMA Signal Bars**
- Five horizontal bars: Positive Emotion, Engagement, Relationships, Meaning, Accomplishment
- Signal strength derived entirely from behavioral data (no user input beyond logging Steps):
  - Positive Emotion → Step frequency + journey diversity indicating active life engagement
  - Engagement → consistency patterns, session clustering, deep Path investment
  - Relationships → proportion of Steps in Connections Journey
  - Meaning → proportion of Steps with a Path association
  - Accomplishment → completed Milestones + Step completion frequency
- Unified soft color for all bars (not five different colors)

**Topographic View (Month-Level)**
- Milestone cards: Journey color border, name, progress bar, recent contributing Steps, pace estimate
- Pace: simple extrapolation ("~2 weeks at current pace"), never deadline pressure language

### Technical Tasks

**New modules:**
- `src/wheel.js` — pure SVG wheel construction
- `src/perma.js` — `inferPermaSignals(steps)` returning 0–1 floats + renderer
- `src/satellite-view.js` — assembles wheel + PERMA + activity summary
- `src/topographic-view.js` — Milestone cards with progress and pace

**`src/main.js` changes:**
- Expand `currentView` to include `month` and `quarter`
- Wire period selector, four-level navigation

**CSS additions:**
- `.satellite-view`, `.topographic-view`
- `.balance-wheel`, `.journey-activity-summary`
- `.perma-bars`, `.perma-bar-row`, `.perma-bar__fill`
- `.milestone-card`, `.milestone-card__progress-bar`, `.milestone-card__pace`
- `.period-selector`
- `.view-nav` expanded to four items

### Success Criteria

- [ ] Balance Wheel renders correctly with 0–5 active Journeys (0 Steps = dot at center)
- [ ] Ghost outline is visually quiet — not a competing focal point
- [ ] PERMA bars derive entirely from behavioral data without any user input beyond logging Steps
- [ ] Topographic View shows milestones with at least one contributing step in last 90 days
- [ ] Pace estimate never uses deadline/failure/urgency language
- [ ] Full zoom stack navigates without data reload (load once, render per view)
- [ ] Satellite View feels like a quiet overview, not a dashboard of demands

### Brand Guard

The PERMA bars are not a performance score. The Wheel is not a grading rubric. Both must be introduced with observational copy: "Here is how your energy has been distributed" — not "Here is how you're doing." No self-assessment prompts of any kind.

---

## Phase 4 — Ikigai, Polish, and PWA

*Add the deepest meaning layer, bring offline capability, and polish to release quality.*

### Goals

1. Ikigai Path alignment indicators per Path in Trail View
2. Offline-capable PWA (installable, offline Step creation queued)
3. Journey customization (rename, reorder, add custom, hide defaults)
4. Multi-user hardening and accessibility audit
5. All four zoom levels feel cohesive and polished

### Key Deliverables

**Ikigai Path Indicator**
- Per-Path indicator: four small circles (Love, Skill, Need, Paid)
- Filled = signal present; hollow = not yet present
- Love: inferred from frequency + consistency + voluntary return patterns
- Skill: inferred from Milestone completion rate + progression patterns
- Need: user-declared toggle on Path ("This benefits others")
- Paid: user-declared toggle on Path ("I earn from this")
- Optional one-sentence insight when genuinely meaningful (e.g., "Shows strong Love and developing Skill. Doesn't generate income — is that intentional?")
- No scoring. No comparison between Paths on Ikigai alignment.

**PWA / Offline**
- Service worker: cache app shell and static assets
- IndexedDB queue for offline Step creation, sync on reconnect
- `manifest.json` with "Today" name, icons, `standalone` display
- Offline indicator: "Working offline — steps will sync when you reconnect" (neutral, not error)

**Journey Customization**
- Settings screen: rename, reorder (up/down buttons), add custom Journey (constrained color palette)
- Hide a Journey (`is_hidden = true`) — Steps remain, Journey hidden from pickers
- Default Journeys cannot be deleted, only renamed or hidden

**Multi-User Hardening**
- Audit all RLS policies
- Verify `claim_anonymous_todos` handles Paths and step_paths
- Test second-user creation flow end to end

**Polish Pass**
- Copy audit against brand tone sliders (70/30 soft, 75/25 personal, 80/20 encouraging)
- Emotion-first checklist across all four views
- Micro-animation review: calm and continuous, not bouncy or celebratory
- Typography audit: Fraunces for headers/reflection, Source Sans 3 for body
- Accessibility: keyboard nav, focus management, ARIA live regions

### Technical Tasks

**New modules:**
- `src/ikigai.js` — `inferIkigaiSignals(path, steps)` + renderer
- `src/offline-queue.js` — IndexedDB wrapper + sync logic
- `src/settings.js` — Journey management UI

**Database Migration:**
```sql
-- Ikigai fields on paths
alter table public.paths
  add column benefits_others boolean not null default false,
  add column is_paid         boolean not null default false;

-- Journey customization
alter table public.journeys
  add column is_hidden boolean not null default false,
  add column color_key text;
```

### Success Criteria

- [ ] Ikigai indicators appear per Path only with 4+ weeks of data
- [ ] Love/Skill inferred from behavioral data; Need/Paid are factual user declarations
- [ ] App installs to home screen on iOS and Android, opens without browser chrome
- [ ] Offline Steps sync within 10 seconds of reconnection
- [ ] Second user gets own default Journeys, cannot see first user's data
- [ ] Custom Journey color appears correctly across all contexts (tile, header, wheel, trail)
- [ ] Keyboard navigation works for all interactions
- [ ] Emotion-first checklist passes across all views

### Brand Guard

Ikigai indicators are informational, not prescriptive. A Path with only Love filled is a hobby, a joy — not a failure. Copy for incomplete alignment must be a genuine question ("Is that intentional?") not a suggestion ("Consider developing a skill here").

Offline state is a practical constraint, not a failure. "Working offline" — not "No connection — your data may be lost."

---

## Dependency Map

```
Phase 1 (Foundation Refinement)
  └─ establishes design principles for all future phases

Phase 2 (Paths + Milestones + Trail)
  ├─ unlocks Path-level analysis for PERMA Meaning signal (Phase 3)
  ├─ unlocks Milestone data for PERMA Accomplishment + Topographic View (Phase 3)
  └─ unlocks Ikigai per-Path signals (Phase 4)

Phase 3 (Wheel + PERMA)
  ├─ requires Path associations from Phase 2
  └─ requires Milestone completion from Phase 2

Phase 4 (Ikigai + PWA + Polish)
  ├─ requires Paths from Phase 2
  └─ requires behavioral data patterns from Phases 2+3
```

---

## Cross-Cutting Concerns

### Accessibility
- All interactive elements: `aria-label` or visible text
- Focus management: dropdowns move focus on open, return on close
- `aria-live="polite"` on step list and progress counter
- Color never sole information carrier — Journey slug text always accompanies color
- Touch targets: 44x44px minimum on mobile

### Performance
- Single-page, no routing library. View state is a JS variable.
- Load data once per session; update incrementally from user actions
- Add `created_at >= now() - interval '90 days'` filter as data grows
- SVG visualizations recomputed from in-memory state

### Data Strategy
- Load 90 days of Steps on auth, keep in module-level state
- Today: client-side filter from loaded data
- Trail View: last 8 weeks for sparklines
- Satellite View: 90 days or current quarter

### Testing Approach
- Manual QA per phase using emotion-first checklist from `brand-art-direction.md`
- Component isolation via existing `style-guide.html`
- Critical path smoke test before any merge: create Step, complete, delete, switch Journey, sign out, sign in — zero console errors

---

## Deferred Items

| Item | Reason |
|------|--------|
| Anonymous social comparison | Requires multiple active users; premature before validation |
| Reflection notes on Steps | Adds input weight; evaluate if behavioral inference proves insufficient for PERMA signals |
| Notification system | PWA notifications high friction on iOS; low priority |
| Calendar integration | Scope-expanding without clear demand |
| Data export/import | Useful but not core to the emotional experience |
| Dark mode | Warm neutral palette may suffice; evaluate after launch |
| Native iOS/Android | Out of scope per product brief |
| Historical data beyond 90 days | Pagination strategy needed when data volume is real |
| Team/collaborative journeys | Out of scope per product brief |

---

## Summary

| Phase | Theme | Key Deliverables | DB Changes |
|-------|-------|-----------------|------------|
| **1** | Refine the Foundation | Design principles, documentation alignment, empty state | No DB changes |
| **2** | Paths, Milestones, Trail | Path/Milestone CRUD, Trail View, zoom nav | `step_paths` junction; extend `paths` + `milestones` |
| **3** | Framework Visualizations | Balance Wheel, PERMA bars (behavioral inference), Topographic View | No DB changes |
| **4** | Ikigai, Polish, PWA | Ikigai indicators, offline support, Journey customization | Ikigai fields on `paths`; `is_hidden` + `color_key` on `journeys` |
