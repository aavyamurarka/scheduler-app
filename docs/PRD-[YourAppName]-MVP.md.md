# Product Requirements Document: [AppName] MVP

## Product Overview

**App Name:** [AppName] (placeholder — name still undecided)
**Tagline:** Turns "I'll get to it later" into "it's already scheduled"
**Launch Goal:** Learn to build apps end-to-end — success is shipping a working MVP, not hitting growth numbers
**Target Launch:** Before July 15

## Who It's For

### Primary User: The Busy, Tech-Savvy Student
University students who are comfortable with AI tools day-to-day, and some of whom code or vibe-code themselves. They're not disorganized people — they just don't write down the tasks that "feel optional" because there's an assumption they'll get to it whenever there's free time.

**Their Current Pain:**
- Small tasks (groceries, replying to emails, cold messaging people) never make it into a calendar, so they have no trigger to actually do them
- These tasks *feel* optional but aren't — they quietly pile up and get missed
- Existing tools (Notion, To Do List, Google Calendar) require the user to manually decide when to do each task, which is exactly the friction point causing tasks to slip

**What They Need:**
- A place to dump every task, big or small, without deciding on a time themselves
- Automatic scheduling that fits flexible tasks around fixed commitments (classes, meetings)
- A nudge (notification) at the right moment, so the task isn't just written down but actually surfaced

### Example User Story
Meet a university student who keeps forgetting to buy groceries, follow up on emails, and send that one cold outreach message. These tasks never make it into their calendar because they assume they'll "do it later." They discover [AppName] and dump every task they have — classes and meetings get logged as fixed, everything else gets priority-ranked. The app builds their day around their fixed commitments automatically. Now those "optional-feeling" tasks are actually getting done, because they're scheduled and they get a nudge right before it's time.

## The Problem We're Solving

Task managers assume the hard part is *remembering* the task. For this audience, the hard part is *deciding when* to do it — that decision costs mental energy, and when energy is low (which is often, for students), the task gets silently deferred, again and again, until it's forgotten entirely.

**Why Existing Solutions Fall Short:**
- **Notion / To Do List:** Great at storing tasks, but the user still has to manually decide when to actually do each one — the exact friction that causes drop-off
- **Google Calendar:** Requires the user to already know when they're free and to manually block time — no automation
- **Sunsama / Motion / Reclaim.ai:** Closer to this idea (auto-scheduling), but built for professionals managing packed calendars, not tuned to the "small task I keep putting off" problem students actually have

## User Journey

### Discovery → First Use → Success

1. **Discovery Phase**
   - How they find us: word of mouth, student communities, social sharing of the build process (given the audience is AI/build-curious)
   - What catches their attention: the promise that they won't have to decide *when* to do things anymore
   - Decision trigger: recognizing their own "I'll get to it later" pattern in the pitch

2. **Onboarding (First 5 Minutes)**
   - Land on: a simple task input screen
   - First action: dump in a few fixed commitments (classes) and a few flexible tasks (groceries, emails)
   - Quick win: seeing their day auto-filled with a sensible schedule, no manual placing required

3. **Core Usage Loop**
   - Trigger: a new task pops up mid-day
   - Action: they add it and rank its priority
   - Reward: the schedule reshuffles automatically, and they get notified if other tasks need to move
   - Investment: their whole day lives in the app, making it the default place tasks go

4. **Success Moment**
   - "Aha!" moment: getting a 15-minute-before notification for something they would have completely forgotten (like a cold email)
   - Share trigger: telling a friend "it just tells me when to do things now"

## MVP Features

### Must Have for Launch

#### 1. Pre-Task Notification
- **What:** Sends a push notification 15 minutes before a scheduled task starts
- **User Story:** As a student, I want to be reminded right before a task starts, so that I don't miss it even if I forgot I scheduled it
- **Success Criteria:**
  - [ ] Notification fires reliably at T-15 minutes for every scheduled task
  - [ ] Works for both fixed and auto-scheduled flexible tasks
- **Priority:** P0 (Critical)

#### 2. Task Input & Priority Ranking
- **What:** A dump zone where users add every task (fixed or flexible) and rank flexible tasks by priority
- **User Story:** As a student, I want to quickly add all my tasks and mark what matters most, so that the app knows what to schedule first when time is tight
- **Success Criteria:**
  - [ ] User can add a task with duration, deadline, and priority in under 15 seconds
  - [ ] Fixed tasks (classes/meetings) are visually distinct from flexible ones
- **Priority:** P0 (Critical)

#### 3. Auto-Scheduling Engine
- **What:** Reads fixed commitments and available free time, then automatically places flexible tasks based on duration, urgency, deadline, and priority
- **User Story:** As a student, I want my flexible tasks placed into my day automatically, so that I never have to decide when to do them myself
- **Success Criteria:**
  - [ ] All flexible tasks get a scheduled slot before their deadline whenever possible
  - [ ] Fixed tasks are never overwritten or moved
- **Priority:** P0 (Critical)

#### 4. Mid-Day Reshuffle Notifications
- **What:** When a spontaneous task is added mid-day, the app reschedules affected tasks and notifies the user of what changed
- **User Story:** As a student, I want to be told when a new task bumps my existing plan, so that I'm never caught off guard by a schedule change
- **Success Criteria:**
  - [ ] Adding a new task triggers a rescheduling pass within seconds
  - [ ] User receives a notification listing which tasks moved and to when
- **Priority:** P0 (Critical)

### Nice to Have (If Time Allows)
- **Manual drag-and-drop override:** Let users manually adjust a task's auto-assigned slot
- **Simple daily summary notification:** A morning digest of the day's plan

### NOT in MVP (Saving for Later)
- **Gmail integration:** Will add once core scheduling is proven — auto-pulling to-dos from email
- **Slack integration:** Will add once core scheduling is proven — auto-pulling to-dos from Slack messages

*Why we're waiting: These require OAuth setup and parsing logic that would eat into the 10-day build. Core auto-scheduling needs to work well first.*

## How We'll Know It's Working

### Launch Success Metrics (First 30 Days)
| Metric | Target | Measure |
|--------|--------|---------|
| Daily Active Users | Consistent personal + friend usage | App opens per day |
| Qualitative Feedback | Positive signal from 5+ testers | Direct conversations / short survey |

### Growth Metrics (Months 2-3)
| Metric | Target | Measure |
|--------|--------|---------|
| Retention | Users still active after 2 weeks | Return visits over time |

## Look & Feel

**Design Vibe:** Simple, one strong accent color, neutral base palette, professional

**Visual Principles:**
1. Neutral backgrounds keep the interface calm — the schedule itself is the focus, not decoration
2. One accent color is used consistently for anything actionable (buttons, active task, notifications)
3. No visual clutter — every screen supports fast task entry or a clear view of the day

**Key Screens/Pages:**
1. **Task Input:** Where users dump tasks and set priority
2. **Day View:** The auto-generated schedule for today
3. **Notifications/Changes View:** Shows what got rescheduled and why

### Simple Wireframe
```
[Day View]
┌─────────────────────────┐
│   [AppName] — Today     │
├─────────────────────────┤
│ 9:00  Class (fixed)     │
│ 11:00 Gym (auto)        │
│ 1:00  Email follow-up   │
│ 3:00  Groceries         │
├─────────────────────────┤
│      [+ Add Task]       │
└─────────────────────────┘
```

## Technical Considerations

**Platform:** Web (mobile later)
**Responsive:** Yes, mobile-first
**Performance:** Page load < 3 seconds; scheduling recalculation should feel instant (< 1 second)
**Accessibility:** WCAG 2.1 AA minimum
**Security/Privacy:** Row-Level Security (RLS) enabled if using Supabase; prefer storing sensitive data locally where feasible rather than in the cloud
**Scalability:** Architecture should not block scaling later if v1 proves out — avoid decisions that would require a full rebuild

## Quality Standards

**What This App Will NOT Accept:**
- Placeholder content in production ("Lorem ipsum", sample images)
- Broken features — everything listed works or isn't included
- Skipping mobile testing before launch
- Ignoring accessibility basics
- Any known security gap around task/calendar data (this app handles personal schedules — treat it seriously)

*These standards will be enforced by the AI coding assistant.*

## Budget & Constraints

**Development Budget:** Free — using free tiers only for v1
**Monthly Operating:** $0 target for v1
**Timeline:** Launch before July 15
**Team:** Solo
**Tooling:** Cursor (or another free AI coding assistant without restrictive limits)

## Open Questions & Assumptions
- Which calendar source(s) will v1 read from — Google Calendar only, or manual fixed-task entry without external calendar sync?
- App name still to be decided
- Assumption: students are willing to do upfront task entry if the payoff (not having to decide *when*) is clear within the first use

## Launch Strategy (Brief)

**Soft Launch:** Personal use first, then a small group of student friends
**Target Users:** 5-10 initial testers
**Feedback Plan:** Direct conversations and a short feedback prompt in-app
**Iteration Cycle:** Adjust scheduling logic and UI based on real usage weekly

## Definition of Done for MVP

The MVP is ready to launch when:
- [ ] All P0 features are functional
- [ ] Basic error handling works
- [ ] It works on mobile and desktop
- [ ] One complete user journey works end-to-end (add tasks → auto-scheduled → notified → reshuffled on new task)
- [ ] Basic analytics are tracking (DAU at minimum)
- [ ] Friends/family test is complete
- [ ] Deployment is automated
- [ ] Security basics confirmed (RLS enabled if Supabase used, no exposed sensitive data)

## Next Steps

After this PRD is approved:
1. Create Technical Design Document (Part 3)
2. Set up development environment
3. Build MVP with AI assistance
4. Test with 5-10 beta users
5. Launch!

---
*Document created: July 5, 2026*
*Status: Draft — Ready for Technical Design*
