# Conversion funnel research

Date: 30 May 2026

Scope: modern design, sales-page structure, seller lead magnet, and booking flow for Jakub Olša web. OpenClaw is intentionally out of scope for this document.

## Research takeaways

### 1. The page needs one primary job

Real-estate landing page guidance consistently treats a landing page as a focused conversion surface, not a broad homepage. The useful pattern for Jakub is:

```text
owner intent
  -> trust and positioning
  -> seller audit / strategy CTA
  -> qualify the situation
  -> book or request a call
```

Source notes:

- PropStream frames real-estate landing pages around one clear CTA, simple lead form, audience targeting, and avoiding clutter: `https://www.propstream.com/real-estate-agent-blog/real-estate-landing-pages-101-creating-pages-to-convert-examples`
- FunnelSurf describes lead magnet funnels as landing page, thank-you/next step, and follow-up sequence. For real estate, it explicitly includes home valuation/seller qualification, calendar booking, and lead segmentation: `https://funnel.surf/blog/articles/real-estate-lead-magnet-funnels`

Decision for Jakub:

- Do not make the website feel like a generic broker brochure.
- Keep the main conversion path around "predajný audit / predajná stratégia".
- The lead magnet should not promise an instant cheap estimate. It should promise a serious first sales strategy.

### 2. The lead magnet should qualify, not just collect contact data

For Jakub, a good lead is not "anyone who left an email". It is someone with enough context to decide whether a call is worth prioritizing.

Minimum qualifying fields:

- intent: sell, explore options, fast sale/buyout, rent/manage, buy new and sell old
- property type
- location
- rough parameters
- timeline
- preferred call date/time
- phone

Decision for current implementation:

- Build a multi-step booking wizard rather than one long form.
- Keep the old audit form as a fallback/contact surface.
- Use the booking wizard as the primary CTA from hero, mobile CTA, and empty listings state.

### 3. Date/time choice must be honest before calendar integration

Baymard's date-picker research notes that unclear availability creates extra verification effort and can cause abandonment. Until a live calendar is connected, the website must not pretend the selected slot is guaranteed.

Source:

- Baymard date picker examples/research summary: `https://baymard.com/ecommerce-design-examples/date-picker`

Decision for current implementation:

- The new wizard says the selected time is preferred/predbežný.
- When calendar integration is ready, replace the static preferred date/time step with real availability from Google Calendar, Calendly, or a custom endpoint.

### 4. Google Calendar is enough for a first real booking layer

Google Calendar appointment schedules can create a booking page, block times when the calendar is busy, and can be shared or embedded.

Source:

- Google Calendar appointment schedules overview: `https://support.google.com/calendar/answer/11608416`
- Google Calendar appointment schedule setup: `https://support.google.com/calendar/answer/10729749`

Practical implications:

- Jakub can create a phone-call appointment schedule.
- It can check availability against calendars.
- It can collect first name, last name, email, and extra booking fields.
- It can send confirmations/reminders.

Limit:

- Google booking embed may be visually less controllable than a custom funnel.
- We should use our own funnel first, then send qualified users into the actual calendar step or replace the date/time step with embedded booking.

### 5. Calendly is the clean fallback if Google embed is too limited

Calendly supports inline embeds, popup widgets, popup text, and iframe fallback. Iframe mode is simpler but cannot pre-fill invitee data or track booking events.

Sources:

- Calendly website embed options: `https://calendly.com/help/how-to-add-calendly-to-your-website`
- Calendly iframe limitations/layout: `https://calendly.com/help/how-to-embed-calendly-with-an-iframe`

Decision:

- Preferred path: Google Calendar if Jakub already lives in Google Calendar.
- Backup path: Calendly if we need cleaner embed, tracking, or easier website behavior.

## Current implementation

Implemented in `src/pages/index.astro`, `src/pages/rezervacia.astro`, and `src/data/site.ts`:

- Hero CTA now goes to the dedicated `/rezervacia/` wizard.
- Mobile sticky CTA goes to `/rezervacia/`.
- Empty listings CTA goes to `/rezervacia/`.
- Homepage has only a compact consultation CTA, not the full wizard embedded into the page.
- The `/rezervacia/` wizard has 4 steps:
  - intent
  - property basics
  - preferred date/time
  - contact and message
- Current submission creates a `mailto:` with structured lead context.
- The flow is explicit that the selected time is preliminary until calendar integration exists.

## Next integration path

### Phase 1: Static funnel

Current state.

```text
user clicks reservation CTA
  -> lands on `/rezervacia/`
  -> selects context and preferred slot
  -> mailto to Jakub
  -> manual confirmation
```

### Phase 2: Lead endpoint

Replace mailto with a Cloudflare Worker endpoint:

```text
booking wizard
  -> POST /api/leads
  -> Telegram/email notification
  -> Google Sheet / Notion / lightweight CRM
```

### Phase 3: Real calendar booking

Two viable routes:

```text
qualified funnel
  -> Google Calendar appointment schedule link/embed
  -> confirmed event in Jakub calendar
```

or:

```text
qualified funnel
  -> custom availability endpoint
  -> Google Calendar API
  -> confirmed event + CRM record
```

Do not build Phase 3 before Jakub confirms how he actually manages his calendar.

## Design direction

Use a premium operational style:

- high contrast, restrained typography, real portrait/listing assets
- one clear primary CTA
- short but concrete service blocks
- sales proof via reference deals and BOSEN service backing
- funnel UI as a serious consultation intake, not a playful quiz

Avoid:

- generic luxury cliches
- huge marketing copy blocks with no action
- fake scarcity
- fake real-time calendar slots
- "AI" as a front-facing promise before the operational layer is real
