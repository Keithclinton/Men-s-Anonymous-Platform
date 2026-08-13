# Mens Platform — Backend

Node.js/TypeScript backend for the anonymous men's counseling, coaching, mentoring, and
support platform. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design and
[API_REFERENCE.md](API_REFERENCE.md) for every endpoint — this file is how to get it
running.

## Stack

NestJS (modular monolith) · PostgreSQL x2 via Prisma (app core + identity vault, kept
physically separate — see ARCHITECTURE.md §3) · Redis + BullMQ · M-Pesa (Daraja) billing.

## Layout

```
apps/api/       main HTTP app — all feature modules live here
apps/worker/    background processes: notification delivery, billing reconciliation
libs/shared/    placeholder for types shared between api & worker (currently empty)
prisma/core/    app-core schema (pseudonymous data only)
prisma/vault/   identity vault schema (real PII, encrypted at rest)
```

## Prerequisites

- **Node.js 20+** (see `.nvmrc` — run `nvm use` if you use nvm)
- **Docker Desktop**, running, before you touch anything below. This is the single most
  common "nothing works" cause — if a command hangs or a Prisma command says
  `Can't reach database server`, this is almost always why. Open Docker Desktop and wait
  for it to finish starting first.
- **Git**

## First-time setup

```bash
git clone https://github.com/Keithclinton/Men-s-Anonymous-Platform.git
cd Men-s-Anonymous-Platform
npm install
cp .env.example .env
```

Fill in `.env`:
- `ENCRYPTION_KEY` and `HASH_KEY` — two **different** 32-byte keys, each generated with:
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — two different long random strings for local dev
- `INTERNAL_API_SECRET` — any string; must match between the api and worker processes
- `CORS_ORIGIN` — leave blank for local dev (the API will reflect whatever origin calls it
  when `NODE_ENV=development`); set it to your frontend's dev URL if you still get CORS
  errors, or once `NODE_ENV=production`, where an unset value now allows nothing
- M-Pesa vars can stay blank until you're actually testing billing (Daraja sandbox creds)

Start Postgres (×2) and Redis:

```bash
npm run docker:up
```

> Ports 5442 (core) and 5443 (vault) are used instead of Postgres's default 5432/5433, in
> case you already have another project's Postgres running locally. Adjust in
> `docker-compose.yml` + `.env` together if you'd rather use the defaults.

Run migrations and generate both Prisma clients:

```bash
npm run prisma:migrate:core
npm run prisma:migrate:vault
npm run prisma:generate
```

## Running

```bash
npm run start:api:dev      # http://localhost:3000
npm run start:worker:dev   # background jobs — needs Redis + api both running
```

Confirm it's alive:

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

`GET /health` is unauthenticated. Everything else requires a JWT by default — see
[API_REFERENCE.md](API_REFERENCE.md) for the full endpoint list, auth flow, and worked
examples. Quick smoke test:

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1","password":"correcthorsebattery"}'
# -> { "accessToken": "...", "refreshToken": "..." }
```

## Building

```bash
npm run build   # builds both api and worker into dist/
npm run lint
```

Note: `apps/api/src/generated/**` (the Prisma clients) are plain `.js`, not `.ts`, so `tsc`
doesn't copy them into `dist` on its own — `npm run build:api` and `npm run start:api*`
all run `scripts/copy-generated.js` to handle that. If you regenerate the Prisma client by
hand (`npx prisma generate ...`) instead of via `npm run prisma:generate:core`, re-run
`node scripts/copy-generated.js` before starting the compiled app.

## Troubleshooting

- **`Can't reach database server at localhost:5442/5443`** — Docker Desktop isn't running,
  or the containers aren't up. Check `docker compose ps`; run `npm run docker:up` if
  they're not listed.
- **Port 3000 (or 5442/5443/6379) already in use** — something else on your machine is
  using it. Either stop that process, or override with `PORT=3100 npm run start:api:dev`
  (and update the port in `docker-compose.yml` + `.env` for the DB/Redis ports).
- **CORS errors from the frontend** — see the `CORS_ORIGIN` note above.
- **`Invalid environment configuration` on boot** — the app validates `.env` strictly at
  startup (see `apps/api/src/common/config/env.validation.ts`) and fails fast rather than
  running half-configured. The error message names exactly which variable is wrong.
- **A payment call 500s** — expected until real M-Pesa Daraja sandbox credentials are set;
  see ARCHITECTURE.md §11.

## Security

- Every route is authenticated by default (JWT), with per-route role checks (`CLIENT` /
  `PROVIDER` / `ADMIN`) and rate limiting (100 req/min per IP globally; 3–5 req/min on
  `/auth/*` and the M-Pesa pay endpoint specifically).
- Real PII (name/email/phone) lives only in the identity vault, encrypted at rest
  (AES-256-GCM), never in the app-core database — see ARCHITECTURE.md §3.
- `npm audit` is checked regularly. Remaining findings at the time of writing are
  transitive dependencies of build tooling only (`@nestjs/cli`'s Angular schematics chain)
  or of `@nestjs/platform-express`'s `multer`/`body-parser`/`qs` chain, where the
  vulnerable code paths (file uploads, malformed size-limit config) aren't exercised by
  this app — full resolution needs a NestJS 11 migration, tracked as a follow-up rather
  than done blind. Run `npm audit` yourself before deploying anywhere real.
- Found a real vulnerability? Please report it privately rather than opening a public issue.

## What's real vs. scaffolded

Every module in ARCHITECTURE.md §4 is implemented end-to-end and has been exercised live
against real Postgres/Redis (not just compiled): auth, the identity vault, provider
onboarding + verification, direct booking, auto-match/request-queue with BullMQ-driven
timeout reassignment, M-Pesa billing (STK Push shape + reconciliation), payment-gated
session start/end, feedback, support groups, the resource library, and the admin review
queue/audit log.

Two things are deliberately left as documented TODOs rather than faked:
- **No video vendor is wired up** (open decision — ARCHITECTURE.md §12). `SessionsService`
  issues a placeholder `roomRef`; swap `createRoom()` for a real Daily.co/Twilio/Agora/
  mediasoup call once that's chosen.
- **§9a's admin sub-roles** (support agent / moderator / compliance officer / super admin)
  aren't enforced — the schema only has one `ADMIN` role today. `AdminService`'s header
  comment flags this; every admin action is still audit-logged so the split can be
  retrofitted without losing history.

M-Pesa itself can't be fully tested without a real Safaricom Daraja sandbox app — the
gateway logic (OAuth caching, STK Push request shape, callback parsing, reconciliation) is
real, but `payForBooking` will 500 until `MPESA_CONSUMER_KEY` etc. are filled in in `.env`.
