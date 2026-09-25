# Tenant Isolation Tests — Design

**Date:** 2026-09-24
**Status:** Approved
**Project root:** `D:\AAAA_MYPROJECT\RSVP_App`

## 1. Goal

Turn "each organiser's events are private" into a **provable, regression-proof** claim by adding an automated cross-tenant isolation test. If anyone ever removes an ownership check, this test fails.

No production code changes. The known-password demo account is **kept by decision** (it is scoped to its own workspace, so only the demo event is exposed, not other tenants' data).

## 2. Scope

- New integration test: `tests/unit/tenant-isolation.test.ts`.
- No schema, service or UI changes.
- Follows the existing integration-test pattern (`guest-edit.test.ts`): set `process.env.DATABASE_URL = TEST_DATABASE_URL`, then dynamic-import services so the Prisma singleton points at the test database.

## 3. What is tested

Two unrelated users (A, B), each with their own workspace, event, guest, function, invitation and question.

Read access:
- `getEventForUser(B, eventA)` — throws
- `getEventDetail(B, eventA)` — throws
- `listEventsForUser(B)` — returns only B's events
- `listEventGuests(B, eventA)` — throws
- `getEventGuestDetail(B, eventA, guestA)` — throws
- `getEventGuestDetail(B, eventB, guestA)` — null (cannot reach A's guest by id)
- `getEventMetrics(B, eventA)` — throws
- `getWorkspaceSummary(B)` — counts only B's data

Write access:
- `updateEventGuest(B, eventA, guestA, …)` — throws
- `deleteEventGuest(B, eventA, guestA)` — throws
- `createFunction` / `updateFunction` / `deleteFunction` on eventA — throws
- `getOrCreateInvitation` / `updateInvitation` / `publishInvitation` on eventA — throws
- `listQuestions` / `createQuestion` / `updateQuestion` / `deleteQuestion` on eventA — throws

## 4. Out of scope

Email verification, password reset, durable rate limiting, demo-account removal, per-tenant branding. Separate future increments.
