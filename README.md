# Jakub Olša web

Astro one-page web for a real estate broker. The first version is built for Jakub Olša,
but the content is already isolated so it can later become a broker website template.

## Run locally

```bash
bun install
bun run dev
```

Production build:

```bash
bun run build
```

## Main files

- `src/pages/index.astro` - homepage layout, styles, form behavior
- `src/data/site.ts` - broker content, contact data, listings, services
- `src/pages/ochrana-osobnych-udajov.astro` - privacy page draft

## Before public launch

Replace the placeholder values in `src/data/site.ts`:

- real phone number
- real email
- real Instagram URL and handle
- operating location
- confirm imported draft listing photos from Bosen can be used on the live site
- replace AI/generated broker imagery if Jakub wants only real photography
- CRM endpoint if the form should submit to a backend instead of email fallback

Legal/privacy:

- fill in the real data controller details
- confirm GDPR wording before launch

## Form behavior

By default the form opens a prefilled email to the configured broker email.

To connect CRM later, set `site.lead.endpoint` in `src/data/site.ts`. The form will
send JSON to that endpoint with all lead fields plus `source` and `createdAt`.
