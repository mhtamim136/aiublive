# AIUB Live

> The campus identity & connection platform — built independently for AIUB students.

A premium, modern web platform where AIUB students create a campus profile, find batchmates, study partners, project teammates, and mentors. Independent of the AIUB portal — no scraping, no shared passwords.

---

## Why this exists

The AIUB campus is bigger than it feels. There are thousands of students you'd vibe with — but no calm, focused product to find them. AIUB Live is exactly that: a small, sharp tool for the few connection problems students *actually* struggle with, without turning into another social-media noise machine.

## Product principles

- **AIUB-first, not generic.** Every screen is shaped around how AIUB students think (departments, semesters, course codes).
- **Calm over noisy.** No infinite feed, no like-counting, no public posts. Daily picks, not endless scroll.
- **Smart, not spammy.** Match score uses shared courses → skills → interests → department weighting.
- **Privacy-first.** Student IDs are masked publicly. The product never touches the AIUB portal.
- **Identity beyond grades.** Skills, projects, achievements, and a one-line "vibe" — not GPA gossip.

## Features included

| Feature | What it solves |
|---|---|
| Multi-step onboarding | Becomes a profile in ~2 minutes — no portal password ever |
| Smart Discover | Search & filter by department, level, course, skill, mentor mode |
| Daily smart picks | 3 thoughtfully ranked matches each day on the dashboard |
| Coursemate finder | Pick a course you're taking → see classmates instantly |
| Project teams marketplace | Post a project, list skills/roles needed, get teammates |
| Mentor mode | Seniors can flag themselves as available to mentor juniors |
| Connections + focused DMs | DMs unlock only after a mutual connection |
| Campus pulse | A calm, once-a-day snapshot — no algorithmic feed |
| Privacy & data controls | Full reset; everything lives in your device |

## Features deliberately excluded

- Public algorithmic feed, likes counter, stories
- Random DMs (only post-connection)
- Heavy gamification, point-grinding
- Anything touching the AIUB portal — credentials, scraping, integrations

---

## Tech stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS with custom design tokens (light + dark)
- **Animations:** Framer Motion
- **State:** Zustand with `persist` (client-side only — your data lives in localStorage)
- **Icons:** Lucide
- **Fonts:** Inter (body), Plus Jakarta Sans (display), JetBrains Mono (mono)
- **Avatars:** DiceBear "notionists" deterministic SVGs

> This is a fully client-rendered demo with mock data. There is no backend, no telemetry, and no external auth. Everything is replaceable when you wire a real backend.

## Project structure

```
src/
  app/
    (app)/                  Authenticated app shell (sidebar + topbar)
      dashboard/page.tsx
      discover/page.tsx
      coursemates/page.tsx
      projects/page.tsx
      connections/page.tsx
      messages/page.tsx
      profile/me/page.tsx
      profile/[id]/page.tsx
      settings/page.tsx
      layout.tsx
    onboarding/page.tsx     Multi-step onboarding flow
    page.tsx                Marketing landing page
    layout.tsx              Root layout (theme + toasts)
    globals.css             Design tokens, aurora background
  components/
    ui/                     Reusable primitives (Button, Card, Input, Badge,
                            Avatar, ChipInput, Modal, Tabs, Toast, etc.)
    marketing/              Hero, Features, CTA, FAQ, Footer
    onboarding/             Multi-step shell
    app/                    Sidebar, Topbar, AuthGate, StudentCard,
                            ProfileView, ProfileEditor, PageHeader
  lib/
    types.ts                Domain types
    catalog.ts              Departments, courses, skill/interest suggestions
    mock-data.ts            12 curated student personas + 4 project posts
    match.ts                Match scoring + reasons logic
    store.ts                Zustand store with persistence
    utils.ts                cn(), avatarUrl(), formatRelativeTime(), initials()
public/
  favicon.svg
```

### Architecture notes

- **Reusable primitives.** Every UI piece (Button, Card, Input, Badge, etc.) lives in `components/ui/` and is consumed everywhere — no copy-pasted styles.
- **Single source of truth.** `lib/store.ts` is the only place that mutates state. Pages just compose components and read selectors.
- **Match scoring** is a pure function in `lib/match.ts` — easy to swap for an API call later.
- **Auth gate** is a thin wrapper that redirects to onboarding if no profile exists; replace with real auth later by changing one component.

---

## Run it locally

Requirements: Node 18+ and npm.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

### What to try

1. Click **Create profile** on the landing page.
2. Walk through the 6-step onboarding (try `22-12345-1` as your student ID — only the format is verified, never stored unmasked).
3. You'll land on the dashboard with smart picks and your courses.
4. Visit **Discover** to filter, **Coursemates** to find classmates, **Projects** to post or join a team.
5. Toggle dark mode in the topbar.

### Useful commands

```bash
npm run dev     # Start dev server on http://localhost:3000
npm run build   # Production build
npm run start   # Run the production build
npm run lint    # Lint the project
```

### Reset your demo data

Open the **Settings** page → "Reset profile". Or in DevTools console:

```js
localStorage.removeItem("aiub-live-store-v1");
location.reload();
```

---

## What this is *not*

- It is **not** affiliated with, endorsed by, or operated by American International University-Bangladesh.
- It does **not** integrate with, scrape, or impersonate any AIUB system.
- It does **not** request, store, or transmit any AIUB portal credentials.

The student ID field collects the **format only** (`XX-XXXXX-X`) for community verification, and only the masked form (`XX-XXXXX-X`) is shown publicly.

---

## What to wire next (for a real launch)

1. **Auth.** Add Clerk / Supabase / your IdP. The `AuthGate` component is the only swap point.
2. **Backend.** Replace `lib/mock-data.ts` with a Postgres + Prisma layer. Domain types in `lib/types.ts` are already production-shaped.
3. **Real student verification.** AIUB-issued email allow-list (`@student.aiub.edu`) + magic link is the minimum viable bar.
4. **Search.** Move filtering server-side and add full-text search (Postgres tsvector / Meilisearch) once the dataset grows.
5. **Notifications.** Web push + a once-a-day email digest (matches the "calm" product principle).
6. **Moderation.** Lightweight report flow, profile cooldowns, anti-spam on connection requests.

Built with care for AIUB students.
