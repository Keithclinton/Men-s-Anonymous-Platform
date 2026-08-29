# Session rooms — API contract for backend

The web client now has full **1:1 chat** and **video waiting** screens at `/bookings/:id/room`. They call the endpoints below. Until these exist, the chat UI still renders but stays local (the other party cannot see messages).

Product rules: handles only (never vault PII in the room), video while anonymous is allowed, **do not persist chat/video content** in Postgres by default.

---

## Must ship for chat to work between two users

### 1. Always return channel on the booking

`GET /bookings/:id` and `GET /bookings/mine` should include:

```json
{
  "channelType": "CHAT" | "VIDEO",
  "clientHandle": "stillwater41"
}
```

`clientHandle` is the client’s public pseudonym so the provider’s room header is not a UUID. Never send name/email/phone here.

### 2. REST message relay (MVP — frontend polls this)

Auth: Bearer JWT. Only the booking’s `clientId` or `providerId`. Session must be **started** and **not ended**.

`GET /bookings/:bookingId/session/messages?after=<ISO-8601 optional>`

```json
[
  {
    "id": "uuid",
    "bookingId": "uuid",
    "sessionId": "uuid",
    "senderId": "pseudonym-uuid",
    "senderHandle": "stillwater41",
    "body": "plain text",
    "createdAt": "2026-08-29T10:00:00.000Z"
  }
]
```

`POST /bookings/:bookingId/session/messages`

```json
{ "body": "plain text, max 2000 chars" }
```

Returns the created `SessionMessage`. Reject empty bodies. Rate-limit (~30/min/user).

**Storage:** Redis (or in-memory) keyed by `sessionId`, TTL = session length + 15 minutes. Do **not** write `body` to Postgres. Do **not** log bodies. After `POST .../session/end`, delete the key.

### 3. Join payload (chat + video)

`GET /bookings/:bookingId/session/join`

```json
{
  "bookingId": "uuid",
  "sessionId": "uuid",
  "channelType": "CHAT",
  "token": "short-lived-room-jwt",
  "wsPath": "/realtime",
  "joinUrl": null
}
```

For **VIDEO**, set `joinUrl` to the Daily/Twilio/Agora room URL (or a URL that already includes the token). Frontend embeds it in an iframe (`camera; microphone; display-capture; autoplay`).

Nameplate passed to the vendor must be the **handle**, never legal name. Camera-off by default is a client setting; vendor should not require identity.

### 4. Existing start/end (already used)

- `POST /bookings/:id/session/start` — create session, mint room, return `SessionSummary` including `channelType` + `roomRef`
- `POST /bookings/:id/session/end` — `endedAt`, tear down Redis/vendor room, 403 if caller is not a participant

---

## Socket.IO (replace polling when ready)

Frontend will connect with the same JWT.

- URL: `VITE_API_URL` (or `VITE_REALTIME_URL` if you split the gateway)
- Path: `/realtime` (or `wsPath` from join)
- Auth: `{ token: "<access JWT or room token>" }`

Events:

| Direction | Event | Payload |
|-----------|--------|---------|
| client → server | `join` | `{ bookingId }` |
| client → server | `message` | `{ bookingId, body }` |
| client → server | `typing` | `{ bookingId, on: boolean }` |
| server → room | `message` | `SessionMessage` |
| server → room | `typing` | `{ senderId, on }` |
| server → room | `ended` | `{ bookingId }` |

Authorize `join` the same as REST. Broadcast only to that booking’s room.

REST can stay as a fallback for Vercel/serverless if the Socket.IO process is separate.

---

## Video vendor

Pick **one** for MVP: Daily.co, Twilio Video, or Agora.

On `session/start` when `channelType=VIDEO`:

1. Create an ephemeral room named by `sessionId` (not by real names).
2. Mint two tokens (client, provider),  bound to that room, TTL = duration + buffer.
3. Return `joinUrl` (Daily room URL + token is simplest for the iframe).

Do not attach identity-vault fields to the vendor user object.

---

## Also missing for a complete product API

These are not the chat screen, but they still block “full” operations:

| Gap | Why |
|-----|-----|
| Document login: email **or** username; HTTP 201 on auth | Frontend already branches; docs should match |
| `GET /admin/users?q=` searchable roster | People tools currently need a pasted UUID |
| Provider signup email: required **or** officially optional | Client signup without email works; provider currently 400s |
| Stop rewriting provider handles to `provider_{uuid}` | Chosen handle is ignored |
| `GET /providers/me/verification` | Desk cannot show queue status |
| Loosen login rate limit in staging | ~5/min blocks testers |
| M-Pesa B2C payouts + subscription auto-renew | Scaffold only |
| Booking `IN_PROGRESS` while session is live | Optional; frontend infers from `session.startedAt` |

---

## Security checklist

- Participants only (client or provider on that booking). Admins do not join the room.
- No join path from messages → identity vault.
- No message bodies in application logs, Sentry, or audit `details`.
- CORS must allow the web origin for REST **and** websockets.
- Vercel serverless cannot hold Socket.IO rooms — run realtime on a long-lived process (or Redis adapter + a small Node service).
