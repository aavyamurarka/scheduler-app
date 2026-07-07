# Product Requirements

## Product Overview

**App Name:** Scheduler (working name — TBD)
**Tagline:** Turns "I'll get to it later" into "it's already scheduled"
**Launch Goal:** Learn to build apps end-to-end — success is shipping a working MVP, not hitting growth numbers
**Target Launch:** Before July 15, 2026

## Primary User Story

Meet a university student who keeps forgetting to buy groceries, follow up on emails, and send that one cold outreach message. These tasks never make it into their calendar because they assume they'll "do it later." They discover Scheduler and dump every task they have — classes and meetings get logged as fixed, everything else gets priority-ranked. The app builds their day around their fixed commitments automatically. Now those "optional-feeling" tasks are actually getting done, because they're scheduled and they get a nudge right before it's time.

## Target User

**Primary User:** The Busy, Tech-Savvy Student

University students comfortable with AI tools, some of whom code or vibe-code. Not disorganized — they just don't write down tasks that "feel optional" because they assume they'll get to them whenever there's free time.

**Pain Points:**
- Small tasks (groceries, emails, cold messaging) never make it into a calendar
- Tasks feel optional but aren't — they pile up and get missed
- Existing tools require manually deciding when to do each task (the exact friction causing drop-off)

**Needs:**
- Dump every task without deciding on a time
- Automatic scheduling around fixed commitments
- A nudge at the right moment so tasks are surfaced, not just stored

## MVP Features — Must Have (P0)

### 1. Pre-Task Notification
- **What:** Push notification 15 minutes before a scheduled task starts
- **User Story:** As a student, I want to be reminded right before a task starts, so that I don't miss it even if I forgot I scheduled it
- **Success Criteria:**
  - Notification fires reliably at T-15 minutes for every scheduled task
  - Works for both fixed and auto-scheduled flexible tasks

### 2. Task Input & Priority Ranking
- **What:** Dump zone for all tasks (fixed or flexible) with priority ranking for flexible tasks
- **User Story:** As a student, I want to quickly add all my tasks and mark what matters most, so that the app knows what to schedule first when time is tight
- **Success Criteria:**
  - User can add a task with duration, deadline, and priority in under 15 seconds
  - Fixed tasks (classes/meetings) are visually distinct from flexible ones

### 3. Auto-Scheduling Engine
- **What:** Reads fixed commitments and free time, auto-places flexible tasks by duration, urgency, deadline, and priority
- **User Story:** As a student, I want my flexible tasks placed into my day automatically, so that I never have to decide when to do them myself
- **Success Criteria:**
  - All flexible tasks get a scheduled slot before their deadline whenever possible
  - Fixed tasks are never overwritten or moved

### 4. Mid-Day Reshuffle Notifications
- **What:** When a spontaneous task is added mid-day, reschedules affected tasks and notifies the user of changes
- **User Story:** As a student, I want to be told when a new task bumps my existing plan, so that I'm never caught off guard by a schedule change
- **Success Criteria:**
  - Adding a new task triggers a rescheduling pass within seconds
  - User receives a notification listing which tasks moved and to when

## Nice to Have (If Time Allows)
- **Manual drag-and-drop override:** Let users manually adjust a task's auto-assigned slot
- **Simple daily summary notification:** A morning digest of the day's plan

## NOT in MVP (Saving for Later)
- **Gmail integration:** Auto-pulling to-dos from email — deferred until core scheduling is proven
- **Slack integration:** Auto-pulling to-dos from Slack — deferred until core scheduling is proven

## In MVP — Google Calendar Sync
- **What:** Connect Google account, read today's calendar events, import as fixed tasks (blocked time for scheduler)
- **Scope:** Read-only for MVP (no writing events back to Google Calendar)
- **Fallback:** Manual fixed-task entry still works if user skips calendar connect

## Success Metrics

### Launch (First 30 Days)
| Metric | Target | Measure |
|--------|--------|---------|
| Daily Active Users | Consistent personal + friend usage | App opens per day |
| Qualitative Feedback | Positive signal from 5+ testers | Direct conversations / short survey |

### Growth (Months 2–3)
| Metric | Target | Measure |
|--------|--------|---------|
| Retention | Users still active after 2 weeks | Return visits over time |

## UI/UX Requirements

**Design Vibe:** Simple, one strong accent color, neutral base palette, professional

**Visual Principles:**
1. Neutral backgrounds — the schedule is the focus, not decoration
2. One accent color for anything actionable (buttons, active task, notifications)
3. No visual clutter — every screen supports fast task entry or a clear day view

**Key Screens:**
1. **Task Input** — dump tasks and set priority
2. **Day View** — auto-generated schedule for today
3. **Notifications/Changes View** — what got rescheduled and why

## Technical & Quality Requirements

- **Platform:** Web (mobile later), mobile-first responsive
- **Performance:** Page load < 3 seconds; scheduling recalculation < 1 second
- **Accessibility:** WCAG 2.1 AA minimum
- **Security:** Row-Level Security on Supabase; no exposed sensitive data
- **Budget:** $0/month operating cost
- **Timeline:** Launch before July 15
- **Team:** Solo builder with Cursor AI assistance

## Definition of Done

- [ ] All P0 features functional
- [ ] Basic error handling works
- [ ] Works on mobile and desktop
- [ ] End-to-end journey: add tasks → auto-scheduled → notified → reshuffled on new task
- [ ] Basic analytics tracking (DAU minimum)
- [ ] 5 beta testers have used it
- [ ] Deployed to Vercel
- [ ] RLS confirmed working
