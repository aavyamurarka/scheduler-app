# Deep Research Prompt: Smart Scheduler App for University Students

## Context

I'm a non-technical founder (vibe-coder) building a web app that helps university students auto-schedule their day. Users input mandatory tasks (classes, meetings) and flexible tasks (gym, groceries, emails). The app classifies tasks by duration, urgency, and deadline, reads the user's calendar, and automatically slots the flexible tasks into open time. The core insight: students don't forget tasks — they forget to decide *when* to do them, and that decision friction is what causes tasks to slip through. I need beginner-friendly research with actionable insights, and I'm aiming to ship an MVP in 10 days using free tools.

## Instructions

### Key Questions to Answer:
1. What similar apps exist (Sunsama, Reclaim.ai, Motion, Google Calendar, Notion, To Do List, Google Gemini's scheduling features) and what features/algorithms do they use for auto-scheduling?
2. What do students specifically love/hate about existing task and calendar tools? (Look for Reddit, forums, App Store/Play Store reviews)
3. What's the simplest technical approach to auto-schedule tasks based on duration, urgency, and deadline against an existing calendar? (e.g., simple heuristic/greedy algorithm vs. constraint solving)
4. What free/low-code tools and APIs (Google Calendar API, Cursor, Claude API, Supabase, Vercel) are best suited for building this as a web app in 10 days?
5. How do similar apps monetize, and what could a student realistically charge (or should this stay free/freemium)?
6. What AI tools or APIs could accelerate development or add a differentiating "smart" layer (e.g., using an LLM to interpret vague task inputs like "buy groceries" into a scheduled time slot)?
7. What are common pitfalls when building calendar-integration features, especially around Google Calendar API auth and free-tier limits?

### Research Focus:
- Simple, actionable insights with examples
- Current tool recommendations (prioritize free tiers and newest/best options)
- Step-by-step implementation guidance for a 10-day build
- Cost estimates with free/paid options clearly separated
- Examples of similar successful projects or launches (especially student-built or indie-hacker scheduling tools)

### Required Deliverables:
1. **Competitor Table** — Features, pricing, auto-scheduling approach, user count/reviews for Sunsama, Reclaim.ai, Motion, Notion, To Do List, Google Calendar/Gemini
2. **Tech Stack** — Recommended free/beginner-friendly tools for a web app with calendar integration
3. **MVP Features** — Confirm must-have vs. nice-to-have (validate: reminders, task input, calendar read/write vs. Slack/Notion/Gmail integrations)
4. **Scheduling Logic Guide** — Plain-English explanation of how to actually classify and auto-place tasks (duration/urgency/deadline logic), with simplest viable approach for a 10-day build
5. **Development Roadmap** — Day-by-day plan for a 10-day build with AI-assistance strategy (e.g., using Claude/Cursor for code generation)
6. **Budget Breakdown** — Free tier limits for calendar API, hosting, database, and where costs would first appear if the app scales

## Output Format
- Explain everything in plain English with examples
- **Include source URLs with access dates** for each major recommendation
- Use tables for comparisons
- Highlight any conflicting information between sources
- Flag anything that seems too complex for a 10-day free-tools build, and suggest a simpler alternative

---

## Project Snapshot (for reference / continuity)

- **Project:** Smart scheduler web app for university students
- **Problem Solved:** Decision friction around *when* to do flexible tasks, not forgetting them
- **Key Features (MVP):** Reminders 15 min before a task, task input section, calendar read + auto-scheduling. (Slack/Notion/Gmail integrations deferred to post-MVP)
- **Platform:** Web app (mobile later)
- **Timeline:** 10 days
- **Budget:** Free tools preferred
