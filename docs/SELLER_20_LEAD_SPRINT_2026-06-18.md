# Seller 20-lead sprint

Date: 2026-06-18

Objective: get 20 qualified seller leads for Jakub and create a path toward EUR 5,000/month for Adam from sourced seller-side deals.

## Revenue target

Working commercial model:

```text
5% property commission
45% BOSEN share
55% Jakub share
50% of Jakub share to Adam for sourced lead

Adam share = 1.375% of sale price
```

Practical target:

```text
EUR 200,000 sale -> about EUR 2,750 to Adam
EUR 365,000 sale -> about EUR 5,019 to Adam
2 average apartment closings/month -> about EUR 5,000+/month
```

## Qualified lead definition

A lead counts toward the 20-lead sprint only if it has:

- seller-side intent, not buyer/renter intent,
- owner, co-owner, family/dedication or inheritance context,
- named location,
- property type,
- phone number,
- time horizon,
- sale status,
- enough context for Jakub to call with a concrete first angle.

Lead scoring in the reservation payload:

- `A`: owner/family/inheritance signal, 0-3 month horizon, active sale status.
- `B`: owner/family/inheritance signal plus either 3-6 month horizon or active sale status.
- `C`: weak or unclear ownership/timing signal.

Sprint goal is 20 `A`/`B` leads, not 20 raw form submissions.

## Funnel

```text
Google Search / Meta / manual outreach / SEO
-> /predaj-bytu-bratislava/
-> /rezervacia/?zamer=Preda%C5%A5%20byt&entry=predaj-bytu-bratislava
-> booking form captures qualification + attribution
-> Supabase CRM + Telegram + OpenClaw handoff
-> Jakub calls
-> meeting / valuation / listing agreement
-> sale outcome and Adam commission tracking
```

## First channels

### Google Search

Use for existing high intent.

Initial ad groups:

- `predaj bytu bratislava`
- `predat byt bratislava`
- `odhad ceny bytu bratislava`
- `predaj zdedeneho bytu`
- `predat byt bez realitky`
- `realitny makler predaj bytu bratislava`

Negative keywords:

- `prenajom`
- `praca`
- `brigada`
- `vzor zmluvy`
- `kataster navod`
- `lacno`
- `reality portal`
- `kurz`

Landing page:

- `/predaj-bytu-bratislava/`

Primary conversion:

- successful reservation submit only.

Secondary events:

- booking start,
- property step,
- date step,
- contact step.

### Meta / Instagram

Use for reach, trust and retargeting. Housing category rules limit targeting, so creative must qualify the viewer.

Creative angles:

- Predávate byt v Bratislave? Najprv si overte cenu a postup.
- Zdedili ste byt a neviete, či predávať, prenajať alebo počkať?
- Už inzerujete bez RK a nechodí správny dopyt?
- Cena, rýchlosť alebo pokoj: čo má byť priorita pri predaji bytu?

CTA:

- `Chcem predajný audit`

Retarget:

- visitors of `/predaj-bytu-bratislava/`,
- booking starters who did not submit,
- Instagram profile engagers.

### Manual AI-assisted hunting

Daily source review:

- Bazos,
- Bezrealitky,
- Nehnutelnosti.sk private-looking listings,
- Facebook local groups,
- posts mentioning inheritance, moving, divorce, downsizing, investment flat, selling without RK.

AI use:

- classify whether the listing looks like owner/private/RK,
- extract location, property type, price, phone/email if public,
- write a personal first message,
- prepare three concrete audit observations from public listing data,
- log the attempt and outcome.

Outreach tone:

```text
Dobrý deň, videl som, že riešite predaj bytu. Nechcem vám posielať generickú ponuku.
Vieme vám spraviť krátky predajný audit: či cena, prezentácia a postup dávajú zmysel
oproti aktuálnemu trhu. Ak chcete, pošlem 3 konkrétne postrehy k vašej ponuke.
```

Do not automate bulk spam. Use AI for research and personalization, not for uncontrolled mass messaging.

## Tool stack

Current stack:

- Astro web,
- reservation wizard,
- Cloudflare Worker booking API,
- Supabase CRM,
- Telegram notifications,
- OpenClaw handoff,
- Google Calendar availability,
- UTM and attribution capture.

Add or configure next:

- Google Ads Search campaign,
- Google Ads conversion for successful booking,
- Meta Pixel/CAPI if legally approved,
- Google Search Console,
- Looker Studio or dashboard view for spend -> lead -> meeting -> agreement -> sale,
- n8n only if external ad lead forms need syncing.

Google Search launch kit:

- `docs/AI_LEADGEN_TOOL_STACK_2026-06-19.md`
- `docs/GOOGLE_SEARCH_20_LEAD_CAMPAIGN_2026-06-18.md`
- `ops/ads/google-search-seller-keywords-2026-06-18.csv`
- `ops/ads/google-search-negative-keywords-2026-06-18.csv`
- `ops/ads/google-search-rsa-copy-2026-06-18.csv`
- `ops/ads/seller-audit-launch-pack-2026-06-19.md`
- `ops/ads/seller-audit-launch-links-2026-06-19.csv`
- `ops/ads/seller-audit-daily-performance-2026-06.csv`
- `ops/ads/seller-audit-daily-performance-report-2026-06-19.md`
- `npm run ads:seller-launch-pack`
- `npm run ads:seller-launch-validate`
- `npm run ads:seller-daily-performance`
- `npm run leadgen:daily-operator`

Meta / Instagram launch kit:

- `docs/META_SELLER_20_LEAD_CREATIVES_2026-06-19.md`
- `ops/ads/meta-seller-creatives-2026-06-19.csv`

Manual hunting kit:

- `docs/LEADGEN_VOLUME_MODEL_2026-06-19.md`
- `ops/leads/daily-owner-leadgen-runbook-2026-06-19.md`
- `ops/leads/leadgen-volume-scenarios-2026-06-19.csv`
- `ops/leads/manual-owner-hunting-playbook-2026-06-19.md`
- `ops/leads/manual-owner-hunting-log-2026-06-19.csv`
- `ops/leads/manual-owner-hunting-candidates-2026-06-19.csv`
- `ops/leads/manual-owner-hunting-first-batch-2026-06-19.md`
- `ops/leads/manual-owner-hunting-next-seven-2026-06-19.md`
- `ops/leads/manual-owner-hunting-reserve-ten-2026-06-19.md`
- `ops/leads/manual-owner-hunting-reply-audits-2026-06-19.md`
- `ops/leads/jakub-qualified-lead-handoff-template-2026-06-19.md`
- `ops/leads/manual-owner-hunting-cockpit-2026-06-19.html`
- `ops/leads/manual-owner-hunting-live-preflight-2026-06-19.md`
- `ops/leads/manual-owner-hunting-live-preflight-2026-06-19.json`
- `ops/leads/manual-owner-hunting-send-session-2026-06-19.html`
- `ops/leads/manual-owner-hunting-send-session-2026-06-19.md`
- `ops/leads/manual-owner-hunting-refill-plan-2026-06-19.md`
- `ops/leads/manual-owner-hunting-refill-plan-2026-06-19.json`
- `ops/leads/manual-owner-hunting-send-queue-2026-06-19.md`
- `ops/leads/manual-owner-hunting-send-queue-2026-06-19.csv`
- `ops/leads/manual-owner-hunting-followup-triage-2026-06-19.md`
- `ops/leads/manual-owner-hunting-followup-triage-2026-06-19.csv`
- `ops/leads/manual-owner-hunting-reserve-verification-2026-06-19.md`
- `ops/leads/manual-owner-hunting-reserve-verification-2026-06-19.csv`
- `docs/MANUAL_OWNER_HUNTING_FIRST_PASS_2026-06-19.md`
- `docs/MANUAL_OWNER_HUNTING_SECOND_PASS_2026-06-19.md`
- `docs/MANUAL_OWNER_HUNTING_LIVE_CHECK_2026-06-19.md`
- `docs/MANUAL_OWNER_HUNTING_RESERVE_LIVE_CHECK_2026-06-19.md`
- `docs/MANUAL_OWNER_HUNTING_EXPANSION_2026-06-19.md`
- `ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv`
- `ops/leads/manual-owner-hunting-expansion-messages-2026-06-19.md`
- Expansion pool now contains 40 reviewed prospects (`HUNT-021` to `HUNT-060`), including 36 A/B-grade prospects.
- `npm run leads:manual-cockpit`
- `npm run leads:manual-expansion-summary`
- `npm run leads:manual-export`
- `npm run leads:manual-followups`
- `npm run leads:manual-import-expansion -- HUNT-021 ready_to_send --follow-up=2026-06-24 --notes="live checked from expansion; ready for outreach"`
- `npm run leads:manual-live-preflight`
- `npm run leads:manual-refill -- --target=10 --simulate-ready=0`
- `npm run leads:manual-send-session`
- `npm run leads:manual-promote -- --dry-run`
- `npm run leads:manual-promote`
- `npm run leads:manual-reserve`
- `npm run leads:manual-status -- HUNT-001 contacted --follow-up=2026-06-22 --notes="sent manually via platform"`
- `npm run leads:manual-status -- HUNT-001 replied --notes="owner accepted audit; audit observations sent"`
- `npm run leads:manual-status -- HUNT-001 qualified --jakub-notified=yes --notes="owner gave call permission"`
- `npm run leads:manual-validate`
- `npm run leads:manual-summary`
- `npm run leads:volume-model`

Manual status flow:

```bash
npm run leads:manual-cockpit
npm run leads:manual-validate
npm run leads:manual-export
npm run leads:manual-followups
npm run leads:manual-reserve
npm run leads:manual-promote -- --dry-run
npm run leads:volume-model
# open ops/leads/manual-owner-hunting-cockpit-2026-06-19.html
# or use ops/leads/manual-owner-hunting-send-queue-2026-06-19.md
# send the prepared platform message manually
npm run leads:manual-status -- HUNT-001 contacted --follow-up=2026-06-22 --notes="sent manually via Bazoš"
npm run leads:manual-promote -- --dry-run
npm run leads:manual-promote
npm run leads:manual-validate
npm run leads:manual-export
# if the owner asks for the 3 observations, send the prepared audit reply
npm run leads:manual-status -- HUNT-001 replied --notes="owner accepted audit; audit observations sent"
# only after phone/call permission, count it as qualified
npm run leads:manual-status -- HUNT-001 qualified --jakub-notified=yes --notes="owner gave call permission"
npm run leads:manual-summary
```

Volume rule:

```text
20 qualified seller leads is not a 20-prospect target.
Base model: about 463 personalized sends for 20 qualified leads at 4.3% overall qualified rate.
Daily operating target after first batch: 20 verified sends/day and at least 60 reviewed prospects in backlog.
```

Optional later:

- Formbricks for standalone survey-style seller audit,
- Twenty CRM if the broker platform becomes multi-client,
- Cal.com only if the custom booking wizard becomes too costly to maintain.

## Metrics

Track daily:

- spend,
- impressions,
- clicks,
- booking starts,
- completed bookings,
- raw CPL,
- qualified `A/B` CPL,
- call completed,
- meeting booked,
- valuation done,
- listing agreement signed,
- sale closed,
- Adam commission.

First sprint acceptable ranges:

```text
EUR 500-1,000 test spend
20-80 raw leads/booking attempts depending on channel mix
20 qualified A/B leads as the real target
4-8 serious conversations
1-3 listing-agreement opportunities
0-2 closed deals later, depending on sales cycle
```

## Daily operating rhythm

Morning:

- check new submissions,
- confirm `A/B/C` score,
- send `A` leads to Jakub immediately,
- verify call outcome from previous day.

Afternoon:

- review ad search terms and negatives,
- review landing page and booking drop-off,
- do 10 personalized owner/outreach attempts.

Evening:

- log outcomes,
- update the next-day creative or keyword hypothesis,
- prepare one SEO/social post from real questions seen in leads.

## Immediate next tasks

- [x] Send `/predaj-bytu-bratislava/` CTA directly into the `Predať byt` booking branch.
- [x] Add qualification fields to reservation flow: ownership relation, sale status, required horizon, price idea.
- [x] Add `lead_score` and `kvalifikacia` payload fields.
- [x] Verify booking payload reaches Supabase/Telegram/OpenClaw with the new qualification fields in local mocked Worker E2E.
- [x] Run real staging E2E with production-like Cloudflare secrets: booking -> Google Calendar -> Supabase CRM.
- [x] Deploy seller lead funnel to `jakubastroweb-staging` version `4c6846f3-3b2e-44db-8260-5e128d5c2270`.
- [x] Deploy analytics conversion scaffold to `jakubastroweb-staging` version `9b119f4f-c11e-4839-b8d2-9cdaf2afc904`.
- [ ] Confirm Telegram/OpenClaw receipt from staging E2E in the actual destination chat/runtime.
- [ ] Clean up or label internal staging test records:
  - Google Calendar event `515j2vbht1nko0qn8qdpq68354`,
  - Supabase lead `e724bd06-21bf-49df-a321-b5527b6c8398`,
  - Supabase appointment `5e3d9a50-22d2-481f-83aa-2e5bf144aaa9`.
  - Google Calendar event `pv98q4jvcr98n1dj7nqa71gi78`,
  - Supabase lead `3ef365e7-fe43-43b8-8089-de319f82601e`,
  - Supabase appointment `f65dc408-1268-4b74-b93e-b04db03e13a1`.
- [x] Add code-level Google Ads conversion scaffold only after successful booking, with non-PII `analytics_conversion_id` as the Ads `transaction_id`.
- [ ] Configure real Google Ads conversion ID/label in the ad account and environment.
- [x] Prepare first Google Search campaign kit: keywords, negatives, RSA copy, UTM URLs, budget and review rules.
- [ ] Launch EUR 500 controlled Search test.
- [x] Create first 5 Meta creatives from the angles above.
- [x] Start manual AI-assisted hunting log and playbook.
- [x] Review first 10 public manual hunting candidates and prepare first 3 outreach messages.
- [x] Add manual hunting pipeline summary command.
- [x] Expand manual hunting candidate pool to 20 public candidates.
- [x] Prepare first 10 manual outreach messages and log them as `ready_to_send`.
- [x] Prepare reserve first-message drafts for all 20 candidates.
- [x] Add manual outreach cockpit for opening listings and copying prepared messages.
- [x] Add manual status update command for `contacted`, `replied`, `qualified` and `sent_to_jakub`.
- [x] Prepare reply-audit messages for all 20 reviewed candidates.
- [x] Add reply-audit copy buttons and `replied` status commands to the manual cockpit.
- [x] Add qualified lead handoff template for Jakub.
- [x] Run live availability check for first manual outreach queue and replace reserved `HUNT-007` with `HUNT-012`.
- [x] Add manual pipeline validator for send-queue guardrails.
- [x] Export validated manual send queue as Markdown and CSV.
- [x] Export follow-up and reply triage pack for the validated send queue.
- [ ] Send first 10 manual outreach messages and log outcomes.
