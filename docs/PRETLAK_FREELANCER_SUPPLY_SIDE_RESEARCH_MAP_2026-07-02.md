# Pretlak freelancer supply-side research map

Date: 2026-07-02

## Purpose

This is the GitHub-safe pointer for the Pretlak freelancer supply-side research layer.

The private dataset maps public Pretlak freelancer profiles and public external portfolio/homepage evidence for providers who could plausibly build broker websites, digital campaigns, CRM/product tooling, property content, or AI automations.

## Private canonical artifacts

The full CSV and detailed index are intentionally stored under ignored private research paths:

- `private/research/05-supply-side/pretlak-freelancer-digital-presence-master-v2-2026-07-02.csv`
- `private/research/05-supply-side/pretlak-freelancer-digital-presence-master-v2-2026-07-02.md`
- `private/research/05-supply-side/pretlak-freelancer-supply-side-index-map-2026-07-02.md`
- `private/research/scripts/scrape-pretlak-freelancer-digital-presence-v2.mjs`

## Source boundary

- Pretlak API: `https://pretlak.com/api/profile/list?skip=0&limit=500`
- Pretlak freelancer sitemap: `https://pretlak.com/freelancers.xml`
- Pretlak robots file: `https://pretlak.com/robots.txt`

This is public-source research. It is not a manual claim that every matched supplier has a verified real-estate case study.

## Snapshot

- Pretlak freelancer profiles found via API: `314`
- Potential web/digital provider candidates: `297`
- External portfolio/homepage checked: `140`
- Providers with real-estate/property/developer signal in Pretlak profile: `34`
- Providers with real-estate/property/developer signal in fetched external site: `17`
- Providers with either Pretlak or external real-estate signal: `45`

## Provider type map

- `web_dev_or_web_builder`: `226`
- `web_or_brand_designer`: `51`
- `digital_marketing_provider`: `30`
- `not_web_provider`: `5`
- `adjacent_creative_provider`: `2`

## Strategic read

This is the supply-side mirror of the broker market dataset.

The broker dataset shows that visible broker positioning is mostly generic, agency-hosted, listing-led, and weak on person-level authority. The Pretlak layer shows that the Slovak/Czech freelancer market already has public capability for web, SEO, PPC, content, video, CRM/product, and AI automation around real estate and development.

The bottleneck is therefore not only vendor availability. The bottleneck is orchestration: selecting the right capability, enforcing taste and proof standards, tying it to broker-specific positioning, and turning it into a repeatable operating system for Jakub/BOSEN.

## Next enrichment lanes

1. Manually browser-review the 45 real-estate-signal suppliers.
2. Classify each as `direct_case_study`, `client_logo_only`, `broad_sector_claim`, or `false_positive`.
3. Extract exact case-study URLs into dedicated columns.
4. Score suppliers by broker relevance, execution proof, seniority, likely price band, and ability to work inside Jakub/BOSEN system.
5. Cross-map supplier strengths against broker-market gaps: personal authority site, Google Places, valuation funnel, property video, CRM, AI receptionist, listing-content system.

