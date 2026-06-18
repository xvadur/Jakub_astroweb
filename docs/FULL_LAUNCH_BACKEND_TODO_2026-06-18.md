# Full launch backend TODO

Date: 2026-06-18

Purpose: finish everything around the website except final visual redesign, so the project can be launched as a real lead engine and broker operating system.

## Current position

The core backend MVP exists:

```text
reservation wizard
  -> Cloudflare Worker
  -> Google Calendar
  -> Supabase CRM
  -> Telegram notification
  -> OpenClaw handoff
```

What remains is launch-grade infrastructure:

- cookie/consent and analytics legality,
- Google Ads/conversion tracking,
- email follow-up,
- dashboard auth,
- dashboard operational panels,
- Google review workflow,
- anti-spam/rate limiting,
- SEO content/schema completion,
- staging E2E verification,
- documentation cleanup.

## Execution order

Do these in this order. Do not start with design.

## 1. Cookie and consent layer

### Goal

The site must know when analytics/marketing scripts are allowed to run.

### Tasks

- [x] Define consent categories:
  - [x] necessary,
  - [x] analytics,
  - [x] marketing.
- [x] Add a lightweight consent banner/component.
- [x] Store consent choice in a first-party cookie or localStorage.
- [x] Do not load analytics/marketing scripts before consent, unless the chosen legal mode allows cookieless analytics.
- [x] Add “manage cookies” link in footer/privacy page.
- [x] Update privacy page to match actual analytics/email/review stack.

### Implementation notes

- Likely files:
  - `src/layouts` if a shared layout exists,
  - otherwise `src/pages/index.astro`, `src/pages/rezervacia.astro`, landing pages,
  - `src/pages/ochrana-osobnych-udajov.astro`.
- Keep staging from firing production tracking.
- Necessary booking/session behavior can run without marketing consent.

### Acceptance criteria

- [x] User can accept/reject analytics.
- [x] User can accept/reject marketing.
- [x] Choice persists across pages.
- [x] GA/Ads tags do not fire before required consent.
- [x] Privacy page reflects reality.

### Adam input needed

- [x] Preferred legal stance: explicit opt-in for analytics/marketing, or cookieless analytics first?
- [ ] Whether BOSEN/legal will review privacy/cookie text.

## 2. Analytics and ads metrics

### Goal

Paid ads and organic traffic must be measurable without leaking PII.

### Tasks

- [x] Pick analytics stack:
  - [x] GA4 + Google Ads tag,
  - [ ] or internal-only tracking first,
  - [ ] or hybrid.
- [x] Add environment-gated analytics config:
  - [ ] production measurement id,
  - [x] staging disabled or separate test id.
- [x] Emit funnel events:
  - [x] `booking_start`,
  - [x] `booking_step_intent`,
  - [x] `booking_step_property`,
  - [x] `booking_step_date`,
  - [x] `booking_step_contact`,
  - [x] `generate_lead` after successful booking.
- [x] Add Google Ads conversion event after accepted booking.
- [x] Ensure failed booking does not fire conversion.
- [x] Ensure duplicate submit does not double-count conversion.
- [x] Never send name, phone, email, exact address or full message to analytics.

### Implementation notes

- Existing wizard already has `trackFunnelEvent`.
- Extend it to respect consent.
- Booking success event should fire only after `/api/book` returns `ok: true`.
- Attribution capture already exists and now includes:
  - `utm_*`,
  - `gclid`,
  - `gbraid`,
  - `wbraid`,
  - `fbclid`,
  - `msclkid`,
  - referrer,
  - landing/booking path.

### Acceptance criteria

- [ ] Staging does not fire production GA/Ads conversion.
- [ ] Successful booking fires one lead conversion.
- [ ] Analytics events contain no PII.
- [ ] Attribution is present in Supabase raw payload, Telegram, OpenClaw.

### Adam input needed

- [ ] GA4 measurement id.
- [ ] Google Ads conversion id/label.
- [ ] Decision whether to use enhanced conversions. Default: no, until legal/privacy is clear.

## 3. Email provider and client email follow-up

### Goal

Client receives useful emails around interactions with Jakub.

### Tasks

- [ ] Choose provider:
  - [ ] Resend,
  - [ ] Postmark,
  - [ ] Mailgun,
  - [ ] Cloudflare Email Workers if suitable.
- [ ] Verify sender domain:
  - [ ] SPF,
  - [ ] DKIM,
  - [ ] DMARC.
- [ ] Store API key as Cloudflare secret only.
- [ ] Add Worker email abstraction:
  - [ ] `sendClientConfirmationEmail`,
  - [ ] later `sendClientReminderEmail`,
  - [ ] later `sendReviewRequestEmail`.
- [ ] Send confirmation email after successful booking.
- [ ] Create admin case if email sending fails.
- [ ] Store provider message id / send status in Supabase note or future email log table.

### Confirmation email content

Must include:

- [ ] confirmation that request was received,
- [ ] selected date/time,
- [ ] Jakub's contact,
- [ ] summary of submitted property/context,
- [ ] what happens next,
- [ ] reschedule/cancel instruction,
- [ ] privacy/footer text.

### Reminder email content

Future task:

- [ ] 24h before interaction,
- [ ] optional 2h before interaction,
- [ ] what to prepare,
- [ ] documents/photos if relevant,
- [ ] Jakub contact.

### Acceptance criteria

- [ ] Booking succeeds even if email provider fails.
- [ ] Email failure creates admin case.
- [ ] No secrets in repo.
- [ ] Email contains no fake promises or unverified legal wording.

### Adam input needed

- [ ] Provider choice.
- [ ] Sender email/domain.
- [ ] Whether confirmation email should be sent before Jakub's real mail/calendar is connected.

## 4. Dashboard auth

### Goal

Real CRM data must not be publicly visible.

### Tasks

- [ ] Protect `/dashboard/*`.
- [ ] Protect `/api/dashboard/*`.
- [ ] Use Cloudflare Access first unless there is a strong reason not to.
- [ ] Configure allowed emails.
- [ ] Keep public staging/demo mode until auth is confirmed.
- [ ] Only then enable `DASHBOARD_DATA_MODE=crm`.

### Implementation notes

- Worker already checks Cloudflare Access email for dashboard CRM reads.
- Need Cloudflare Access app/policy alignment.
- Staging can remain demo until locked.

### Acceptance criteria

- [ ] Public visitor cannot access CRM dashboard.
- [ ] Allowed email can access dashboard.
- [ ] API returns real CRM data only for allowed users.
- [ ] Demo mode remains safe when auth is not configured.

### Adam input needed

- [ ] Allowed dashboard emails.

## 5. Dashboard operational panels

### Goal

Dashboard becomes a working cockpit, not just a demo.

### Tasks

- [ ] Lead list with:
  - [ ] status,
  - [ ] source,
  - [ ] attribution,
  - [ ] next follow-up.
- [ ] Lead detail:
  - [ ] contact,
  - [ ] property/context,
  - [ ] raw payload summary,
  - [ ] attribution panel,
  - [ ] notes.
- [ ] Follow-up queue.
- [ ] Appointment/pre-meeting panel.
- [ ] Admin cases panel.
- [ ] Email send status panel.
- [ ] Review request panel.
- [ ] Approval queue.
- [ ] Monitoring cards.

### Implementation notes

- Existing `/dashboard/leady/` already has a prototype.
- Expand gradually instead of redesigning.
- Keep PII protected behind auth.

### Acceptance criteria

- [ ] Adam/Jakub can see new leads.
- [ ] They can see where lead came from.
- [ ] They can see failed side effects/admin cases.
- [ ] They can see next follow-up tasks.

## 6. Admin cases and failure visibility

### Goal

No important background failure should disappear silently.

### Already started

- [x] Worker creates admin case for Supabase CRM write failure.
- [x] Worker creates admin case for Telegram notification failure.
- [x] Worker creates admin case for OpenClaw handoff failure.
- [x] Monitoring can optionally read open `admin_cases` from Supabase.

### Remaining tasks

- [ ] Add admin case for email provider failure.
- [ ] Add admin case for reminder/review email failure.
- [ ] Add dashboard panel for open admin cases.
- [ ] Add severity rules:
  - [ ] `critical`: booking API/calendar broken,
  - [ ] `high`: CRM/OpenClaw failed,
  - [ ] `medium`: Telegram/email failed,
  - [ ] `low`: non-urgent content/review workflow issue.
- [ ] Add manual resolution workflow in dashboard or runbook.

### Acceptance criteria

- [ ] A failed side effect produces an open admin case.
- [ ] Monitoring can show open admin cases.
- [ ] Dashboard can show open admin cases.

## 7. Google review workflow

### Goal

After a successful client interaction/deal, Jakub can request a Google review through a controlled process.

### Tasks

- [ ] Confirm Google Business Profile review URL.
- [ ] Apply/verify `review_requests` schema.
- [ ] Create review request draft flow:
  - [ ] contact,
  - [ ] lead/deal/property,
  - [ ] message text,
  - [ ] Google review URL,
  - [ ] approval status.
- [ ] Require Jakub approval before sending in V1.
- [ ] Send review email after approval.
- [ ] Track status:
  - [ ] draft,
  - [ ] approved,
  - [ ] sent,
  - [ ] responded,
  - [ ] skipped.
- [ ] Show review requests in dashboard.

### Rules

- Do not ask for review after first booking.
- Good triggers:
  - [ ] deal closed,
  - [ ] handover complete,
  - [ ] positive client signal,
  - [ ] Jakub manually marks as review-ready.
- No incentive for positive review.
- No filtering language like “only if you were happy”.

### Adam input needed

- [ ] Real Google review link.
- [ ] Whether review request can be email-only in V1.

## 8. Anti-spam and rate limiting

### Goal

Booking endpoint creates real side effects, so it needs abuse protection before ads.

### Tasks

- [ ] Keep honeypot.
- [ ] Keep payload size limit.
- [ ] Add per-IP cooldown.
- [ ] Add per-phone/email cooldown.
- [ ] Decide whether to add Cloudflare Turnstile before ads.
- [ ] Add admin case or monitoring alert for unusual submit volume.

### Acceptance criteria

- [ ] Basic spam cannot create unlimited calendar/CRM events.
- [ ] Legit user can still book.
- [ ] Blocking reason is visible/logged.

## 9. SEO and AI-search completion

### Goal

Production site should be crawlable, structured and useful for seller intent.

### Tasks

- [ ] Finish `/predaj-bytu-bratislava/`.
- [ ] Add 16-question FAQ/Q&A section.
- [ ] Add `FAQPage` schema where FAQ is visible.
- [ ] Add `BreadcrumbList` schema.
- [ ] Add internal links from homepage to seller pages.
- [ ] Add next seller pages:
  - [ ] `/ocenenie-bytu-bratislava/`,
  - [ ] `/predaj-bytu-ruzinov/`,
  - [ ] `/predaj-bytu-stare-mesto/`,
  - [ ] `/predaj-zdedenej-nehnutelnosti/`.
- [ ] Update `llms.txt`.
- [ ] Verify production `robots.txt`.
- [ ] Submit sitemap in Google Search Console.

### Acceptance criteria

- [ ] Production pages are indexable.
- [ ] Staging remains noindex.
- [ ] Structured data validates.
- [ ] Seller landing pages answer actual questions, not generic SEO filler.

## 10. Staging E2E test

### Goal

Before production launch, prove the actual system works.

### Test path

```text
staging seller landing page
  -> reservation wizard
  -> /api/book
  -> Google Calendar event
  -> Supabase contact/lead/appointment/note
  -> Telegram notification
  -> OpenClaw handoff
  -> dashboard/admin visibility
```

### Acceptance criteria

- [ ] Booking response `ok: true`.
- [ ] Calendar event exists.
- [ ] Supabase lead exists.
- [ ] Attribution exists in raw payload.
- [ ] Telegram notification arrived.
- [ ] OpenClaw handoff arrived or admin case exists.
- [ ] Dashboard shows lead after auth.
- [ ] No production analytics event fired from staging.

## Required Adam inputs summary

- [ ] Email provider choice.
- [ ] Sender email/domain.
- [ ] GA4 measurement id, if GA4 is used.
- [ ] Google Ads conversion id/label.
- [ ] Google review URL.
- [ ] Dashboard allowed emails.
- [ ] Cookie/legal preference.
- [ ] Confirmation whether BOSEN/legal reviews privacy/cookie/email wording.
- [ ] Final Jakub Google Calendar/mail credentials at in-person onboarding.

## Immediate next implementation step

Start with:

```text
cookie/consent architecture
  -> analytics gating
  -> GA4/Ads event scaffold
  -> email provider abstraction
```

Do not redesign frontend until Adam gives one coherent visual direction.
