@AGENTS.md

# Family Events Coordination App

## Overview
A web app for coordinating family events. Invite-only — Dan specifies who can participate. Members can collaborate around events, discuss locations and dates, RSVP, and share photos.

## Status
**Phase 6 — Complete.** All phases done. Docker + Cloudflare Tunnel deployment ready. See `DEPLOY.md` for instructions. Dev server runs on `http://localhost:3000`.

### Admin credentials (local dev)
- Email: `dan@family-events.local`
- Password: `admin123`
- First invite code: `ZemALXKq1G` (link: `/join/ZemALXKq1G`)

## Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** SQLite via `better-sqlite3` + Drizzle ORM
- **Auth:** bcrypt + iron-session (cookie-based, invite-only)
- **Styling:** Tailwind CSS v4 (no component library)
- **Font:** Nunito (via next/font/google) for headings, system fonts for body
- **Photo storage:** Local filesystem (`./uploads/photos/{eventId}/`)
- **Thumbnails:** sharp (400px-wide WebP, generated at upload time)
- **Email:** Nodemailer + Gmail SMTP (invite emails, optional — works without credentials)
- **Deployment:** Docker + Cloudflare Tunnel (standalone Next.js output)
- **IDs:** nanoid (URL-safe, non-sequential)

## Key Commands
- `npm run dev` — start dev server
- `npm run seed` — create admin user and first invite code
- `npm run build` — production build (standalone output)
- `npm run lint` — run ESLint
- `docker compose up -d` — run in production with Docker
- `docker compose build` — rebuild Docker image

## Data Model

### Tables
- **users** — id, email, display_name, password_hash, role (admin/member), avatar_url, created_at
- **invites** — id, code, email (optional lock), created_by, used_by, used_at, expires_at, created_at
- **events** — id, title, description, location, start_date, end_date, start_time, end_time, created_by, created_at, updated_at
- **event_responses** — id, event_id, user_id, status (going/maybe/not_going), created_at; UNIQUE(event_id, user_id)
- **comments** — id, event_id, user_id, body, created_at
- **photos** — id, event_id, uploaded_by, filename, original_name, mime_type, size_bytes, caption, created_at

## Project Structure
```
family-events/
  src/
    app/
      layout.tsx              — root layout: Nunito font, NavBar, auth check
      page.tsx                — home/dashboard with calendar
      globals.css             — Tailwind v4 + warm minimalism theme
      login/page.tsx          — login form
      join/[code]/page.tsx    — invite acceptance / registration
      admin/page.tsx          — manage members + invites (tabbed)
      api/
        auth/login/route.ts   — POST login
        auth/logout/route.ts  — POST logout
        auth/register/route.ts — POST register with invite code
        invites/route.ts      — GET list, POST create + email (admin only)
        invites/[id]/route.ts — DELETE revoke unused invite
        users/route.ts        — GET list all users (admin only)
        users/[id]/route.ts   — PATCH role/password, DELETE remove (admin only)
        events/[id]/photos/route.ts — GET list, POST upload (FormData)
        photos/[id]/route.ts  — GET serve original, DELETE remove
        photos/[id]/thumb/route.ts — GET serve WebP thumbnail
    lib/
      db.ts                   — SQLite connection + initDb()
      schema.ts               — Drizzle table definitions
      auth.ts                 — iron-session helpers (getSession, getCurrentUser, requireAuth, requireAdmin)
      email.ts                — Nodemailer Gmail transport + sendInviteEmail()
    components/
      NavBar.tsx              — sticky top nav with sign out
      Calendar.tsx            — month-grid calendar with event dots and day selection
      RsvpButton.tsx          — going/maybe/can't make it toggle pills
      PhotoGallery.tsx        — photo grid, upload form, lightbox viewer
      ToastProvider.tsx       — global toast context, useToast hook, renderer
  scripts/
    seed.ts                   — creates admin user + first invite
  data/                       — SQLite database (gitignored)
  uploads/photos/             — photo storage (gitignored)
  Dockerfile                  — multi-stage production build
  docker-compose.yml          — app service with persistent volumes
  docker-compose.override.yml — Cloudflare Tunnel sidecar (commented)
  docker-entrypoint.sh        — auto-seeds DB on first run
  DEPLOY.md                   — deployment guide
```

## UI Design — "Warm Minimalism"
- Warm off-white backgrounds (#FFFBF5), not clinical white
- Coral (#F97066) as primary accent — cheerful, friendly
- Sage green (#6EE7B7) for "going", lavender (#C4B5FD) for "maybe", warm gray for "can't make it"
- Sky blue (#38BDF8) for calendar/info accents, amber (#FBBF24) for highlights
- Warm near-black text (#1C1917), warm gray secondary text (#78716C)
- Rounded cards (border-radius: 12px), generous whitespace, subtle shadows
- Heading font: Nunito (loaded via next/font/google)
- Body: system font stack
- Mobile-first responsive grids
- Three clicks max to any action: Calendar -> Date -> Event detail

## Build Phases
1. ~~**Project setup + Auth**~~ — DONE
2. ~~**Events + Calendar**~~ — DONE
3. ~~**Comments**~~ — DONE
4. ~~**Photo uploads**~~ — DONE
5. ~~**Admin panel + polish**~~ — DONE
6. ~~**Deployment**~~ — DONE

## Email Setup (optional)

Invite emails are sent via Gmail SMTP. To enable, add to `.env.local`:
```
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```
Get an App Password: Google Account > Security > 2-Step Verification > App passwords.
Without these vars, invites still work — you just share the link manually.

## Next.js 16 Notes
- `params` in route handlers is a `Promise` — must be awaited: `const { id } = await params`
- Tailwind v4 uses `@import "tailwindcss"` and `@theme inline` blocks
- Google Fonts loaded via `next/font/google`, not CSS @import (ordering issues with Tailwind)

## Workflow Notes
- New variants should be saved as separate files — preserve originals unless explicitly asked to modify
- All phases should be built incrementally with working state at each step
