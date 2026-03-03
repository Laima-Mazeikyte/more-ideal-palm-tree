# Product Brief: To do list

---

## Overview

A mobile-first progressive web app that tracks incremental daily progress across all life domains as a personal journey tracker rather than a productivity tool. The app surfaces how seemingly insignificant daily efforts accumulate into meaningful progress over time by mapping personal activity against established life frameworks (Wheel of Life, PERMA, Ikigai) without requiring users to think explicitly in those terms. This creates a living record of personal journeys that transforms task completion into visible life balance and fulfillment metrics.

## Vision

Build a system that captures the full breadth of life activity in one place and reveals how incremental effort accumulates into something meaningful across days, weeks, months, and years. Replace the chronic sense of underaccomplishment with a structure that makes progress visible, creating an anxiety-free experience of forward motion where every contribution-from writing a book chapter to paying an insurance bill-connects to a fulfilling, intentional life.

## Problem Statement

**What problem does this solve?**
Individuals managing multiple concurrent life domains experience a fragmented, overwhelming daily experience with no single system to capture their full breadth of activity. Current tools are optimized for task completion rather than surfacing the meaning and accumulation of effort across a whole life. This creates a chronic sense of underaccomplishment-not from doing too little, but from having no structure that makes the accumulation visible.

**Why is it important to solve now?**
Every day feels like a fresh slate of failure rather than a continuation of a larger, ongoing journey. Existing tools (project managers like Plane, informal lists like Apple Notes) fail to connect daily activity to broader life balance or personal fulfillment, providing no sense of journey or forward motion.

**What is the impact of NOT solving it?**
Continued fragmentation of life activity, persistent feelings of underaccomplishment despite significant effort, and no way to understand how daily work connects to meaningful life progress or purpose alignment. The inability to see patterns across time horizons prevents learning from lived experience and maintaining perspective on what actually constitutes a fulfilling life.

## Goals

### Business Goals

Create a mobile-first PWA that serves as a differentiated personal journey tracking platform distinct from existing productivity tools and project managers. Position the product as a reflection and fulfillment tool rather than a task management system, creating a new category that maps personal activity to established psychological frameworks for life balance and purpose.

KPIs to be defined after discovery and benchmarking.

### Customer Goals

**User Problem:** Users managing complex, multi-domain lives lack visibility into how their daily efforts accumulate over time, leading to chronic feelings of underaccomplishment despite substantial work across professional, creative, personal, and logistical domains.

**User Value:** Users gain an anxiety-free system that makes forward motion visible across multiple time horizons (day, week, month, year), surfaces meaning from daily activity by connecting it to life balance and purpose frameworks, and creates a sense of journey and accumulation rather than perpetual incompletion.

**User Problem:** Current productivity tools are prescriptive, generic, and optimized for task completion rather than personal meaning, creating shame from incomplete work and failing to reflect the actual texture of individual lives.

**User Value:** Users receive a non-prescriptive system that adapts to their personal contexts (Paths), acknowledges the full spectrum of life work (including unglamorous necessities), and provides perspective through anonymous journey comparisons that inspire rather than create competition.

Success criteria will be defined through user research and discovery activities.

## Target Personas

**Primary Persona:** Multi-domain high achievers managing simultaneous professional, creative, personal, and logistical responsibilities who experience fragmentation and struggle to maintain perspective on their progress despite high output.

This persona is inferred from the issue author's self-description: managing three businesses, a creative writing career, freelance work, active education, physical health, home ownership, and full social and family life. The feature matters to this persona because they need a unified system to surface meaning and accumulation from their diverse activities rather than experiencing each domain as a separate source of overwhelm.

## Initiative

Build a mobile-first progressive web app with a four-tier data model (Journey -> Path -> Milestone -> Step) that captures atomic units of work and aggregates them upward to reveal patterns in life balance (Wheel of Life), emotional fulfillment (PERMA), and purpose alignment (Ikigai). The initiative creates a journey tracking experience rather than a task management system, emphasizing emotional tone of forward motion, visibility across time horizons, and personal meaning derived from data.

## Assumptions

- Users will find value in mapping their personal activity against established life frameworks (Wheel of Life, PERMA, Ikigai) even if they're not explicitly familiar with those models
- The anxiety-free, non-judgmental emotional tone can be achieved through interaction design and will meaningfully differentiate the experience from existing productivity tools
- Users will invest effort in creating and maintaining personal Paths that reflect their individual life contexts
- Velocity metrics (time-to-completion per Step) will provide meaningful insight into personal patterns and life balance when aggregated
- Anonymous social comparison of journeys will be inspiring rather than anxiety-inducing or competitive
- A four-tier data model (Journey/Path/Milestone/Step) provides sufficient flexibility without overwhelming users with organizational complexity
- Mobile-first PWA is the appropriate platform choice for capturing daily life activity
- Multi-user architecture from day one is necessary even though current need is single-user

Risk levels to be assessed during technical and design discovery.

### Evolved Constraints (Post-Discovery)

- Quality tags, satisfaction ratings, and all self-assessment mechanics have been excluded. Framework signals are derived entirely from behavioral data.
- The Today view is a dedicated "accumulation hemisphere" with no performance metrics, comparisons, or retrospective data. Framework visualizations live in separate Journey views.
- Entering text is the heaviest user interaction. Step tiles are weightless.

## Constraints

**Technical Constraints:**
- Must be built as a mobile-first progressive web app
- Backend must use Supabase for authentication and infrastructure
- Must support multiple users from initial architecture

**User Constraints:**
- Single user (issue author) as initial audience
- User is currently managing workflow across two separate tools (Plane for project work, Apple Notes for daily tasks)

**Timeline Constraints:**
- Stated as "Nice to have - no rush"

**Resource Constraints:**
To be determined - requires resource allocation and prioritization discussion.

## Scope

### In Scope

- Mobile-first progressive web app interface
- Four-tier data model: Journey, Path, Milestone, Step
- Five default Journeys: Vitality, Pursuits, Prosperity, Connections, Foundations
- User-customizable Journeys and user-defined Paths
- Step creation with required Journey association and optional Path/Milestone tagging
- Velocity tracking (time-to-completion per Step)
- Progress visualization across multiple time horizons (day, week, month, year)
- Aggregation of Step completions mapped to Wheel of Life balance
- Mapping to PERMA outcomes (emotional fulfillment)
- Mapping to Ikigai alignment (purpose)
- Anonymous social journey comparison functionality
- Supabase authentication and backend infrastructure
- Multi-user architecture

### Out of Scope

- Native mobile applications (iOS/Android)
- Desktop-first or desktop-optimized experience
- Integration with existing tools (Plane, Apple Notes)
- Prescriptive life templates or guided onboarding flows
- Competitive features (leaderboards, streaks, gamification)
- Team or collaborative journey tracking
- AI-powered suggestions or automation
- Calendar integration
- Notification systems (to be evaluated in discovery)
- Data export/import capabilities (to be evaluated in discovery)

## Open Questions

1. How do users currently conceptualize their "Journeys" and "Paths"? Will the four-tier model map to their mental models, or does it require significant cognitive adjustment?

2. What is the optimal granularity for a "Step"? How do users naturally break down their work, and at what level does tracking become burdensome rather than valuable?

3. What does "anxiety-free" interaction design look like in practice? What specific UI/UX patterns create forward motion versus shame or overwhelm?

4. How should incomplete or abandoned Steps be handled to maintain the emotional tone of continuous journey rather than failure?

5. What time horizons are most valuable for progress visualization? Is day/week/month/year the right set, or are other periods (quarter, season, project duration) more meaningful?

6. How should velocity be calculated and displayed to be meaningful rather than punitive? What happens when velocity slows due to Step complexity rather than user behavior?

7. What does meaningful anonymous social comparison look like? What data points should be shared, and how should they be visualized to inspire without creating anxiety?

8. How do Wheel of Life, PERMA, and Ikigai frameworks translate into actual UI? How much of the framework should be exposed versus implicit?

9. What is the minimum viable onboarding experience that allows users to start tracking without requiring extensive setup of Journeys, Paths, and Milestones?

10. What data persistence and sync requirements exist for a mobile-first PWA? What offline capabilities are essential?

11. How should the app handle the transition from single-user (current need) to multi-user (architectural requirement)? What features are user-specific versus shareable?

12. What existing productivity, habit tracking, or life logging apps serve as useful comparison points or anti-patterns?

13. What are the technical limitations of Supabase for this use case, particularly around real-time data aggregation and complex querying for analytics?

14. How should the "full texture of life" be captured? What metadata beyond Journey/Path/Milestone is needed to make Steps feel personally meaningful?

15. What triggers users to reflect on accumulated progress? Should reflection be passive (dashboard) or active (prompted review)?

## Recommended Next Steps

### Research

1. Conduct initial user interview with issue author to understand current workflow, pain points with existing tools (Plane, Apple Notes), and mental models for organizing life activity
2. Execute comparative analysis of existing life tracking, habit tracking, and holistic productivity apps to identify patterns, anti-patterns, and white space
3. Research Wheel of Life, PERMA, and Ikigai frameworks to understand how they're typically applied and what translation to digital experience looks like
4. Investigate anonymous social comparison patterns in existing apps to understand what creates inspiration versus competition or anxiety
5. Survey or interview additional potential users who manage multi-domain lives to validate problem space beyond single user
6. Analyze issue author's actual Step data if willing to share sample activity to understand natural granularity and categorization patterns

### Design

1. Create concept sketches exploring "anxiety-free" interaction patterns and emotional tone through visual design, copy, and interaction flows
2. Prototype the four-tier data model (Journey/Path/Milestone/Step) as a low-fidelity interface to test comprehensibility and mental model alignment
3. Design wireframes for Step creation flow to understand optimal input experience for mobile-first context
4. Explore visualization approaches for progress across multiple time horizons (day/week/month/year views)
5. Develop design concepts for how Wheel of Life, PERMA, and Ikigai frameworks surface in the interface without requiring explicit user knowledge
6. Create mobile-first interaction patterns for managing Journeys, Paths, and Milestones without overwhelming users
7. Design concept for anonymous social journey comparison that emphasizes perspective and inspiration

### Technical

1. Execute Supabase feasibility spike to validate authentication, data modeling, and real-time querying capabilities for the four-tier structure
2. Prototype PWA capabilities assessment focusing on offline functionality, data sync, and mobile-first performance requirements
3. Design database schema for Journey/Path/Milestone/Step model including velocity tracking and aggregation requirements
4. Investigate technical approaches for calculating and storing derived metrics (Wheel of Life balance, PERMA outcomes, Ikigai alignment)
5. Assess multi-user architecture requirements and isolation patterns for Supabase implementation
6. Prototype anonymous social comparison feature to understand data anonymization and aggregation patterns
7. Evaluate PWA installation and home screen presence on iOS and Android to understand platform-specific constraints
