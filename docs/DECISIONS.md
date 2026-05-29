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
