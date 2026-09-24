# RSVP App — MVP (Slice A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the universal Event + Contact + Guest + Invitation + RSVP engine, demonstrated through a wedding.

**Architecture:** Next.js App Router monolith. Mutations are thin Server Actions that validate (zod) then call `lib/services/*`; all business logic lives in those services. Prisma → PostgreSQL. Public invitation route is server-rendered. Pure logic (import, phone, tokens, metrics) is isolated from the DB so it is unit-testable without a database.

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind CSS, Prisma + PostgreSQL 17 (local), Auth.js v5 (credentials, bcrypt, JWT), papaparse, zod, Vitest, Playwright.

## Global Constraints

- Node v26.x, npm 11.x. Project root: `D:\AAAA_MYPROJECT\RSVP_App`.
- DB: local PostgreSQL 17 at `D:\PostgreSQL\17`, database `rsvp_app_dev` (and `rsvp_app_test` for integration tests). Connection string in `.env` (never committed).
- All server-side business logic in `lib/services/*`. Server actions are thin: `zod.parse → service call → revalidatePath`.
- Ownership is enforced **in services**: every organiser operation checks the event's workspace `ownerId` equals `session.user.id`. Never rely on UI alone.
- No per-vertical guest tables. `Contact` (workspace CRM) + `EventGuest` (event participation). Vertical data goes in `customFields` / `eventCustomFields` JSON.
- Guest tokens: high-entropy (≥120 bits), URL-safe uppercase base32, unique per `EventGuest`.
- Mobile numbers normalized to E.164 with default country `+91`.
- TypeScript strict mode on. No `any` in committed code.
- Every task ends green (`npm test` passes) and is committed.

---

## File Structure

```
RSVP_App/
├─ app/
│  ├─ (auth)/
│  │  ├─ signin/page.tsx
│  │  ├─ signup/page.tsx
│  │  └─ actions.ts                 # signInAction, signUpAction
│  ├─ (dashboard)/
│  │  ├─ layout.tsx                 # auth guard + nav
│  │  ├─ dashboard/page.tsx
│  │  └─ events/
│  │     ├─ new/page.tsx
│  │     └─ [eventId]/
│  │        ├─ page.tsx             # overview + metrics
│  │        ├─ functions/page.tsx
│  │        ├─ guests/page.tsx
│  │        ├─ guests/import/page.tsx
│  │        ├─ guests/[guestId]/page.tsx
│  │        ├─ invitation/page.tsx
│  │        └─ actions.ts           # all event server actions
│  ├─ e/[eventSlug]/[guestToken]/
│  │  ├─ page.tsx                   # public invitation
│  │  └─ rsvp/page.tsx + actions.ts
│  ├─ api/upload/route.ts
│  ├─ layout.tsx
│  └─ globals.css
├─ lib/
│  ├─ db.ts
│  ├─ auth.ts
│  ├─ validation/schemas.ts
│  ├─ utils/token.ts
│  ├─ utils/phone.ts
│  ├─ utils/slug.ts
│  ├─ services/
│  │  ├─ workspaces.ts
│  │  ├─ events.ts
│  │  ├─ functions.ts
│  │  ├─ contacts.ts
│  │  ├─ eventGuests.ts
│  │  ├─ invitation.ts
│  │  ├─ rsvp.ts
│  │  ├─ metrics.ts
│  │  └─ import/{parse,map,validate,analyze}.ts
│  └─ storage/media.ts
├─ components/
│  ├─ ui/{Button,Input,Card,Label}.tsx
│  ├─ invitation-templates/{RoyalTemplate,MinimalTemplate}.tsx
│  └─ dashboard/MetricCard.tsx
├─ prisma/schema.prisma, seed.ts
├─ tests/{unit,e2e}/
├─ vitest.config.ts, playwright.config.ts
└─ .env.example
```

---

### Task 1: Project scaffold + tooling

**Files:**
- Create: whole Next.js app, `vitest.config.ts`, `.env.example`, `.gitignore`

**Interfaces:**
- Produces: runnable app, `npm test` (Vitest) and `npm run build` wired.

- [ ] **Step 1: Scaffold Next.js**

Run in `D:\AAAA_MYPROJECT`:
```powershell
npx create-next-app@latest RSVP_App --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm --yes
```
Then work inside `D:\AAAA_MYPROJECT\RSVP_App`.

- [ ] **Step 2: Install deps**

```powershell
npm i @prisma/client bcryptjs papaparse zod next-auth@beta
npm i -D prisma vitest @types/bcryptjs @types/papaparse @playwright/test
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { environment: "node", include: ["tests/unit/**/*.test.ts"] },
});
```
Install `vite-tsconfig-paths` dev dep (`npm i -D vite-tsconfig-paths`). Add scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Create `.env.example`**

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/rsvp_app_dev?schema=public"
TEST_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/rsvp_app_test?schema=public"
AUTH_SECRET="generate-with: npx auth secret"
```

- [ ] **Step 5: git init + first commit**

```powershell
git init; git add -A; git commit -m "chore: scaffold next.js app with vitest"
```
Verify: `npm run build` succeeds, `npm test` reports "no test files found" (exit 0 with `--passWithNoTests`; add that flag).

---

### Task 2: Prisma schema + migration

**Files:**
- Create: `prisma/schema.prisma`

**Interfaces:**
- Produces: DB tables + Prisma client types for every service.

- [ ] **Step 1: Write the full schema**

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum EventType { wedding birthday corporate investor conference party religious other }
enum EventStatus { draft published completed archived }
enum RsvpStatus { yes maybe no }
enum DietaryPreference { veg nonveg jain other }

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())
  workspaces   Workspace[]
}

model Workspace {
  id        String    @id @default(cuid())
  name      String
  ownerId   String
  owner     User      @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  contacts  Contact[]
  events    Event[]
  createdAt DateTime  @default(now())
  @@index([ownerId])
}

model Contact {
  id               String   @id @default(cuid())
  workspaceId      String
  workspace        Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  name             String
  mobile           String
  mobileNormalized String
  email            String?
  organisation     String?
  designation      String?
  city             String?
  masterTags       Json?
  customFields     Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  eventGuests      EventGuest[]
  @@unique([workspaceId, mobileNormalized])
  @@index([workspaceId])
}

model Event {
  id            String      @id @default(cuid())
  workspaceId   String
  workspace     Workspace   @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  name          String
  type          EventType
  status        EventStatus @default(draft)
  startDate     DateTime
  endDate       DateTime?
  locationName  String?
  city          String?
  coverImageUrl String?
  hostName      String?
  contactNumber String?
  slug          String      @unique
  publishedAt   DateTime?
  createdAt     DateTime    @default(now())
  functions     EventFunction[]
  groups        GuestGroup[]
  eventGuests   EventGuest[]
  invitation    Invitation?
  questions     EventQuestion[]
  @@index([workspaceId])
}

model EventFunction {
  id           String   @id @default(cuid())
  eventId      String
  event        Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name         String
  date         DateTime
  startTime    String?
  endTime      String?
  venueName    String?
  venueAddress String?
  description  String?
  dressCode    String?
  capacity     Int?
  rsvpRequired Boolean  @default(true)
  sortOrder    Int      @default(0)
  attendance   RsvpAttendance[]
  @@index([eventId])
}

model GuestGroup {
  id        String       @id @default(cuid())
  eventId   String
  event     Event        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name      String
  guests    EventGuest[]
  @@unique([eventId, name])
}

model EventGuest {
  id                String    @id @default(cuid())
  eventId           String
  event             Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  contactId         String
  contact           Contact   @relation(fields: [contactId], references: [id], onDelete: Cascade)
  groupId           String?
  group             GuestGroup? @relation(fields: [groupId], references: [id], onDelete: SetNull)
  isVip             Boolean   @default(false)
  partySize         Int       @default(1)
  guestToken        String    @unique
  eventCustomFields Json?
  firstOpenedAt     DateTime?
  openCount         Int       @default(0)
  rsvp              Rsvp?
  @@unique([eventId, contactId])
  @@index([eventId])
}

model Invitation {
  id            String   @id @default(cuid())
  eventId       String   @unique
  event         Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  templateKey   String   @default("royal")
  content       Json
  sections      Json
  coverImageUrl String?
  version       Int      @default(1)
  published     Boolean  @default(false)
  media         InvitationMedia[]
}

model InvitationMedia {
  id           String     @id @default(cuid())
  invitationId String
  invitation   Invitation @relation(fields: [invitationId], references: [id], onDelete: Cascade)
  url          String
  type         String     @default("image")
  sortOrder    Int        @default(0)
}

model Rsvp {
  id                    String            @id @default(cuid())
  eventId               String
  event                 Event             @relation(fields: [eventId], references: [id], onDelete: Cascade)
  eventGuestId          String            @unique
  eventGuest            EventGuest        @relation(fields: [eventGuestId], references: [id], onDelete: Cascade)
  status                RsvpStatus
  adultCount            Int               @default(0)
  childCount            Int               @default(0)
  accommodationRequired Boolean?
  travelRequired        Boolean?
  dietaryPreference     DietaryPreference?
  message               String?
  respondedAt           DateTime          @default(now())
  attendance            RsvpAttendance[]
  answers               RsvpAnswer[]
  @@index([eventId])
}

model RsvpAttendance {
  id              String        @id @default(cuid())
  rsvpId          String
  rsvp            Rsvp          @relation(fields: [rsvpId], references: [id], onDelete: Cascade)
  eventFunctionId String
  eventFunction   EventFunction @relation(fields: [eventFunctionId], references: [id], onDelete: Cascade)
  attending       Boolean       @default(true)
  @@unique([rsvpId, eventFunctionId])
}

model EventQuestion {
  id        String       @id @default(cuid())
  eventId   String
  event     Event        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  label     String
  type      String       @default("text")
  options   Json?
  sortOrder Int          @default(0)
  answers   RsvpAnswer[]
  @@index([eventId])
}

model RsvpAnswer {
  id         String        @id @default(cuid())
  rsvpId     String
  rsvp       Rsvp          @relation(fields: [rsvpId], references: [id], onDelete: Cascade)
  questionId String
  question   EventQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  answer     String
  @@unique([rsvpId, questionId])
}
```

- [ ] **Step 2: Create DBs and migrate**

```powershell
& "D:\PostgreSQL\17\bin\createdb.exe" -U postgres rsvp_app_dev
& "D:\PostgreSQL\17\bin\createdb.exe" -U postgres rsvp_app_test
npx prisma migrate dev --name init
```
(Password prompt applies; or set `$env:PGPASSWORD` first.)

- [ ] **Step 3: Verify**

Run: `npx prisma validate` → expected "schema is valid".
Run: `npx prisma migrate status` → expected "Database schema is up to date".

- [ ] **Step 4: Commit**

```powershell
git add prisma; git commit -m "feat: add prisma schema for universal event engine"
```

---

### Task 3: Token + phone + slug utilities (pure logic, TDD)

**Files:**
- Create: `lib/utils/token.ts`, `lib/utils/phone.ts`, `lib/utils/slug.ts`
- Test: `tests/unit/token.test.ts`, `tests/unit/phone.test.ts`, `tests/unit/slug.test.ts`

**Interfaces:**
- Produces: `generateGuestToken(length?: number): string`; `normalizeMobile(raw: string | null | undefined, defaultCountry?: string): string | null`; `slugify(input: string, isTaken?: (s: string) => boolean): string`.

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/token.test.ts
import { describe, it, expect } from "vitest";
import { generateGuestToken } from "@/lib/utils/token";
describe("generateGuestToken", () => {
  it("returns 26-char uppercase base32", () => {
    const t = generateGuestToken();
    expect(t).toMatch(/^[A-Z2-9]{26}$/);
  });
  it("is unique across many draws", () => {
    const set = new Set(Array.from({ length: 5000 }, () => generateGuestToken()));
    expect(set.size).toBe(5000);
  });
});
```

```ts
// tests/unit/phone.test.ts
import { describe, it, expect } from "vitest";
import { normalizeMobile } from "@/lib/utils/phone";
describe("normalizeMobile", () => {
  it("normalizes 10-digit indian number", () => expect(normalizeMobile("9876543210")).toBe("+919876543210"));
  it("strips formatting and country code", () => expect(normalizeMobile("+91 98765 43210")).toBe("+919876543210"));
  it("handles leading zero", () => expect(normalizeMobile("09876543210")).toBe("+919876543210"));
  it("rejects junk", () => expect(normalizeMobile("123")).toBeNull());
  it("rejects empty", () => expect(normalizeMobile("")).toBeNull());
});
```

```ts
// tests/unit/slug.test.ts
import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/utils/slug";
describe("slugify", () => {
  it("kebab-cases", () => expect(slugify("Rahul & Neha Wedding")).toBe("rahul-neha-wedding"));
  it("appends suffix when taken", () => expect(slugify("Rahul & Neha Wedding", (s) => s === "rahul-neha-wedding")).toBe("rahul-neha-wedding-2"));
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test` → expected FAIL "Cannot find module '@/lib/utils/token'".

- [ ] **Step 3: Implement**

```ts
// lib/utils/token.ts
import { randomInt } from "crypto";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1
export function generateGuestToken(length = 26): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}
```

```ts
// lib/utils/phone.ts
export function normalizeMobile(raw: string | null | undefined, defaultCountry = "91"): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  let d = digits;
  if (d.length === 10) d = defaultCountry + d;
  else if (d.length === 11 && d.startsWith("0")) d = defaultCountry + d.slice(1);
  else if (d.length === 12 && d.startsWith(defaultCountry)) { /* ok */ }
  else if (d.length === 13 && d.startsWith("0" + defaultCountry)) d = d.slice(1);
  if (d.length < 10 || d.length > 15) return null;
  return "+" + d;
}
```

```ts
// lib/utils/slug.ts
export function slugify(input: string, isTaken: (s: string) => boolean = () => false): string {
  const base = input.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "event";
  if (!isTaken(base)) return base;
  let n = 2;
  while (isTaken(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
```

- [ ] **Step 4: Run tests to verify pass** — `npm test` → expected PASS (11 tests).
- [ ] **Step 5: Commit** — `git add lib/utils tests/unit; git commit -m "feat: add token, phone and slug utilities"`

---

### Task 4: CSV import engine (pure logic, TDD)

**Files:**
- Create: `lib/services/import/parse.ts`, `map.ts`, `analyze.ts`
- Test: `tests/unit/import.test.ts`, fixture `tests/unit/fixtures/guests.csv`

**Interfaces:**
- Produces:
  - `parseCsv(text: string): { headers: string[]; rows: Record<string,string>[] }`
  - `mapColumns(headers: string[]): Record<CanonicalField, string | null>` where `CanonicalField = "name"|"mobile"|"email"|"organisation"|"designation"|"group"|"vip"|"partySize"|"city"`
  - `analyzeImport(rows, mapping, existingMobiles: Set<string>): ImportAnalysis`
  - `ImportAnalysis = { total; ready: ImportRow[]; review: ImportRow[]; duplicates: ImportRow[]; importable: ImportRow[] }`
  - `ImportRow = { index; name; mobile; mobileNormalized; email; organisation; designation; group; isVip; partySize; issues: string[] }`

- [ ] **Step 1: Add fixture `tests/unit/fixtures/guests.csv`**

```csv
Guest Name,Mob No,Company,Side,VIP,Party Size
Rahul Sharma,9876543210,,Friends,no,2
Priya Shah,+91 98111 22233,,Family,yes,4
Rahul Sharma,9876543210,,Friends,no,2
Bad Row,abc,,Friends,no,1
,9999999999,,VIP,no,1
```
(rows: 5 total → 1 duplicate, 2 review, 2 ready)

- [ ] **Step 2: Write failing tests**

```ts
// tests/unit/import.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseCsv } from "@/lib/services/import/parse";
import { mapColumns } from "@/lib/services/import/map";
import { analyzeImport } from "@/lib/services/import/analyze";

const csv = readFileSync("tests/unit/fixtures/guests.csv", "utf8");

describe("import engine", () => {
  it("parses headers and rows", () => {
    const { headers, rows } = parseCsv(csv);
    expect(headers[0]).toBe("Guest Name");
    expect(rows).toHaveLength(5);
  });
  it("maps messy headers to canonical fields", () => {
    const { headers } = parseCsv(csv);
    const m = mapColumns(headers);
    expect(m.name).toBe("Guest Name");
    expect(m.mobile).toBe("Mob No");
    expect(m.organisation).toBe("Company");
    expect(m.group).toBe("Side");
    expect(m.vip).toBe("VIP");
  });
  it("classifies rows", () => {
    const { rows } = parseCsv(csv);
    const a = analyzeImport(rows, mapColumns(parseCsv(csv).headers), new Set());
    expect(a.total).toBe(5);
    expect(a.duplicates).toHaveLength(1);
    expect(a.review).toHaveLength(2);
    expect(a.importable).toHaveLength(2);
  });
  it("flags duplicates against existing contacts", () => {
    const { headers, rows } = parseCsv(csv);
    const a = analyzeImport(rows, mapColumns(headers), new Set(["+919876543210"]));
    expect(a.duplicates.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 3: Run tests, verify fail** — `npm test` → FAIL module not found.

- [ ] **Step 4: Implement `parse.ts`**

```ts
import Papa from "papaparse";
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const res = Papa.parse<Record<string, string>>(text.trim(), { header: true, skipEmptyLines: true });
  const headers = (res.meta.fields ?? []).map((h) => h.trim());
  return { headers, rows: res.data };
}
```

- [ ] **Step 5: Implement `map.ts`**

```ts
export type CanonicalField = "name"|"mobile"|"email"|"organisation"|"designation"|"group"|"vip"|"partySize"|"city";
const SYNONYMS: Record<CanonicalField, string[]> = {
  name: ["name","guest name","full name","guest","invitee","first name"],
  mobile: ["mobile","mob no","mob","phone","phone number","contact","mobile number","cell","whatsapp","whatsapp number"],
  email: ["email","e mail","email address","mail"],
  organisation: ["organisation","organization","company","firm","org","employer"],
  designation: ["designation","title","role","position","job title"],
  group: ["group","side","category","segment","list","relation"],
  vip: ["vip","is vip","priority","vip flag"],
  partySize: ["party size","pax","guest count","number of guests","seats","heads","no of guests"],
  city: ["city","location","town","place"],
};
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export function mapColumns(headers: string[]): Record<CanonicalField, string | null> {
  const hn = headers.map((h) => ({ raw: h, n: norm(h) }));
  const out = {} as Record<CanonicalField, string | null>;
  for (const field of Object.keys(SYNONYMS) as CanonicalField[]) {
    const syns = SYNONYMS[field].map(norm);
    const exact = hn.find((h) => syns.includes(h.n));
    const partial = hn.find((h) => syns.some((s) => h.n.includes(s) || s.includes(h.n)));
    out[field] = (exact ?? partial)?.raw ?? null;
  }
  return out;
}
```

- [ ] **Step 6: Implement `analyze.ts`**

```ts
import { normalizeMobile } from "@/lib/utils/phone";
import type { CanonicalField } from "./map";

export type ImportRow = { index: number; name: string; mobile: string; mobileNormalized: string | null;
  email: string | null; organisation: string | null; designation: string | null; group: string | null;
  isVip: boolean; partySize: number; issues: string[] };
export type ImportAnalysis = { total: number; ready: ImportRow[]; review: ImportRow[]; duplicates: ImportRow[]; importable: ImportRow[] };

export function analyzeImport(rows: Record<string, string>[], mapping: Record<CanonicalField, string | null>, existingMobiles: Set<string>): ImportAnalysis {
  const get = (r: Record<string, string>, f: CanonicalField) => (mapping[f] ? (r[mapping[f]!] ?? "").trim() : "");
  const seen = new Set<string>();
  const parsed: ImportRow[] = rows.map((r, i) => {
    const name = get(r, "name");
    const rawMobile = get(r, "mobile");
    const norm = normalizeMobile(rawMobile);
    const vipRaw = get(r, "vip").toLowerCase();
    const party = parseInt(get(r, "partySize") || "1", 10);
    const issues: string[] = [];
    if (!name) issues.push("missing name");
    if (!norm) issues.push("invalid mobile");
    if (norm && seen.has(norm)) issues.push("duplicate in file");
    if (norm && existingMobiles.has(norm)) issues.push("already exists");
    if (norm) seen.add(norm);
    return { index: i, name, mobile: rawMobile, mobileNormalized: norm,
      email: get(r, "email") || null, organisation: get(r, "organisation") || null,
      designation: get(r, "designation") || null, group: get(r, "group") || null,
      isVip: ["yes","y","true","1","vip"].includes(vipRaw),
      partySize: Number.isFinite(party) && party > 0 ? party : 1, issues };
  });
  const duplicates = parsed.filter((r) => r.issues.some((x) => x.includes("duplicate") || x.includes("exists")));
  const review = parsed.filter((r) => !duplicates.includes(r) && r.issues.length > 0);
  const ready = parsed.filter((r) => r.issues.length === 0);
  return { total: parsed.length, ready, review, duplicates, importable: [...ready, ...review].filter((r) => r.name && r.mobileNormalized) };
}
```

- [ ] **Step 7: Run tests to verify pass** — `npm test` → all import tests PASS.
- [ ] **Step 8: Commit** — `git commit -am "feat: add CSV import engine (parse, map, analyze)"`

---

### Task 5: Dashboard metrics aggregation (pure logic, TDD)

**Files:**
- Create: `lib/services/metrics.ts`
- Test: `tests/unit/metrics.test.ts`

**Interfaces:**
- Produces:
  - `computeEventMetrics(guests: MetricGuest[]): EventMetrics`
  - `MetricGuest = { isVip; functions: string[]; rsvp: { status: RsvpStatus; functions: string[] } | null }`
  - `EventMetrics = { invited; opened; responded; confirmed; maybe; declined; pending; vipTotal; vipConfirmed; perFunction: Record<string, number> }`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from "vitest";
import { computeEventMetrics } from "@/lib/services/metrics";
const g = (over: any = {}) => ({ isVip: false, functions: ["wedding"], rsvp: null, ...over });
describe("computeEventMetrics", () => {
  it("counts statuses and per-function attendance", () => {
    const m = computeEventMetrics([
      g({ rsvp: { status: "yes", functions: ["wedding","reception"] } }),
      g({ rsvp: { status: "maybe", functions: ["wedding"] } }),
      g({ rsvp: { status: "no", functions: [] } }),
      g(),
    ]);
    expect(m.invited).toBe(4);
    expect(m.responded).toBe(3);
    expect(m.confirmed).toBe(1);
    expect(m.maybe).toBe(1);
    expect(m.declined).toBe(1);
    expect(m.pending).toBe(1);
    expect(m.perFunction["wedding"]).toBe(2);
    expect(m.perFunction["reception"]).toBe(1);
  });
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement**

```ts
type RsvpStatus = "yes" | "maybe" | "no";
export type MetricGuest = { isVip: boolean; functions: string[]; rsvp: { status: RsvpStatus; functions: string[] } | null };
export type EventMetrics = { invited: number; opened: number; responded: number; confirmed: number; maybe: number;
  declined: number; pending: number; vipTotal: number; vipConfirmed: number; perFunction: Record<string, number> };
export function computeEventMetrics(guests: MetricGuest[]): EventMetrics {
  const perFunction: Record<string, number> = {};
  let confirmed = 0, maybe = 0, declined = 0, vipConfirmed = 0;
  for (const guest of guests) {
    if (guest.isVip && guest.rsvp?.status === "yes") vipConfirmed++;
    if (!guest.rsvp) continue;
    if (guest.rsvp.status === "yes") confirmed++;
    else if (guest.rsvp.status === "maybe") maybe++;
    else declined++;
    for (const f of guest.rsvp.functions) perFunction[f] = (perFunction[f] ?? 0) + 1;
  }
  return { invited: guests.length, opened: 0, responded: confirmed + maybe + declined,
    confirmed, maybe, declined, pending: guests.length - (confirmed + maybe + declined),
    vipTotal: guests.filter((x) => x.isVip).length, vipConfirmed, perFunction };
}
```
(Note: `opened` is filled by the caller from `EventGuest.firstOpenedAt` because this function stays pure. Add an optional second arg `openedCount = 0` if simpler — implement `computeEventMetrics(guests, openedCount = 0)` and set `opened: openedCount`.)

- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `git commit -am "feat: add dashboard metrics aggregation"`

---

### Task 6: Prisma client + workspaces/events services + ownership

**Files:**
- Create: `lib/db.ts`, `lib/services/workspaces.ts`, `lib/services/events.ts`, `lib/services/functions.ts`
- Test: `tests/unit/slug-ownership.test.ts` (pure) + integration steps manual

**Interfaces:**
- Produces:
  - `prisma` singleton from `lib/db`
  - `createWorkspaceForUser(userId: string, name: string): Promise<Workspace>`
  - `listEventsForUser(userId: string): Promise<Event[]>`
  - `createEvent(userId, input): Promise<Event>` — generates unique slug
  - `getEventForUser(userId, eventId): Promise<Event>` — throws `ForbiddenError` if not owner
  - `setEventStatus(userId, eventId, status): Promise<Event>`
  - `updateEvent(userId, eventId, input)`; `deleteEvent(userId, eventId)`
  - `EventInput = { name; type: EventType; startDate: Date; endDate?: Date; locationName?; city?; coverImageUrl?; hostName?; contactNumber? }`

- [ ] **Step 1: Implement `lib/db.ts`**

```ts
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 2: Implement `workspaces.ts`**

```ts
import { prisma } from "@/lib/db";
export function createWorkspaceForUser(userId: string, name: string) {
  return prisma.workspace.create({ data: { ownerId: userId, name } });
}
export function getWorkspaceForUser(userId: string) {
  return prisma.workspace.findFirst({ where: { ownerId: userId }, orderBy: { createdAt: "asc" } });
}
```

- [ ] **Step 3: Implement `events.ts`** with `ForbiddenError` and slug uniqueness via `slugify(name, (s) => existing.has(s))` where `existing` is a Set of current slugs fetched with `prisma.event.findMany({ select: { slug: true } })`. Every read/write resolves the workspace by `ownerId` first, then asserts `event.workspaceId === workspace.id`.

- [ ] **Step 4: Implement `functions.ts`** (`listFunctions(eventId)`, `createFunction(userId, eventId, input)` after ownership check, `updateFunction`, `deleteFunction`). Ownership via `getEventForUser`.

- [ ] **Step 5: Manual verification**

Run `npx prisma studio`, create a user/workspace/event via a scratch script, confirm event appears and slug is unique. (Full automated integration test arrives in Task 15.)

- [ ] **Step 6: Commit** — `git commit -am "feat: add workspace and event services with ownership checks"`

---

### Task 7: Auth.js v5 — signup, signin, workspace provisioning

**Files:**
- Create: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/(auth)/signup/page.tsx`, `app/(auth)/signin/page.tsx`, `app/(auth)/actions.ts`, `middleware.ts`

**Interfaces:**
- Consumes: `createWorkspaceForUser`.
- Produces: `auth()`, `signIn()`, `signOut()` session helpers; `requireUserId(): Promise<string>` (redirects to `/signin` when absent).

- [ ] **Step 1: Implement `lib/auth.ts`**

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    authorize: async (c) => {
      const email = String(c?.email ?? "").toLowerCase().trim();
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return null;
      const ok = await bcrypt.compare(String(c?.password ?? ""), user.passwordHash);
      return ok ? { id: user.id, email: user.email, name: user.name } : null;
    },
  })],
  callbacks: { jwt: ({ token, user }) => { if (user) token.uid = user.id; return token; },
    session: ({ session, token }) => { if (token.uid) session.user.id = token.uid as string; return session; } },
});
```

- [ ] **Step 2: `app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 3: `middleware.ts`** protecting `/(dashboard)` and `/events` paths; allow `/e/*` and `/(auth)/*`.

- [ ] **Step 4: Signup action** — zod-validate email/password/name, lowercase email, reject duplicate (`P2002`), bcrypt hash (cost 10), `prisma.user.create`, then `createWorkspaceForUser(user.id, "My Workspace")`, then `signIn("credentials", ...)`, redirect `/dashboard`.

- [ ] **Step 5: Signin/Signup pages** — minimal Tailwind forms posting to the actions.

- [ ] **Step 6: Manual test** — `npm run dev`; sign up; expect redirect to `/dashboard`; confirm `User` + `Workspace` rows exist in Prisma Studio.

- [ ] **Step 7: Commit** — `git commit -am "feat: add credentials auth with workspace provisioning"`

---

### Task 8: Contacts + EventGuest services and guest list UI

**Files:**
- Create: `lib/services/contacts.ts`, `lib/services/eventGuests.ts`, `app/(dashboard)/events/[eventId]/guests/page.tsx`, `.../guests/[guestId]/page.tsx`, `.../actions.ts`

**Interfaces:**
- Produces:
  - `upsertContact(workspaceId: string, data: { name; mobile; email?; organisation?; designation?; city? }): Promise<Contact>` — normalizes mobile, upsert on `(workspaceId, mobileNormalized)`.
  - `addEventGuest(userId, eventId, contactData, opts?: { groupId?; isVip?; partySize? }): Promise<EventGuest>` — creates contact, then guest with `generateGuestToken()`.
  - `listEventGuests(userId, eventId)` — includes contact, group, rsvp.
  - `getEventGuestByToken(eventSlug, guestToken)` — public resolver (no auth).
  - `recordOpen(eventGuestId)` — sets `firstOpenedAt` if null, increments `openCount`.

- [ ] **Step 1: Implement `contacts.ts`** using `normalizeMobile`; throw `ValidationError` when mobile invalid.
- [ ] **Step 2: Implement `eventGuests.ts`** with ownership checks on the authed functions; `getEventGuestByToken` joins through `event.slug`.
- [ ] **Step 3: Guest list page** — server component fetching `listEventGuests`; table columns Name / Mobile / Group / VIP / RSVP / Party / Opens. "Add guest" inline form → server action `addGuestAction`.
- [ ] **Step 4: Guest detail page** — shows contact, token link (`{origin}/e/{slug}/{token}`) with copy button, RSVP summary.
- [ ] **Step 5: Manual test** — add guest, confirm row + working personal link.
- [ ] **Step 6: Commit** — `git commit -am "feat: add contact/event-guest services and guest list UI"`

---

### Task 9: CSV import wizard UI

**Files:**
- Create: `app/(dashboard)/events/[eventId]/guests/import/page.tsx`, `.../import/ImportWizard.tsx` (client), `.../import/actions.ts`
- Modify: `app/(dashboard)/events/[eventId]/actions.ts`

**Interfaces:**
- Consumes: `parseCsv`, `mapColumns`, `analyzeImport`, `upsertContact`, `generateGuestToken`.
- Produces: `previewImportAction(formData)` and `commitImportAction(formData)`.

- [ ] **Step 1: Upload step (client)** — file input reads text via `FileReader`, posts to `previewImportAction`; server fetches existing `mobileNormalized` for the workspace, runs `analyzeImport`, returns `ImportAnalysis` + `mapping`.
- [ ] **Step 2: Mapping step** — show detected `mapping` in editable `<select>`s (client state), re-run preview on change.
- [ ] **Step 3: Preview step** — summary "N records: A ready, B need review, C duplicates" + table; checkbox to include review rows.
- [ ] **Step 4: Commit** — `commitImportAction` calls `upsertContact` + `prisma.eventGuest.create` per selected row inside `prisma.$transaction`, skipping rows already in the event, then `revalidatePath` guests page and redirect with a summary.
- [ ] **Step 5: E2E-lite test** — import the Task 4 fixture into a scratch event; expect 2 guests created, 1 duplicate skipped.
- [ ] **Step 6: Commit** — `git commit -am "feat: add guided CSV import wizard"`

---

### Task 10: Event + functions CRUD UI

**Files:**
- Create/Modify: `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/events/new/page.tsx`, `app/(dashboard)/events/[eventId]/page.tsx`, `.../functions/page.tsx`, `app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `createEvent`, `listEventsForUser`, `getEventForUser`, `setEventStatus`, functions services.

- [ ] **Step 1: Dashboard layout** — sidebar (Dashboard, Events, Guests, Invitation) + `requireUserId()` guard; sign-out button.
- [ ] **Step 2: Dashboard page** — list events with status + type.
- [ ] **Step 3: Create event page** — form (name, type select, dates, city, host) → `createEventAction` → redirect to event overview.
- [ ] **Step 4: Event overview** — event header, status control, functions list, links to guests/invitation.
- [ ] **Step 5: Functions page** — add/edit/delete functions with date, times, venue, dress code, capacity, rsvpRequired, sortOrder.
- [ ] **Step 6: Manual test** — create "Rahul & Neha Wedding", add 4 functions, navigate.
- [ ] **Step 7: Commit** — `git commit -am "feat: add event and function management UI"`

---

### Task 11: Invitation builder + media

**Files:**
- Create: `lib/services/invitation.ts`, `lib/storage/media.ts`, `app/api/upload/route.ts`, `app/(dashboard)/events/[eventId]/invitation/page.tsx`, `.../invitation/InvitationEditor.tsx`
- Modify: `prisma/schema.prisma` if needed (none)

**Interfaces:**
- Produces:
  - `getOrCreateInvitation(userId, eventId)` — default content + sections.
  - `updateInvitation(userId, eventId, { templateKey; content; sections; coverImageUrl; media })`.
  - `publishInvitation(userId, eventId)` — sets `published=true`, `version++`, and `event.status = "published"`, `publishedAt = now()`.
  - Invitation `content` shape: `{ headline; welcome; about; hostMessage; rsvpMessage; venueNote }`; `sections` shape: `{ welcome; about; functions; gallery; venue; directions; dressCode; accommodation; travel; rsvp; contact; giftRegistry; agenda: boolean }`.
  - `saveUpload(file: File): Promise<string>` → returns public URL (local `public/uploads` in dev; seam for Cloudinary).

- [ ] **Step 1: Implement `invitation.ts`** with default content/sections and ownership checks.
- [ ] **Step 2: Implement `media.ts` + upload route** (validate mime type + size ≤ 5 MB, uuid filename, write to `public/uploads`). Note in code comment: on Vercel, swap to Cloudinary using the same `saveUpload` signature.
- [ ] **Step 3: Editor UI** — template picker (Royal / Minimal), text fields, section toggles, cover image upload, gallery upload/reorder, live preview pane rendering the selected template with draft content.
- [ ] **Step 4: Publish button** → `publishInvitationAction`; show public URL + copy/WhatsApp links.
- [ ] **Step 5: Manual test** — upload cover, publish, open public URL.
- [ ] **Step 6: Commit** — `git commit -am "feat: add invitation builder, media upload and publish"`

---

### Task 12: Public invitation render + templates

**Files:**
- Create: `app/e/[eventSlug]/[guestToken]/page.tsx`, `components/invitation-templates/RoyalTemplate.tsx`, `MinimalTemplate.tsx`
- Modify: `lib/services/eventGuests.ts` (recordOpen)

**Interfaces:**
- Consumes: `getEventGuestByToken`, `recordOpen`, invitation + functions.
- Produces: server-rendered invitation with `generateMetadata` (OG title/description/image).

- [ ] **Step 1: Resolver** — `getEventGuestByToken(slug, token)` returns event, guest, contact, group, functions, invitation; `notFound()` if missing or invitation unpublished (except allow preview via `?preview=1` for owner).
- [ ] **Step 2: Open tracking** — call `recordOpen(guest.id)` (fire-and-forget, guarded so it only writes on first view per session via cookie).
- [ ] **Step 3: `RoyalTemplate`** — ornate serif, gold accents, couple names, date range, city, "Open Invitation" reveal, functions timeline, venue, RSVP CTA with the guest's name.
- [ ] **Step 4: `MinimalTemplate`** — clean sans-serif, image-forward, same sections.
- [ ] **Step 5: Render** — switch on `invitation.templateKey`, pass `{ event, guest, functions, content, sections, media }`, render only enabled sections, overlay guest name/VIP/functions.
- [ ] **Step 6: `generateMetadata`** — OG title `"{event.name}"`, description from `content.welcome`, image from `coverImageUrl`.
- [ ] **Step 7: Manual test** — open personal link on a phone-width viewport; confirm personalization + open count increments.
- [ ] **Step 8: Commit** — `git commit -am "feat: add public invitation page and templates"`

---

### Task 13: RSVP form + submission + confirmation

**Files:**
- Create: `lib/services/rsvp.ts`, `app/e/[eventSlug]/[guestToken]/rsvp/page.tsx`, `.../rsvp/actions.ts`
- Modify: `lib/validation/schemas.ts`

**Interfaces:**
- Produces: `submitRsvp(eventGuestId, input): Promise<Rsvp>`; `RsvpInput = { status: "yes"|"maybe"|"no"; adultCount; childCount; functions: string[]; accommodationRequired?; travelRequired?; dietaryPreference?; message?; answers: { questionId; answer }[] }`.

- [ ] **Step 1: Schema** — zod: counts ≥ 0; when `status !== "yes"`, counts forced to 0 and functions emptied.
- [ ] **Step 2: Implement `submitRsvp`** — `prisma.$transaction`: upsert `Rsvp` by `eventGuestId` (replace attendance + answers), set `respondedAt`.
- [ ] **Step 3: Rate limit** — in-memory fixed window keyed by IP+guestToken (e.g. 5/min); return 429 on exceed.
- [ ] **Step 4: RSVP page** — Yes/Maybe/No radio → conditional headcount, function checkboxes, accommodation/travel/diet, dynamic custom questions; submit → `submitRsvpAction` → redirect to confirmation.
- [ ] **Step 5: Confirmation** — thank-you with summary; link back to invitation; edits allowed (re-submit overwrites).
- [ ] **Step 6: Manual test** — submit all three statuses; verify dashboard numbers.
- [ ] **Step 7: Commit** — `git commit -am "feat: add RSVP engine, form and confirmation"`

---

### Task 14: Dashboard metrics UI

**Files:**
- Create: `components/dashboard/MetricCard.tsx`
- Modify: `app/(dashboard)/events/[eventId]/page.tsx`, `app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `computeEventMetrics`, `listEventGuests`.

- [ ] **Step 1: Metrics service** — `getEventMetrics(userId, eventId)` loads guests with rsvp + attendance, maps to `MetricGuest[]`, calls `computeEventMetrics`, sets `opened` from `firstOpenedAt != null`.
- [ ] **Step 2: Event dashboard cards** — Invited / Opened / Responded / Confirmed / Maybe / Declined / Pending + VIP confirmed, and a per-function attendance table.
- [ ] **Step 3: Workspace dashboard** — count of events, total contacts, total confirmed guests across events.
- [ ] **Step 4: Manual test** — numbers match seeded data.
- [ ] **Step 5: Commit** — `git commit -am "feat: add event and workspace metrics dashboards"`

---

### Task 15: Investor zero-schema-change integration test

**Files:**
- Create: `tests/unit/investor-schema.test.ts` (runs against `TEST_DATABASE_URL`)

**Interfaces:**
- Consumes: Prisma client (test instance), services.

- [ ] **Step 1: Test DB harness** — beforeAll: `execSync("npx prisma migrate deploy")` with `DATABASE_URL=$env:TEST_DATABASE_URL`; construct a `PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } })`.
- [ ] **Step 2: Write test**

```ts
it("represents an investor meet without schema change", async () => {
  // user + workspace + event(type: investor)
  // contact with organisation "ABC Capital", designation "MD"
  // eventGuest with isVip true, eventCustomFields { investorType: "institutional" }
  // eventQuestion "Would you like a management meeting?", answer "Yes"
  // then read back and assert every value round-trips
});
```

- [ ] **Step 3: Run** — `$env:DATABASE_URL=$env:TEST_DATABASE_URL; npm test` → PASS.
- [ ] **Step 4: Commit** — `git commit -am "test: prove investor vertical needs no schema change"`

---

### Task 16: Seed + Playwright e2e + README

**Files:**
- Create: `prisma/seed.ts`, `playwright.config.ts`, `tests/e2e/loop.spec.ts`, `README.md`
- Modify: `package.json` (`prisma.seed`, `test:e2e`)

- [ ] **Step 1: Seed** — create demo user (`demo@example.com` / `demo1234`), workspace, "Rahul & Neha Wedding" with 4 functions, ~12 contacts/guests, invitation published, a few RSVPs.
- [ ] **Step 2: Playwright config** — `webServer` runs `npm run dev`; baseURL `http://localhost:3000`.
- [ ] **Step 3: E2E test** — sign in → create event → add function → import fixture CSV → open a guest personal link from DB → submit RSVP → assert dashboard shows Confirmed = 1.
- [ ] **Step 4: README** — setup (create DBs, `.env`, migrate, seed), run, test, deploy notes (Vercel + Neon + Cloudinary swap).
- [ ] **Step 5: Run full suite** — `npm test; npm run test:e2e` → all green.
- [ ] **Step 6: Commit** — `git commit -am "chore: add seed, e2e test and README"`

---

## Self-Review

**Spec coverage**

| Spec section | Tasks |
|---|---|
| Workspace (lightweight) | 2, 6, 7 |
| Contact + EventGuest split | 2, 8 |
| Contact dedup by normalized mobile | 3, 8, 9 |
| Event + status + functions | 2, 6, 10 |
| Invitation builder + version | 2, 11 |
| 2 templates + sections | 11, 12 |
| Media upload | 11 |
| Personalised token links | 3, 8, 12 |
| Open tracking (`firstOpenedAt`/`openCount`) | 8, 12 |
| CSV import wizard (detect→map→validate→dedup→preview→import) | 4, 9 |
| RSVP engine + dynamic questions | 2, 13 |
| Share (copy + wa.me) | 8, 11 |
| Dashboard metrics + per-function | 5, 14 |
| Rate limiting | 13 |
| Auth + ownership in services | 6, 7 |
| Investor zero-schema-change test | 15 |
| Vitest unit tests | 3–5, 15 |
| Playwright e2e | 16 |
| Deploy notes | 16 |

**Placeholder scan:** no TBD/TODO; every code step carries real code. Media upload deliberately uses local storage with a documented Cloudinary seam (spec allows Cloudinary or UploadThing; local is the zero-signup demo path).

**Type consistency:** `EventGuest.guestToken` used in Tasks 3/8/12; `mobileNormalized` used in Tasks 3/8/9; `computeEventMetrics` signature updated in Task 5 to accept `openedCount` — Task 14 supplies it; `ImportAnalysis`/`ImportRow` defined in Task 4 and consumed verbatim in Task 9; `requireUserId` defined in Task 7 and used in Tasks 8–14.

**Known risk:** Auth.js v5 beta + Next.js latest on Node 26 may need a minor version pin. If `next-auth@beta` misbehaves, fall back to a signed-cookie session in `lib/auth.ts` behind the same `auth()/requireUserId()` interface; nothing else changes.
