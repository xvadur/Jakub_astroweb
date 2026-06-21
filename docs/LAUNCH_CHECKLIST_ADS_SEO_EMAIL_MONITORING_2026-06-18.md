# Launch checklist: ads, SEO, email follow-up, reviews, monitoring

Date: 2026-06-18

Purpose: prepare Jakub's web/backend for paid acquisition and operational handoff without doing the final visual redesign yet.

## Definition of done for this week

- [ ] A paid visitor can land on a seller-intent page, book a consultation, and keep attribution through the whole flow.
- [ ] Jakub/Adam receive reliable internal notification after booking.
- [ ] Client receives a clean confirmation/pre-meeting email after booking.
- [ ] System can create follow-up tasks and review request drafts.
- [ ] Dashboard/admin view shows leads, follow-ups, failed side effects and review requests.
- [ ] SEO/crawl layer is ready for production indexing.
- [ ] Monitoring can show whether web/API/OpenClaw/email side effects are healthy.

## 1. Ads and attribution readiness

### Campaign structure

- [x] Prepare first Google Search campaign kit only for high-intent seller queries:
  - [x] `docs/AI_LEADGEN_TOOL_STACK_2026-06-19.md`
  - [x] `docs/GOOGLE_SEARCH_20_LEAD_CAMPAIGN_2026-06-18.md`
  - [x] `ops/ads/google-search-seller-keywords-2026-06-18.csv`
  - [x] `ops/ads/google-search-negative-keywords-2026-06-18.csv`
  - [x] `ops/ads/google-search-rsa-copy-2026-06-18.csv`
- [x] Prepare first Meta/Instagram creative kit:
  - [x] `docs/META_SELLER_20_LEAD_CREATIVES_2026-06-19.md`
  - [x] `ops/ads/meta-seller-creatives-2026-06-19.csv`
- [x] Prepare manual AI-assisted hunting kit:
  - [x] `docs/LEADGEN_VOLUME_MODEL_2026-06-19.md`
  - [x] `ops/leads/daily-owner-leadgen-runbook-2026-06-19.md`
  - [x] `ops/leads/leadgen-volume-scenarios-2026-06-19.csv`
  - [x] `ops/leads/manual-owner-hunting-playbook-2026-06-19.md`
  - [x] `ops/leads/manual-owner-hunting-log-2026-06-19.csv`
  - [x] `ops/leads/manual-owner-hunting-candidates-2026-06-19.csv`
  - [x] `ops/leads/manual-owner-hunting-first-batch-2026-06-19.md`
  - [x] `ops/leads/manual-owner-hunting-next-seven-2026-06-19.md`
  - [x] `ops/leads/manual-owner-hunting-reserve-ten-2026-06-19.md`
  - [x] `ops/leads/manual-owner-hunting-reply-audits-2026-06-19.md`
  - [x] `ops/leads/jakub-qualified-lead-handoff-template-2026-06-19.md`
  - [x] `ops/leads/manual-owner-hunting-cockpit-2026-06-19.html`
  - [x] `ops/leads/manual-owner-hunting-live-preflight-2026-06-19.md`
  - [x] `ops/leads/manual-owner-hunting-live-preflight-2026-06-19.json`
  - [x] `ops/leads/manual-owner-hunting-send-session-2026-06-19.html`
  - [x] `ops/leads/manual-owner-hunting-send-session-2026-06-19.md`
  - [x] `ops/leads/manual-owner-hunting-refill-plan-2026-06-19.md`
  - [x] `ops/leads/manual-owner-hunting-refill-plan-2026-06-19.json`
  - [x] `ops/leads/manual-owner-hunting-send-queue-2026-06-19.md`
  - [x] `ops/leads/manual-owner-hunting-send-queue-2026-06-19.csv`
  - [x] `ops/leads/manual-owner-hunting-followup-triage-2026-06-19.md`
  - [x] `ops/leads/manual-owner-hunting-followup-triage-2026-06-19.csv`
  - [x] `ops/leads/manual-owner-hunting-reserve-verification-2026-06-19.md`
  - [x] `ops/leads/manual-owner-hunting-reserve-verification-2026-06-19.csv`
  - [x] `docs/MANUAL_OWNER_HUNTING_FIRST_PASS_2026-06-19.md`
  - [x] `docs/MANUAL_OWNER_HUNTING_SECOND_PASS_2026-06-19.md`
  - [x] `docs/MANUAL_OWNER_HUNTING_LIVE_CHECK_2026-06-19.md`
  - [x] `docs/MANUAL_OWNER_HUNTING_RESERVE_LIVE_CHECK_2026-06-19.md`
  - [x] `docs/MANUAL_OWNER_HUNTING_EXPANSION_2026-06-19.md`
  - [x] `ops/leads/manual-owner-hunting-expansion-candidates-2026-06-19.csv`
  - [x] `ops/leads/manual-owner-hunting-expansion-messages-2026-06-19.md`
  - [x] `npm run leads:manual-cockpit`
  - [x] `npm run leads:manual-expansion-summary`
  - [x] `npm run leads:manual-export`
  - [x] `npm run leads:manual-followups`
  - [x] `npm run leads:manual-import-expansion -- HUNT-021 ready_to_send --follow-up=2026-06-24 --notes="live checked from expansion; ready for outreach"`
  - [x] `npm run leads:manual-live-preflight`
  - [x] `npm run leads:manual-refill -- --target=10 --simulate-ready=0`
  - [x] `npm run leads:manual-send-session`
  - [x] `npm run leads:manual-promote -- --dry-run`
  - [x] `npm run leads:manual-promote`
  - [x] `npm run leads:manual-reserve`
  - [x] `npm run leads:manual-status -- HUNT-001 contacted --follow-up=2026-06-22 --notes="sent manually via platform"`
  - [x] `npm run leads:manual-status -- HUNT-001 replied --notes="owner accepted audit; audit observations sent"`
  - [x] `npm run leads:manual-status -- HUNT-001 qualified --jakub-notified=yes --notes="owner gave call permission"`
  - [x] `npm run leads:manual-validate`
  - [x] `npm run leads:manual-summary`
  - [x] `npm run leads:volume-model`
- [ ] Create first Google Search campaign in Google Ads account.
- [ ] Create first Meta campaign in Meta Ads Manager after policy/category review.
- [x] Review first 20 public manual hunting candidates.
- [x] Prepare first 10 manual personalized outreach attempts.
- [x] Prepare reserve message drafts for all 20 reviewed candidates.
- [x] Generate manual outreach cockpit for opening listings and copying messages.
- [x] Add command-line status updater for manual outreach outcomes.
- [x] Prepare reply-audit messages for all 20 reviewed manual candidates.
- [x] Add reply-audit copy buttons and `replied` status commands to manual cockpit.
- [x] Add qualified lead handoff template for Jakub.
- [x] Live-check first send queue and replace reserved `HUNT-007` with `HUNT-012`.
- [x] Add manual pipeline validator for send-queue guardrails.
- [x] Export validated manual send queue as Markdown and CSV.
- [x] Export follow-up and reply triage pack for validated send queue.
- [x] Model manual outreach volume required for 20 qualified leads.
- [x] Export reserve verification queue for remaining reviewed candidates.
- [x] Live-check reserve queue and promote 7 candidates to verified reserve state.
- [x] Add reserve promotion command for filling active queue after sends/removals.
- [x] Expand post-reserve backlog to 40 expansion candidates; total reviewed backlog is now 60 prospects.
- [x] Add expansion import command and cockpit support for post-reserve backlog.
- [x] Add repeatable live preflight for ready-to-send URLs; latest run: 10 `send_ok`, 0 `manual_check`, 0 `do_not_send`.
- [x] Add focused send-session page for the first 10 live-checked manual outreach attempts.
- [x] Add refill plan for the next 10 ready-to-send candidates after first send block.
- [ ] Send first 10 manual personalized outreach attempts.
- [ ] Keep ad groups tightly matched to landing pages:
  - [ ] predaj bytu Bratislava -> `/predaj-bytu-bratislava/`
  - [ ] odhad ceny bytu Bratislava -> future `/ocenenie-bytu-bratislava/`
  - [ ] predaj bytu Ružinov -> future `/predaj-bytu-ruzinov/`
  - [ ] predaj zdedenej nehnuteľnosti -> future `/predaj-zdedenej-nehnutelnosti/`
- [ ] Avoid broad keywords like `reality Bratislava` in the first test.
- [x] Define negative keywords before launch:
  - [x] prenájom, práca, brigáda, lacno, reality portál, vzor zmluvy, kataster návod, buyer/rental/admin variants.
- [ ] Use direct booking CTA, but optimize for lead quality, not raw lead count.

### Tracking implementation

- [x] Capture attribution on first page view:
  - [x] `utm_source`
  - [x] `utm_medium`
  - [x] `utm_campaign`
  - [x] `utm_content`
  - [x] `utm_term`
  - [x] `gclid`
  - [x] `gbraid`
  - [x] `wbraid`
  - [x] referrer
  - [x] first landing path
  - [x] first seen timestamp
- [x] Persist attribution in a first-party cookie/localStorage object with expiry.
- [x] Pass attribution into the reservation wizard hidden payload.
- [x] Store attribution in Supabase lead `raw_payload`.
- [x] Include attribution in Telegram notification.
- [x] Include attribution in OpenClaw handoff payload.
- [x] Store conversion identifiers in booking response / raw payload / OpenClaw handoff:
  - [x] non-PII `analytics_conversion_id`,
  - [x] internal booking/calendar event id when Google Calendar creates an event,
  - [x] Supabase lead id when CRM write succeeds,
  - [x] appointment id when CRM write succeeds,
  - [ ] OpenClaw run id when available.
- [x] Emit GA4 `generate_lead` after successful booking.
- [x] Add Google Ads conversion scaffold for successful booking.
- [ ] Configure real Google Ads conversion ID/label in Google Ads account and environment.
- [ ] Decide if enhanced conversions are allowed legally/operationally before sending hashed customer data to Google.
- [x] Do not send raw PII into analytics events.

### Pre-launch ad checks

- [ ] Verify conversion fires only after accepted booking, not after opening wizard.
- [ ] Verify failed booking does not fire conversion.
- [x] Add client-side guard so duplicate successful submit cannot double-count conversion in the same wizard session.
- [ ] Verify staging has no production ad tags/conversions.
- [ ] Verify production has canonical URLs and no `noindex`.
- [ ] Create a small test campaign budget cap.
- [ ] Add a daily manual review routine for first 7 days after launch.

## 2. SEO and AI-search readiness

### Technical crawl/indexing

- [x] Production `robots.txt` allows Googlebot, Bingbot and AI/search crawlers we intentionally allow.
- [x] Staging remains `noindex,nofollow,noarchive`.
- [x] `/sitemap.xml` includes homepage, reservation page, listing details and seller landing pages.
- [ ] Submit sitemap in Google Search Console after production review.
- [x] Verify canonical URLs on every indexable page.
- [x] Verify OpenGraph/Twitter metadata on indexable pages.
- [ ] Check 404 page and redirects.
- [ ] Run Lighthouse/Core Web Vitals pass before production ad traffic.

### Structured data

- [x] Keep `Person` structured data for Jakub.
- [x] Keep `RealEstateAgent` / `LocalBusiness` structured data where appropriate.
- [x] Add/verify `Service` structured data for:
  - [x] predaj nehnuteľnosti,
  - [x] kúpa nehnuteľnosti,
  - [x] prenájom,
  - [x] odhad ceny / predajná stratégia.
- [x] Add `BreadcrumbList` on landing pages and listing detail pages.
- [x] Add `FAQPage` only on pages with visible FAQ content.
- [ ] Validate structured data in Rich Results Test / Search Console.

### Seller content

- [x] Finish `/predaj-bytu-bratislava/` as first seller-intent page.
- [x] Add Q&A/FAQ section answering at least 16 seller questions.
- [ ] Create next landing pages:
  - [ ] `/ocenenie-bytu-bratislava/`
  - [ ] `/predaj-bytu-ruzinov/`
  - [ ] `/predaj-bytu-stare-mesto/`
  - [ ] `/predaj-zdedenej-nehnutelnosti/`
- [x] Add internal links from homepage to seller pages.
- [ ] Add internal links from seller pages to relevant sold references.
- [x] Add a short “Ako funguje konzultácia” block on seller pages.
- [x] Update `/llms.txt` after content changes.

## 3. Client email follow-up

### Email provider and secrets

- [ ] Choose provider for V1:
  - [x] Resend,
  - [ ] Postmark,
  - [ ] Mailgun,
  - [ ] Cloudflare Email Workers/Email Routing if enough for the use case.
- [ ] Verify sender domain authentication:
  - [ ] SPF,
  - [ ] DKIM,
  - [ ] DMARC.
- [x] Store provider API key only as Cloudflare secret.
- [x] Add email failure logging; booking must not fail only because email failed.

### Immediate client confirmation email

Trigger: successful booking after calendar event is created.

- [x] Send to client email from booking form.
- [ ] BCC or internal copy only if privacy/legal review allows it.
- [x] Include:
  - [x] confirmation that request was received,
  - [x] selected date/time,
  - [x] Jakub's name and contact,
  - [x] property/context summary,
  - [x] what happens next,
  - [x] how to reschedule/cancel,
  - [x] privacy/footer text.
- [x] Store email send status in Supabase:
  - [x] `sent`,
  - [x] `failed`,
  - [x] provider message id,
  - [x] error summary if failed.
- [x] Add CRM note after send attempt.

### Pre-interaction reminder email

Trigger: before booked consultation / meeting.

- [ ] Create task/reminder at booking time:
  - [ ] default: 24h before event,
  - [ ] optional: 2h before event.
- [ ] Email should remind client:
  - [ ] meeting/phone time,
  - [ ] what to prepare,
  - [ ] property documents/photos if relevant,
  - [ ] Jakub's contact,
  - [ ] cancellation/reschedule path.
- [ ] Internal notification to Jakub before interaction:
  - [ ] lead summary,
  - [ ] property/location,
  - [ ] source/UTM,
  - [ ] previous notes,
  - [ ] suggested angle for conversation.
- [ ] Decide channel for Jakub pre-interaction notification:
  - [ ] Telegram,
  - [ ] email,
  - [ ] dashboard task,
  - [ ] all of the above for first test.

### Post-interaction follow-up email

Trigger: after consultation / meeting / viewing.

- [ ] OpenClaw prepares draft follow-up email.
- [ ] Jakub approval required until rules are proven.
- [ ] Store draft as task or email draft record.
- [ ] After approval, send client recap:
  - [ ] thanks,
  - [ ] next steps,
  - [ ] requested documents,
  - [ ] timeline,
  - [ ] Jakub contact.

## 4. Google review workflow

### Data model

- [ ] Apply/verify `review_requests` migration in Supabase.
- [ ] Link review request to:
  - [ ] contact,
  - [ ] lead/deal,
  - [ ] property,
  - [ ] appointment/interactions where relevant.
- [ ] Store:
  - [ ] status: `draft`, `approved`, `sent`, `responded`, `skipped`,
  - [ ] channel: `email`,
  - [ ] Google review URL,
  - [ ] message text,
  - [ ] approval request id,
  - [ ] sent timestamp,
  - [ ] provider message id,
  - [ ] raw provider response/error.

### Review request rules

- [ ] Do not ask for review immediately after first booking.
- [ ] Candidate triggers:
  - [ ] after successful sale closing,
  - [ ] after successful handover,
  - [ ] after positive explicit client signal,
  - [ ] after Jakub manually marks client as review-ready.
- [ ] Jakub approval required before first production review requests.
- [ ] Use only verified Google review link from Jakub's Google Business Profile.
- [ ] Store skipped reason when review should not be requested.

### Review email content

- [ ] Short, human, non-pushy message in Jakub's tone.
- [ ] Direct Google review link.
- [ ] No incentive for positive review.
- [ ] No filtering like “only if you were happy”.
- [ ] Include fallback reply option if client does not want to use Google.

## 5. Monitoring expansion

### Current checks

- [x] GET staging `/api/health`.
- [x] GET production `/api/health`.
- [x] GET OpenClaw public `/healthz`.

### Add service health

- [ ] Add optional local OpenClaw Docker health check in Adam dashboard mode.
- [ ] Add Cloudflare Worker health metadata:
  - [ ] runtime ok,
  - [ ] config mode,
  - [ ] calendar mode,
  - [ ] dashboard mode,
  - [ ] timestamp.
- [ ] Add non-mutating Supabase read smoke check.
- [ ] Add OpenClaw tool smoke check:
  - [ ] CRM read,
  - [ ] listing audit.
- [ ] Add email provider health/config check without sending mail.
- [ ] Add Telegram bot config/status check without sending spam.

### Add failure visibility

- [x] Worker creates admin case when Telegram notification fails.
- [x] Worker creates admin case when OpenClaw handoff fails.
- [x] Worker creates admin case when Supabase write fails.
- [x] Worker creates admin case when client confirmation email fails.
- [ ] Worker creates admin case when reminder email fails.
- [ ] Admin case stores:
  - [ ] service,
  - [ ] severity,
  - [ ] booking/lead id,
  - [ ] error summary,
  - [ ] retryable flag,
  - [ ] created timestamp.
- [ ] Dashboard shows open admin cases.
- [ ] Adam global dashboard can ingest monitoring JSON.

### Alerting

- [ ] Decide first alert channel:
  - [ ] Telegram to Adam,
  - [ ] email to Adam,
  - [ ] dashboard only.
- [ ] Alert on:
  - [ ] production `/api/health` down,
  - [ ] staging `/api/health` down during active work,
  - [ ] OpenClaw public hook down,
  - [ ] booking accepted but side effects failed,
  - [ ] repeated booking validation failures,
  - [ ] unusual submit volume.

## 6. Dashboard additions required

- [ ] Lead list with source/UTM columns.
- [ ] Lead detail with attribution panel.
- [ ] Follow-up task queue.
- [ ] Appointment/pre-meeting reminder panel.
- [ ] Email send log panel.
- [ ] Review request panel.
- [ ] Approval queue.
- [ ] Admin cases / failed side effects.
- [ ] Monitoring status cards.

## 7. This week's build order

1. [x] UTM/referrer/landing capture in reservation wizard.
2. [x] Pass attribution through `/api/book`.
3. [x] Store attribution in Supabase lead payload.
4. [x] Include attribution in Telegram/OpenClaw.
5. [x] Add client confirmation email provider abstraction.
6. [x] Add confirmation email after successful booking.
7. [ ] Add pre-interaction reminder task model.
8. [ ] Add admin cases for failed side effects.
9. [ ] Extend monitoring script/output.
10. [ ] Add dashboard panels for attribution, follow-ups, email logs and admin cases.
11. [ ] Add/finish seller FAQ + structured data.
12. [x] Run staging E2E test after analytics conversion scaffold deploy.

## Source references

- Google Search Central SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Central FAQ structured data: https://developers.google.com/search/docs/appearance/structured-data/faqpage
- Google Search documentation updates: https://developers.google.com/search/updates
- GA4 recommended events: https://developers.google.com/analytics/devguides/collection/ga4/reference/events
- Google Tag Manager server-side Ads setup: https://developers.google.com/tag-platform/tag-manager/server-side/ads-setup
- Google Business Profile review request guidance: https://support.google.com/business/answer/3474122
