# Google Places autocomplete

Date: 30 May 2026

Purpose: verified address/location input for the `/rezervacia/` wizard.

## Decision

Use Google Places Autocomplete on the `Lokalita` field so leads cannot submit nonsense addresses or localities when Google verification is active.

Current implementation:

- `src/pages/rezervacia.astro` loads Google Maps JavaScript Places only when `PUBLIC_GOOGLE_MAPS_API_KEY` exists.
- Autocomplete is restricted to Slovakia with `componentRestrictions: { country: "sk" }`.
- Autocomplete uses the `geocode` type so it suggests addresses and geographic localities, not businesses.
- Returned fields are limited to `formatted_address`, `geometry`, `name`, and `place_id`.
- When Google is active, the wizard requires the visitor to select a Google suggestion before moving forward.
- The email lead includes:
  - formatted locality
  - Google verification status
  - Google Place ID
  - GPS coordinates when Google returns them
- If the key is missing locally, the field remains manual so development is not blocked.

## Required Google setup

Create or use a Google Cloud project and enable:

- Maps JavaScript API
- Places API

Create a browser API key and restrict it:

- Application restriction: HTTP referrers
- Allowed referrers:
  - `https://jakubolsa.sk/*`
  - `https://staging.jakubolsa.sk/*`
  - `http://127.0.0.1:4321/*` for local testing

Set the key as an environment variable:

```bash
PUBLIC_GOOGLE_MAPS_API_KEY=...
```

Do not commit the real key. Use local `.env` for development and Cloudflare environment variables for staging/production.

## Related Google OAuth secret

The downloaded `google_secrets.json` OAuth client is not the browser Places API key. It is useful later for server-side Google Calendar integration.

Local processing convention:

- store the JSON copy in ignored path `private/secrets/google_oauth_client.json`
- expose local env keys in ignored `.env`:
  - `GOOGLE_PROJECT_ID`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_OAUTH_CLIENT_JSON`

These values must stay out of Git.

## Cost notes

Google Maps Platform requires billing to be enabled.

Relevant SKUs:

- Autocomplete Requests
- Places API Place Details Essentials

The current volume should fit comfortably inside the free monthly caps, but quota limits and billing alerts should still be configured before production.

## Next hardening

- Add Google Cloud budget alert.
- Set quota caps for autocomplete and place details.
- Move lead submission from `mailto:` to Cloudflare Worker.
- Persist `place_id`, formatted address, and GPS in CRM/Sheet/Notion.
