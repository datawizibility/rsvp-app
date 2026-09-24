# RSVP App — MVP (Slice A) Design

**Date:** 2026-09-24
**Status:** Approved — Revision 2 (review incorporated)
**Project root:** `D:\AAAA_MYPROJECT\RSVP_App`

## 1. Overview

Build the core loop of the Event Platform described in the product blueprint: an
organiser creates an event, builds a mobile-web invitation, imports a guest list,
shares personalised links, and watches RSVPs land on a dashboard. A guest opens a
personal link, views the invitation, and RSVPs.

Build #1 is the **universal Event + Contact + Guest + Invitation + RSVP engine,
demonstrated through a wedding**. It is not a wedding app — it is the engine for the
future Event OS, with a wedding as the first UI/demo. Every later subsystem
(WhatsApp automation, QR check-in, corporate/investor flows, AI layer, planner tier,
marketplace) hangs off it. It must prove the "one universal guest engine, verticals
are configuration" thesis.

## 2. Goal & Success Criteria

**Goal:** a deployed working demo that walks a real couple (or investor client)
through the complete loop end-to-end.

Done when:

1. An organiser can sign up, create an event with multiple functions, and publish an invitation.
2. Contacts / guests can be added manually or imported from CSV through a guided wizard (detect → map → validate → dedup → preview → import).
3. Each event guest has a unique, non-enumerable personal link.
4. A guest can open that link, view a personalised invitation, and submit an RSVP.
5. The organiser dashboard reflects invited / opened / responded / confirmed / maybe / declined / pending, plus per-function counts.
6. An investor-style event expresses itself through the same schema with **zero schema change** (proven by test).
7. The whole loop runs on a deployed URL, not just localhost.

## 3. Scope

### In scope

- Organiser auth: email + password (managed auth library; no custom crypto)
- **Lightweight `Workspace`** auto-created per user (no teams/roles/permissions/billing yet)
- **`Contact` (workspace-level CRM) + `EventGuest` (event-level participation)** split
- Create / edit event; multiple functions per event; explicit `Event.status`
- Invitation builder: 2 hand-coded templates, toggleable sections, cover image + gallery upload, `version` counter
- Manual content entry (no AI generation)
- Guests: add manually; **first-class CSV import wizard** with header detection, heuristic column mapping, validation, duplicate detection, preview, import summary
- Custom per-event groups; VIP flag
- Personalised tokenized event-guest links
- RSVP: yes / maybe / no, adult + child headcount, per-function attendance, custom questions
- Share: copy link + WhatsApp deep link (`wa.me`), manual
- Dashboard metrics listed in §2, criterion 5

### Out of scope (deferred to later subsystems)

- **AI-assisted CSV mapping** — mapper is deterministic heuristics in MVP; a single `mapColumns()` seam allows an AI mapper later
- AI content generation and AI assistant
- QR check-in / live event-day dashboard
- WhatsApp Business API automation and scheduled reminders
- Full invitation version **history** (only a `version` counter in MVP)
- Organisation / multi-tenant teams, roles, white-label
- Payments, meeting scheduler, seating, vendor marketplace, native apps
- Email delivery to guests
- Google Sheets ingestion (roadmap, see §11)

## 4. Architecture & Stack

**Approach:** pragmatic monolith with service-layer discipline.

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Mutations | Server Actions (thin: validate → call service → revalidate) |
| Database | PostgreSQL (Neon), Prisma ORM |
| Auth | Auth.js (credentials provider, email + password, bcrypt) |
| Media | Cloudinary or UploadThing |
| Styling | Tailwind CSS |
| Hosting | Vercel (app) + Neon (db) |

**Rules**

- All business logic lives in `lib/services/*`. Server actions and route handlers are thin wrappers.
- The public invitation route is server-rendered (fast guest links, shareable OG previews).
- `app/api/*` reserved for future webhooks/cron only; MVP mutations go through server actions.

### Repo layout

```
RSVP_App/
├─ app/
│  ├─ (auth)/signin, signup
│  ├─ (dashboard)/
│  │  ├─ dashboard/
│  │  └─ events/[eventId]/           # overview, functions, guests, invitation
│  ├─ e/[eventSlug]/[guestToken]/    # PUBLIC personalised invitation
│  └─ api/                           # reserved (webhooks/cron later)
├─ lib/
│  ├─ services/                      # events, contacts, event-guests, rsvp, invitation, import
│  ├─ db.ts                          # Prisma singleton
│  ├─ auth.ts                        # Auth.js config
│  └─ validation/                    # zod schemas
├─ components/
│  ├─ ui/
│  └─ invitation-templates/
├─ prisma/schema.prisma
└─ tests/
```

## 5. Data Model (universal engine)

Core principle: **one `Contact` + one `EventGuest` — no per-vertical guest tables.**
Vertical differences live in `customFields` (Json) and, only if proven necessary,
promoted columns.

```
User            id, email, passwordHash, name, createdAt

Workspace       id, name, ownerId, createdAt
                # MVP: exactly one auto-created per user

Contact         id, workspaceId, name, mobile, mobileNormalized, email?,
                organisation?, designation?, city?, masterTags(Json?),
                customFields(Json?), createdAt, updatedAt
                # unique(workspaceId, mobileNormalized)

Event           id, workspaceId, name, type(enum), status(enum), startDate, endDate,
                locationName, city, coverImageUrl, hostName, contactNumber,
                slug(unique), publishedAt?

EventFunction   id, eventId, name, date, startTime, endTime, venueName,
                venueAddress, description, dressCode, capacity, rsvpRequired, sortOrder

GuestGroup      id, eventId, name

EventGuest      id, eventId, contactId, groupId?, isVip, partySize,
                guestToken(unique), eventCustomFields(Json?),
                firstOpenedAt?, openCount
                # unique(eventId, contactId)

Invitation      id, eventId(unique), templateKey, content(Json), sections(Json),
                coverImageUrl, version, published

InvitationMedia id, invitationId, url, type(image|video), sortOrder

Rsvp            id, eventId, eventGuestId(unique), status(yes|maybe|no),
                adultCount, childCount, accommodationRequired, travelRequired,
                dietaryPreference, message, respondedAt

RsvpAttendance  id, rsvpId, eventFunctionId, attending

EventQuestion   id, eventId, label, type, options(Json?), sortOrder

RsvpAnswer      id, rsvpId, questionId, answer
```

**Enums**

- `EventType`: wedding, birthday, corporate, investor, conference, party, religious, other
- `EventStatus`: draft, published, completed, archived
- `RsvpStatus`: yes, maybe, no
- `DietaryPreference`: veg, nonveg, jain, other

**Key decisions**

- **Workspace is lightweight.** Just `User → Workspace → Contacts + Events`. Owner is the user; no membership, roles, or billing. This reserves the tenancy boundary that a future Organisation/planner tier needs, without building multi-tenancy now.
- **Contact = CRM identity; EventGuest = participation.** A person is one `Contact` in the workspace and one `EventGuest` per event they attend. This is what lets Raj Mehta of ABC Capital appear across Investor Meet 2026, AGM, and Dealer Conference as a single contact.
- **The invitation token lives on `EventGuest`, not `Contact`** — the same person can have different roles/party size/VIP status per event.
- **Contact dedup:** on import/add, upsert by `(workspaceId, mobileNormalized)`. Missing mobile → new contact. Mobile is normalized to E.164 with a default country code (IN). Merge/split UI deferred.
- **Personalisation** = `Event.slug` + `EventGuest.guestToken` → `/e/rahul-neha/7H82K`. Invitation content is shared; person-specific values are overlaid at render.
- **Verticals are configuration.** Investor `organisation` / `designation` live on `Contact`; event-specific values ride in `EventGuest.eventCustomFields`. The investor case must pass a zero-schema-change test (§9).
- **`Rsvp` is 1:1 with `EventGuest`** (latest response wins). Attendance joins to functions; custom questions are generic `EventQuestion` / `RsvpAnswer` rows.
- **`openCount` / `firstOpenedAt`** on `EventGuest` power the "Opened" metric without a separate analytics table.
- **`Invitation.version`** increments on publish. Full history deferred.

## 6. Core Flows

### Organiser

1. Sign up → `User` + auto-created `Workspace`
2. Create event (type, dates, city) → auto-generate `Event.slug`, status `draft`
3. Add functions (e.g. Mehendi / Sangeet / Wedding / Reception)
4. Build invitation → pick template → edit content → toggle sections → upload cover/gallery → **Publish** (status `published`, `version`++)
5. Import guests → guided wizard (below) → `Contact` upsert + `EventGuest` per row with a unique `guestToken`
6. Share → copy personal link or `wa.me` deep link (manual)
7. Dashboard → invited / opened / responded / confirmed / maybe / declined / pending, per-function counts
8. Remind non-responders → filter + share links (manual)

### CSV import wizard

```
Upload CSV
   ↓ detect columns
Map columns (heuristic header match, user-editable)
   ↓
Validate (missing name, invalid mobile, country code)
   ↓
Detect duplicates (existing Contact in workspace + within file)
   ↓
Preview  →  "487 records: 451 ready, 28 need review, 8 duplicates"
   ↓
Import           →  "Import 451"
   ↓
Summary
```

Mapping example:

| Uploaded column | Mapped field |
|---|---|
| Guest Name | Name |
| Mob No | Mobile |
| Company | Organisation |
| Designation | Designation |
| Side | Group |
| VIP | VIP |

### Guest

1. Open `/e/[eventSlug]/[guestToken]`
2. Server resolves event + event guest, stamps `firstOpenedAt`, increments `openCount`
3. Personalised invitation renders (shared content + guest overlay)
4. RSVP form → status, headcount, per-function attendance, custom questions
5. Confirmation screen

## 7. Routes

| Route | Purpose |
|---|---|
| `/signin`, `/signup` | organiser auth (signup provisions workspace) |
| `/dashboard` | metrics home |
| `/events/new` | create event |
| `/events/[id]` | overview |
| `/events/[id]/functions` | functions CRUD |
| `/events/[id]/guests` | event guest list |
| `/events/[id]/guests/import` | CSV import wizard |
| `/events/[id]/guests/[guestId]` | event guest detail |
| `/events/[id]/invitation` | editor / preview / publish |
| `/e/[slug]/[token]` | **public** personalised invitation |
| `/e/[slug]/[token]/rsvp` | RSVP form + confirmation |

## 8. Auth & Security

- Auth.js credentials provider; passwords hashed with bcrypt.
- **Ownership enforced in services**, not just UI: every organiser action re-checks that the event's workspace belongs to `session.user.id`.
- Guest access = no account. Token is high-entropy (128-bit, base32) so links cannot be enumerated.
- RSVP submission is rate-limited.

## 9. Testing

Critical paths only (demo scope):

- **Vitest (unit):** CSV parse + header detection + heuristic mapping, mobile normalization, validation, duplicate detection, token generation, RSVP handling, dashboard metric aggregation.
- **Schema test:** the investor case (Contact org/designation + EventGuest VIP + EventQuestion "management meeting?" + RsvpAnswer "yes") persists and reads back with zero schema change.
- **Playwright (e2e):** create event → import guest → open personal link → RSVP → dashboard reflects the response.

## 10. Deployment

- Vercel (app) + Neon (Postgres) + Cloudinary/UploadThing (media).
- `prisma migrate deploy` on release; a seed script creates a demo wedding.

## 11. Future (not this build)

Organisation/teams tier → Google Sheets ingestion → WhatsApp Business API +
scheduled reminders → QR check-in / live event-day → corporate & investor flows
(registration, meeting scheduler, agenda) → AI layer (invitation builder, column
mapping, assistant) → planner/agency tier → marketplace.
