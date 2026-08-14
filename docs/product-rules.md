# Product Rules — Men's Anonymous Support Platform

Companion to `concept-note.pdf` (vision) and `architecture.pdf` (backend).  
These rules define client-facing anonymity and session choice. Engineering must not contradict them.

---

## 1. Anonymity is the default

- At registration, every client is **anonymous**: handle / pseudonym only.
- Real identity (name, phone, email, payment details) may exist in the **Identity Vault** for account recovery and billing.
- Vault PII is **not** visible to counselors, moderators, or other clients unless the client explicitly reveals.

**Platform knowing you ≠ counselor knowing you.**

---

## 2. Progressive reveal (client-controlled)

When comfortable, a client may step up disclosure. Levels:

| Level | What the counselor / moderator sees |
|-------|-------------------------------------|
| **Anonymous** (default) | Handle / display name only |
| **First name** | First name + handle |
| **Full name** | Full legal/preferred name + handle |
| **Name + photo** | Full name + profile photo + handle |

Rules:

- Each step requires **explicit consent**.
- Reveal is **scoped** (this session and/or this provider relationship) — not a platform-wide public identity dump.
- Higher levels include lower ones (e.g. name + photo implies name is known).

---

## 3. Video while anonymous — allowed

- A client may join **video** sessions while still at the Anonymous level.
- Live face on a call is **not** the same as “known on file” / revealed identity.
- Counselor or moderator still only sees the handle in product UI until the client reveals.

---

## 4. Revoke

- Client may **lower or revoke** reveal for **future** sessions at any time (including mid-relationship).
- Past sessions keep historical context as it was (what was already shown or noted is not rewritten away by revoke).
- Revoke does not delete vault records needed for billing, recovery, or legal/compliance obligations.

---

## 5. Who and how (booking choice)

When booking a 1:1 session, the client chooses:

1. **Who:** Counselor **or** Moderator  
2. **How:** **Video** **or** **1:1 chat** (text, no camera)

Allowed combinations:

- 1:1 chat with counselor  
- Video with counselor  
- 1:1 chat with moderator  
- Video with moderator  

Support groups and resource library remain later phases (see architecture roadmap).

### Role intent (product)

| Role | Intent |
|------|--------|
| **Counselor** | Professional counseling / therapeutic support |
| **Moderator** | Facilitated support / lighter check-in; not a substitute for clinical counseling |

*Open for ops:* verification depth and rates may differ by role; booking UX stays the same.

---

## 6. Provider anonymity (asymmetric)

- Providers (counselors, moderators) are **anonymous to clients** (pseudonymous public profile).
- The **platform** must know and verify providers (credentials, accountability). See architecture §10.
- Clients never see provider legal identity in normal product flows.

---

## 7. Still open (decide with colleague)

1. Is “become known” **ever required** for a service type, or always optional?  
2. Photo on reveal: **profile photo in UI only**, or also pinned in the live session chrome?  
3. Moderator vs counselor: same rate card or different? Same verification bar or lighter for moderators?

---

## 8. Alignment with architecture

| Product rule | Architecture implication |
|--------------|--------------------------|
| Anonymous by default | App core addresses users by `pseudonym_id` only |
| Progressive reveal | Consent + scope records; vault reads only when reveal grants access; every vault access audit-logged |
| Video ≠ revealed | Session metadata stores channel type; no identity join from video provider |
| Revoke future-only | Reveal grants are versioned/time-bounded; historical session snapshots immutable |
| Counselor / moderator | Provider profile carries role/kind; matching & booking filter on it |
| Chat vs video | `SessionChannelType`: `CHAT` \| `VIDEO` |

Do not put real name, email, or phone on `ClientProfile` as always-visible fields. Reveal is a **grant**, not a permanent public profile field.

---

## 9. MVP implication (product)

Ship Phase 1 able to:

1. Register anonymous  
2. Book counselor or moderator × chat or video  
3. Join video while still anonymous  
4. Opt into first name → full name → name + photo for a session/provider  
5. Revoke for future sessions  

Subscriptions, support groups, and full admin tooling stay on the architecture phased roadmap.
