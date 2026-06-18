# Seller lead engine checklist

Date: 2026-06-10

Updated: 2026-06-17

Purpose: turn Jakub's current web + OpenClaw backend into a repeatable seller-lead engine for people who are already thinking about selling a property.

Detailed launch-readiness checklist for ads, SEO, email follow-up, Google reviews and monitoring:

- `docs/LAUNCH_CHECKLIST_ADS_SEO_EMAIL_MONITORING_2026-06-18.md`

## Current base

- [x] Astro web exists as Jakub's personal broker website.
- [x] Reservation wizard exists at `/rezervacia/`.
- [x] Cloudflare Worker handles `/api/availability` and `/api/book`.
- [x] Booking flow can check Google Calendar availability and disable busy slots.
- [x] Booking flow can create a Google Calendar event when Google secrets are configured.
- [x] Booking flow can write contact, lead, appointment and note records into Supabase CRM.
- [x] Booking flow can send Telegram notifications.
- [x] Booking flow can hand off the booking to OpenClaw.
- [x] OpenClaw agent has CRM/listing/property workflow tools prepared.
- [x] `llms.txt`, sitemap and basic SEO metadata exist.

## Immediate integration checklist

- [ ] Switch Google Calendar OAuth/secrets from Adam/test calendar to Jakub's real working calendar.
- [x] Confirm wizard -> Calendar communication and event creation on Adam/test Google account.
- [ ] Run controlled staging E2E test after current hook/secrets check: web wizard -> Worker -> Google Calendar -> Supabase -> Telegram -> OpenClaw.
- [ ] Confirm OpenClaw receives real booking handoff from deployed staging Worker.
- [ ] Confirm busy Google Calendar slots are disabled in the wizard.
- [ ] Confirm second free/busy check blocks race-condition double booking at submit time.
- [x] Add UTM/campaign capture to booking payload.
- [x] Store attribution fields in Supabase lead `raw_payload`.
- [x] Add attribution fields to OpenClaw handoff payload.
- [ ] Confirm production secrets are present except Jakub calendar/mail and document the exact remaining gap.
- [ ] Confirm Telegram notification is delivered to the intended Jakub/Adam chat after web booking.

## Seller landing pages

Create pages for high-intent seller queries. Each page should lead into `/rezervacia/` and the seller audit/consultation flow.

- [ ] `/predaj-bytu-bratislava/`
- [ ] `/ocenenie-bytu-bratislava/`
- [ ] `/predaj-bytu-ruzinov/`
- [ ] `/predaj-bytu-stare-mesto/`
- [ ] `/predaj-domu-bratislava/`
- [ ] `/predaj-zdedenej-nehnutelnosti/`
- [ ] `/rychly-predaj-bytu-bratislava/`

Each page should include:

- [ ] clear seller intent headline,
- [ ] Jakub + BOSEN positioning,
- [ ] process explanation,
- [ ] proof from real sold listings,
- [ ] FAQ section,
- [ ] booking CTA,
- [ ] schema/structured data where appropriate.

## Content for Google and AI search

Build content that answers real questions sellers ask before contacting a broker.

- [ ] How to sell an apartment in Bratislava.
- [ ] How to estimate the price of an apartment in Bratislava.
- [ ] Whether to renovate before selling.
- [ ] How to sell inherited property.
- [ ] How fast an apartment can sell with the right pricing and demand.
- [ ] What a good broker actually does beyond posting an ad.
- [ ] How Jakub works with BOSEN Group support.
- [ ] Case study: Orenburska polyfunctional object.
- [ ] Case study: Skalicka cesta.
- [ ] Case study: Slnecnice / mid-market apartment sale.

## Structured data and crawlability

- [ ] Verify `robots.txt` does not block Googlebot, Bingbot or OAI-SearchBot on production.
- [ ] Keep staging noindex/noarchive.
- [ ] Add or verify `LocalBusiness` / `RealEstateAgent` structured data.
- [ ] Add or verify `Person` structured data for Jakub.
- [ ] Add `Service` structured data for selling, buying, renting and valuation services.
- [ ] Add `FAQPage` structured data on seller guide pages where appropriate.
- [ ] Add `BreadcrumbList` structured data on landing/detail pages.
- [ ] Keep `llms.txt` accurate as an AI-readable summary, but treat HTML content as the source of truth.

References:

- Google SEO starter guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google AI optimization guidance: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google LocalBusiness structured data: https://developers.google.com/search/docs/appearance/structured-data/local-business
- OpenAI crawlers and OAI-SearchBot: https://developers.openai.com/api/docs/bots

## Paid acquisition

Google Search should capture existing high intent. Meta/Instagram should build trust and retarget people who already interacted.

Google Search test:

- [ ] Start with seller-intent keywords only.
- [ ] Avoid broad generic "reality Bratislava" campaigns at first.
- [ ] Send each ad group to a matching landing page.
- [ ] Use call and booking conversion tracking.
- [ ] Measure lead quality, not just form volume.

Example keyword groups:

- [ ] predat byt bratislava
- [ ] predaj bytu bratislava
- [ ] odhad ceny bytu bratislava
- [ ] predat byt ruzinov
- [ ] rychly predaj bytu bratislava
- [ ] makler predaj bytu bratislava
- [ ] predaj zdedeneho bytu

Meta/Instagram test:

- [ ] Use Reels/carousels for education and trust.
- [ ] Retarget visitors of seller landing pages.
- [ ] Retarget people who opened but did not finish the booking wizard.
- [ ] Use sold-property proof and process explanations.
- [ ] Keep direct booking CTA, but expect Meta to assist trust more than close hot intent.

## Attribution and CRM tracking

Every lead should preserve attribution from first touch to closed deal.

- [ ] `utm_source`
- [ ] `utm_medium`
- [ ] `utm_campaign`
- [ ] `utm_content`
- [ ] `utm_term`
- [ ] landing page path
- [ ] referrer
- [ ] selected intent
- [ ] property type
- [ ] location
- [ ] booking page URL
- [ ] user consent/cookie mode for analytics where needed
- [ ] calendar event id
- [ ] CRM lead id
- [ ] Telegram notification status
- [ ] OpenClaw handoff run id/status
- [ ] follow-up outcome
- [ ] listing agreement outcome
- [ ] sale outcome
- [ ] commission/success-fee outcome

## Monitoring and failure visibility

- [ ] Add Worker-side logging/admin case for failed Telegram notification.
- [ ] Add Worker-side logging/admin case for failed OpenClaw handoff.
- [ ] Add periodic health checks for staging/prod `/api/health`.
- [ ] Add periodic health check for OpenClaw `https://openclaw.jakubolsa.sk/healthz`.
- [ ] Surface failed agent runs, failed webhooks and open admin cases in Adam's global business dashboard.
- [ ] Keep approval decisions in `approval_requests` or a dedicated approval audit trail.

## Google reviews workflow

- [ ] Decide whether V1 uses `tasks` + `approval_requests` or a dedicated `review_requests` table.
- [ ] Store client/property/deal relation for each review request.
- [ ] Store review status: draft, approved, sent, responded, skipped.
- [ ] Store Google review link and message text.
- [ ] Require Jakub approval before sending client-facing review request until rules are proven.
- [ ] Surface pending review requests in dashboard.

## Commercial positioning

Do not sell this as "a website".

Positioning:

- personal broker lead system,
- seller acquisition funnel,
- calendar-aware booking engine,
- CRM-backed broker operating system,
- OpenClaw AI sales desk,
- listing/CMS workflow,
- multi-tenant broker platform.

Target customer:

- high-performing broker,
- broker team,
- franchise office,
- broker with personal brand,
- broker handling higher-value listings,
- broker who cares about speed-to-lead and automation.

Avoid:

- low-budget brokers who only want a cheap website,
- clients who do not understand lead value,
- selling success fee without written attribution rules.

## Revenue logic

For the discussed Jakub/BOSEN example:

```text
5% property commission
45% BOSEN share
55% Jakub share
50% of Jakub share to Adam for sourced lead

Adam share = 1.375% of property sale price
```

Implication:

- a EUR 250,000 sale can be worth about EUR 3,438 to Adam,
- a EUR 350,000 sale can be worth about EUR 4,813 to Adam,
- a EUR 650,000 sale can be worth about EUR 8,938 to Adam,
- an EUR 800,000 sale can be worth about EUR 11,000 to Adam.

This makes the upside larger than a one-time website fee if attribution and revenue share are contracted.

## Next build items

- [x] Implement UTM capture in `src/pages/rezervacia.astro`.
- [x] Pass attribution through `/api/book`.
- [x] Store attribution in Supabase lead payload.
- [x] Include attribution in Telegram and OpenClaw booking handoff.
- [x] Add failure visibility for Telegram/OpenClaw side effects.
- [ ] Start dashboard module backlog with leads + follow-ups + approvals.
- [x] Add first seller landing page: `predaj-bytu-bratislava`.
- [x] Add seller FAQ content.
- [x] Add structured data updates.
- [x] Run local build.
- [x] Deploy to staging.
- [ ] Run a small paid search test after Jakub calendar is connected.
