# RSVP App

A universal **Event + Contact + Guest + Invitation + RSVP** engine, demonstrated through a wedding.

This is Build #1 (Slice A) of the Event Platform blueprint: one organiser creates an event, builds a mobile-web invitation, imports a guest list, shares personalised links, and watches RSVPs land on a dashboard. A guest opens a personal link, views the invitation, and RSVPs.

## Stack

- Next.js (App Router) + TypeScript, Tailwind CSS
- Prisma + PostgreSQL
- Auth.js v5 (credentials, bcrypt, JWT sessions)
- Vitest (unit/integration) + Playwright (e2e)
- papaparse + zod

## Architecture

- **Monolith with a service layer.** Server Actions validate with zod, then call `lib/services/*`. All business logic lives in services; ownership (`event.workspace.ownerId === session.user.id`) is enforced there, not only in the UI.
- **Universal guest engine.** One `Contact` (workspace-level CRM) + one `EventGuest` (event participation). No per-vertical guest tables — vertical data rides in `customFields` / `eventCustomFields`. The investor vertical is proven to need zero schema change by a test.
- **Personalised links.** `Event.slug` + `EventGuest.guestToken` → `/e/<slug>/<token>`. Invitation content is shared; person-specific values are overlaid at render.
- **Public invitation** is server-rendered (fast mobile links, OG previews).

## Getting started

Prerequisites: Node 20+, PostgreSQL running locally.

```bash
npm install
```

Copy `.env.example` to `.env` and fill in your database credentials:

```
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/rsvp_app_dev?schema=public"
TEST_DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/rsvp_app_test?schema=public"
AUTH_SECRET="..."   # npx auth secret
```

Create the databases and migrate:

```bash
createdb rsvp_app_dev
createdb rsvp_app_test
npx prisma migrate dev
```

Seed a demo wedding (login `demo@example.com` / `demo1234`, event slug `rahul-neha-wedding`):

```bash
npm run db:seed
```

Run the app:

```bash
npm run dev        # http://localhost:3000
```

## Testing

```bash
npm test           # Vitest: unit + integration (migrates the test DB automatically)
npm run test:e2e   # Playwright: organiser + guest end-to-end loop
npm run build      # production build
```

## Project layout

```
app/
  (auth)/                    signin, signup + actions
  (dashboard)/               organiser app (guarded by layout)
    dashboard/               workspace summary + events
    events/[eventId]/        overview, functions, guests, invitation
  e/[eventSlug]/[guestToken] PUBLIC invitation + RSVP
  api/auth, api/upload
lib/
  services/                  all business logic (events, contacts, eventGuests,
                             invitation, rsvp, metrics, import/, dashboard)
  utils/                     token, phone, slug
  validation/                zod schemas
components/
  ui/                        Button, Input, Card
  invitation-templates/      Royal, Minimal
prisma/                      schema + migrations + seed
tests/                       unit/ (Vitest), e2e/ (Playwright)
docs/superpowers/            design spec + implementation plan
```

## Media uploads

Cover/gallery images are written to `public/uploads` in development via `lib/storage/media.ts`. On Vercel the filesystem is ephemeral — swap `saveUpload()` for Cloudinary/UploadThing using the same signature. The upload endpoint already validates type and size (≤ 5 MB).

## Deploy notes

- App → Vercel. DB → Neon (set `DATABASE_URL`). Run `prisma migrate deploy` on release.
- Set a real `AUTH_SECRET`.
- Swap `saveUpload()` to a hosted image provider.

## Out of scope (later subsystems)

AI content generation, QR check-in / live event-day, WhatsApp Business API automation, organisation/teams, payments, meeting scheduler, seating, marketplace, native apps, Google Sheets ingestion.
