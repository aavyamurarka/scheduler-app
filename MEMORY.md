# System Memory & Context 🧠
<!--
AGENTS: Update this file after every major milestone, structural change, or resolved bug.
DO NOT delete historical context if it is still relevant. Compress older completed items.
-->

## 🏗️ Active Phase & Goal
**Current Phase:** Phase 2 — Core Features
**Current Task:** Onboarding complete — ready for Step 2.5 (real-time reshuffle)
**Next Steps:**
1. Implement `lib/scheduler.ts` greedy algorithm
2. Add priority and deadline fields to task input
3. Build day view with scheduled time slots

## 📂 Architectural Decisions
*(Log specific choices made during the build here so future agents respect them)*
- 2026-07-06 — **Google Calendar sync is in MVP** — read-only import of today's events as fixed tasks; manual fixed entry kept as fallback
- 2026-07-05 — **Manual fixed-task entry** — still supported alongside calendar import
- 2026-07-05 — **Greedy scheduling algorithm** — Simple priority-then-deadline placement into free gaps; good enough for MVP
- 2026-07-05 — **OneSignal for push notifications** — Easier than native Web Push for a first build
- 2026-07-05 — **Supabase for backend** — Postgres + Auth + Realtime + RLS in one free-tier platform
- 2026-07-06 — **User wake/sleep preferences** — scheduling window from `user_preferences` table (onboarding on first login)

## 🐛 Known Issues & Quirks
*(Log current bugs or weird workarounds here)*
- App name still TBD — using "Scheduler" as working name
- `create-next-app` cannot run in non-empty dirs — scaffolded via temp dir and copied in

## 📜 Completed Phases
- [x] Part 1: Research
- [x] Part 2: PRD
- [x] Part 3: Technical Design
- [x] Part 4: Agent configuration (AGENTS.md, agent_docs/, Cursor rules)
- [x] Initial scaffold (Next.js 16 + TypeScript + Tailwind + Supabase packages)
- [x] Database schema migration file + Supabase client libs
- [x] Auth integration (login, signup, middleware, callback)
- [x] Basic task input UI (TaskInput, TaskList, server actions)
