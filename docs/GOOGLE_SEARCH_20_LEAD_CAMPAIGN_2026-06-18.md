# Google Search campaign kit: 20 seller leads

Date: 2026-06-18

Objective: launch a controlled Google Search test that can produce the first 20 qualified seller leads for Jakub without wasting budget on buyer, rental, job, portal-navigation or generic real-estate searches.

## Source references

- Google Ads housing / personalized advertising policy: https://support.google.com/adspolicy/answer/16701755
- Google Ads keyword match types: https://support.google.com/google-ads/answer/7478529
- Google Ads website conversions setup: https://support.google.com/google-ads/answer/16560108
- Google lead form assets overview: https://business.google.com/uk/resources/articles/generate-more-leads-with-lead-form-assets/

## Current funnel state

Staging proof:

```text
https://staging.jakubolsa.sk/predaj-bytu-bratislava/
-> /rezervacia/?zamer=Preda%C5%A5%20byt&entry=predaj-bytu-bratislava
-> /api/book
-> Google Calendar
-> Supabase CRM
```

Last staging E2E:

```text
mode: google
bookingStatus: calendar_created
crmStatus: crm_created
eventId: pv98q4jvcr98n1dj7nqa71gi78
leadId: 3ef365e7-fe43-43b8-8089-de319f82601e
appointmentId: f65dc408-1268-4b74-b93e-b04db03e13a1
analyticsConversionId: e5f6bc86-ca42-4215-b74f-3ed06d84c70e
```

Before paid traffic:

- confirm Telegram/OpenClaw receipt from staging E2E,
- clean up or label the internal test records above,
- deploy reviewed changes to production,
- set production GA4 / Google Ads IDs through environment variables, not hardcoded values,
- verify conversion with Tag Assistant after consent + successful booking.

## Budget and success math

Recommended first Search test:

```text
Total test budget: EUR 500
Daily cap: EUR 35-50
Duration: 10-14 days
Goal: 20 A/B seller leads
Primary conversion: successful booking only
Secondary signals: booking_start, booking_step_property, booking_step_date, booking_step_contact
```

Decision thresholds:

```text
If spend EUR 100 and no booking_start -> ad/keyword mismatch or landing page problem.
If many booking_start but no contact step -> wizard friction or wrong promise.
If many raw bookings but few A/B -> tighten keywords/negatives and copy.
If 3+ A leads arrive below EUR 150 each -> keep test running and raise budget slowly.
```

## Campaign setup

Campaign name:

```text
SK | Search | Seller Audit | Bratislava | 20 lead sprint
```

Network:

```text
Search Network only.
Do not include Display Network.
Do not start with Performance Max.
```

Location:

```text
Bratislava + relevant nearby market.
Use city/region targeting, not demographic narrowing.
```

Policy note:

Housing-related ads can trigger Google personalized advertising restrictions. Use neutral service copy, avoid demographic exclusion/inclusion, and do not target by sensitive personal traits. Google allows city and country-based geographic targeting and radius targeting with at least 1 km radius under the referenced policy page.

Languages:

```text
Slovak
English optional only if search volume is too low.
```

Bidding:

Start conservative:

```text
Manual CPC or Maximize clicks with CPC cap if no conversion history exists.
Switch to Maximize conversions only after real conversion volume exists.
```

Reason: Google notes broad match works best with Smart Bidding, but this account likely has little conversion data. For the first seller sprint, phrase/exact control matters more than scale.

## Keyword files

Prepared files:

- `ops/ads/google-search-seller-keywords-2026-06-18.csv`
- `ops/ads/google-search-negative-keywords-2026-06-18.csv`
- `ops/ads/google-search-rsa-copy-2026-06-18.csv`

Initial match types:

```text
Use exact + phrase only.
Avoid broad until there are enough search terms and conversion data.
```

Google's keyword documentation says broad match may show on related searches that do not contain the direct meaning of the keyword. That is useful at scale, but risky during a EUR 500 seller-only test.

## Ad groups

### 1. Predaj bytu Bratislava

Use:

- `[predaj bytu bratislava]`
- `"predaj bytu bratislava"`
- `[predat byt bratislava]`
- `"predat byt bratislava"`

Landing:

```text
https://jakubolsa.sk/predaj-bytu-bratislava/?utm_source=google&utm_medium=cpc&utm_campaign=seller_audit_ba_search&utm_content=predaj_bytu_ba_exact&utm_term={keyword}
```

### 2. Odhad ceny bytu

Use:

- `[odhad ceny bytu bratislava]`
- `"odhad ceny bytu bratislava"`

Ad copy must not promise a precise instant estimate. The offer is a human predajný audit / predajná stratégia.

### 3. Predaj bez realitky

Use:

- `[predat byt bez realitky]`
- `"predat byt bez realitky"`

Tone: do not attack self-sellers. Offer a check of price, presentation and process.

### 4. Zdedený byt

Use:

- `[predaj zdedeneho bytu]`
- `"predaj zdedeneho bytu"`

This deserves a future dedicated landing page. Until then, route to `/predaj-bytu-bratislava/`.

### 5. Rýchly predaj bytu

Use:

- `[rychly predaj bytu bratislava]`
- `"rychly predaj bytu bratislava"`

Do not claim guaranteed speed or guaranteed price. Use the angle: avoid unnecessary discount by understanding price and process first.

## Conversion setup

Primary conversion:

```text
Name: Lead - Seller audit booking
Category: Submit lead form or closest lead category available
Trigger: only after /api/book returns ok:true
Value: no fixed value for first test, or EUR 250 estimated lead value if Google Ads needs value
Enhanced conversions: off for V1
Remarketing: off for V1
```

Implementation already expected in code:

- consent-aware Google tag,
- `generate_lead` event after successful booking,
- Google Ads conversion only after marketing consent and successful booking,
- no raw PII in analytics events.

Google's conversion setup documentation starts from Goals -> Summary -> Create conversion action -> Conversions on a website -> Add URL / Scan. Use that flow after production tags are configured.

## Lead form assets

Do not use Google lead form assets in the first sprint unless website conversion volume is too low.

Reason:

- Google lead form assets reduce friction, but the current goal is qualified owner leads.
- The website wizard collects ownership relation, sale status, price idea, property parameters, and time horizon.
- Google lead forms have limited/custom question constraints and can lower lead quality.

If used later:

- CTA: `Získať odhad` or `Kontaktovať`
- business name: `Jakub Olša`
- privacy policy URL: `https://jakubolsa.sk/ochrana-osobnych-udajov/`
- webhook/n8n sync must map into Supabase and preserve `utm_*` equivalent fields.

## Daily review routine

First 7 days:

- check search terms daily,
- add negatives immediately for buyers, renters, jobs, portals, legal templates, admin guides,
- check booking funnel events,
- check every completed booking manually for A/B/C grade,
- ask Jakub for call outcome within 24h,
- pause keywords that spend EUR 50+ without booking_start,
- pause ad groups with poor lead quality even if CPL is low.

Daily report fields:

```text
date
spend
impressions
clicks
CTR
CPC
booking_start
booking_step_property
booking_step_date
booking_step_contact
completed_bookings
A leads
B leads
C leads
qualified CPL
calls completed
meetings booked
listing opportunities
notes / search-term actions
```

## Launch gate

Do not spend before these are true:

- [ ] Production deploy reviewed and no `noindex` on production.
- [ ] Staging test records cleaned or clearly labeled.
- [ ] Telegram/OpenClaw destination receipt confirmed.
- [ ] Production `PUBLIC_ANALYTICS_MODE=production`.
- [ ] Production GA4 measurement ID set.
- [ ] Production Google Ads ID and conversion label set.
- [ ] Tag Assistant confirms no conversion before consent.
- [ ] Tag Assistant confirms one conversion after successful booking.
- [ ] Negative keyword list loaded.
- [ ] Daily cap set to EUR 35-50.
- [ ] Jakub agrees to call A leads same day.
