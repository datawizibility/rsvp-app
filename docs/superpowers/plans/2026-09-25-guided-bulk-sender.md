# Guided Bulk Sender (WhatsApp) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send WhatsApp invitations and reminders to many guests from one guided queue, with per-round send tracking and recipient filters.

**Architecture:** Additive schema (2 event fields, 2 guest fields), two pure messaging helpers (`renderMessage`, `buildWhatsAppLink`), a pure recipient-filter predicate, a messaging service (templates, mark-sent, recipients), and one client queue component backed by two thin server actions. No WhatsApp API — each send opens a pre-filled `wa.me` chat.

**Tech Stack:** Next.js App Router, TypeScript, Prisma + PostgreSQL, Tailwind, zod, Vitest.

## Global Constraints

- Project root: `D:\AAAA_MYPROJECT\RSVP_App`.
- All business logic in `lib/services/*`; server actions are thin (`requireUserId` → validate → service → `revalidatePath`).
- Ownership enforced in services via `getEventForUser` / `getEventDetail`.
- No `any` in committed code. TypeScript strict.
- Tests: pure logic in `tests/unit/*.test.ts`; DB logic in integration tests that set `process.env.DATABASE_URL = TEST_DATABASE_URL` then dynamically import services (existing pattern).
- Every task ends green (`npm test`), lint clean, and committed.
- WhatsApp only; email deferred. No delivery receipts (documented limitation).

---

## File Structure

```
prisma/schema.prisma                                   (modify: 2 Event fields, 2 EventGuest fields)
lib/messaging/templates.ts                             (create: defaults + renderMessage)
lib/messaging/whatsapp.ts                              (create: buildWhatsAppLink)
lib/services/recipientFilter.ts                        (create: pure predicate)
lib/services/messaging.ts                              (create: templates, markSent, listRecipients)
app/(dashboard)/events/[eventId]/guests/send/page.tsx  (create: server page)
app/(dashboard)/events/[eventId]/guests/send/SendQueue.tsx  (create: client queue)
app/(dashboard)/events/[eventId]/guests/send/TemplateEditor.tsx (create: client editor)
app/(dashboard)/events/[eventId]/guests/send/actions.ts (create: 2 server actions)
app/(dashboard)/events/[eventId]/guests/page.tsx       (modify: add "Send invitations" button)
tests/unit/messaging.test.ts                           (create: pure)
tests/unit/recipient-filter.test.ts                    (create: pure)
tests/unit/send-tracking.test.ts                       (create: integration)
```

---

### Task 1: Schema + migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Event.inviteTemplate`, `Event.reminderTemplate`, `EventGuest.lastInvitedAt`, `EventGuest.lastRemindedAt`.

- [ ] **Step 1: Add fields to `Event`**

Find the `model Event { ... }` block and add, alongside the existing optional fields:
```prisma
  inviteTemplate   String?
  reminderTemplate String?
```

- [ ] **Step 2: Add fields to `EventGuest`**

Find the `model EventGuest { ... }` block and add:
```prisma
  lastInvitedAt  DateTime?
  lastRemindedAt DateTime?
```

- [ ] **Step 3: Migrate**

Run: `npx prisma migrate dev --name add_messaging_tracking`
Expected: migration applied, client regenerated.

- [ ] **Step 4: Verify**

Run: `npx prisma validate`
Expected: "The schema ... is valid".

- [ ] **Step 5: Commit**

```bash
git add prisma
git commit -m "feat: add messaging templates and send tracking fields"
```

---

### Task 2: Pure messaging helpers

**Files:**
- Create: `lib/messaging/templates.ts`, `lib/messaging/whatsapp.ts`
- Test: `tests/unit/messaging.test.ts`

**Interfaces:**
- Produces: `renderMessage(template: string, vars: TemplateVars): string`; `buildWhatsAppLink(mobileE164: string, message: string): string`; `DEFAULT_INVITE_TEMPLATE`, `DEFAULT_REMINDER_TEMPLATE`; type `TemplateVars = { name: string; event: string; date: string; link: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/messaging.test.ts
import { describe, it, expect } from "vitest";
import { renderMessage } from "@/lib/messaging/templates";
import { buildWhatsAppLink } from "@/lib/messaging/whatsapp";

const vars = { name: "Raj", event: "Rahul & Neha Wedding", date: "10 Dec 2026", link: "https://x/e/a/T1" };

describe("renderMessage", () => {
  it("substitutes every placeholder", () => {
    expect(renderMessage("Hi {name}, {event} on {date}: {link}", vars)).toBe(
      "Hi Raj, Rahul & Neha Wedding on 10 Dec 2026: https://x/e/a/T1",
    );
  });

  it("tolerates spaces and casing", () => {
    expect(renderMessage("Hi { NAME }", vars)).toBe("Hi Raj");
  });

  it("leaves unknown placeholders intact", () => {
    expect(renderMessage("Hi {name}, {typo}", vars)).toBe("Hi Raj, {typo}");
  });

  it("falls back to 'there' when the name is empty", () => {
    expect(renderMessage("Hi {name}!", { ...vars, name: "  " })).toBe("Hi there!");
  });
});

describe("buildWhatsAppLink", () => {
  it("strips the plus and non-digits and encodes the message", () => {
    const link = buildWhatsAppLink("+91 98000 00001", "Hi there & welcome");
    expect(link).toBe(
      "https://wa.me/919800000001?text=Hi%20there%20%26%20welcome",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/messaging.test.ts`
Expected: FAIL — cannot find module `@/lib/messaging/templates`.

- [ ] **Step 3: Implement `templates.ts`**

```ts
export type TemplateVars = {
  name: string;
  event: string;
  date: string;
  link: string;
};

export const DEFAULT_INVITE_TEMPLATE =
  "Hi {name}, you're invited to {event} on {date}. Here's your personal invitation: {link}";

export const DEFAULT_REMINDER_TEMPLATE =
  "Hi {name}, a gentle reminder about {event} on {date}. Please confirm your attendance here: {link}";

const KEY_PATTERN = /\{\s*(name|event|date|link)\s*\}/gi;

export function renderMessage(template: string, vars: TemplateVars): string {
  return template.replace(KEY_PATTERN, (match, rawKey: string) => {
    const key = rawKey.toLowerCase() as keyof TemplateVars;
    const value = (vars[key] ?? "").trim();
    if (key === "name" && value === "") return "there";
    return value;
  });
}
```

- [ ] **Step 4: Implement `whatsapp.ts`**

```ts
export function buildWhatsAppLink(mobileE164: string, message: string): string {
  const digits = mobileE164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/messaging.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/messaging tests/unit/messaging.test.ts
git commit -m "feat: add message rendering and WhatsApp link helpers"
```

---

### Task 3: Pure recipient filter

**Files:**
- Create: `lib/services/recipientFilter.ts`
- Test: `tests/unit/recipient-filter.test.ts`

**Interfaces:**
- Produces: `matchesFilter(subject: FilterSubject, filter: RecipientFilter, groupId?: string | null): boolean`; types `RecipientFilter = "all" | "group" | "not_sent" | "non_responders" | "not_opened"`, `FilterSubject = { groupId: string | null; lastSentAtForRound: Date | null; rsvpStatus: "yes" | "maybe" | "no" | null; firstOpenedAt: Date | null }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/recipient-filter.test.ts
import { describe, it, expect } from "vitest";
import { matchesFilter } from "@/lib/services/recipientFilter";

const subject = (over = {}) => ({
  groupId: null as string | null,
  lastSentAtForRound: null as Date | null,
  rsvpStatus: null as "yes" | "maybe" | "no" | null,
  firstOpenedAt: null as Date | null,
  ...over,
});

describe("matchesFilter", () => {
  it("all includes everyone", () => {
    expect(matchesFilter(subject(), "all")).toBe(true);
  });
  it("group matches only the given group", () => {
    expect(matchesFilter(subject({ groupId: "g1" }), "group", "g1")).toBe(true);
    expect(matchesFilter(subject({ groupId: "g2" }), "group", "g1")).toBe(false);
    expect(matchesFilter(subject({ groupId: null }), "group", "g1")).toBe(false);
  });
  it("not_sent matches when the round timestamp is null", () => {
    expect(matchesFilter(subject(), "not_sent")).toBe(true);
    expect(matchesFilter(subject({ lastSentAtForRound: new Date() }), "not_sent")).toBe(false);
  });
  it("non_responders matches when there is no rsvp", () => {
    expect(matchesFilter(subject(), "non_responders")).toBe(true);
    expect(matchesFilter(subject({ rsvpStatus: "yes" }), "non_responders")).toBe(false);
  });
  it("not_opened matches when never opened", () => {
    expect(matchesFilter(subject(), "not_opened")).toBe(true);
    expect(matchesFilter(subject({ firstOpenedAt: new Date() }), "not_opened")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/recipient-filter.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
export type RecipientFilter =
  | "all"
  | "group"
  | "not_sent"
  | "non_responders"
  | "not_opened";

export type FilterSubject = {
  groupId: string | null;
  lastSentAtForRound: Date | null;
  rsvpStatus: "yes" | "maybe" | "no" | null;
  firstOpenedAt: Date | null;
};

export function matchesFilter(
  subject: FilterSubject,
  filter: RecipientFilter,
  groupId?: string | null,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "group":
      return subject.groupId !== null && subject.groupId === groupId;
    case "not_sent":
      return subject.lastSentAtForRound === null;
    case "non_responders":
      return subject.rsvpStatus === null;
    case "not_opened":
      return subject.firstOpenedAt === null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/recipient-filter.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/services/recipientFilter.ts tests/unit/recipient-filter.test.ts
git commit -m "feat: add recipient filter predicate"
```

---

### Task 4: Messaging service

**Files:**
- Create: `lib/services/messaging.ts`
- Test: `tests/unit/send-tracking.test.ts`

**Interfaces:**
- Consumes: `getEventForUser`, `getEventDetail` (events service); `matchesFilter`, `RecipientFilter`, `FilterSubject` (Task 3); `DEFAULT_*` templates (Task 2).
- Produces:
  - `type Round = "invite" | "reminder"`
  - `getEventTemplates(userId, eventId): Promise<{ inviteTemplate: string; reminderTemplate: string }>` (returns stored value or default)
  - `saveEventTemplates(userId, eventId, input: { inviteTemplate: string; reminderTemplate: string }): Promise<void>`
  - `markSent(userId, eventId, guestId, round: Round): Promise<void>`
  - `listRecipients(userId, eventId, filter: RecipientFilter, round: Round, groupId?: string | null): Promise<GuestRow[]>`
  - `GuestRow = { id, name, mobileNormalized, groupId, groupName, lastInvitedAt, lastRemindedAt, rsvpStatus, firstOpenedAt }`

- [ ] **Step 1: Write the failing integration test**

```ts
// tests/unit/send-tracking.test.ts
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;

run("messaging service", () => {
  process.env.DATABASE_URL = url as string;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  let messaging: typeof import("@/lib/services/messaging");

  let userId = "";
  let eventId = "";
  let guestInvited = "";
  let guestFresh = "";
  let guestResponded = "";

  beforeAll(async () => {
    messaging = await import("@/lib/services/messaging");

    const stamp = Date.now();
    const user = await prisma.user.create({
      data: { email: `msg_${stamp}@test.local`, passwordHash: "x", name: "Msg" },
    });
    userId = user.id;
    const workspace = await prisma.workspace.create({
      data: { ownerId: userId, name: "WS" },
    });
    const event = await prisma.event.create({
      data: {
        workspaceId: workspace.id,
        name: "Msg Event",
        type: "wedding",
        startDate: new Date("2026-12-10"),
        slug: `msg-${stamp}`,
      },
    });
    eventId = event.id;
    const group = await prisma.guestGroup.create({
      data: { eventId, name: "Friends" },
    });

    const mk = async (name: string, mobile: string, opts: { invited?: boolean; rsvp?: boolean; group?: string } = {}) => {
      const contact = await prisma.contact.create({
        data: { workspaceId: workspace.id, name, mobile, mobileNormalized: `+91${mobile}` },
      });
      const g = await prisma.eventGuest.create({
        data: {
          eventId,
          contactId: contact.id,
          guestToken: `T${stamp}${mobile}`,
          groupId: opts.group ?? null,
          lastInvitedAt: opts.invited ? new Date() : null,
        },
      });
      if (opts.rsvp) {
        await prisma.rsvp.create({ data: { eventId, eventGuestId: g.id, status: "yes" } });
      }
      return g.id;
    };

    guestInvited = await mk("Invited Guy", "9800000301", { invited: true, group: group.id });
    guestFresh = await mk("Fresh Guy", "9800000302");
    guestResponded = await mk("Responded Guy", "9800000303", { rsvp: true });
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("returns defaults when no templates are saved", async () => {
    const t = await messaging.getEventTemplates(userId, eventId);
    expect(t.inviteTemplate).toContain("{link}");
    expect(t.reminderTemplate).toContain("{link}");
  });

  it("saves and reads templates", async () => {
    await messaging.saveEventTemplates(userId, eventId, {
      inviteTemplate: "Custom invite {name} {link}",
      reminderTemplate: "Custom reminder {name} {link}",
    });
    const t = await messaging.getEventTemplates(userId, eventId);
    expect(t.inviteTemplate).toBe("Custom invite {name} {link}");
  });

  it("marks invite and reminder sent independently", async () => {
    await messaging.markSent(userId, eventId, guestFresh, "invite");
    let g = await prisma.eventGuest.findUnique({ where: { id: guestFresh } });
    expect(g?.lastInvitedAt).not.toBeNull();
    expect(g?.lastRemindedAt).toBeNull();

    await messaging.markSent(userId, eventId, guestFresh, "reminder");
    g = await prisma.eventGuest.findUnique({ where: { id: guestFresh } });
    expect(g?.lastRemindedAt).not.toBeNull();
  });

  it("filters not_sent for the round", async () => {
    const rows = await messaging.listRecipients(userId, eventId, "not_sent", "invite");
    expect(rows.map((r) => r.id)).not.toContain(guestInvited);
    expect(rows.map((r) => r.id)).toContain(guestResponded);
  });

  it("filters non_responders", async () => {
    const rows = await messaging.listRecipients(userId, eventId, "non_responders", "invite");
    expect(rows.map((r) => r.id)).not.toContain(guestResponded);
    expect(rows.map((r) => r.id)).toContain(guestFresh);
  });

  it("enforces ownership", async () => {
    await expect(
      messaging.listRecipients("someone-else", eventId, "all", "invite"),
    ).rejects.toThrow();
    await expect(
      messaging.markSent("someone-else", eventId, guestFresh, "invite"),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/send-tracking.test.ts`
Expected: FAIL — cannot find module `@/lib/services/messaging`.

- [ ] **Step 3: Implement `messaging.ts`**

```ts
import { prisma } from "@/lib/db";
import {
  DEFAULT_INVITE_TEMPLATE,
  DEFAULT_REMINDER_TEMPLATE,
} from "@/lib/messaging/templates";
import { getEventForUser } from "./events";
import { matchesFilter, type RecipientFilter } from "./recipientFilter";

export type Round = "invite" | "reminder";

export type GuestRow = {
  id: string;
  name: string;
  mobileNormalized: string;
  groupId: string | null;
  groupName: string | null;
  lastInvitedAt: Date | null;
  lastRemindedAt: Date | null;
  rsvpStatus: "yes" | "maybe" | "no" | null;
  firstOpenedAt: Date | null;
};

export async function getEventTemplates(userId: string, eventId: string) {
  const event = await getEventForUser(userId, eventId);
  return {
    inviteTemplate: event.inviteTemplate ?? DEFAULT_INVITE_TEMPLATE,
    reminderTemplate: event.reminderTemplate ?? DEFAULT_REMINDER_TEMPLATE,
  };
}

export async function saveEventTemplates(
  userId: string,
  eventId: string,
  input: { inviteTemplate: string; reminderTemplate: string },
) {
  await getEventForUser(userId, eventId);
  await prisma.event.update({
    where: { id: eventId },
    data: {
      inviteTemplate: input.inviteTemplate,
      reminderTemplate: input.reminderTemplate,
    },
  });
}

export async function markSent(
  userId: string,
  eventId: string,
  guestId: string,
  round: Round,
) {
  await getEventForUser(userId, eventId);
  await prisma.eventGuest.updateMany({
    where: { id: guestId, eventId },
    data:
      round === "invite"
        ? { lastInvitedAt: new Date() }
        : { lastRemindedAt: new Date() },
  });
}

export async function listRecipients(
  userId: string,
  eventId: string,
  filter: RecipientFilter,
  round: Round,
  groupId?: string | null,
): Promise<GuestRow[]> {
  await getEventForUser(userId, eventId);

  const guests = await prisma.eventGuest.findMany({
    where: { eventId },
    include: { contact: true, group: true, rsvp: true },
    orderBy: { contact: { name: "asc" } },
  });

  return guests
    .map<GuestRow>((g) => ({
      id: g.id,
      name: g.contact.name,
      mobileNormalized: g.contact.mobileNormalized,
      groupId: g.groupId,
      groupName: g.group?.name ?? null,
      lastInvitedAt: g.lastInvitedAt,
      lastRemindedAt: g.lastRemindedAt,
      rsvpStatus: g.rsvp?.status ?? null,
      firstOpenedAt: g.firstOpenedAt,
    }))
    .filter((row) =>
      matchesFilter(
        {
          groupId: row.groupId,
          lastSentAtForRound:
            round === "invite" ? row.lastInvitedAt : row.lastRemindedAt,
          rsvpStatus: row.rsvpStatus,
          firstOpenedAt: row.firstOpenedAt,
        },
        filter,
        groupId,
      ),
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/send-tracking.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/services/messaging.ts tests/unit/send-tracking.test.ts
git commit -m "feat: add messaging service for templates, send tracking and recipients"
```

---

### Task 5: Sender UI

**Files:**
- Create: `app/(dashboard)/events/[eventId]/guests/send/actions.ts`
- Create: `app/(dashboard)/events/[eventId]/guests/send/TemplateEditor.tsx`
- Create: `app/(dashboard)/events/[eventId]/guests/send/SendQueue.tsx`
- Create: `app/(dashboard)/events/[eventId]/guests/send/page.tsx`

**Interfaces:**
- Consumes: `getEventDetail`, `getEventTemplates`, `saveEventTemplates`, `markSent`, `listRecipients` (Task 4); `renderMessage`, `buildWhatsAppLink`, `TemplateVars` (Task 2); `matchesFilter`, `RecipientFilter` (Task 3).
- Produces: server actions `saveTemplatesAction(prev, formData): Promise<FormState>` and `markSentAction(eventId: string, guestId: string, round: Round): Promise<void>`.

- [ ] **Step 1: Implement `actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import {
  markSent,
  saveEventTemplates,
  type Round,
} from "@/lib/services/messaging";

export type FormState = { error?: string; success?: string } | null;

export async function saveTemplatesAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));
  const inviteTemplate = String(formData.get("inviteTemplate") ?? "").trim();
  const reminderTemplate = String(formData.get("reminderTemplate") ?? "").trim();

  if (inviteTemplate.length < 5 || reminderTemplate.length < 5) {
    return { error: "Both messages need a little more text." };
  }
  if (inviteTemplate.length > 1000 || reminderTemplate.length > 1000) {
    return { error: "Messages must be under 1000 characters." };
  }

  await saveEventTemplates(userId, eventId, { inviteTemplate, reminderTemplate });
  revalidatePath(`/events/${eventId}/guests/send`);
  return { success: "Messages saved." };
}

export async function markSentAction(
  eventId: string,
  guestId: string,
  round: Round,
): Promise<void> {
  const userId = await requireUserId();
  await markSent(userId, eventId, guestId, round);
}
```

- [ ] **Step 2: Implement `TemplateEditor.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Field } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { saveTemplatesAction, type FormState } from "./actions";

export function TemplateEditor({
  eventId,
  inviteTemplate,
  reminderTemplate,
}: {
  eventId: string;
  inviteTemplate: string;
  reminderTemplate: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveTemplatesAction,
    null,
  );

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">
        Message templates
      </summary>
      <p className="mt-2 text-xs text-slate-500">
        Use {"{name}"}, {"{event}"}, {"{date}"} and {"{link}"} — they are filled in per guest.
      </p>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="eventId" value={eventId} />
        <Field label="Invitation message">
          <Textarea name="inviteTemplate" rows={3} defaultValue={inviteTemplate} />
        </Field>
        <Field label="Reminder message">
          <Textarea name="reminderTemplate" rows={3} defaultValue={reminderTemplate} />
        </Field>
        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state?.success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {state.success}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save messages"}
        </Button>
      </form>
    </details>
  );
}
```

- [ ] **Step 3: Implement `SendQueue.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { renderMessage } from "@/lib/messaging/templates";
import { buildWhatsAppLink } from "@/lib/messaging/whatsapp";
import { matchesFilter, type RecipientFilter } from "@/lib/services/recipientFilter";
import type { Round } from "@/lib/services/messaging";
import { markSentAction } from "./actions";

export type QueueGuest = {
  id: string;
  name: string;
  mobileNormalized: string;
  groupId: string | null;
  groupName: string | null;
  lastInvitedAt: string | null;
  lastRemindedAt: string | null;
  rsvpStatus: "yes" | "maybe" | "no" | null;
  firstOpenedAt: string | null;
  link: string;
};

const FILTERS: { value: RecipientFilter; label: string }[] = [
  { value: "all", label: "All guests" },
  { value: "not_sent", label: "Not yet sent" },
  { value: "non_responders", label: "Non-responders" },
  { value: "not_opened", label: "Not yet opened" },
  { value: "group", label: "A specific group" },
];

export function SendQueue({
  eventId,
  eventName,
  eventDate,
  inviteTemplate,
  reminderTemplate,
  guests,
  groups,
}: {
  eventId: string;
  eventName: string;
  eventDate: string;
  inviteTemplate: string;
  reminderTemplate: string;
  guests: QueueGuest[];
  groups: { id: string; name: string }[];
}) {
  const [round, setRound] = useState<Round>("invite");
  const [filter, setFilter] = useState<RecipientFilter>("all");
  const [groupId, setGroupId] = useState<string>(groups[0]?.id ?? "");
  const [index, setIndex] = useState(0);

  const list = useMemo(() => {
    return guests.filter((g) =>
      matchesFilter(
        {
          groupId: g.groupId,
          lastSentAtForRound: round === "invite" ? g.lastInvitedAt : g.lastRemindedAt,
          rsvpStatus: g.rsvpStatus,
          firstOpenedAt: g.firstOpenedAt,
        },
        filter,
        filter === "group" ? groupId : null,
      ),
    );
  }, [guests, round, filter, groupId]);

  const current = list[index];

  function reset(next: Partial<{ round: Round; filter: RecipientFilter }> = {}) {
    if (next.round) setRound(next.round);
    if (next.filter) setFilter(next.filter);
    setIndex(0);
  }

  if (list.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500">
          No guests match this filter.
        </p>
      </Card>
    );
  }

  if (!current) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-slate-900">
          Round complete — {list.length} sent
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Everyone matching the filter has been messaged.
        </p>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => setIndex(0)}>
            Start this filter again
          </Button>
        </div>
      </Card>
    );
  }

  const template = round === "invite" ? inviteTemplate : reminderTemplate;
  const message = renderMessage(template, {
    name: current.name,
    event: eventName,
    date: eventDate,
    link: current.link,
  });
  const waLink = buildWhatsAppLink(current.mobileNormalized, message);

  async function openAndMark() {
    window.open(waLink, "_blank", "noopener");
    if (current) await markSentAction(eventId, current.id, round);
    setIndex((i) => i + 1);
  }

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Round
          </span>
          <select
            value={round}
            onChange={(e) => reset({ round: e.target.value as Round })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="invite">Invitation</option>
            <option value="reminder">Reminder</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Recipients
          </span>
          <select
            value={filter}
            onChange={(e) => reset({ filter: e.target.value as RecipientFilter })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        {filter === "group" && (
          <label className="text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
              Group
            </span>
            <select
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                setIndex(0);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {index + 1} of {list.length}
          </p>
          {current.groupName && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {current.groupName}
            </span>
          )}
        </div>

        <h3 className="mt-2 text-xl font-semibold text-slate-900">{current.name}</h3>
        <p className="text-sm text-slate-500">{current.mobileNormalized}</p>

        <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          {message}
        </pre>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={openAndMark}>Open WhatsApp</Button>
          <Button variant="secondary" onClick={() => setIndex((i) => i + 1)}>
            Skip
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Implement `page.tsx`**

```tsx
import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { getEventDetail } from "@/lib/services/events";
import { getEventTemplates, listRecipients } from "@/lib/services/messaging";
import { TemplateEditor } from "./TemplateEditor";
import { SendQueue, type QueueGuest } from "./SendQueue";

export const dynamic = "force-dynamic";

export default async function SendPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const userId = await requireUserId();
  const event = await getEventDetail(userId, eventId);
  const templates = await getEventTemplates(userId, eventId);
  const rows = await listRecipients(userId, eventId, "all", "invite");

  const host = (await headers()).get("host") ?? "localhost:3000";
  const base = `http://${host}`;

  const tokens = await prisma.eventGuest.findMany({
    where: { eventId },
    select: { id: true, guestToken: true },
  });
  const linkById = new Map(
    tokens.map((t) => [t.id, `${base}/e/${event.slug}/${t.guestToken}`]),
  );

  const guests: QueueGuest[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    mobileNormalized: row.mobileNormalized,
    groupId: row.groupId,
    groupName: row.groupName,
    lastInvitedAt: row.lastInvitedAt ? row.lastInvitedAt.toISOString() : null,
    lastRemindedAt: row.lastRemindedAt ? row.lastRemindedAt.toISOString() : null,
    rsvpStatus: row.rsvpStatus,
    firstOpenedAt: row.firstOpenedAt ? row.firstOpenedAt.toISOString() : null,
    link: linkById.get(row.id) ?? "",
  }));

  const eventDate = event.startDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <Link href={`/events/${eventId}/guests`} className="text-sm text-slate-500 underline">
        ← Back to guests
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Send invitations</h1>
        <p className="mt-1 text-sm text-slate-500">
          One guest at a time. Open WhatsApp, send, and the app moves on.
        </p>
      </div>

      <TemplateEditor
        eventId={eventId}
        inviteTemplate={templates.inviteTemplate}
        reminderTemplate={templates.reminderTemplate}
      />

      <SendQueue
        eventId={eventId}
        eventName={event.name}
        eventDate={eventDate}
        inviteTemplate={templates.inviteTemplate}
        reminderTemplate={templates.reminderTemplate}
        guests={guests}
        groups={event.groups.map((g) => ({ id: g.id, name: g.name }))}
      />
    </div>
  );
}
```

- [ ] **Step 5: Typecheck and build**

Run: `npx tsc --noEmit` then `npm run build`
Expected: no type errors; route `/events/[eventId]/guests/send` present.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/events/[eventId]/guests/send"
git commit -m "feat: add guided WhatsApp bulk sender screen"
```

---

### Task 6: Entry point from the guest list

**Files:**
- Modify: `app/(dashboard)/events/[eventId]/guests/page.tsx`

**Interfaces:**
- Consumes: existing guest list page.

- [ ] **Step 1: Add the button**

In the header button group (next to "Download CSV" / "Import CSV"), add:
```tsx
          <Link
            href={`/events/${eventId}/guests/send`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Send invitations
          </Link>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/events/[eventId]/guests/page.tsx"
git commit -m "feat: link send invitations from the guest list"
```

---

### Task 7: Full verification + deploy

- [ ] **Step 1: Run everything**

Run: `npm test` then `npm run lint` then `npm run build`
Expected: all green (existing 49 tests + new 16 = 65 tests).

- [ ] **Step 2: Push**

```bash
git push origin feat/mvp
```

- [ ] **Step 3: Verify the route is live**

Run: `Invoke-WebRequest https://rsvp-app-nine-rouge.vercel.app/events/dummy/guests/send -MaximumRedirection 0`
Expected: 307 (auth redirect) — route exists.

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| §3 schema fields | 1 |
| §4 renderMessage / buildWhatsAppLink | 2 |
| §5 recipient filter | 3 |
| §5/§6 templates, markSent, recipients service | 4 |
| §5 sender screen (round, filter, queue, editor) | 5 |
| §5 entry point from guest list | 6 |
| §7 unit + integration tests | 2, 3, 4 |
| §8 limits | documented in spec; no code |

**Type consistency:** `RecipientFilter` defined in Task 3 and consumed in Tasks 4/5. `Round` defined in Task 4 and consumed in Task 5's actions and queue. `TemplateVars` in Task 2. `GuestRow` in Task 4, mapped to `QueueGuest` in Task 5. `matchesFilter` signature identical in Tasks 3, 4, 5.

**Placeholder scan:** no TBD/TODO; every code step carries real code.

**Note on Task 5 Step 4:** the page fetches personal links by querying `guestToken` directly via `prisma` (the existing `listRecipients` returns guest rows without tokens). This keeps the messaging service free of link-building concerns.
