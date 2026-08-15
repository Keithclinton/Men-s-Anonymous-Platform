# Men's Anonymous Support Platform — Frontend

Privacy-first anonymous counseling, coaching, mentoring, consulting, and peer support for men.

This repo is the **web client**. Auth talks to the NestJS API in the backend repo.

Source docs live in `docs/`:
- `platform-master-spec.md` — combined concept + product rules + architecture
- `product-rules.md` — anonymity, reveal, and session-choice rules
- `architecture.pdf` / `concept-note.pdf` — original write-ups

## What’s here now

Phase 1 client + provider + admin surfaces, mobile-first:

- Auth: welcome, create handle, sign in
- Client: Find providers, book (chat/video), auto-match, pay (M-Pesa poll), session start/end, feedback, progressive reveal/revoke
- Provider desk: verification submit, publish profile/rates, accept/decline match requests, see reveals + feedback
- More: support groups join/leave, resource library
- Admin: verification queue, suspend/reinstate, break-glass vault, create groups/resources, audit log

Role-aware bottom nav (client / provider / admin).

**Backend note:** progressive reveal needs migration  
`prisma/core/migrations/20260814220000_identity_reveal_grants` — run `npm run prisma:migrate:core` in the backend repo.

## Stack

- Vite + React + TypeScript (`apps/web`)
- React Router
- Tailwind CSS v4
- Backend auth + providers, bookings, billing, sessions endpoints

## Run locally

1. Start the backend API on `http://localhost:3000` (see the backend README).
2. In this repo:

```bash
cp apps/web/.env.example apps/web/.env
npm install
npm run dev
```

Open `http://localhost:5173`.

`VITE_API_URL` in `apps/web/.env` must match the API. CORS is open in backend development if `CORS_ORIGIN` is unset.

## Auth behaviour

- Access token is kept in memory (15-minute TTL).
- Refresh token is in `sessionStorage` by default (closing the tab signs you out).
- “Stay signed in on this device” uses `localStorage` instead — leave it off on a shared phone.
- Expired access tokens refresh automatically; a failed refresh returns you to sign-in.

Signup never sends empty email/phone fields (the API rejects unknown/empty extras). Recovery contact is stored only in the Identity Vault on the server.
