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
