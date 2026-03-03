# Visualization Spec

Build-ready specification for Journey Tracker's data visualization system. Defines how each data tier is visualized, how tiers integrate, and how the walking metaphor governs all visual decisions.

---

## Governing Principles

These rules apply to every visualization decision in the product.

### Walking Metaphor as Structural Logic

| Metaphor | Data Tier | Visual Character | Zoom Equivalent |
|----------|-----------|------------------|-----------------|
| Footprint | Step | Light, discrete, additive — weight comes from accumulation | Street View |
| Trail | Path | Linear, forward-extending, showing accumulated distance | Trail View |
| Waypoint | Milestone | Distinct, visible from distance, marks pause points | Topographic View |
| Terrain | Journey | Big-picture landscape, defines environment and context | Satellite View |

> **Note:** These metaphors are internal design language. User-facing copy and labels use the data-tier terms only: Journey, Path, Milestone, Step.

### Visual Language Rules

1. **Color is the primary anchor.** Journey color is the first visual signal on every element. Not text, not icons.
2. **Accumulation creates weight.** A single Step is visually light. Many Steps stacked create a visible trail. Never make individual items heavy to compensate for low volume.
3. **Progress is directional, not circular.** Paths and Milestones use linear visualization (left-to-right). The only circular visualization is the Journey balance wheel — because Journeys are unbounded.
4. **Completion uses saturation, not symbols.** Full saturation = completed. Desaturated/faded = in progress. Outlined = planned. No checkboxes (task manager language). No red/green binary states.
5. **Time flows forward.** Recent items are brighter/more saturated. Older items fade. The trail behind recedes; the path ahead is primary.
6. **No shame mechanics.** No daily quotas, no streak counters, no red indicators for inactivity. Absence is neutral, not failure.

### Journey Color System

Each Journey carries a consistent color that permeates the entire interface across all zoom levels.

| Journey | Color Character | Terrain Metaphor |
|---------|----------------|-----------------|
| Vitality | Warm (reds/oranges) | Sun, fire, energy |
| Pursuits | Creative (purples/magentas) | Imagination, possibility |
| Prosperity | Grounded (golds/greens) | Growth, material stability |
| Connections | Cool (blues) | Sky, openness, relational space |
| Foundations | Earthy (greens/browns) | Ground, stability, roots |

Exact hex values should be defined in `style.css` tokens, referenced by Journey slug.

---

## Step Tile

The atomic visual unit. Every interaction begins here.

### Anatomy

```
┌──────────────────────────────────┐
│ ● Journey Color    3:42 PM       │
│ 30-minute run                    │
│ Cardiovascular Health → 8/50 mi  │
└──────────────────────────────────┘
```

### Information Layers

**Layer 1 — Always Visible (Glanceable)**

| Element | Implementation | Notes |
|---------|---------------|-------|
| Journey color indicator | Colored dot or left-border bar | First visual anchor. Uses Journey slug → color token mapping. |
| Step title | Text, `--font-size-md` | What happened. User-authored text. |
| Timestamp | Text, `--color-text-muted`, `--font-size-sm` | When it happened. Relative for today ("3:42 PM"), date for older. |

**Layer 2 — Available on Tap (Contextual)**

| Element | Implementation | Notes |
|---------|---------------|-------|
| Path label | Text below title, `--font-size-sm` | Which trail. Only shown if Step has a Path assignment. |
| Milestone proximity | Mini progress indicator | "8/50 mi" or "3/10 tasks" — only if Milestone exists. |
| Completion state | Saturation shift | Full saturation = done. Faded = in progress. Outlined = planned. |

**Layer 3 — Reserved**

Currently empty. The minimum tile (Layer 1 + Layer 2 context) is sufficient. Future enrichment may be added here if needed, but must pass the interaction weight test: any addition that makes the Today view heavier belongs in the Journey hemisphere instead.

### Design Rules
- No tile should feel like a form. No self-assessment inputs on tiles.
- Journey color dot + title + timestamp is the minimum viable tile.
- Path and Milestone context appear only when those associations exist in the data.
- On a day with 15 Steps, the stack of tiles should feel like a trail of footprints — not an inbox of demands.

---

## Progress Visualization by Tier

### Step Progress — Daily Accumulation

**User question:** "What did I do today?"

**View:** Chronological stack of Step tiles grouped by Journey color. Count displayed without a target.

```
TODAY — March 2 — 6 Steps

● Vitality (2)
  30-min run · Meal prep

● Pursuits (2)
  Wrote 1200 words · Read chapter

● Connections (1)
  Called mom

● Foundations (1)
  Grocery run
```

**Progress counter:** "6 Steps today" — a tally, not a score. No comparisons, averages, or performance context. The Today view is accumulation only.

**Implementation notes:**
- Group Steps by Journey, sorted by Journey `sort_order`
- Within each group, sort by `created_at` ascending
- No daily quota. No ring to fill. Count is the only metric.

---

### Path Progress — Medium-Term Trajectory

**User question:** "Am I building momentum on this trail?"

**View:** Linear trail visualization. Steps as marks along the line. Milestones as waypoints.

```
Path: Novel Writing (Pursuits)
──●──●──●──●──⚑──●──●──●──●──●──●──⚑──●──●──○
              25K              50K          → 75K

Sparkline: ▁▃▅▃▆▇▅█ (8-week frequency)
```

**Implementation notes:**
- `●` = completed Step contributing to this Path
- `⚑` = completed Milestone
- `○` = current position (most recent Step)
- Trail extends left (past) to right (future)
- Below the trail: weekly frequency sparkline (8-week history) — visual pattern only, no evaluative labels
- The sparkline lets users see their own patterns without the app passing judgment

---

### Milestone Progress — Distance to Waypoint

**User question:** "How far to the next landmark?"

**View:** Progress bar with contributing Steps and pace estimate.

```
⚑ Complete 10K Run
  ████████░░ 80% (8K of 10K)

  Recent Steps:
  · 5K run (today) → now at 8K
  · 3K run (Monday) → was at 3K

  Pace: ~2 weeks at current rate
```

**Implementation notes:**
- Progress bar is percentage-based. Milestones are the one place where percentage is appropriate (they have a defined endpoint).
- Contributing Steps listed with recency. Max 5 shown, expandable.
- Pace estimate: extrapolate from recent velocity. No deadline pressure language.
- If no target date set: show pace only. If target date exists: show "On track" / "Behind pace" neutrally.

---

### Journey Progress — Life Balance

**User question:** "Is my life balanced? Where am I investing?"

**View:** Five-spoke balance wheel with temporal comparison.

```
         Pursuits
            |
           /|\
          / | \
Connect. /  |  \ Vitality
        /   |   \
       /    |    \
   ━━━━━━━━○━━━━━━━━
          /   \
         /     \
  Found. /       \ Prosperity
```

**Implementation notes:**
- Spoke length = relative Step count per Journey for the selected period
- Period selector: This Week / This Month / This Quarter
- Overlay: ghost outline of previous period for trend comparison
- Below wheel: PERMA signal bars (derived, see framework-reference.md)
- Activity summary per Journey: "Vitality: 12 Steps · Connections: 3 Steps ← Low"
- "Low" flag: triggered when a Journey falls below 15% of total Steps for the period

---

## Zoom Stack — Tier Integration

The four tiers form a continuous zoom stack. Users navigate by zooming in/out, maintaining spatial context at every level.

### Default Entry Point

The app opens to **Today (Street View)**. This respects the Ikigai principle that meaning lives in the daily practice, not the overview.

### Zoom Levels

| Level | View | Shows | Time Resolution | Navigation |
|-------|------|-------|----------------|------------|
| Street | Today | Step tiles | Hours | Default landing. Scroll to see all today's Steps. |
| Trail | This Week/Month | Path activity + frequency | Days/Weeks | Zoom out from Today, or tap a Path name. |
| Topographic | Active Milestones | Milestone progress bars + Path network | Weeks/Months | Zoom out from Trail, or tap a Milestone. |
| Satellite | Journey Balance | Five-spoke wheel + PERMA + trends | Months/Quarters | Zoom out from Topographic, or tap "Balance" nav. |

### Drill-Down Navigation

Every element is tappable to zoom in:
- Tap a Journey spoke → see its Paths (Trail View filtered to that Journey)
- Tap a Path → see its Milestones and recent Steps
- Tap a Milestone → see contributing Steps (Street View filtered to that Milestone)

### Drill-Up Navigation (Breadcrumbs)

Every Step tile carries its hierarchy as a breadcrumb:

```
Vitality > Cardiovascular Health > 10K Run
```

Tap any segment to zoom to that level. This maintains the "sense of place" principle from the research — the user always knows where they are in the hierarchy.

### Visual Continuity Across Levels

These elements persist across all zoom levels:
- Journey colors (always consistent)
- Directional flow (left-to-right for time, bottom-to-top for hierarchy)
- Saturation-based completion states
- Walking metaphor language (Steps, Path, Milestone, Journey — never "tasks," "projects," "goals," "categories")

---

## Framework Output Surfaces

Framework insights appear at specific zoom levels. They are **never** the primary content — always supplementary.

| Zoom Level | Framework Surface | Format |
|------------|------------------|--------|
| Street (Today) | None | Frameworks are invisible at daily level. Just Steps. |
| Trail (Week) | Ikigai — Path alignment hint | Subtle indicator per Path: "Where your energy goes" |
| Topographic (Month) | PERMA — Well-being snapshot | Five horizontal bars showing signal strength derived entirely from behavioral patterns |
| Satellite (Quarter) | All three frameworks | Full wheel + PERMA trend + Ikigai per-Path analysis |

---

## Component Summary

For implementation, these are the distinct visual components needed:

| Component | Used At | Priority |
|-----------|---------|----------|
| Step Tile | Street View (Today) | **P0** — Required for core Step logging |
| Journey Color System | All levels | **P0** — Required for any visualization |
| Step Stack (grouped by Journey) | Street View | **P0** — Today's primary view |
| Progress Counter | Street View | **P0** — "6 Steps today" — tally only, no comparisons |
| Milestone Progress Bar | Topographic View | **P1** — Required when Milestones are implemented |
| Path Trail (linear) | Trail View | **P1** — Required when Paths are fully implemented |
| Weekly Sparkline | Trail View | **P1** — Visual frequency pattern per Path |
| Journey Balance Wheel | Satellite View | **P2** — Required for framework output layer |
| PERMA Signal Bars | Satellite View | **P2** — Derived from behavioral data (Paths, Milestones, frequency) |
| Ikigai Path Indicator | Trail/Satellite View | **P3** — Most complex, requires rich Path data |
| Zoom Navigation | All levels | **P1** — Required to connect the views |
| Breadcrumb | All levels below Satellite | **P1** — Required for spatial context |

---

## Current State → Next Build Phase

The current implementation (`src/main.js`) has:
- ✅ Step CRUD (create, complete, delete)
- ✅ Journey assignment per Step (picker + badge)
- ✅ Journey color system (via `data-journey-slug`)
- ✅ Step grouping by Journey with color-coded headers
- ✅ Saturation-based completion (opacity, no checkboxes)
- ✅ Timestamp display (relative for today, date for older)
- ✅ Progress counter ("X steps today")

The next build phase should target:
1. **Path data model** — Add Paths table, Step ↔ Path association, Path picker on Step tiles.
2. **Milestone data model** — Add Milestones table, Step ↔ Milestone association, progress bar component.
3. **Trail View** — Path-level visualization with linear trail and sparkline.
4. **Journey Balance Wheel** — Five-spoke visualization from Step distribution data.
