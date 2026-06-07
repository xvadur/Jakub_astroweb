# Project decisions

## 2026-05-30: Staging is the default review environment

Website changes should be tested on `https://staging.jakubolsa.sk/` before production.

Documented setup:

- production: `https://jakubolsa.sk/`
- staging: `https://staging.jakubolsa.sk/`
- staging worker: `jakubastroweb-staging`
- staging fallback: `https://jakubastroweb-staging.yksvadur-ja.workers.dev/`

Rules:

- Work on `staging` for experiments, copy changes, lead magnet changes, tracking, booking, and OpenClaw-driven website mutations.
- Deploy production only from reviewed changes.
- Keep staging `noindex,nofollow,noarchive`.
- Keep the visible `STAGING` badge on staging.
- Do not commit Cloudflare API tokens or other secrets.

Reason:

The production domain is already stable enough to protect. Staging gives Adam and Jakub a safe place to review conversion, positioning, and automation changes before they affect live visitors.

## 2026-06-03: OpenClaw is a post-booking handoff, not the booking authority

Booking must remain deterministic inside the Cloudflare Worker path.

Decision:

- `/api/book` validates the payload, checks Google Calendar when configured, creates the event, and returns success/failure to the visitor.
- Telegram notification and OpenClaw processing are non-blocking side effects after the booking decision.
- OpenClaw receives a structured system event through `/hooks/agent` only when `OPENCLAW_HOOK_URL` and `OPENCLAW_HOOK_TOKEN` are configured.
- The target agent is `jakub-olsa`.
- OpenClaw may summarize, create CRM records, propose follow-up, and prepare drafts.
- OpenClaw may not publish public web changes, delete CRM data, delete/move calendar events, or send sensitive client messages without approval.

Reason:

This keeps the visitor-facing booking flow reliable while still letting Jakub's agent build business memory and follow-up work in parallel. If OpenClaw is offline, the booking can still succeed.

## 2026-05-30: Business positioning centers on BOSEN-backed service

The homepage should present Jakub as the personal broker, with BOSEN as the service infrastructure behind him.

Core message:

- Jakub is the accountable person on the client's side.
- BOSEN gives him broader capability: valuation, sales strategy, presentation, marketing, legal support, financing support, property management, and special transaction scenarios.
- The website should attract owners of valuable properties, not position Jakub as a low-cost or cheap-flat broker.

Lead magnet:

- predajný audit / predajná stratégia
- goal: turn anonymous visitors into serious consultations
- target user: owner deciding whether to sell, rent, wait, buy another property, or solve a complex transaction

## 2026-05-30: One canonical local project folder

Canonical folder:

```text
/Users/xvadur_mac/Jakub_Astro
```

Compatibility aliases point to the same folder:

```text
/Users/xvadur_mac/Projects/Jakub_Astro
/Users/xvadur_mac/Workspace/legacy/code/Jakub_Astro
/Users/xvadur_mac/Workspace/projects/jakub-astro
```

Rules:

- Do not create separate Jakub web copies elsewhere in `/Users/xvadur_mac`.
- Keep project docs, source assets, ops templates, OpenClaw architecture notes, and deployment notes inside `/Users/xvadur_mac/Jakub_Astro`.
- If old external notes are found, move or archive them under `docs/archive/`.
- Generated folders such as `dist/`, `.astro/`, `.wrangler/`, `node_modules/`, and `output/` are not source of truth.
- Do not copy raw Obsidian/personal/client-sensitive notes into tracked GitHub files. Distill them into sanitized decisions or keep them in ignored `private/` paths.

## 2026-05-30: Booking wizard before calendar integration

The primary CTA should lead to a guided booking/seller-audit funnel, not only to a generic contact form.

Decision:

- Add a dedicated `/rezervacia/` page with a 4-step booking wizard.
- Keep the homepage focused on selling the consultation click; do not embed the full wizard as a large homepage section.
- Current version collects context and preferred date/time, then prepares a structured email.
- The selected date/time is explicitly preliminary until a real calendar integration exists.
- Do not add OpenClaw to this layer yet.

Reason:

Jakub needs to see a practical sales flow before the automation layer. The website should prove the business mechanism first: qualify intent, collect useful context, and make the next call feel natural.

Next step:

- After Jakub confirms his calendar behavior, replace or augment the preferred date/time step with Google Calendar appointment scheduling, Calendly, or a custom Cloudflare Worker + Calendar API endpoint.

## 2026-05-30: Verified locality input uses Google Places

The reservation wizard should not accept nonsense locality values when Google verification is enabled.

Decision:

- Use Google Places Autocomplete on the `/rezervacia/` locality field.
- Restrict suggestions to Slovakia.
- Store formatted address, Google Place ID, and GPS coordinates when available.
- Require a selected Google suggestion only when the Google API key is configured and the widget loads.
- Keep local development usable without the API key.

Reason:

Lead quality matters more than raw form volume. Verified locality data will make future CRM, calendar, and pricing workflows cleaner.

## 2026-06-07: Broker system direction after working MVP core

The project is no longer only a public website. It is becoming a lightweight broker operating system for Jakub.

Decision:

- Keep `staging` and `main`.
- Keep production conservative: public website only until auth/GDPR are ready.
- Use Cloudflare Access with Google login as the preferred first dashboard auth layer.
- Do not build a custom Astro login in V1 unless Cloudflare Access is insufficient.
- Keep the public staging dashboard on demo data until auth is enabled.
- Use Supabase as the database truth for CRM, leads, properties, tasks, notes, appointments, audit logs, and review workflows.
- Cloudflare Worker owns booking transaction reliability: validation, Google Calendar availability, event creation, Telegram notification, and Supabase booking write.
- OpenClaw is not the booking authority. OpenClaw handles operations after or around the booking: CRM tools, follow-ups, briefings, reviews, notifications, approvals, and web draft workflows.
- Add a secure Cloudflare Tunnel/Access path from staging Worker to local Docker OpenClaw before enabling deployed OpenClaw handoff.
- First follow-up/review channel should be email. SMS/WhatsApp can be researched later.
- Legal/GDPR is a separate workstream. Before a lawyer is involved, prepare a factual processing map and exact questions.
- Multi-tenant platform work comes after Jakub's pilot.

Reason:

The current system already has a real booking/Calendar/Supabase/OpenClaw foundation. The next risk is not design; it is exposing CRM data without auth, letting OpenClaw mutate data without deterministic tools, and mixing production with staging. This decision keeps the system stable while allowing the dashboard, agent workflow, review generation, and lead database to mature.

Source roadmap:

```text
docs/BROKER_SYSTEM_ROADMAP_2026-06-07.md
```
