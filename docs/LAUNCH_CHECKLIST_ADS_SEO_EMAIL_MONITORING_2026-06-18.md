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

- [ ] Create first Google Search campaign only for high-intent seller queries.
- [ ] Keep ad groups tightly matched to landing pages:
  - [ ] predaj bytu Bratislava -> `/predaj-bytu-bratislava/`
  - [ ] odhad ceny bytu Bratislava -> future `/ocenenie-bytu-bratislava/`
  - [ ] predaj bytu Ružinov -> future `/predaj-bytu-ruzinov/`
  - [ ] predaj zdedenej nehnuteľnosti -> future `/predaj-zdedenej-nehnutelnosti/`
- [ ] Avoid broad keywords like `reality Bratislava` in the first test.
- [ ] Define negative keywords before launch:
  - [ ] prenájom, práca, brigáda, lacno, reality portál, bez makléra, vzor zmluvy, kataster návod.
- [ ] Use direct booking CTA, but optimize for lead quality, not raw lead count.

### Tracking implementation

- [ ] Capture attribution on first page view:
  - [ ] `utm_source`
  - [ ] `utm_medium`
  - [ ] `utm_campaign`
  - [ ] `utm_content`
  - [ ] `utm_term`
  - [ ] `gclid`
  - [ ] `gbraid`
  - [ ] `wbraid`
  - [ ] referrer
  - [ ] first landing path
  - [ ] first seen timestamp
- [ ] Persist attribution in a first-party cookie/localStorage object with expiry.
- [ ] Pass attribution into the reservation wizard hidden payload.
- [ ] Store attribution in Supabase lead `raw_payload`.
- [ ] Include attribution in Telegram notification.
- [ ] Include attribution in OpenClaw handoff payload.
- [ ] Store conversion identifiers:
  - [ ] internal booking id,
  - [ ] Supabase lead id,
  - [ ] appointment id,
  - [ ] calendar event id,
  - [ ] OpenClaw run id when available.
- [ ] Emit GA4 `generate_lead` after successful booking.
- [ ] Configure Google Ads conversion for successful booking.
- [ ] Decide if enhanced conversions are allowed legally/operationally before sending hashed customer data to Google.
- [ ] Do not send raw PII into analytics events.

### Pre-launch ad checks

- [ ] Verify conversion fires only after accepted booking, not after opening wizard.
- [ ] Verify failed booking does not fire conversion.
- [ ] Verify duplicate submit does not double-count conversion.
- [ ] Verify staging has no production ad tags/conversions.
- [ ] Verify production has canonical URLs and no `noindex`.
- [ ] Create a small test campaign budget cap.
- [ ] Add a daily manual review routine for first 7 days after launch.

## 2. SEO and AI-search readiness

### Technical crawl/indexing

- [ ] Production `robots.txt` allows Googlebot, Bingbot and AI/search crawlers we intentionally allow.
- [ ] Staging remains `noindex,nofollow,noarchive`.
- [ ] `/sitemap.xml` includes homepage, reservation page, listing details and seller landing pages.
- [ ] Submit sitemap in Google Search Console after production review.
- [ ] Verify canonical URLs on every indexable page.
- [ ] Verify OpenGraph/Twitter metadata on indexable pages.
- [ ] Check 404 page and redirects.
- [ ] Run Lighthouse/Core Web Vitals pass before production ad traffic.

### Structured data

- [ ] Keep `Person` structured data for Jakub.
- [ ] Keep `RealEstateAgent` / `LocalBusiness` structured data where appropriate.
- [ ] Add/verify `Service` structured data for:
  - [ ] predaj nehnuteľnosti,
  - [ ] kúpa nehnuteľnosti,
  - [ ] prenájom,
  - [ ] odhad ceny / predajná stratégia.
- [ ] Add `BreadcrumbList` on landing pages and listing detail pages.
- [ ] Add `FAQPage` only on pages with visible FAQ content.
- [ ] Validate structured data in Rich Results Test / Search Console.

### Seller content

- [ ] Finish `/predaj-bytu-bratislava/` as first seller-intent page.
- [ ] Add Q&A/FAQ section answering at least 16 seller questions.
- [ ] Create next landing pages:
  - [ ] `/ocenenie-bytu-bratislava/`
  - [ ] `/predaj-bytu-ruzinov/`
  - [ ] `/predaj-bytu-stare-mesto/`
  - [ ] `/predaj-zdedenej-nehnutelnosti/`
- [ ] Add internal links from homepage to seller pages.
- [ ] Add internal links from seller pages to relevant sold references.
- [ ] Add a short “Ako funguje konzultácia” block on seller pages.
- [ ] Update `/llms.txt` after content changes.

## 3. Client email follow-up

### Email provider and secrets

- [ ] Choose provider for V1:
  - [ ] Resend,
  - [ ] Postmark,
  - [ ] Mailgun,
  - [ ] Cloudflare Email Workers/Email Routing if enough for the use case.
- [ ] Verify sender domain authentication:
  - [ ] SPF,
  - [ ] DKIM,
  - [ ] DMARC.
- [ ] Store provider API key only as Cloudflare secret.
- [ ] Add email failure logging; booking must not fail only because email failed.

### Immediate client confirmation email

Trigger: successful booking after calendar event is created.

- [ ] Send to client email from booking form.
- [ ] BCC or internal copy only if privacy/legal review allows it.
- [ ] Include:
  - [ ] confirmation that request was received,
  - [ ] selected date/time,
  - [ ] Jakub's name and contact,
  - [ ] property/context summary,
  - [ ] what happens next,
  - [ ] how to reschedule/cancel,
  - [ ] privacy/footer text.
- [ ] Store email send status in Supabase:
  - [ ] `sent`,
  - [ ] `failed`,
  - [ ] provider message id,
  - [ ] error summary if failed.
- [ ] Add CRM note after send attempt.

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

- [ ] Worker creates admin case when Telegram notification fails.
- [ ] Worker creates admin case when OpenClaw handoff fails.
- [ ] Worker creates admin case when Supabase write fails.
- [ ] Worker creates admin case when client confirmation email fails.
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

1. [ ] UTM/referrer/landing capture in reservation wizard.
2. [ ] Pass attribution through `/api/book`.
3. [ ] Store attribution in Supabase lead payload.
4. [ ] Include attribution in Telegram/OpenClaw.
5. [ ] Add client confirmation email provider abstraction.
6. [ ] Add confirmation email after successful booking.
7. [ ] Add pre-interaction reminder task model.
8. [ ] Add admin cases for failed side effects.
9. [ ] Extend monitoring script/output.
10. [ ] Add dashboard panels for attribution, follow-ups, email logs and admin cases.
11. [ ] Add/finish seller FAQ + structured data.
12. [ ] Run staging E2E test.

## Source references

- Google Search Central SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Central FAQ structured data: https://developers.google.com/search/docs/appearance/structured-data/faqpage
- Google Search documentation updates: https://developers.google.com/search/updates
- GA4 recommended events: https://developers.google.com/analytics/devguides/collection/ga4/reference/events
- Google Tag Manager server-side Ads setup: https://developers.google.com/tag-platform/tag-manager/server-side/ads-setup
- Google Business Profile review request guidance: https://support.google.com/business/answer/3474122
