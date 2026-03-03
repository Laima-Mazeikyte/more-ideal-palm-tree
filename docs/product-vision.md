# Journey Tracker — Product Context

## Overview

Journey Tracker is a mobile-first progressive web app that tracks incremental daily progress across all life domains. It is not a task manager or productivity tool — it is a personal journey tracker that surfaces how seemingly insignificant daily Steps compound into something meaningful over time.

The core emotional goal is forward motion. Users should feel good about the accumulation of effort, including the unglamorous and necessary work of daily life. The app should never trigger anxiety, shame, or a sense of underaccomplishment.

---

## Problem Statement

Managing multiple businesses, creative projects, relationships, health, and home obligations simultaneously creates a fragmented, overwhelming daily experience. There is no single system that captures the full breadth of life activity in one place, and no way to look back across days, weeks, months, and years and see how incremental effort has accumulated into something meaningful.

The result is a chronic sense of underaccomplishment — not because enough isn't being done, but because there is no structure that makes the accumulation visible. Every day feels like a fresh slate of failure rather than a continuation of a larger, ongoing journey.

---

## Goals

- Track incremental daily Steps across all life domains
- Surface how effort accumulates across day, week, month, and year
- Make even unglamorous tasks visible as part of a well-lived, balanced life
- Eliminate anxiety, shame, and overwhelm from the task tracking experience
- Map personal activity against established life frameworks to surface meaning
- Allow anonymous comparison of journeys across users

---

## UX Principles

- **Forward motion** — the experience should always feel like progress, never failure
- **Accumulation over completion** — the app rewards showing up, not just finishing
- **Personal, not prescriptive** — each journey should feel unique to the individual
- **Anxiety-free** — no endless lists, no shame from incomplete work, no punishment for slow days

---

## Design Principles

These constraints govern all feature design and implementation decisions.

### Today vs Journey Hemisphere Separation

The application operates in two distinct hemispheres:

- **Today hemisphere** — Present-focused, action-oriented. Shows today's steps as simple accumulation. No averages, comparisons, streaks, or performance metrics. The counter ("X steps today") is a tally, not a score.
- **Journey hemisphere** — Retrospective, pattern-recognizing. Rolling averages, PERMA inference, progress visualizations, and trend data live here. Separate views, separate mental mode.

This is an architectural boundary. Features must not bleed between hemispheres.

### Interaction Weight Constraint

Entering text in the input bar is the heaviest interaction in the entire application. Step tiles should feel weightless — text accumulating on the page, not interactive dashboards. New features must pass the weight test: does this make the Today view heavier? If yes, it belongs in the Journey hemisphere or doesn't belong at all.

### No Self-Assessment Mechanics

The app never asks users to rate, score, or evaluate their own effort. PERMA and framework signals are inferred from behavioral patterns (frequency, consistency, journey diversity), never from self-reported input. Quality tags, mood trackers, effort ratings, satisfaction scores, and similar mechanics are explicitly excluded.

Factual declarations on Paths (e.g., "I earn from this") are acceptable — they describe objective attributes, not subjective self-evaluation.

---

## Theoretical Frameworks

Progress tracking maps Step completions against three established frameworks:

- **Wheel of Life** — surfaces balance across life domains
- **PERMA** (Positive Psychology) — surfaces emotional fulfillment outcomes
- **Ikigai** — surfaces purpose and meaning alignment

These frameworks operate at the output layer. Users do not need to think in these terms — the app surfaces insights derived from them automatically.

---

## Data Model

The app is structured around a four-tier model. All entities are scoped to a `user_id`.

```
Journey (required, tag)
Path (optional, tag — many-to-many across Journeys)
Milestone (optional)
  └── Step
Step (atomic unit of work)
```

### Rules

- A Step always requires at least one Journey
- A Path can span multiple Journeys
- A Step can belong to a Journey, Path, and Milestone simultaneously
- A Step can belong to a Journey only, with no Path or Milestone
- Milestones are large units of work composed of Steps
- Journeys and Paths function as tags (many-to-many relationships)
- Milestones are not required — Steps can exist without them

---

## Terminology

| Term | Definition |
|---|---|
| **Journey** | The broadest life domain. Always required on a Step. |
| **Path** | A named personal context (e.g., "Khaos", "Gears") that spans one or more Journeys. User-defined. |
| **Milestone** | A large task composed of smaller Steps (e.g., "Launch Q1 Product Roadmap"). |
| **Step** | The atomic unit of work. The primary input of the app. |

### Language Boundaries

The four data-tier terms (Journey, Path, Milestone, Step) are the only structural terms used in the UI. The visualization spec defines a parallel walking metaphor (Terrain, Trail, Waypoint, Footprint) for internal design guidance — these metaphors govern visual decisions but never appear as user-facing labels or copy.

---

## Default Journeys

Rooted in the Wheel of Life framework. Shipped as defaults, user-customizable.

| Journey | Covers |
|---|---|
| **Vitality** | Health, body, mind, rest |
| **Pursuits** | Creative work, skill-building, learning |
| **Prosperity** | Career, business, finances |
| **Connections** | Relationships, community, family |
| **Foundations** | Home, chores, obligations, logistics |

---

## Core Features

### Step Management
- Create, edit, delete Steps
- Mark Steps as complete or uncomplete
- Tag Steps with Journey, Path, and/or Milestone

### Progress Tracking
- Aggregated views across day, week, month, and year
- Output layer maps completions against Wheel of Life, PERMA, and Ikigai

### Categorization
- Journeys — default set, user-customizable
- Paths — fully user-defined, many-to-many across Journeys
- Milestones — large tasks that group related Steps

### Social
- Anonymized journey comparison across all users
- No PII exposed in comparative views

### User Configuration
- Rename, add, or hide default Journeys
- Create and manage personal Paths

---

## Tech Stack

| Layer | Choice |
|---|---|
| App type | Progressive Web App (PWA) |
| Primary platform | Mobile-first, laptop supported |
| Auth & backend | Supabase |
| Users | Multi-user from day one |

---

## Current Alternatives

| Tool | Limitation |
|---|---|
| Plane | Generic task manager, not journey-oriented, no life balance layer |
| Apple Notes | Informal to-do lists, no tracking, no accumulation view |

Neither tool surfaces the meaning or accumulation of effort across a whole life.

---

## Launch Scope

Single primary user at launch. Backend architected for multiple users from day one to avoid painful retrofitting. Social and comparative features can be surfaced once additional users are active.