# Brand and Art Direction

This document implements the brand and art direction plan for the product in `product-brief.md`.

## 1) Brand One-Pager

### Brand Thesis
The product is not a productivity enforcer; it is a gentle progress mirror.

### Brand Promise
Your life is moving forward, even in small steps.

### Positioning
- Category: personal journey tracking
- Not: high-pressure task management
- Value: transforms fragmented effort into visible, meaningful accumulation

### Emotional Outcomes
- During use: calm, in control, focused-not-rushed, hopeful, encouraged, seen
- After session: small wins, clarity, relief, steady momentum, self-compassion, bigger-journey connection

### Brand Attributes
- Warm
- Steady
- Humane
- Clear
- Reflective
- Non-judgmental

### Tone Sliders
- Soft -> Sharp: **70/30 soft**
- Personal -> Institutional: **75/25 personal**
- Reflective -> Transactional: **70/30 reflective**
- Encouraging -> Directive: **80/20 encouraging**
- Calm -> Energetic: **65/35 calm**

### Message Hierarchy by Moment
- Capture (add a step): reassurance first, then clarity
- Review (look back): perspective first, then progress
- Plan (what next): gentle momentum first, then prioritization

### Anti-Patterns
- Shame framing ("you failed", "you missed")
- Competitive mechanics (leaderboards, streak pressure)
- Alarmist color usage for normal states
- Dense "dashboard overload" layouts
- High-friction data entry
- Self-assessment prompts (quality ratings, satisfaction scores, mood trackers)
- Performance comparisons on the daily view (averages, streaks, velocity labels)

## 2) Art Direction North Star

### Visual Statement
Design for quiet confidence: soft structure, warm clarity, and visible momentum without urgency.

### Shape Language
- Rounded corners as the default
- Low-contrast boundaries
- Soft grouping containers over hard boxes
- Generous whitespace to reduce cognitive pressure

### Composition Rhythm
- Breathing room over density
- Mobile-first single-column flow as the baseline
- Short, scannable blocks that stack in meaningful sequence
- Visual pacing from "today" to "journey" (micro -> macro)

### Color Emotion Model
- Neutral field for calm baseline and readability
- Warm green/teal accent for forward motion and optimism
- Status colors reserved for true state changes, never decorative urgency

## 3) Practical UI Direction Spec

This spec maps the art direction to tokens already defined in `src/style.css`.

### Color Usage
- App background: `--color-bg`
- Elevated/group surfaces: `--color-surface`, `--color-surface-subtle`
- Primary text: `--color-text`
- Secondary/supporting text: `--color-text-muted`
- Dividers and controls: `--color-border`
- Primary action and key progress cues: `--color-primary`
- Primary interaction hover: `--color-primary-hover`
- Focus states: `--color-focus-ring`
- Status only: `--color-success`, `--color-warning`, `--color-danger`

### Typography Usage
- Body default: `--font-family-body`, `--font-size-md`, `--line-height-body`
- Emphasis (links/buttons/key labels): `--font-weight-emphasis`
- Keep dense UI text at `--font-size-sm`; avoid going below it for core flows
- Reserve `--font-size-lg` and `--font-size-xl` for reflection summaries and key milestones

### Spacing and Layout
- Base rhythm: `--space-sm` and `--space-md`
- Section spacing: `--space-lg` and `--space-xl`
- Minimum vertical compression in core flows: do not go below `--space-sm`
- Container bounds: `--layout-max-width`; viewport floors: `--layout-min-width`, `--layout-min-height`

### Radius and Borders
- Default control rounding: `--radius-md`
- Larger summary/group containers: `--radius-lg`
- Border weight: `--border-width-sm` with `--color-border`

### Motion
- Micro interactions: `--motion-fast` with `--motion-ease`
- Motion should indicate continuity and cause/effect, not urgency
- Avoid bounce, snap, or celebratory animations for normal completion states

## 4) Product Moment Direction

### Step Creation
- Present a calm input zone on `--color-surface`
- Keep hierarchy minimal: one primary action, one clear next step
- Use supportive helper text in `--color-text-muted`

### Daily Review
- Lead with "small wins" framing and clear count/progress language
- Visual emphasis on accumulation, not incompletion
- Use `--color-primary` sparingly for momentum markers

### Time Horizons (day/week/month/year)
- Maintain consistent structure, only changing aggregation level
- Keep visual transitions subtle so users feel continuity across horizons
- Avoid scoreboard treatments; prefer trend and narrative framing

### Journey / Path / Milestone Views
- Distinguish levels with spacing, type scale, and subtle surface variation
- Use accent color as a guide rail, not a dominant fill
- Keep state badges quiet unless action is required

## 5) Emotion-First Validation Checklist

Use this checklist in design reviews and implementation QA.

### Pressure and Compassion
- Does this screen reduce pressure?
- Is copy non-judgmental and encouraging?
- Does the interface support self-compassion after incomplete days?

### Clarity and Control
- Is the next action obvious without feeling forced?
- Can users understand progress in under 5 seconds?
- Is information grouped with enough visual breathing room?

### Momentum and Meaning
- Does feedback reinforce steady momentum over perfection?
- Are small wins visible and believable?
- Does this connect daily actions to a broader journey?

### Visual Consistency
- Are semantic tokens used instead of ad-hoc styling?
- Is accent color used intentionally rather than everywhere?
- Are status colors reserved for actual status communication?

## 6) Implementation Guardrails

- Prefer semantic tokens in components; only base tokens in token-definition layers.
- If a new visual need appears repeatedly, add a semantic token before adding local hard-coded styles.
- Any new pattern that increases urgency, competition, or shame requires explicit design review.
- Any feature that asks the user to evaluate their own effort requires explicit design review and is presumed rejected.
- The Today view accepts only one input: step text. Any additional input mechanism violates the interaction weight constraint.
