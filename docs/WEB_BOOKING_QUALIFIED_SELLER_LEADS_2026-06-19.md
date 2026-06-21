# Web booking qualified seller leads

Date: 2026-06-19

Purpose: document how inbound seller bookings from ads/SEO become qualified lead opportunities for Jakub.

## Mechanism

The reservation funnel collects:

- seller intent (`zamer`),
- owner relationship,
- sale status,
- time horizon,
- price idea,
- property/location parameters,
- contact details,
- UTM/click attribution,
- booking date/time.

The browser computes a visible `lead_score` grade:

- `A`: owner/family/dedication relation + hot time horizon + active sale state.
- `B`: owner/family/dedication relation + warm horizon or active sale state.
- `C`: weaker or incomplete seller signal.

The Worker recomputes the same qualification server-side and stores it in `raw_payload.qualification`.

## CRM Status

For web bookings:

- grade `A` or `B` starts as CRM status `qualified`,
- grade `C` starts as CRM status `new`.

This does not mean a sold deal. It means the inbound web booking has enough seller signal to prioritize Jakub follow-up.

## Dashboard Action

Qualified A/B web bookings show the next action:

`Prioritne preveriť vlastníka, cenu a pripraviť konzultáciu.`

## Why This Matters

For the 5 000 EUR/month path, web ads should not optimize only for cheap form fills. The operational target is qualified seller conversations:

- owner or decision-maker,
- real property context,
- sale intent,
- timeframe,
- permission to continue via booked consultation.

This separates useful seller leads from low-intent traffic before Jakub spends time on them.
