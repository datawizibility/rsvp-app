# Account Hardening (No Email) — Design

**Date:** 2026-09-25
**Status:** Approved
**Project root:** `D:\AAAA_MYPROJECT\RSVP_App`

## 1. Goal

Make organiser accounts safer without introducing any email dependency. Two capabilities:

1. A logged-in user can **change their password**.
2. **Rate limiting** becomes durable (Postgres-backed) instead of per-instance in-memory.

Email-dependent features (password reset, email verification) are deliberately deferred until a sending domain is available.

## 2. Scope

**In scope**
- `changePassword` service + `/account/password` page and form.
- `Account` link in the dashboard navigation.
- `RateLimit` model + `checkRateLimit` service.
- Apply rate limiting to sign-up, sign-in and RSVP submission (replacing the in-memory limiter in the RSVP action).

**Out of scope (deferred)**
- Password reset via email.
- Email verification.
- Both are deferred until a sending domain exists. The future seam is `lib/email/send.ts` with a `sendEmail({ to, subject, text })` interface; the console transport means no account or domain is needed to build it, but it is not built in this increment.

## 3. Data model

One new table. No changes to existing tables.

```
RateLimit
  key       String   @id        // e.g. "signin:1.2.3.4:user@x.com"
  count     Int      @default(0)
  expiresAt DateTime
  @@index([expiresAt])
```

A fixed-window counter: `key` identifies the subject, `expiresAt` marks the end of the window. Rows are reused by upsert; expired rows are effectively reset on next use. A periodic cleanup is unnecessary for launch scale.

## 4. Change password

**Service:** `lib/services/accounts.ts`

```
changePassword(userId: string, current: string, next: string): Promise<void>
```

Rules (implemented as a pure `validateNewPassword(current, next)` helper, so policy is unit-testable without a database):
- Load the user; `bcrypt.compare(current, user.passwordHash)` must pass, else throw `ValidationError("Current password is incorrect")`.
- `next` must be at least 8 characters, else `ValidationError`.
- `next` must differ from `current`, else `ValidationError("New password must be different")`.
- Store `bcrypt.hash(next, 10)`.

**Route:** `/account/password` (inside the dashboard layout, so auth-guarded). A client form posts to `changePasswordAction` (thin server action: `requireUserId` → zod validate → service → success message). A successful change keeps the user signed in.

**Navigation:** add an `Account` link to `app/(dashboard)/layout.tsx`.

## 5. Rate limiting

**Service:** `lib/services/rateLimit.ts`

```
checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean>
```

Fixed-window algorithm:
- If no row or the row is expired → upsert `count = 1`, `expiresAt = now + windowMs`, return `true`.
- Else if `count >= limit` → return `false`.
- Else increment `count`, return `true`.

Keys and limits:
- `signup:<ip>` — 5 per 60 s
- `signin:<ip>:<email>` — 5 per 60 s
- `rsvp:<ip>:<guestToken>` — 5 per 60 s

The IP is read from `x-forwarded-for` (first hop), falling back to `"local"`. Rate limits are checked **before** any password hashing or DB work. When a limit is hit, the action returns a friendly "Too many attempts, try again in a minute" message (RSVP keeps its current message).

## 6. Testing

**Unit** (`tests/unit/password-policy.test.ts`)
- `validateNewPassword(current, next)` returns ok for a valid, different, ≥ 8-char password.
- Rejects short passwords.
- Rejects a password equal to the current one.

**Integration** (`tests/unit/account-hardening.test.ts`, against `TEST_DATABASE_URL`)
- `changePassword` with the wrong current password throws and leaves the hash unchanged.
- `changePassword` with the correct current password updates the hash: the new password verifies, the old one does not.
- `checkRateLimit` allows `limit` calls, rejects `limit + 1`, and allows again after the window expires (window set short for the test).

A small pure `validateNewPassword` (introduced in §4) is what makes the policy rules unit-testable without a database.

## 7. Risks / notes

- Fixed-window rate limiting is approximate (a burst can straddle two windows). Acceptable for abuse mitigation at launch scale.
- Rate-limit rows grow with unique keys; trivial at current scale, and a cleanup query can be added later.
- `changePassword` does not invalidate other sessions (JWT strategy). Documented as a future improvement.
