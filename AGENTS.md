# Jakub Astro Agent Rules

## Purpose

Business website for Jakub, a real-estate broker.

## Current State

- Source project is migrated and active in `/Users/xvadur_mac/Diera/active/jakub/Jakub_Astro`.
- Compatibility symlink: `/Users/xvadur_mac/Jakub_Astro`.
- Production domain: `https://jakubolsa.sk/`.
- Staging domain: `https://staging.jakubolsa.sk/`.
- Current public positioning: Jakub Olša as an experienced real-estate broker backed by BOSEN service infrastructure.
- Current lead magnet: predajný audit / predajná stratégia for owners of valuable properties.
- Active development should happen on `staging` first, then move to `main` only after review.

## Rules

- Preserve client/business content.
- Use Astro conventions.
- Do not deploy experimental changes directly to production.
- Test website, lead magnet, tracking, booking, and OpenClaw-driven mutations on staging first.
- Do not store Cloudflare API tokens or other secrets in the repository.

## Next Work

- Improve the lead magnet and conversion flow on staging.
- Connect a real lead capture backend when needed: Cloudflare Worker, Telegram, n8n, CRM, Google Sheet, Notion, or OpenClaw handoff.
- Keep `docs/PROJECT_STATUS.md` and `docs/STAGING_DEPLOYMENT.md` updated when deployment or workflow changes.
