# Guided Bulk Sender (WhatsApp) — Design

**Date:** 2026-09-25
**Status:** Approved
**Project root:** `D:\AAAA_MYPROJECT\RSVP_App`

## 1. Goal

Let an organiser send invitations and reminders to **many guests** from one screen instead of opening each guest's page. Optimised for a 100–200 guest list, with no WhatsApp Business API, no cost, and no Meta approval.

The sender is a **guided queue**: one guest at a time, a pre-filled WhatsApp message, and the app remembers who has already been messaged so the next round (reminders) is short.

## 2. Scope

**In scope**
- Two editable message templates per event: **invitation** and **reminder**, with a usable default for each.
- Per-guest send tracking: `lastInvitedAt` and `lastRemindedAt`.
- A sender screen: round selector + recipient filter + one-at-a-time queue.
- Marking a guest as sent when their WhatsApp chat is opened.
- A "Send invitations" entry point from the guest list.

**Out of scope (deferred)**
- WhatsApp Business API (automated sending, delivery/read receipts).
- Email and SMS channels (blocked on a sending domain).
- Scheduling reminders to send automatically.

## 3. Data model

Additive only; no changes to existing columns or relations.

```
Event      += inviteTemplate    String?
              reminderTemplate  String?
EventGuest += lastInvitedAt     DateTime?
              lastRemindedAt    DateTime?
```

Defaults for both templates live in code (`DEFAULT_INVITE_TEMPLATE`, `DEFAULT_REMINDER_TEMPLATE`) so a new event works without editing anything. A null template means "use the default".

## 4. Message rendering (pure)

`lib/messaging/templates.ts`

```
type TemplateVars = { name: string; event: string; date: string; link: string };
renderMessage(template: string, vars: TemplateVars): string
```

- Replaces `{name}`, `{event}`, `{date}`, `{link}` (case-insensitive, tolerant of surrounding spaces).
- Unknown placeholders are left intact (so a typo is visible, not silently blanked).
- If `{name}` is empty, the message still reads acceptably (no dangling punctuation issues introduced by this function).

`lib/messaging/whatsapp.ts`

```
buildWhatsAppLink(mobileE164: string, message: string): string
```

- Strips the leading `+` and any non-digits from the number.
- URL-encodes the message.
- Returns `https://wa.me/<digits>?text=<encoded>`.

## 5. Sender screen

Route: `/events/[eventId]/guests/send`, entered from a **Send invitations** button on the guest list.

**Round selector**
- *Invitation* — uses `inviteTemplate` (or default) and stamps `lastInvitedAt`.
- *Reminder* — uses `reminderTemplate` (or default) and stamps `lastRemindedAt`.

**Recipient filter**
- All
- Group — a specific `GuestGroup`
- Not yet sent — no send timestamp **for the selected round** (`lastInvitedAt` for Invitation, `lastRemindedAt` for Reminder)
- Non-responders — no `Rsvp` row
- Not yet opened — `firstOpenedAt` is null

Filters are combined with the round (e.g. *Reminder + Non-responders*). The "Not yet sent" filter is always evaluated against the current round's timestamp.

**Queue**
- One guest at a time: name, mobile, and a preview of the exact message.
- **Open WhatsApp** — opens the pre-filled chat in a new tab and marks the guest sent for the current round.
- **Skip** — advances without marking.
- Progress line: sends completed of total in the filtered set.
- When the queue is empty, a done state with counts.

**Templates editor**
- A collapsed section on the same screen to edit both templates for the event, with a "reset to default" action. Saved on the Event.

## 6. Server actions

- `saveTemplatesAction(eventId, inviteTemplate, reminderTemplate)` — validates length, saves on the owned event.
- `markSentAction(eventId, guestId, round)` — stamps `lastInvitedAt` or `lastRemindedAt`, guarded by ownership.

Both are thin: `requireUserId` → validate → service → `revalidatePath`.

## 7. Testing

**Unit** (`tests/unit/messaging.test.ts`)
- `renderMessage` substitutes all placeholders.
- Unknown placeholders survive.
- Missing name does not leave broken output.
- `buildWhatsAppLink` strips `+`/non-digits and URL-encodes the message.

**Unit** (`tests/unit/recipient-filter.test.ts`)
- Pure filter predicate: given a guest's `{ lastSentAtForRound, rsvpStatus, firstOpenedAt, groupId }` and a filter, returns include/exclude correctly for each of the five filters (`lastSentAtForRound` is the timestamp for the currently selected round).

**Integration** (`tests/unit/send-tracking.test.ts`, against `TEST_DATABASE_URL`)
- `markSent` stamps the right timestamp for each round and leaves the other untouched.
- The recipient query returns exactly the expected guests for *Not yet sent* and *Non-responders*.
- Templates round-trip on the Event via the service.
- Ownership is enforced (another user cannot mark or read).

**Regression:** the full suite, including tenant isolation, stays green.

## 8. Limits (documented, not defects)

- No delivery or read confirmation — `wa.me` links cannot report it. That requires the WhatsApp Business API.
- WhatsApp only; email is deferred until a sending domain exists.
- Roughly one click plus one tap-send per guest: a 200-guest list is about 15–20 minutes per round.
- Rate limiting does not apply here: sends happen from the organiser's own device, not the server.
