# API Reference

Every HTTP endpoint the backend exposes, for whoever's building the frontend. Companion to [ARCHITECTURE.md](ARCHITECTURE.md). Source of truth is always the code in `apps/api/src/modules/**/*.controller.ts` — if this drifts from that, trust the code.

- **Base URL (dev):** `http://localhost:3000` (configurable via `PORT`)
- **Format:** JSON over HTTP
- **Auth:** Bearer JWT

## Getting started

1. Get the backend running locally — see [README.md](README.md).
2. Point your frontend's API base URL at an env var (`VITE_API_URL`, `NEXT_PUBLIC_API_URL`, etc.), not a hardcoded string.
3. **CORS:** in dev, the API reflects whatever origin you call it from (`CORS_ORIGIN` unset). If you're getting CORS errors, confirm `NODE_ENV=development` on the backend, or ask for `CORS_ORIGIN` to include your dev server's origin explicitly.

## Authentication

Every route requires a JWT **except** the ones marked `Public` below. Send it as:

```
Authorization: Bearer <accessToken>
```

Get a token pair from `POST /auth/signup` or `POST /auth/login`:

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

**Login and signup bodies differ by role — CLIENT uses a handle, PROVIDER uses email:**

- **CLIENT** (default role): `{ "username": "quietoak42", "password": "..." }`. Providers aren't anonymous the way clients are (ARCHITECTURE.md §3), so this handle is a genuine pseudonym — it's what the whole app calls the person, and login is by handle only.
- **PROVIDER**: `{ "role": "PROVIDER", "email": "you@example.com", "password": "..." }`. Email is **required** on signup (400 `"A valid email is required to register as a provider..."` if missing/invalid) and is always the login identifier — a `username` sent alongside it is optional and only used as an internal/admin-facing display label, never for login. Stored encrypted in the vault, looked up via a deterministic hash, never returned in plaintext by any endpoint except `GET /users/me` for the owning provider themselves.
- **ADMIN**: exactly one of the two above at signup (there's no self-service ADMIN role) — an existing account gets promoted directly in the database, same for the `staffRole` sub-scope (ARCHITECTURE.md §9a) unless assigned via `POST /admin/users/:userId/staff-role` by a `SUPER_ADMIN`.

Login always sends **exactly one** of `username`/`email` (whichever the account was created with) — never both:

```
POST /auth/login
{ "username": "quietoak42", "password": "..." }        // CLIENT
{ "email": "you@example.com", "password": "..." }       // PROVIDER / ADMIN-via-provider
```

Access tokens expire in 15 minutes by default (`JWT_ACCESS_TTL`), refresh tokens in 30 days (`JWT_REFRESH_TTL`) — both configurable on the backend. On a 401 from an expired access token:

```
POST /auth/refresh
{ "refreshToken": "..." }
→ { "accessToken": "...", "refreshToken": "..." }   // both rotate — store the new pair
```

**Roles:** `CLIENT`, `PROVIDER`, or `ADMIN`, embedded in the JWT. Signup only accepts `CLIENT`/`PROVIDER` (defaults to `CLIENT`) — there's no self-service path to `ADMIN`. Routes tagged with a role below 403 for any other role.

> **The user's real name, email, and phone never appear in any API response.** Every `id`/`userId`/`clientId`/`providerId` is a pseudonymous UUID by design (see ARCHITECTURE.md §3). Provider display names come from `displayName` on the provider profile.

## Conventions

**Error shape** — every error, every endpoint:

```json
{
  "statusCode": 404,
  "message": "Provider not found",
  "path": "/providers/abc-123",
  "timestamp": "2026-08-09T12:00:00.000Z"
}
```

`message` is a **string** for ordinary errors, and a **string array** for 400 validation failures:

```json
{
  "statusCode": 400,
  "message": [
    "username may only contain letters, numbers, and underscores",
    "password must be at least 10 characters"
  ],
  "path": "/auth/signup",
  "timestamp": "..."
}
```

Safe generic handler: `Array.isArray(body.message) ? body.message.join(', ') : body.message`.

**Other conventions**
- IDs are UUID strings; dates are ISO-8601 strings; money is a plain number in **KES major units** (`500` = KSh 500, not cents).
- Request bodies are validated strictly — unknown fields are **rejected** (400), not dropped.
- Rate limits: 100 req/min per IP by default; `/auth/*` is limited to 20 req/min, the M-Pesa pay/payout/subscription endpoints to 3 req/min — expect 429s if you're hammering them in a test loop.
- `createdAt`/`updatedAt` are present on most records even where omitted from the shapes below.

---

## Users

### `GET /users/me` — Authenticated

Your own profile.

```json
{
  "id": "uuid", "username": "quietoak42", "role": "CLIENT",
  "status": "ACTIVE", "createdAt": "...",
  "providerProfile": null,
  "clientProfile": null
}
```

### Progressive reveal (client-controlled)

Scoped grants — counselors only see what an **active** grant projects. Revoke is future-only. Names/photo on the grant are a client-supplied projection (vault PII stays vaulted).

| Endpoint | Role | Notes |
|---|---|---|
| `GET /users/me/reveals` | `CLIENT` | Your grants |
| `POST /users/me/reveals` | `CLIENT` | Body: `{ providerId, bookingId?, level, firstName?, fullName?, photoUrl? }` · `level`: `ANONYMOUS` \| `FIRST_NAME` \| `FULL_NAME` \| `NAME_PHOTO` |
| `POST /users/me/reveals/:id/revoke` | `CLIENT` | Deactivates for future sessions |
| `GET /providers/me/reveals` | `PROVIDER` | Active grants aimed at you |

---

## Providers

Provider profiles are public/pseudonymous — `userId` doubles as the provider's public ID used in booking calls.

### `GET /providers?specialty=` — Public

Browse published, verified providers. `specialty` query param optional.

```json
[{
  "userId": "uuid", "displayName": "Coach Dave", "bio": null,
  "specialties": ["career"],
  "rateCard": { "minimumRate": 500, "hourlyRate": 1500 },
  "availability": null
}]
```

### `GET /providers/:id` — Public
Single profile, same shape. 404 if not found/not published.

### `POST /providers/me/verification` — Role: `PROVIDER`
Submit credentials for admin review. Required before publishing a profile.

| field | type | notes |
|---|---|---|
| `licenseNumber` | string | required |
| `documentRefs` | object | optional |
| `verifyingBody` | string | optional |
| `expiryDate` | ISO date | optional |

→ `201 { "id": "uuid" }`

### `PUT /providers/me` — Role: `PROVIDER`
Publish/update your profile (upsert).

| field | type | notes |
|---|---|---|
| `displayName` | string | required, 2+ chars |
| `bio` | string | optional |
| `specialties` | string[] | required |
| `rateCard` | `{ minimumRate, hourlyRate }` | optional, but required before clients can pay |
| `availability` | object | optional, free-form |

- `403` — not verified yet (message tells the user exactly what to do next, safe to show directly)

### `PATCH /providers/me/availability` — Role: `PROVIDER`
Body: `{ "availability": { ... } }`. `404` if no profile published yet.

---

## Booking (direct)

Client picks a provider and a slot directly — auto-confirms instantly, no accept/decline. For "match me with anyone available," see [Matching](#matching).

### `POST /bookings` — Role: `CLIENT`

| field | type | notes |
|---|---|---|
| `providerId` | uuid | required |
| `scheduledStart` | ISO date | required, must be future |
| `durationMin` | int | 15–180. ≤30 bills `MINIMUM`, >30 bills `HOURLY` — computed server-side |
| `channelType` | `"CHAT"` \| `"VIDEO"` | required |

```json
{
  "id": "uuid", "clientId": "uuid", "providerId": "uuid",
  "scheduledStart": "...", "durationMin": 20, "billingType": "MINIMUM",
  "status": "CONFIRMED", "specialty": null, "declinedProviderIds": [],
  "session": { "id": "uuid", "channelType": "VIDEO", "roomRef": null, "startedAt": null, "endedAt": null }
}
```

- `404` — provider not found / hasn't published a profile
- `409` — `scheduledStart` in the past, or an overlapping booking already exists for that provider

### `GET /bookings/mine` — Authenticated
Every booking where you're client or provider, newest first.

### `GET /bookings/:id` — Authenticated
`403` if you're not a participant.

### `POST /bookings/:id/cancel` — Authenticated
`403` not a participant · `409` already `COMPLETED`.

---

## Sessions

The chat/video session tied to a booking. **No video vendor is wired up yet** (open decision, see ARCHITECTURE.md §12) — `roomRef` is a placeholder string, not a joinable room.

### `POST /bookings/:bookingId/session/start` — Authenticated
Requires booking `CONFIRMED` **and** payment `SUCCEEDED`. Idempotent.

```json
{ "id": "uuid", "bookingId": "uuid", "channelType": "VIDEO", "roomRef": "pending-provider-room-...", "startedAt": "...", "endedAt": null }
```

`403` not a participant · `409` booking not confirmed, or payment not succeeded yet.

### `POST /bookings/:bookingId/session/end` — Authenticated
Marks the booking `COMPLETED` (unlocks feedback). Idempotent. `409` if never started.

---

## Chat (WebSocket)

1:1 text chat between a booking's two participants. **Separate from the REST API** — its own Vercel Function (`api/socket.ts`), its own URL. Message *content* is relayed only and never stored server-side (ARCHITECTURE.md §6) — there's no history endpoint; a client that wasn't connected when a message was sent never sees it.

- **URL:** same host as the REST API (`https://<api-domain>`), **path:** `/api/socket/socket.io` — both must be set explicitly, the Socket.IO client defaults to `/socket.io`.
- **Transport:** `transports: ['websocket']` — required. Vercel's WebSocket support doesn't do HTTP long-polling, and that's the Socket.IO client default, so leaving it unset silently breaks the connection.
- **Auth:** pass the access token via the `auth` option, not a header — `io(url, { auth: { token: accessToken } })`. A connection with no token, or an expired/invalid one, is rejected at handshake (`connect_error`).

```js
import { io } from 'socket.io-client';

const socket = io('https://men-s-anonymous-platform-api.vercel.app', {
  path: '/api/socket/socket.io',
  transports: ['websocket'],
  auth: { token: accessToken },
});
```

**Events you emit:**

| Event | Payload | Ack response |
|---|---|---|
| `join` | `{ bookingId }` | `{ ok: true }` or `{ ok: false, error }` — rejected unless you're `clientId`/`providerId` on that booking and it's `CONFIRMED` or `COMPLETED` |
| `message` | `{ bookingId, text }` (text ≤ 4000 chars) | `{ ok: true }` or `{ ok: false, error }` — must `join` first |
| `typing` | `{ bookingId }` | none |
| `leave` | `{ bookingId }` | none |

**Events you receive:**

| Event | Payload |
|---|---|
| `message` | `{ bookingId, senderId, text, sentAt }` — broadcast to the room, including back to the sender |
| `typing` | `{ bookingId, userId }` |
| `presence` | `{ userId, online }` — fires on join/leave/disconnect |

**Reconnection is your responsibility.** Vercel Function WebSocket connections force-close after 5 minutes on the Hobby plan (a hard platform limit, see [Vercel's WebSocket docs](https://vercel.com/docs/functions/websockets#handle-disconnections-and-reconnects)) — Socket.IO's client reconnects automatically, but you must re-`join` every booking room on each reconnect; room membership isn't remembered across a dropped connection. On a genuinely cold function instance, allow a couple of seconds after connecting before relying on delivery (the Redis pub/sub adapter that makes cross-instance delivery work needs a moment to establish on first spin-up).

---

## Billing (M-Pesa)

> **Async by nature.** `POST .../pay` only confirms the STK Push prompt was sent — not that it succeeded. Poll `payment-status` every 2–3s until it's no longer `PENDING`, and show a "check your phone" state meanwhile.

### `POST /billing/bookings/:bookingId/pay` — Role: `CLIENT`
Amount is computed server-side from the provider's rate card — you don't send one.

Body: `{ "phone": "254712345678" }` (digits, 9–15, optional leading `+`)

→ `201 { "externalRef": "ws_CO_...", "status": "PENDING" }`

`403` not your booking · `409` provider has no rate card set. Throttled to 3 req/min.

### `GET /billing/bookings/:bookingId/payment-status` — Role: `CLIENT`

```json
{ "status": "NOT_INITIATED" | "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED", "amount": 500, "externalRef": "ws_CO_..." }
```

### Internal only (not for frontend use)
- `POST /billing/mpesa/callback` — Safaricom calls this directly
- `GET /billing/internal/reconcile` — scheduled GitHub Actions workflow, every 5 min; requires `Authorization: Bearer <CRON_SECRET>`

---

## Matching (auto-match)

Client asks for "someone with X specialty" instead of picking a person. Starts `REQUESTED`, assigned to the least-loaded matching provider, who has 15 minutes to accept/decline before it reassigns.

### `POST /matching/request` — Role: `CLIENT`

| field | type |
|---|---|
| `specialty` | string, required |
| `scheduledStart` | ISO date, required, future |
| `durationMin` | int, 15–180 |
| `channelType` | `"CHAT"` \| `"VIDEO"` |

Response: booking shape (see Booking), `status: "REQUESTED"`, `specialty` set. `404` if no provider currently offers that specialty.

### `POST /matching/:bookingId/accept` — Role: `PROVIDER`
→ `CONFIRMED`. `403` not assigned to you · `409` no longer pending.

### `POST /matching/:bookingId/decline` — Role: `PROVIDER`
Reassigns to the next least-loaded provider (stays `REQUESTED`, new `providerId`), or `CANCELLED` if nobody else is available.

### Internal only
- `GET /matching/internal/sweep-expired` — scheduled GitHub Actions workflow, every 5 min; sweeps every `REQUESTED` booking past its 15-minute window and reassigns/cancels. Requires `Authorization: Bearer <CRON_SECRET>`.

---

## Support groups

### `GET /support-groups` — Public
Upcoming groups. Member identities are never exposed, only a headcount.
```json
[{ "id": "uuid", "topic": "Career transitions", "schedule": "...", "capacity": 8, "memberCount": 3 }]
```

### `GET /support-groups/mine` — Authenticated
### `POST /support-groups` — Role: `ADMIN`
Body: `{ "topic": "...", "schedule": "ISO date", "capacity": 8 }`

### `POST /support-groups/:id/join` — Authenticated
`404` not found · `409` full. Safe to call again if already joined.

### `DELETE /support-groups/:id/leave` — Authenticated
`200` with an empty body.

---

## Resources

### `GET /resources?tag=` — Public
Only ever returns `published: true` items.
```json
[{ "id": "uuid", "type": "ARTICLE", "title": "...", "body": "...", "url": null, "tags": ["career"], "published": true }]
```

### `GET /resources/:id` — Public
`404` if not found or not published.

### `POST /resources` — Role: `ADMIN`

| field | type | notes |
|---|---|---|
| `type` | `"ARTICLE"` \| `"VIDEO"` | required |
| `title` | string | required |
| `body` / `url` | string | optional — `body` for articles, `url` for videos |
| `tags` | string[] | optional |
| `published` | boolean | optional, default false |

---

## Feedback

### `POST /sessions/:sessionId/feedback` — Authenticated
Only the client from that session can submit — one rating per session, ever.

Body: `{ "rating": 5, "comment": "optional" }` (rating 1–5)

`403` not the client on this session · `409` session not completed yet, or feedback already submitted.

### `GET /providers/me/feedback` — Authenticated
Feedback received across your sessions as a provider (empty array if you're not one). Never who left it.
```json
[{ "id": "uuid", "rating": 5, "comment": "...", "createdAt": "..." }]
```

---

## Admin

Everything here requires `ADMIN`. One flat admin role today — no support-agent/moderator/compliance sub-split yet (see ARCHITECTURE.md §9a).

| Endpoint | Notes |
|---|---|
| `GET /admin/verifications` | Pending provider verification queue |
| `GET /admin/verifications/:id` | Full detail incl. decrypted license number — sensitive, vault-audit-logged |
| `POST /admin/verifications/:id/decision` | Body: `{ "decision": "APPROVED" \| "REJECTED" }` |
| `POST /admin/users/:userId/suspend` | Returns updated user |
| `POST /admin/users/:userId/reinstate` | Returns updated user |
| `GET /admin/audit-log?limit=` | Default 100, capped at 500 |
| `POST /admin/vault/:pseudonymId/break-glass` | Reveals real name/email/phone. Body: `{ "reason": "10+ chars, required" }`. Rare, justified, logged — see ARCHITECTURE.md §9 |

---

## End-to-end flows

**Provider onboarding → visible in search**
1. `POST /auth/signup` with `role: "PROVIDER"`
2. `POST /providers/me/verification` with license info
3. Provider is invisible/unbookable until an admin approves — UI should say "under review"
4. Admin: `GET /admin/verifications` → `POST /admin/verifications/:id/decision` `{"decision":"APPROVED"}`
5. `PUT /providers/me` now succeeds — provider is live on `GET /providers`

**Client books and pays (direct booking)**
1. `GET /providers?specialty=...` → pick one
2. `POST /bookings` → `CONFIRMED` immediately
3. `POST /billing/bookings/:id/pay` with phone → `PENDING`
4. Poll `GET /billing/bookings/:id/payment-status` until `SUCCEEDED`/`FAILED`
5. `POST /bookings/:bookingId/session/start` → succeeds, returns `roomRef`
6. … session happens …
7. `POST /bookings/:bookingId/session/end` → `COMPLETED`
8. `POST /sessions/:sessionId/feedback`

**Client requests auto-match**
1. `POST /matching/request` with a specialty → `REQUESTED`
2. Provider has 15 minutes to `POST /matching/:id/accept` or `/decline`
3. Accept → `CONFIRMED`, same payment/session flow as direct booking from here
4. Decline/timeout → silently reassigned to a new provider, still `REQUESTED`
5. No one available → `CANCELLED`
