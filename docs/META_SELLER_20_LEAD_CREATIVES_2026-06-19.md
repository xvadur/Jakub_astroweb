# Meta seller creative kit: 20 lead sprint

Date: 2026-06-19

Objective: prepare the first five Meta/Instagram creative concepts for seller-side lead acquisition without relying on narrow demographic targeting. Meta is for reach, trust and retargeting; Google Search remains the higher-intent channel.

## Source references

- Meta Business Help Center: Choose a Special Ad Category: https://www.facebook.com/business/help/298000447747885
- Meta Business Help Center: Audiences for Housing, Employment or Financial Products: https://www.facebook.com/business/help/2220749868045706
- Meta Business Help Center: About ads for housing: https://www.facebook.com/business/help/1198401317374558

Meta pages may require login, but the operating assumption for this campaign is conservative: declare Housing / Special Ad Category, avoid demographic or sensitive-trait targeting, and let creative qualify the viewer.

## Campaign posture

Use Meta as:

- awareness for Bratislava owners who may sell later,
- retargeting for `/predaj-bytu-bratislava/` visitors,
- retargeting for booking starters who did not submit,
- proof/education channel for Jakub's process.

Do not use Meta as the only source of the first 20 leads. Search captures active demand; Meta creates familiarity and assists conversion.

## Campaign setup

Campaign:

```text
SK | Meta | Seller Audit | Bratislava | 20 lead sprint
```

Special Ad Category:

```text
Housing
```

Objective:

```text
Traffic or Leads -> Website booking
```

V1 budget:

```text
EUR 10-20/day cold broad test
EUR 5-10/day retargeting if pixel/consent setup is legally approved
First review after EUR 50 spend or 1,500 landing-page views, whichever comes first
```

Landing:

```text
https://jakubolsa.sk/predaj-bytu-bratislava/
```

CTA:

```text
Chcem predajný audit
Rezervovať konzultáciu
```

## Targeting constraints

Use only housing-compliant setup:

- no age narrowing beyond platform-required housing defaults,
- no gender targeting,
- no income or wealth targeting,
- no exclusion of protected groups,
- no personal hardship targeting,
- no language implying that we know the viewer's private situation.

Acceptable broad framing:

- Bratislava / relevant region,
- people seeing general housing/seller education,
- retargeting of first-party website visitors only if consent and Meta setup are approved.

## Creative principles

The creative must qualify without discriminatory targeting:

1. Speak to situations, not demographics.
2. Sell the audit, not a guaranteed outcome.
3. Explain a mechanism: price, presentation, process, BOSEN service layer.
4. Make self-sellers feel respected, not attacked.
5. Keep every claim verifiable or process-based.

Avoid:

- "predáme za najvyššiu cenu",
- "predáme rýchlo garantovane",
- fake testimonials,
- fake sold labels,
- aggressive "bez realitky robíte chybu",
- any implication of financial distress, divorce or inheritance as known personal facts.

## Five ready creative concepts

CSV export:

- `ops/ads/meta-seller-creatives-2026-06-19.csv`

### 1. Predaj bytu nezačína inzerátom

Angle: before a listing goes public, the owner should check price, presentation and process.

Best format:

- 4:5 feed static,
- 9:16 story.

Use when:

- cold broad test,
- first retargeting wave.

### 2. Zdedili ste byt?

Angle: inheritance/family context requires a calmer decision path: sell, wait, rent, prepare paperwork.

Best format:

- 1:1 carousel.

Use when:

- creative variety,
- educational post reuse,
- softer trust-building.

### 3. Keď inzerát neťahá dopyt

Angle: self-sellers may have a price, photo, text or process problem, not just a demand problem.

Best format:

- UGC-style Reel,
- Jakub speaking to camera.

Use when:

- retargeting,
- Instagram profile content,
- organic reel before paid boost.

### 4. Prvých 48 hodín predaja

Angle: professional mechanism; what Jakub checks before pushing a property to market.

Best format:

- static checklist,
- Reel with quick checklist cuts.

Use when:

- trust/proof,
- retargeting visitors who started booking but did not submit.

### 5. Cena, rýchlosť alebo pokoj?

Angle: the owner needs to define the real priority before choosing the sales route.

Best format:

- 9:16 Story,
- 4:5 Feed.

Use when:

- cold broad test,
- audience education,
- post-call follow-up content.

## First test matrix

Start with:

```text
Creative 001: static feed + story
Creative 003: UGC Reel
Creative 004: checklist static
```

Hold back:

```text
Creative 002: carousel, launch after first learnings
Creative 005: priority angle, launch as alternate cold creative or retargeting
```

Decision rules:

```text
CTR below 0.6% after 1,000 impressions -> replace hook/visual.
Landing page views but no booking_start -> offer mismatch or landing trust issue.
Booking_start but no submit -> wizard friction or wrong channel promise.
Raw leads but mostly C score -> tighten copy around owner/sale readiness.
A/B lead below EUR 150 assisted CPL -> keep running.
```

## Production checklist

- [ ] Confirm Meta ad account can run Housing special category ads.
- [ ] Confirm production domain has final privacy/cookie text before pixel/retargeting.
- [ ] Add Meta Pixel/CAPI only after consent/legal decision.
- [ ] Produce 4:5, 1:1 and 9:16 variants.
- [ ] Use real Jakub/BOSEN assets where possible.
- [ ] Verify all links use UTM from the CSV.
- [ ] Do not launch before production conversion tracking is reviewed.
