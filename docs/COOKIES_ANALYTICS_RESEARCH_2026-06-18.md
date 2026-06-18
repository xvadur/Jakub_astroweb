# Cookies and analytics research

Date: 2026-06-18

Purpose: working brief for adding a cookie/consent layer and analytics/conversion tracking to Jakub's staging site before paid traffic.

This is technical research and implementation direction, not final legal wording.

## Local project documents

- `docs/FULL_LAUNCH_BACKEND_TODO_2026-06-18.md`
  - Primary execution order.
  - Cookies/consent is step 1.
  - Analytics and ads metrics is step 2.
  - Requires categories: necessary, analytics, marketing.
  - Requires privacy page update and staging-safe tracking.

- `docs/LAUNCH_CHECKLIST_ADS_SEO_EMAIL_MONITORING_2026-06-18.md`
  - Defines attribution fields and pre-launch ad checks.
  - Requires conversion only after successful booking.
  - Requires no production tags on staging.

- `docs/GDPR_DATA_MAP_AND_LAWYER_QUESTIONS_2026-06-07.md`
  - Data map for booking, Supabase CRM, Google Calendar, Telegram/OpenClaw, email/reviews and analytics.
  - Lists legal questions for BOSEN/lawyer, including analytics/cookies and processor/controller roles.

- `docs/BACKEND_SYSTEM_AUDIT_2026-06-17.md`
  - Confirms analytics, ads and attribution were not launch-ready in the audit.
  - Defines minimum: UTM capture, Supabase raw payload, Telegram/OpenClaw payload and successful-booking conversion.

- `docs/SELLER_LEAD_ENGINE_CHECKLIST_2026-06-10.md`
  - Defines attribution as part of the lead engine, including consent/cookie mode as a CRM tracking field.

- `src/pages/ochrana-osobnych-udajov.astro`
  - Current public privacy/cookie page.
  - Current claim: the site does not use analytics or marketing cookies.
  - Must be updated before enabling GA4, Google Ads, remarketing or other non-essential tracking.

- `src/pages/rezervacia.astro`
  - Existing booking wizard already has `trackFunnelEvent`.
  - Existing attribution storage key: `jakub_booking_attribution_v1`.
  - Existing attribution TTL: 90 days.
  - Existing fields: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, `referrer`, landing/booking path and timestamps.
  - Existing flow sends attribution inside `/api/book` payload.

## Official sources

- Úrad na ochranu osobných údajov SR FAQ:
  - https://dataprotection.gov.sk/en/legislation/guidelines-faq/frequently-asked-questions-faq/
  - Relevant point: essential cookies do not require consent under §109(8) of Act 452/2021 Coll.; advertising and other cookies require consent meeting GDPR requirements.
  - The FAQ also notes refusal must be available at the same level as consent, consent validity/reconfirmation should be reasonable, and users must be informed about purpose and recipients before consent.

- Act No. 452/2021 Coll. on electronic communications:
  - https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2021/452/
  - Relevant section: §109(8), storage/access to information in terminal equipment.

- GDPR text, Regulation (EU) 2016/679:
  - https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32016R0679
  - Relevant articles for implementation: Article 5 accountability/data minimisation, Article 6 legal basis, Article 7 consent conditions, Article 13 information duty, Article 28 processors.

- EDPB Guidelines 05/2020 on consent:
  - https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en
  - Relevant point: consent must be active, informed, specific and freely given. Cookie walls and consent-by-scroll are weak/non-valid patterns.

- Google Consent Mode overview:
  - https://developers.google.com/tag-platform/security/concepts/consent-mode
  - Consent Mode adjusts Google tag behavior based on user choices.
  - Basic mode blocks tags until consent.
  - Advanced mode loads tags with denied defaults and sends cookieless pings.

- Google Consent Mode website setup:
  - https://developers.google.com/tag-platform/security/guides/consent
  - Implementation requires setting default consent state before tag behavior and updating consent state after user choice.

- Google Consent Mode reference:
  - https://support.google.com/tagmanager/answer/13802165
  - Relevant consent types:
    - `analytics_storage`
    - `ad_storage`
    - `ad_user_data`
    - `ad_personalization`
    - plus functional/security storage where needed.

- GA4 recommended events:
  - https://developers.google.com/analytics/devguides/collection/ga4/reference/events
  - `generate_lead` is the recommended event for a generated lead/form submission.
  - Later CRM milestones can use `qualify_lead`, `working_lead`, `close_convert_lead` or `close_unconvert_lead`.

## Current implementation state

Documented facts:

- The site is on branch `staging`.
- Current commit: `0eb6674 Prepare launch backend and lead engine systems`.
- There is no shared Astro layout in `src/layouts`.
- Public pages define their own full document HTML, so a global cookie component currently needs either:
  - a small shared partial/component inserted into each public page, or
  - a broader refactor into a layout.
- The privacy page currently says analytics/marketing cookies are not used.
- Booking attribution is already captured in `src/pages/rezervacia.astro` and sent to `/api/book`.
- `trackFunnelEvent` currently pushes `booking_*` events to `window.dataLayer` and dispatches `booking:funnel`.
- There is no visible cookie banner, consent store, GA4 id, Google Ads id/label, GTM container id, or consent-aware tag loader in the repo.
- `.env.example` and `wrangler.toml` do not yet define public analytics or ads config variables.

Reasonable inference:

- The lowest-risk V1 is explicit opt-in for analytics and marketing on Slovak/EU traffic.
- For Google stack, Basic Consent Mode is cleaner for launch because no Google measurement request is sent before the visitor interacts with the banner.
- Advanced Consent Mode can be considered later if conversion modeling is strategically important and legal review accepts cookieless pings before consent.
- Staging should have tracking disabled by default or use separate test IDs.

## Recommended V1 decision

Use this mode first:

```text
necessary: always active
analytics: opt-in
marketing: opt-in
Google Consent Mode: basic
staging: no production GA/Ads tags
enhanced conversions: disabled
remarketing: disabled until legal/privacy text is confirmed
```

Why:

- It matches Slovak/UOOU guidance more conservatively.
- It is easier to verify: if no consent, no GA/Ads network requests.
- It keeps the launch path simple while Jakub/BOSEN legal text is still not final.
- It avoids sending hashed customer data to Google before enhanced conversions are explicitly approved.

## Consent categories

Necessary:

- Site rendering.
- Security and availability.
- Booking form operation.
- `/api/availability`.
- `/api/book`.
- Cloudflare Worker.
- Google Places only where needed for address autocomplete. This should be described in the privacy text because the browser calls Google services.

Analytics:

- GA4 page views.
- GA4 funnel events.
- Internal analytics events that are not strictly necessary.

Marketing:

- Google Ads conversion tracking.
- Google Ads remarketing.
- Meta Pixel or other ad pixels if added later.
- Enhanced conversions if ever approved, but default for now is no.

## Event map

Current internal events from wizard:

- `booking_step_view`
- `booking_intent_select`
- `booking_date_select`
- `booking_time_select`
- `booking_submit_attempt`
- `booking_submit_success`
- `booking_submit_error`

Recommended GA4/Ads-facing events:

- `booking_start`
  - Fire when wizard is opened or first step is viewed.
- `booking_step_intent`
  - Fire after intent selection.
- `booking_step_property`
  - Fire when property/context step is viewed or completed.
- `booking_step_date`
  - Fire when date/time step is viewed or completed.
- `booking_step_contact`
  - Fire when contact step is viewed.
- `generate_lead`
  - Fire only after `/api/book` returns `ok: true`.
  - Do not fire on fallback mailto.
  - Do not include name, phone, email, exact address or message.

Allowed event parameters:

- `intent`
- `property_type`
- `booking_status`
- `mode`
- `lead_source` from attribution source, not from personal text
- `landing_path`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`

Do not send:

- meno
- email
- telefon
- full address / exact location
- free-text message
- Google Place id if it can identify the property too precisely

## Implementation shape

Files likely needed:

- `src/components/CookieConsent.astro`
- `src/scripts/consent.ts` or plain inline module if no build pipeline for client scripts is desired
- `src/scripts/analytics.ts`
- `src/pages/ochrana-osobnych-udajov.astro`
- public pages:
  - `src/pages/index.astro`
  - `src/pages/rezervacia.astro`
  - `src/pages/predaj-bytu-bratislava.astro`
  - `src/pages/nehnutelnosti/[slug].astro`

Environment/config additions:

- `PUBLIC_GA4_MEASUREMENT_ID`
- `PUBLIC_GOOGLE_ADS_ID`
- `PUBLIC_GOOGLE_ADS_CONVERSION_LABEL`
- `PUBLIC_ANALYTICS_MODE=disabled|test|production`
- optional later: `PUBLIC_GTM_CONTAINER_ID`

Consent storage:

- Key: `jakub_cookie_consent_v1`
- Storage: `localStorage`
- Persist:
  - `necessary: true`
  - `analytics: boolean`
  - `marketing: boolean`
  - `version`
  - `updated_at`
  - `expires_at`

Recommended TTL:

- 6 months for rejected/non-granted consent.
- 6 to 12 months for granted consent, depending on legal review.

## Acceptance checks

- First load on staging shows banner and no production Google network calls.
- Reject all persists choice and keeps GA/Ads blocked.
- Analytics-only consent allows GA4 but not Ads/remarketing.
- Marketing consent maps to `ad_storage`, `ad_user_data`, `ad_personalization`.
- Manage cookies link reopens preferences.
- Successful `/api/book` fires one `generate_lead`.
- Failed booking and mailto fallback do not fire `generate_lead`.
- No analytics payload contains PII.
- Privacy page describes actual tools, categories, purposes, recipients and how to change consent.

## Open decisions for Adam/Jakub/BOSEN

1. Use GA4 + Google Ads directly, or use GTM as the tag container?
2. Use Basic Consent Mode now, with Advanced Consent Mode postponed?
3. Use separate staging/test measurement IDs, or fully disable Google tags on staging?
4. Who is confirmed as controller: Jakub, BOSEN, or joint arrangement?
5. Should Google Places be described under necessary/functional services even before analytics is enabled?
6. How long should attribution be retained in browser storage and CRM?
7. Are enhanced conversions allowed later? Default answer for V1: no.
8. Will BOSEN/legal review the privacy and cookie text before production ads?

## Immediate next implementation step

Build a lightweight local consent layer first, with no external CMP:

1. Add a reusable `CookieConsent.astro` component.
2. Add a small consent manager script.
3. Gate `trackFunnelEvent` and future GA/Ads calls behind consent.
4. Add environment-gated analytics config.
5. Update privacy/cookie page.
6. Verify locally and on staging before enabling production tracking.
