# Men's Anonymous Support Platform — Frontend

Privacy-first anonymous counseling, coaching, mentoring, consulting, and peer support for men.

This is the **web client**. It talks to the NestJS API in `apps/api` (see the root [README](../../README.md) and [API_REFERENCE.md](../../API_REFERENCE.md)) as a separate origin, configured via `VITE_API_URL` — it doesn't share a build or a deploy with the backend.

Source docs live in [`/docs`](../../docs):
- `platform-master-spec.md` — combined concept + product rules + architecture
- `product-rules.md` — anonymity, reveal, and session-choice rules
- `architecture.pdf` / `concept-note.pdf` — original write-ups

## What's here

Phase 1 client + provider + admin surfaces, mobile-first:

- Auth: welcome, create handle, sign in
- Client: find providers, book (chat/video), auto-match, pay (M-Pesa poll), session start/end, feedback, progressive reveal/revoke
- Provider desk: verification submit, publish profile/rates, accept/decline match requests, see reveals + feedback
- More: support groups join/leave, resource library
- Admin: verification queue, suspend/reinstate, break-glass vault, create groups/resources, audit log

Role-aware bottom nav (client / provider / admin).

## Stack

- Vite + React + TypeScript
- React Router
- Tailwind CSS v4

## Run locally

This app is self-contained — its own `package.json`, run from within this folder (the repo root's `package.json` belongs to the backend, see the root README).

1. Start the backend API on `http://localhost:3000` (see the root README) — or point `VITE_API_URL` at wherever it's actually running/deployed.
2. In this folder:

```bash
cd apps/web
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

`VITE_API_URL` in `.env` must match the API. CORS is open on the backend in development if `CORS_ORIGIN` is unset there.

## Auth behaviour

- Access token is kept in memory (15-minute TTL).
- Refresh token is in `sessionStorage` by default (closing the tab signs you out).
- "Stay signed in on this device" uses `localStorage` instead — leave it off on a shared phone.
- Expired access tokens refresh automatically; a failed refresh returns you to sign-in.

Signup never sends empty email/phone fields (the API rejects unknown/empty extras). Recovery contact is stored only in the Identity Vault on the server.

## Deploying

Deploys as its own Vercel project, Root Directory set to `apps/web`, alongside the backend's separate Vercel project on the same repo. Set `VITE_API_URL` in that project's environment variables to the backend's deployed URL.
