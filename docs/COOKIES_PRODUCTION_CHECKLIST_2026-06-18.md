# Cookies production checklist

Date: 2026-06-18

Purpose: operational checklist for taking Jakub's site from no analytics cookies to a production-ready cookie, consent, analytics and ads tracking setup.

This document is the working source of truth before implementation. Legal wording must still be reviewed by Jakub/BOSEN legal support if paid analytics/ads are enabled.

## Target V1 mode

Use the conservative EU/SK setup first:

```text
necessary: always active
analytics: opt-in
marketing: opt-in
Google Consent Mode: basic
staging: no production GA/Ads tags
enhanced conversions: disabled
remarketing: disabled until legal/privacy text is confirmed
```

## 0. Current state

- [x] Site runs on `staging` branch.
- [x] Current commit baseline: `0eb6674 Prepare launch backend and lead engine systems`.
- [x] Privacy page exists at `/ochrana-osobnych-udajov/`.
- [x] Booking wizard exists at `/rezervacia/`.
- [x] Booking wizard already captures attribution:
  - `utm_source`
  - `utm_medium`
  - `utm_campaign`
  - `utm_content`
  - `utm_term`
  - `gclid`
  - `gbraid`
  - `wbraid`
  - `fbclid`
  - `msclkid`
  - referrer
  - landing path
  - booking path
  - first/last seen timestamp
- [x] Booking wizard sends attribution to `/api/book`.
- [x] `trackFunnelEvent` exists in `src/pages/rezervacia.astro`.
- [ ] No cookie banner exists.
- [ ] No consent storage exists.
- [ ] No GA4/Ads environment config exists.
- [ ] No production-safe Google tag loader exists.
- [ ] Privacy page still says analytics/marketing cookies are not used.

## 1. Decide the tracking stack

Goal: choose the measurement architecture before writing code.

- [ ] Decide whether V1 uses direct Google tags or GTM.
  - Recommended V1: direct Google tag if only GA4 + Google Ads are needed.
  - Use GTM if Adam/Jakub expect many future tags, experiments or non-developer tag changes.
- [ ] Decide whether staging uses:
  - fully disabled analytics, or
  - separate test GA4/Ads IDs.
  - Recommended V1: disabled on staging until local QA passes; optional test ID later.
- [ ] Decide whether Google Consent Mode is:
  - basic, or
  - advanced.
  - Recommended V1: basic.
- [ ] Decide whether enhanced conversions are allowed.
  - Recommended V1: no.
- [ ] Decide whether remarketing is allowed.
  - Recommended V1: no until privacy/legal text is confirmed.

Acceptance criteria:

- [ ] There is a clear written decision for direct tags vs GTM.
- [ ] There is a clear written decision for staging/test tracking.
- [ ] There is a clear written decision that enhanced conversions are disabled for V1.

## 2. Inventory services and data flows

Goal: know exactly what must be described in privacy/cookie text.

- [ ] Confirm active technical services:
  - [ ] Cloudflare hosting/CDN/Worker.
  - [ ] `/api/availability`.
  - [ ] `/api/book`.
  - [ ] Google Places autocomplete.
  - [ ] Google Calendar server-side event creation.
  - [ ] Supabase CRM.
  - [ ] Telegram internal notifications.
  - [ ] OpenClaw handoff.
- [ ] Confirm planned analytics/marketing services:
  - [ ] GA4.
  - [ ] Google Ads conversion tracking.
  - [ ] Google Ads remarketing, if planned later.
  - [ ] Meta Pixel, if planned later.
  - [ ] Microsoft Ads, if planned later.
- [ ] Confirm that no PII will be sent into analytics events:
  - no name,
  - no phone,
  - no email,
  - no exact address,
  - no free-text message.

Acceptance criteria:

- [ ] Every external service has a purpose.
- [ ] Every non-essential service is mapped to analytics or marketing consent.
- [ ] Privacy page can be updated from this inventory without guessing.

## 3. Define consent categories

Goal: make categories stable before UI and code.

### Necessary

Always active. No opt-out because the site cannot function without them.

Includes:

- basic site rendering,
- security,
- Cloudflare Worker,
- booking form operation,
- `/api/availability`,
- `/api/book`,
- storing the user's cookie choice,
- Google Places if used as part of address input functionality.

- [ ] Confirm final necessary category wording.

### Analytics

Only active after opt-in.

Includes:

- GA4 page views,
- GA4 booking funnel events,
- analytics-only measurement of traffic sources and page performance.

- [ ] Confirm final analytics category wording.

### Marketing

Only active after opt-in.

Includes:

- Google Ads conversion tracking,
- Google Ads remarketing,
- Meta Pixel or other ad pixels if added,
- enhanced conversions if ever approved later.

- [ ] Confirm final marketing category wording.

Acceptance criteria:

- [ ] Categories are understandable to a normal visitor.
- [ ] Categories map cleanly to code.
- [ ] Categories map cleanly to Google Consent Mode consent types.

## 4. Add environment configuration

Goal: prevent staging or local work from firing production tracking.

Add public config placeholders:

- [ ] `PUBLIC_ANALYTICS_MODE=disabled|test|production`
- [ ] `PUBLIC_GA4_MEASUREMENT_ID=`
- [ ] `PUBLIC_GOOGLE_ADS_ID=`
- [ ] `PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=`
- [ ] Optional later: `PUBLIC_GTM_CONTAINER_ID=`

Likely files:

- `.env.example`
- `wrangler.toml`
- deployment environment variables in Cloudflare

Rules:

- [ ] Production IDs must not be hardcoded directly in components.
- [ ] Staging must not use production conversion labels.
- [ ] Local dev should default to disabled unless explicitly overridden.

Acceptance criteria:

- [ ] Missing IDs do not break the site.
- [ ] Disabled mode never loads Google analytics/ads scripts.
- [ ] Staging cannot accidentally fire production conversion tracking.

## 5. Build consent storage

Goal: persist the visitor's choice across pages.

Storage:

- [ ] Use `localStorage` key `jakub_cookie_consent_v1`.
- [ ] Store:
  - `necessary: true`
  - `analytics: boolean`
  - `marketing: boolean`
  - `version`
  - `updated_at`
  - `expires_at`

Recommended TTL:

- [ ] 6 months for rejected/non-granted consent.
- [ ] 6 to 12 months for granted consent, depending on legal review.

Behavior:

- [ ] If no choice exists, show banner.
- [ ] If choice exists and is valid, do not show banner.
- [ ] If version changes, ask again.
- [ ] If expired, ask again.
- [ ] User can reopen preferences from footer/privacy page.

Acceptance criteria:

- [ ] Choice persists across homepage, seller page, listing page and reservation page.
- [ ] Reject all persists.
- [ ] Accept all persists.
- [ ] Custom preference persists.
- [ ] Expired or version-mismatched consent reopens banner.

## 6. Build cookie banner UI

Goal: give a clear and legally usable choice.

Required controls:

- [ ] Accept all.
- [ ] Reject optional cookies.
- [ ] Manage preferences.
- [ ] Save preferences.
- [ ] Analytics toggle.
- [ ] Marketing toggle.
- [ ] Link to `/ochrana-osobnych-udajov/`.

Required copy:

- [ ] Short explanation that necessary cookies/services are always active.
- [ ] Analytics explanation.
- [ ] Marketing explanation.
- [ ] Clear mention that settings can be changed later.

Implementation likely:

- [ ] Add `src/components/CookieConsent.astro`.
- [ ] Add component to public pages:
  - [ ] `src/pages/index.astro`
  - [ ] `src/pages/rezervacia.astro`
  - [ ] `src/pages/predaj-bytu-bratislava.astro`
  - [ ] `src/pages/nehnutelnosti/[slug].astro`
  - [ ] `src/pages/ochrana-osobnych-udajov.astro`
- [ ] Add “Spravovať cookies” link in footer/privacy page.

Acceptance criteria:

- [ ] Banner is visible on first visit.
- [ ] Buttons are equally available: rejecting optional cookies is not hidden behind dark patterns.
- [ ] UI works on mobile.
- [ ] UI does not block booking form usability after a choice is made.

## 7. Implement Google Consent Mode mapping

Goal: translate Jakub's categories into Google consent state.

Mapping:

```text
analytics -> analytics_storage
marketing -> ad_storage
marketing -> ad_user_data
marketing -> ad_personalization
necessary -> security_storage / necessary local behavior
```

Tasks:

- [ ] Initialize default denied state before Google tags can run.
- [ ] Update consent state after visitor choice.
- [ ] In basic mode, do not load Google tags before relevant consent.
- [ ] Keep consent update code best-effort so it never breaks booking.

Acceptance criteria:

- [ ] Before consent, no GA4/Ads tags are loaded in basic mode.
- [ ] Analytics consent enables analytics only.
- [ ] Marketing consent enables Ads/conversion consent types.
- [ ] Revoking consent stops future optional tracking.

## 8. Build analytics loader

Goal: load GA4/Ads only when config and consent allow it.

Tasks:

- [ ] Create a small analytics loader script.
- [ ] Read `PUBLIC_ANALYTICS_MODE`.
- [ ] Read GA4 measurement id.
- [ ] Read Google Ads id and conversion label.
- [ ] Load Google tag only after analytics or marketing consent.
- [ ] Expose a safe function for sending events.
- [ ] Never throw errors into the user flow.

Rules:

- [ ] No external analytics script in disabled mode.
- [ ] No production IDs in staging.
- [ ] No analytics event should include PII.

Acceptance criteria:

- [ ] Page view fires only after analytics consent.
- [ ] Ads conversion capability exists only after marketing consent.
- [ ] Console/network inspection confirms no requests before consent.

## 9. Gate booking funnel events

Goal: make existing wizard tracking consent-aware.

Current code:

- `src/pages/rezervacia.astro`
- function: `trackFunnelEvent`

Tasks:

- [ ] Keep internal `booking:funnel` browser event for debugging if useful.
- [ ] Send GA4 funnel events only when analytics consent is granted.
- [ ] Send Ads conversion only when marketing consent is granted.
- [ ] Convert current internal event names to final external event names.

Recommended event map:

- [ ] `booking_start`
- [ ] `booking_step_intent`
- [ ] `booking_step_property`
- [ ] `booking_step_date`
- [ ] `booking_step_contact`
- [ ] `generate_lead`

Rules:

- [ ] `generate_lead` fires only after `/api/book` returns `ok: true`.
- [ ] Failed booking does not fire `generate_lead`.
- [ ] Mailto fallback does not fire `generate_lead`.
- [ ] Double submit does not double-count conversion.

Acceptance criteria:

- [ ] Opening wizard can fire a consented analytics funnel event.
- [ ] Successful booking fires one `generate_lead`.
- [ ] Failed booking fires no conversion.
- [ ] Event payload contains no PII.

## 10. Define allowed event parameters

Goal: protect privacy while preserving useful campaign reporting.

Allowed:

- [ ] `intent`
- [ ] `property_type`
- [ ] `booking_status`
- [ ] `mode`
- [ ] `utm_source`
- [ ] `utm_medium`
- [ ] `utm_campaign`
- [ ] `utm_content`
- [ ] `utm_term`
- [ ] `landing_path`
- [ ] `lead_source`

Forbidden:

- [ ] `meno`
- [ ] `telefon`
- [ ] `email`
- [ ] exact address
- [ ] full location string if it identifies the property
- [ ] free-text message
- [ ] raw form payload
- [ ] Google Place ID if it identifies a precise property

Acceptance criteria:

- [ ] Code has a sanitization layer or allowlist before sending analytics events.
- [ ] Manual inspection of event payloads shows no PII.

## 11. Update privacy and cookie text

Goal: public text must match actual implementation.

Current file:

- `src/pages/ochrana-osobnych-udajov.astro`

Tasks:

- [ ] Replace current claim that analytics/marketing cookies are not used once tags are added.
- [ ] Add cookie categories:
  - necessary,
  - analytics,
  - marketing.
- [ ] Explain purposes.
- [ ] Explain providers/recipients:
  - Cloudflare,
  - Google,
  - Supabase,
  - Telegram,
  - OpenClaw/OpenAI if relevant,
  - future email provider if already enabled.
- [ ] Explain how to change consent.
- [ ] Explain that analytics/marketing are optional.
- [ ] Keep legal wording conservative until BOSEN/legal confirms final language.
- [ ] Update “Posledná aktualizácia”.

Acceptance criteria:

- [ ] Privacy page describes the real stack.
- [ ] “Spravovať cookies” works from privacy page.
- [ ] Page does not overclaim legal certainty.

## 12. Configure GA4

Goal: make analytics useful before ads money is spent.

Tasks:

- [ ] Create or confirm GA4 property.
- [ ] Add production measurement ID to production environment only.
- [ ] Optionally create separate staging/test measurement ID.
- [ ] Mark `generate_lead` as key event/conversion in GA4.
- [ ] Verify DebugView after consent.
- [ ] Verify no PII in events.

Acceptance criteria:

- [ ] Consent-accepted page view appears in GA4.
- [ ] Consent-accepted funnel event appears in GA4.
- [ ] Successful booking appears as `generate_lead`.
- [ ] Rejected analytics produces no GA4 event in basic mode.

## 13. Configure Google Ads conversion

Goal: attribute paid search leads correctly.

Tasks:

- [ ] Create Google Ads conversion action for successful booking.
- [ ] Add conversion ID.
- [ ] Add conversion label.
- [ ] Fire Ads conversion only after `/api/book` success.
- [ ] Do not fire on form open, step completion, validation error or mailto fallback.
- [ ] Keep enhanced conversions disabled.

Acceptance criteria:

- [ ] Google Tag Assistant confirms conversion only after consent + successful booking.
- [ ] Failed booking does not create conversion.
- [ ] Staging does not fire production conversion.

## 14. QA matrix

Goal: prove the system behaves correctly before production.

Browser states:

- [ ] Fresh visitor.
- [ ] Accept all.
- [ ] Reject optional.
- [ ] Analytics only.
- [ ] Marketing only.
- [ ] Change preferences after prior choice.
- [ ] Expired consent.

Pages:

- [ ] Homepage.
- [ ] Reservation page.
- [ ] Seller landing page.
- [ ] Listing detail page.
- [ ] Privacy page.

Network checks:

- [ ] No consent: no GA/Ads requests.
- [ ] Analytics consent: GA4 requests allowed.
- [ ] Marketing consent: Ads conversion allowed.
- [ ] Staging: no production endpoints/IDs.

Booking checks:

- [ ] Successful booking fires one conversion.
- [ ] Failed booking fires no conversion.
- [ ] Duplicate submit cannot double-count.
- [ ] Event payload contains no PII.
- [ ] Attribution still reaches `/api/book`.

Acceptance criteria:

- [ ] QA notes are written in docs or commit message.
- [ ] Any blocker is fixed before production deploy.

## 15. Deployment sequence

Goal: avoid breaking production or polluting analytics.

Steps:

- [ ] Implement locally.
- [ ] Run Astro build.
- [ ] Test locally.
- [ ] Deploy to staging.
- [ ] Test banner and preferences on staging.
- [ ] Test no production tags on staging.
- [ ] Add production env vars only after staging QA.
- [ ] Deploy production.
- [ ] Verify production with fresh browser profile.
- [ ] Monitor first live events.

Acceptance criteria:

- [ ] Production only receives real tracking after final env vars are configured.
- [ ] Production privacy page is updated before tags are live.
- [ ] Adam/Jakub know how to reopen cookie preferences.

## 16. Documentation updates

Goal: future work should not depend on memory.

Update after implementation:

- [ ] `docs/PROJECT_STATUS.md`
- [ ] `docs/STAGING_DEPLOYMENT.md`
- [ ] `docs/FULL_LAUNCH_BACKEND_TODO_2026-06-18.md`
- [ ] `docs/LAUNCH_CHECKLIST_ADS_SEO_EMAIL_MONITORING_2026-06-18.md`
- [ ] `docs/COOKIES_ANALYTICS_RESEARCH_2026-06-18.md` if decisions changed.

Record:

- [ ] Chosen analytics stack.
- [ ] Consent mode.
- [ ] Environment variables.
- [ ] Event names.
- [ ] Staging QA result.
- [ ] Production deploy date.
- [ ] Known limitations.

## 17. Decisions still needed

- [ ] Direct Google tag or GTM?
- [ ] Disable staging tracking or use test IDs?
- [ ] Final controller: Jakub, BOSEN or joint arrangement?
- [ ] Is Google Places acceptable as necessary/functional service in the privacy text?
- [ ] Consent retention period: 6 months or 12 months?
- [ ] Attribution retention period in browser/CRM: keep 90 days or shorten?
- [ ] Will BOSEN/legal review before production paid ads?

## 18. First implementation slice

Start with the minimum shippable consent layer:

- [ ] Add reusable `CookieConsent.astro`.
- [ ] Add consent storage and preference modal.
- [ ] Add “Spravovať cookies” trigger.
- [ ] Add disabled-by-default analytics config.
- [ ] Gate existing booking `trackFunnelEvent`.
- [ ] Update privacy page to describe categories and current disabled/test state.
- [ ] Build and test locally.

Only after this slice works should GA4/Google Ads IDs be wired in.
