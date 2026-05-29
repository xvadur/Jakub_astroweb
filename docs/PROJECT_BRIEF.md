# Jakub Astro Project Brief

## Intent

Deliver a modern Astro website for Jakub, a real-estate broker.

## Direction

- migrated the current MacBook project to Mourek from `/Users/_xvadur/Jakub_astroweb`
- preserve the existing base shape
- upgrade it into a polished modern real-estate broker website
- add refined animation and interaction where it supports trust and conversion

## Current Local State

- local path: `/Users/xvadur_mac/Jakub_Astro`
- compatibility symlink: `/Users/xvadur_mac/Workspace/legacy/code/Jakub_Astro`
- framework: Astro
- active work branch: `staging`
- production branch: `main`
- production URL: `https://jakubolsa.sk/`
- staging URL: `https://staging.jakubolsa.sk/`
- current implementation and launch checklist live in `docs/PROJECT_STATUS.md`
- source on MacBook also had `/Users/_xvadur/Jakub_astroweb-visual-refresh`, but that branch is older than the dirty `main` working tree
- the local migration intentionally preserved the MacBook working tree state, including uncommitted edits and staged asset moves

## Current Business Direction

- Jakub is positioned as an experienced broker with the service backing of BOSEN.
- The website should not target cheap flats as the core audience.
- The promise is high-touch service for owners who want a serious sale strategy, strong presentation, legal/financial support, and one accountable person.
- The lead magnet is a predajný audit / predajná stratégia before a client decides whether to sell, rent, wait, buy another property, or consider a fast sale/buyout path.
- OpenClaw or other automation should support this business flow, not turn the website into a generic real-estate brochure.

## Deployment Rule

All meaningful website changes go through staging first:

```text
local edit
  -> build
  -> staging branch
  -> https://staging.jakubolsa.sk/
  -> review
  -> main
  -> https://jakubolsa.sk/
```

## Run Commands

Preferred project command from README:

```bash
bun install
bun run dev
bun run build
```

Mourek currently has Node available but not Bun, so this verified fallback works:

```bash
npm install --no-package-lock
npm run dev -- --host 127.0.0.1
npm run build
```

Verified on 2026-05-26:

- `npm run build` succeeds
- local dev server started at `http://127.0.0.1:4323/`
