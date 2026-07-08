# System Memory & Context 🧠
<!--
AGENTS: Update this file after every major milestone, structural change, or resolved bug.
DO NOT delete historical context if it is still relevant. Compress older completed items.
-->

## 🏗️ Active Phase & Goal
**Current Phase:** Phase 3 — Notifications & Polish (near launch)
**Current Task:** Warm dark glass UX polish shipped; ready for beta/launch checks
**Next Steps:**
1. Manual E2E on Vercel (push notifications + calendar auto-sync)
2. Beta with a few users / critical bugfixes
3. Optional: light DAU analytics

## 📂 Architectural Decisions
*(Log specific choices made during the build here so future agents respect them)*
- 2026-07-06 — **Google Calendar sync is in MVP** — read-only import of today's events as fixed tasks; manual fixed entry kept as fallback
- 2026-07-05 — **Manual fixed-task entry** — still supported alongside calendar import
- 2026-07-05 — **Greedy scheduling algorithm** — Simple priority-then-deadline placement into free gaps; good enough for MVP
- 2026-07-05 — **OneSignal for push notifications** — Easier than native Web Push for a first build
- 2026-07-05 — **Supabase for backend** — Postgres + Auth + Realtime + RLS in one free-tier platform
- 2026-07-06 — **User wake/sleep preferences** — scheduling window from `user_preferences` table (onboarding on first login)
- 2026-07-08 — **Pre-task push via external cron** — Hobby Vercel can't do 1-min cron; `/api/notifications/run` + cron-job.org (https + `?secret=`)
- 2026-07-08 — **Calendar auto-sync** — timezone-aware day import, cleanup of yesterday's Google tasks, refresh on open/focus (no Sync button)
- 2026-07-08 — **UX direction** — sage→cream web app layout (schedule left / task input right); quieter translucent cards; browser auto-prompts for notifications; calendar sync stays in header
- 2026-07-08 — **Manual override** — `tasks.manual_lock`; DayTimeline hour grid with free gaps; drag flexible tasks (15m snap); locked tasks treated as fixed by auto-scheduler

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
