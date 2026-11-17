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

`lib/storage/media.ts` writes to `public/uploads` in development, and to **Vercel Blob** in production when `BLOB_READ_WRITE_TOKEN` is set. Both paths return a public URL, so callers are unchanged. The upload endpoint validates type and size (≤ 4 MB).

## WhatsApp sending

Two channels, selectable per bulk-send session on the **Send invitations** screen:

1. **Manual (default, always available)** — opens each guest's chat in your own WhatsApp App/Web with the personalised message pre-filled; you press send. Because sends are human-paced from your number, this is safe for typical guest lists (hundreds). The app tracks `lastInvitedAt` / `lastRemindedAt` per guest so you can resume or re-remind.
2. **WhatsApp Business Cloud API** — official, automation-safe channel (no ban risk). Requires a Meta WhatsApp Business account:
   1. Create a Meta app with the *WhatsApp* product and add a business phone number.
   2. Create message templates (e.g. `rsvp_invite`, `rsvp_reminder`) with a single body variable `{{1}}` and get them approved.
   3. Generate a permanent access token and copy the phone number id.
   4. Set `WHATSAPP_BUSINESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_INVITE`, `WHATSAPP_TEMPLATE_REMINDER` (see `.env.example`) in Vercel.
   5. The Send screen then offers **Channel: Business API (auto-send)** — each send calls the Graph API with the rendered message as the template body and marks the round complete.

## Deploy notes (free tier)

App → **Vercel** (Hobby), DB → **Neon**, images → **Vercel Blob**.

1. **Database:** create a Neon project and copy the pooled connection string.
2. **Push** the repo to GitHub, then import it in Vercel.
3. **Env vars** in Vercel:
   - `DATABASE_URL` — the Neon connection string (`?sslmode=require`)
   - `AUTH_SECRET` — from `npx auth secret`
   - `BLOB_READ_WRITE_TOKEN` — from Vercel → Storage → Blob (connect to the project)
4. **Migrations** run automatically: the `vercel-build` script executes `prisma migrate deploy && next build`. `postinstall` runs `prisma generate`.
5. Deploy → `https://<your-app>.vercel.app`.

Note: Vercel's free Hobby tier is for non-commercial use.

## Out of scope (later subsystems)

AI content generation, QR check-in / live event-day, WhatsApp Business API automation, organisation/teams, payments, meeting scheduler, seating, marketplace, native apps, Google Sheets ingestion.
