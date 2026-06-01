# Wednesday prep

Target meeting: Wednesday, 3 June 2026

Goal: show Jakub that the website is not just a visual presentation, but the first layer of a sales and lead-management system.

## Demo flow

Show this path:

```text
visitor lands on web
  -> sees Jakub + BOSEN positioning
  -> clicks Rezervácia konzultácie
  -> lands on `/rezervacia/`
  -> answers 4-step wizard
  -> selects preferred date/time
  -> structured lead context is prepared
```

Key sentence:

> Toto nie je kontaktný formulár. Toto je prvý filter pred predajným auditom.

## What is ready

- Staging URL: `https://staging.jakubolsa.sk/`
- Production URL: `https://jakubolsa.sk/`
- Staging workflow documented.
- BOSEN-backed positioning documented and implemented.
- Lead magnet direction: predajný audit / predajná stratégia.
- Static booking wizard prepared on `/rezervacia/`.
- Calendar integration path researched.

## What to ask Jakub

1. Which calendar does he actually use every day?
2. Does he want calls as phone calls, Google Meet, or "to be specified later"?
3. What call duration is realistic: 15, 20, 30, or 45 minutes?
4. Which times should never be bookable?
5. Does he want every website lead, or only qualified seller leads?
6. Should the lead first go to email, Telegram, WhatsApp, or CRM?
7. Which fields are too invasive before the first call?

## What not to promise yet

- automatic confirmed calendar booking before real calendar access exists
- CRM sync before data destination is chosen
- ad campaign performance
- automated follow-up until GDPR/data handling is clear
- OpenClaw production workflow

## Suggested Wednesday agenda

```text
1. Show current web positioning
2. Show the separate Rezervácia konzultácie wizard
3. Explain what data Jakub receives
4. Ask calendar and notification questions
5. Decide Phase 2: Cloudflare Worker + notification destination
6. Only then talk about OpenClaw
```

## Recommended next build after Wednesday

Minimum useful backend:

```text
Astro funnel submit
  -> Cloudflare Worker
  -> Telegram notification to Adam/Jakub
  -> append row to Google Sheet or Notion
```

This gives speed-to-lead without building a full CRM.

## Detailed TODO

The working checklist for Wednesday, 3 June 2026 is in:

```text
docs/TODO_2026-06-03.md
```
