# Mens Platform — Backend

Node.js/TypeScript backend for the anonymous men's counseling, coaching, mentoring, and
support platform. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design and
[API_REFERENCE.md](API_REFERENCE.md) for every endpoint — this file is how to get it
running, locally and on Vercel.

> This repo root is the **backend**. The web client lives in
> [`apps/web`](apps/web/README.md) — it's a separate, self-contained app (own
> `package.json`, own Vercel project) that talks to this API as a different origin via
> `VITE_API_URL`. Run each from its own folder; they don't share a build or a deploy.

## Stack

NestJS · PostgreSQL x2 via Prisma (app core + identity vault, kept physically separate —
see ARCHITECTURE.md §3) · Redis (rate-limit storage) · M-Pesa (Daraja) billing. Deploys to
Vercel as serverless functions — see [Deploying to Vercel](#deploying-to-vercel) below.
No persistent background worker: scheduled sweeps (billing reconciliation, match-expiry)
run as a scheduled GitHub Actions workflow hitting the API directly instead.

## Layout

```
apps/api/       the whole app — all feature modules live here
api/index.ts    Vercel serverless entry point (wraps apps/api for a request/response model)
vercel.json     rewrites everything to api/index.ts + defines the cron schedule
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
- `CRON_SECRET` — any string; see [Deploying to Vercel](#deploying-to-vercel) for what this guards
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

There's no separate worker process to start locally. The two scheduled sweeps
(`GET /billing/internal/reconcile`, `GET /matching/internal/sweep-expired`) only run when
something calls them — in production that's a scheduled GitHub Actions workflow
(`.github/workflows/cron.yml`); locally, call them yourself when you need to test that path:

```bash
curl http://localhost:3000/billing/internal/reconcile -H "Authorization: Bearer $CRON_SECRET"
```

## Building

```bash
npm run build   # builds apps/api into dist/
npm run lint
```

Note: `apps/api/src/generated/**` (the Prisma clients) are plain `.js`, not `.ts`, so `tsc`
doesn't copy them into `dist` on its own — `npm run build:api` and `npm run start:api*`
all run `scripts/copy-generated.js` to handle that. If you regenerate the Prisma client by
hand (`npx prisma generate ...`) instead of via `npm run prisma:generate:core`, re-run
`node scripts/copy-generated.js` before starting the compiled app. (Vercel's own build
doesn't need this — see below, it bundles `api/index.ts` directly.)

## Deploying to Vercel

The app runs as Vercel serverless functions via `api/index.ts`, which wraps the same Nest
app `apps/api/src/main.ts` uses locally (see `apps/api/src/create-app.ts` — the two share
everything except how the result is served). `vercel.json` rewrites every incoming path to
that one function.

**1. Databases.** Provision **two separate** Postgres databases — not two databases inside
one project/instance, separate projects, so the vault keeps a genuinely different blast
radius from the app core (ARCHITECTURE.md §3). Vercel's own Postgres offering runs on Neon.
For each one, use the **pooled** connection string (the one with `-pooler` in the hostname),
not the direct one, for both `DATABASE_URL` and `VAULT_DATABASE_URL` — serverless functions
can run many concurrent instances, each holding its own DB connection, and Postgres's
connection limit runs out fast without PgBouncer-style pooling in front of it.

**2. Redis.** Add Upstash Redis via the Vercel Marketplace. Use the standard `rediss://`
(TCP/TLS) connection string for `REDIS_URL` — not the REST API endpoint, `ioredis` needs
the real protocol. This is only used for rate-limit counters now (no job queue anymore), so
a small/free Upstash tier is plenty.

**3. Environment variables.** Set everything from `.env.example` in the Vercel project
settings: both database URLs (pooled), `REDIS_URL`, `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`,
`ENCRYPTION_KEY`/`HASH_KEY`, `CORS_ORIGIN` (the frontend's deployed URL), `NODE_ENV=production`,
and `CRON_SECRET` — a shared secret checked by `InternalSecretGuard` on the two scheduled-sweep
endpoints. Without it set, those endpoints reject every request (fails closed, not open).

**4. Scheduling the sweeps.** Billing reconciliation and the match-expiry sweep are triggered
by `.github/workflows/cron.yml` — a scheduled GitHub Actions workflow, not Vercel Cron. This
is deliberate: Vercel's **Hobby plan caps native Cron Jobs at once per day**, which is too
coarse for either job (reconciliation needs to catch stuck M-Pesa payments within minutes;
match-expiry is enforcing a 15-minute window). GitHub Actions has no such limit and needs no
paid plan. Add two repo secrets under **Settings → Secrets and variables → Actions**:
- `API_BASE_URL` — the backend's deployed Vercel URL (no trailing slash)
- `CRON_SECRET` — the same value set on the Vercel project

If you're on Vercel Pro or higher and would rather use native Vercel Cron instead, add a
`crons` array back to `vercel.json` (see git history for the shape) and remove the workflow —
either works against the same `Authorization: Bearer`-guarded endpoints.

**5. Migrations.** Vercel doesn't run `prisma migrate deploy` for you — run it yourself
against the production database URLs before/after each deploy that changes the schema:
`DATABASE_URL=<prod pooled url> npx prisma migrate deploy --schema=prisma/core/schema.prisma`
(and the vault equivalent). Consider a `-direct` unpooled connection string for migrations
specifically — Neon/Prisma recommend this since migrations use features PgBouncer's
transaction pooling mode doesn't support.

**6. Prisma binary targets.** `prisma/core/schema.prisma` and `prisma/vault/schema.prisma`
already include `rhel-openssl-1.0.x` and `rhel-openssl-3.0.x` in `binaryTargets` alongside
`native` — Prisma's documented requirement for Vercel's Amazon-Linux-based runtime. If a
future Vercel runtime update needs a different target, Prisma's error message at cold-start
will say so explicitly.

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
- **On Vercel: `PrismaClientInitializationError` / query engine not found** — almost always
  a `binaryTargets` mismatch with Vercel's current runtime, or a direct (non-pooled)
  connection string exhausting Postgres's connection limit under load. See step 1/6 above.
- **Scheduled sweep returns 401** — `CRON_SECRET` doesn't match between the two places it
  needs to: the Vercel project's env vars (what the API checks against) and the GitHub repo
  secret of the same name (what the Actions workflow sends). Both have to be set, and equal,
  independently — setting it in one place doesn't propagate to the other.
- **Scheduled sweep never seems to run** — check the workflow's own run history under the
  repo's **Actions** tab, not just Vercel logs; a failure there (e.g. `API_BASE_URL` unset)
  never reaches the API at all.

## Security

- Every route is authenticated by default (JWT), with per-route role checks (`CLIENT` /
  `PROVIDER` / `ADMIN`) and rate limiting (100 req/min per IP globally; 3–5 req/min on
  `/auth/*` and the M-Pesa pay endpoint specifically). Rate-limit counters live in Redis,
  not in-memory — required, not just nice-to-have, since this runs as serverless functions
  with no single long-lived process to hold counters in memory.
- Real PII (name/email/phone) lives only in the identity vault, encrypted at rest
  (AES-256-GCM), never in the app-core database — see ARCHITECTURE.md §3.
- `npm audit` is checked regularly. Remaining findings at the time of writing are all
  transitive dependencies of build/deploy tooling only (`@nestjs/cli`'s Angular schematics
  chain, `@vercel/node`'s own build-utils chain) or of `@nestjs/platform-express`'s
  `multer`/`body-parser`/`qs` chain, where the vulnerable code paths (file uploads,
  malformed size-limit config) aren't exercised by this app — none of it ships to the
  deployed function. Full resolution of the platform-express chain needs a NestJS 11
  migration, tracked as a follow-up rather than done blind. Run `npm audit` yourself before
  deploying anywhere real.
- Found a real vulnerability? Please report it privately rather than opening a public issue.

## What's real vs. scaffolded

Every module in ARCHITECTURE.md §4 is implemented end-to-end and has been exercised live
against real Postgres/Redis (not just compiled): auth, the identity vault, provider
onboarding + verification, direct booking, auto-match/request-queue with cron-driven
timeout reassignment, M-Pesa billing (STK Push shape + reconciliation), payment-gated
session start/end, feedback, support groups, the resource library, and the admin review
queue/audit log.

Two things are deliberately left as documented TODOs rather than faked:
- **No video vendor is wired up** (open decision — ARCHITECTURE.md §12). `SessionsService`
  issues a placeholder `roomRef`; swap `createRoom()` for a real Daily.co/Twilio/Agora call
  once that's chosen (a self-hosted option like mediasoup doesn't fit serverless — it needs
  a persistent process, same constraint that shaped the rest of this deployment).
- **§9a's admin sub-roles** (support agent / moderator / compliance officer / super admin)
  aren't enforced — the schema only has one `ADMIN` role today. `AdminService`'s header
  comment flags this; every admin action is still audit-logged so the split can be
  retrofitted without losing history.

M-Pesa itself can't be fully tested without a real Safaricom Daraja sandbox app — the
gateway logic (OAuth caching, STK Push request shape, callback parsing, reconciliation) is
real, but `payForBooking` will 500 until `MPESA_CONSUMER_KEY` etc. are filled in in `.env`.
