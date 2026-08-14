# Men's Anonymous Support Platform

Privacy-first anonymous counseling, coaching, mentoring, consulting, and peer support for men.

Source docs live in `docs/`:
- `platform-master-spec.pdf` — **combined** concept + product rules + architecture (PDF)
- `platform-master-spec.md` — same content in Markdown
- `concept-note.pdf` — product concept (original)
- `architecture.pdf` — backend technical architecture (original)
- `product-rules.md` — anonymity, reveal, and session-choice rules


## Stack (planned)

- NestJS modular monolith (`apps/api` — not in repo yet)
- BullMQ worker (`apps/worker`)
- Shared types (`libs/shared`)
- PostgreSQL app-core + isolated Identity Vault DB
- Redis
- Prisma
- M-Pesa (Daraja) behind a payment gateway abstraction
