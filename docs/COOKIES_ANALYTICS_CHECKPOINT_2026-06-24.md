# Cookies and analytics checkpoint - 2026-06-24

Ucel: zhrnut aktualne rozhodnutie a implementaciu cookies/analytics pre `jakubolsa.sk`.

## Rozhodnutie

V1 meranie ma byt consent-first.

Analyticke alebo marketingove skripty sa nesmu nacitat pred suhlasom navstevnika.

## Implementovane

Pridany komponent:

```text
src/components/AnalyticsConsent.astro
```

Komponent je zapojeny na:

```text
/
/rezervacia/
/nehnutelnosti/[slug]/
/ochrana-osobnych-udajov/
/404.html
```

Komponent robi:

- zobrazi cookie banner iba vtedy, ked je nastavene aspon jedno analytics env ID,
- uklada rozhodnutie do `localStorage` pod klucom `jakub_cookie_consent_v1`,
- zachytava attribution pri prvej navsteve: UTM parametre, referrer a landing path,
- attribution helper bezi aj bez analytics env ID, aby booking payload vedel priradit zdroj leadu,
- pred suhlasom nenacitava GTM, GA ani Meta Pixel,
- po suhlase nacita nastavene meracie skripty,
- pri odmietnuti zahodi queue a nenacita skripty,
- zachytava kliky na telefon, email, Instagram a rezervaciu,
- spracuje existujuce wizard eventy cez `window.jakubTrackEvent`.

## Env variables

Build-time public env variables:

```text
PUBLIC_GTM_ID
PUBLIC_GA_MEASUREMENT_ID
PUBLIC_META_PIXEL_ID
```

Ak nie su nastavene, cookie banner ani analytics skripty sa nezobrazia ani nenacitaju.

Pozor: tieto hodnoty cita Astro pri builde. Nestaci ich dat iba ako runtime Worker secret. Treba ich nastavit v build prostredi alebo pri spusteni buildu.

Priklad pre lokalny test:

```bash
PUBLIC_GTM_ID=GTM-TEST PUBLIC_GA_MEASUREMENT_ID=G-TEST npm run dev
```

## Merane eventy

Zakladne CTA:

```text
cta_click
```

Parametre:

```text
page_path
link_type     phone | email | instagram | reservation
link_label
component     header | footer | content
utm_source
utm_medium
utm_campaign
utm_content
utm_term
referrer_host
landing_path
```

Booking wizard:

```text
booking_step_view
booking_intent_select
booking_date_select
booking_time_select
booking_submit_attempt
booking_submit_success
booking_submit_error
```

Povolene parametre:

```text
page_path
intent
step
step_name
booking_status
mode
utm_source
utm_medium
utm_campaign
referrer_host
landing_path
```

## Attribution

Pridana je navstevnicka attribution vrstva.

Pri prvej navsteve sa uklada:

```text
utm_source
utm_medium
utm_campaign
utm_content
utm_term
referrer
referrer_host
landing_path
landing_url
captured_at
```

Session hodnota:

```text
sessionStorage.jakub_session_attribution_v1
```

Trvalejsia posledna znama kampanova hodnota:

```text
localStorage.jakub_attribution_v1
```

Do analytics eventov sa posielaju iba whitelisted attribution polia:

```text
utm_source
utm_medium
utm_campaign
utm_content
utm_term
referrer_host
landing_path
```

Do booking payloadu sa posiela aj `payload.attribution`, aby CRM/Worker vedeli priradit lead k zdroju navstevy. Worker pridava kratke zhrnutie attribution aj do Telegram notifikacie:

```text
Zdroj návštevy: utm_source=google, utm_medium=cpc, utm_campaign=..., referrer=..., landing=...
```

## PII pravidlo

Do analytics sa neposiela:

```text
meno
telefon
email
sprava
presna lokalita / adresa
datum
cas
```

Tieto udaje patria do booking/CRM vrstvy, nie do analytiky.

## Privacy text

`src/pages/ochrana-osobnych-udajov.astro` bol upraveny:

- uz netvrdi, ze web nikdy nepouziva analyticke cookies,
- hovori, ze analyticke/marketingove skripty sa nacitaju iba po suhlase,
- uvadza, ze formularove PII sa neposiela do analytiky.

## Stav QA

Overene:

```bash
npm run build
```

Build presiel.

Overene lokalnymi screenshotmi cez Playwright CLI pri testovacich env hodnotach:

```text
/tmp/jakub-cookie-home.png
/tmp/jakub-cookie-reservation.png
/tmp/jakub-cookie-reservation-fixed.png
/tmp/jakub-cookie-reservation-bar.png
```

Poznamka: Playwright nie je dependency projektu. Nebol pridany do `package.json`. Pouzity bol len docasne cez `npx playwright`.

## Dalsie kroky

1. Rozhodnut, ci ideme cez GTM alebo priamo GA4.
2. Ak GTM, vytvorit container a nastavit `PUBLIC_GTM_ID`.
3. Ak GA4 priamo, vytvorit GA4 stream a nastavit `PUBLIC_GA_MEASUREMENT_ID`.
4. Meta Pixel zapnut az ked bude realny reklamny plan a cookie policy/consent je schvaleny.
5. Po nasadeni overit v real-time analytics, ze:
   - page view pride az po suhlase,
   - `booking_submit_success` neobsahuje PII,
   - telefon/email/Instagram kliky sa meraju ako CTA eventy.
