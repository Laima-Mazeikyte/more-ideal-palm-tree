# Framework Reference

Concise reference for the three psychological frameworks that govern Journey Tracker's output layer. Distilled from comprehensive research for use during design and development.

---

## How Frameworks Operate in the Product

Frameworks are **not user-facing features**. Users input Steps. The system derives framework insights from behavioral data. Users never fill out PERMA questionnaires or Ikigai worksheets.

| Framework | Operates At | Question Answered | Input Source |
|-----------|-------------|-------------------|-------------|
| Wheel of Life | Journey level | "Is my life balanced?" | Step distribution across Journeys |
| PERMA | Step → Journey aggregation | "Am I flourishing?" | Activity frequency, journey distribution, path associations, milestone progression |
| Ikigai | Path level | "Where is authentic meaning?" | Frequency, path associations, milestone progression |

---

## Wheel of Life

### Origin
Created in the 1960s by Paul J. Meyer (Success Motivation® Institute). Roots in Tibetan Buddhist philosophy of balance-as-happiness. Now the most commonly used self-assessment instrument in coaching practice globally.

### The Model
A radial diagram where each spoke represents a life domain rated 1–10 for satisfaction. The resulting shape reveals imbalance through irregularity. A perfect circle = perfect balance (theoretical). An irregular shape = concentrated investment in some areas, neglect in others.

### Standard 8 Domains → Journey Tracker's 5 Journeys

| Standard Domain | Maps To | Journey |
|----------------|---------|---------|
| Health & Fitness | Physical well-being, exercise, sleep, nutrition | **Vitality** |
| Personal Growth, Fun & Recreation | Creative work, learning, skill-building, leisure | **Pursuits** |
| Career, Money & Finances | Professional work, business, financial management | **Prosperity** |
| Family & Friends, Romance | Relationships, community, social connection | **Connections** |
| Physical Environment | Home, chores, obligations, logistics | **Foundations** |

The consolidation from 8 to 5 domains reduces cognitive load while preserving the essential balance assessment.

### Application in Journey Tracker
- **Data source:** Count and distribution of Steps across the five Journeys over time
- **Visualization:** Five-spoke wheel showing relative investment per Journey
- **User input:** None. Balance is derived entirely from Step distribution.
- **Insight type:** "You've invested heavily in Prosperity this month. Connections has declined 40% from last quarter."
- **Frequency:** Wheel shape updates continuously from Step data.

### Key Design Principle
The wheel reveals *distribution*, not *deficiency*. An imbalanced wheel is diagnostic information, not a failure state. Language must be observational ("Connections is lower this quarter") never judgmental ("You're neglecting relationships").

---

## PERMA (Seligman's Well-Being Model)

### Origin
Developed by Martin Seligman in *Flourish* (2011), evolving from his earlier Authentic Happiness theory. PERMA defines five measurable pillars of well-being that together constitute "flourishing." Validated through the PERMA Profiler instrument (Butler & Kern, 2016).

### The Five Pillars

| Pillar | Definition | How It's Signaled in Steps |
|--------|-----------|---------------------------|
| **P** — Positive Emotion | Joy, gratitude, serenity, interest, hope, pride, amusement, inspiration, awe, love | Step frequency + journey diversity indicating active life engagement |
| **E** — Engagement | Flow states, deep absorption, challenge-skill balance (Csíkszentmihályi) | Session clustering, consistent daily patterns, deep Path investment |
| **R** — Relationships | Positive, meaningful connections with others | Steps involving other people, Connections Journey activity |
| **M** — Meaning | Serving something larger than self, values-aligned action | Steps associated with Paths, multi-journey engagement |
| **A** — Accomplishment | Achievement, competence, mastery, goal completion | Milestone progress, Step completion frequency |

### PERMA+ Extensions
Research has proposed additional dimensions: Physical Health (already captured by Vitality Journey), Mindfulness, Economic Security, Loneliness. These are captured implicitly through the Journey/Path structure rather than as separate PERMA dimensions.

### Application in Journey Tracker
- **Data source:** System-inferred entirely from Step frequency, journey distribution, path associations, and milestone progression
- **Visualization:** Five horizontal bars showing derived signal strength per PERMA dimension
- **User input:** None. All signals derived from behavioral patterns — what you do and how consistently you do it.
- **Insight type:** "Strong Accomplishment signals this week. Engagement is lower — fewer consistent sessions across your Paths."
- **Frequency:** Dashboard updated weekly. Trend comparison monthly.

### Key Design Principle
PERMA operates as a **derived output layer**, never an input form. The system infers well-being signals entirely from behavioral patterns — what you do and how consistently you do it — never from self-assessment. No quality tags, mood ratings, or satisfaction prompts.

### Signal Inference Logic

| PERMA Dimension | Inferred From |
|-----------------|---------------|
| Positive Emotion | Step frequency + journey diversity (active engagement across life domains signals positive emotional state) |
| Engagement | Session clustering, consistent daily patterns, deep Path investment (regular return to the same Path) |
| Relationships | Steps tagged to Connections Journey or involving other people |
| Meaning | Steps associated with Paths, multi-journey engagement (investment in purpose-aligned contexts) |
| Accomplishment | Milestone completion rate, Step completion frequency |

---

## Ikigai

### Origin
Japanese concept with dual interpretations relevant to Journey Tracker:

**Authentic Japanese (Kamiya, 1966; Hasegawa, 2001):** Ikigai means "that which makes life worth living" — small daily experiences that create a feeling of life being worthwhile. Not grand purpose, but present-moment engagement. Morning coffee, a satisfying run, quality time with family.

**Western Adaptation (Héctor García, 2016):** The four-circle Venn diagram — intersection of What You Love, What You're Good At, What the World Needs, What You Can Be Paid For. This version operates at the Path/career level, not the daily moment level.

### Dual Application in Journey Tracker

| Interpretation | Operates At | What It Reveals |
|---------------|-------------|-----------------|
| Authentic Japanese | Step level | Which daily actions carry genuine aliveness — the small joys that make waking up worthwhile |
| Western 4-Circle | Path level | Which Paths align love, skill, need, and compensation — purpose alignment of longer pursuits |

### The Four Circles (Western Model) Applied to Paths

| Circle | Signal Source | Example |
|--------|--------------|---------|
| What You Love | Frequency + consistency + voluntary return patterns | "I write fiction 5x/week and keep coming back to it" |
| What You're Good At | Milestone progression + increasing complexity patterns | "Completed 3 running milestones in 3 months" |
| What the World Needs | User-declared factual attribute on Path ("This benefits others") | "Teaching yoga benefits others' health" |
| What You Can Be Paid For | User-declared factual attribute on Path ("I earn from this") | "Freelance design generates income" |

### Named Deficiency States (Opus Research Finding)

When a Path has three of four circles but is missing one:

| Missing Circle | State | Example |
|---------------|-------|---------|
| Love | Comfortable but empty | "High-paying job you don't care about" |
| Skill | Excited but uncertain | "Passion project you haven't developed skills for" |
| Need | Satisfying but useless | "Hobby that serves no one but yourself" |
| Payment | Fulfilling but unsustainable | "Meaningful volunteer work that doesn't pay" |

These states are not judgments — they're awareness prompts. Many valuable Paths have only 1–2 circles filled, and that's appropriate.

### Application in Journey Tracker
- **Data source (daily ikigai):** Step frequency patterns, voluntary return to activities
- **Data source (Path alignment):** Love/Skill inferred from behavioral patterns; Need/Paid are factual user declarations on Paths
- **Visualization:** Per-Path alignment indicator showing which circles are filled
- **Insight type:** "Your Novel Writing path shows high Love and developing Skill. It doesn't pay yet — is that intentional, or something to explore?"
- **Frequency:** Ikigai signals update continuously. Path alignment review monthly.

### Key Design Principle
Ikigai analysis must never prescribe that all four circles need filling. Many of life's most meaningful activities (family time, exercise, volunteering) intentionally lack the "Paid" circle. The system observes alignment; the user decides what matters.

---

## Framework Interaction: Triangulation

The three frameworks analyzing the same behavioral data create a composite picture. When signals align, confidence is high. When they diverge, the system surfaces the tension as an insight.

### Alignment Example
User has high Vitality Steps + consistent daily patterns + improving Milestone pace.
- **Wheel:** Vitality domain is well-attended
- **PERMA:** Strong Positive Emotion and Accomplishment signals
- **Ikigai:** Fitness Path shows high Love and Skill
- **Insight:** "Your fitness practice is thriving across all dimensions."

### Divergence Example
User has high Connections wheel spoke but Connections Step frequency is declining week over week.
- **Wheel:** Connections domain well-attended over the quarter
- **PERMA:** Relationships signal weakening (fewer recent relational Steps)
- **Ikigai:** Not applicable at this level
- **Insight:** "Connections has been a strong area overall, but activity has been quieter recently. Is quality compensating for quantity?"

### Data Flow Summary

```
User logs Step
  → Step has: activity text, Journey tag, optional Path/Milestone
    → Wheel: Step counted toward Journey domain balance
    → PERMA: Frequency, journey diversity, and path associations feed signal inference
    → Ikigai: Step frequency and Path associations contribute to alignment analysis
      → All three aggregate upward to produce composite life picture
```

---

## Implementation Priority

For the next build phase, framework implementation should follow this order:

1. **Wheel of Life (Journey balance)** — Simplest to implement. Requires only Step-count distribution across Journeys. No inference logic needed. Ship the five-spoke wheel visualization first.

2. **PERMA signals** — Requires behavioral inference logic mapping frequency, journey diversity, path associations, and milestone progression → dimensions. Can ship as a "Well-being snapshot" once Paths and Milestones exist in the data model.

3. **Ikigai alignment** — Most complex. Requires Path-level analysis against four circles, with Love and Skill inferred from behavioral patterns and Need/Paid as factual user declarations. Ship after Paths are fully implemented and used.
