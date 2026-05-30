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
