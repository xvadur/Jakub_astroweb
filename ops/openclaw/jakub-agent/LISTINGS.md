# LISTINGS.md - Web listings workflow

Tento subor definuje, ako ma agent `jakub-olsa` pracovat s ponukami a predanymi nehnutelnostami na Jakubovom webe.

## Zdroj pravdy na webe

Aktualne verejne nehnutelnosti su v Astro data subore:

```text
/home/node/Jakub_Astro/src/data/site.ts
```

Konkretny array:

```text
site.listings
```

Detail stranky sa generuju automaticky z:

```text
/home/node/Jakub_Astro/src/pages/nehnutelnosti/[slug].astro
```

Homepage sekcia `#ponuky` rozdeluje zaznamy podla:

```text
group: "available" | "sold"
```

## Povinne listing polia

Kazdy verejny listing musi mat:

- `slug`
- `group`
- `status`
- `title`
- `place`
- `price`
- `image`
- `gallery`
- `note`
- `summary`
- `specs`
- `highlights`
- `detail`
- `href`
- `cta`

`href` musi byt:

```text
/nehnutelnosti/<slug>/
```

Fotky maju byt v:

```text
/home/node/Jakub_Astro/public/images/listings/<slug-or-human-folder>/
```

## Deterministicky listing tool

Agent ma k dispozicii lokalny tool:

```bash
node /home/node/Jakub_Astro/ops/openclaw/tools/site-listings.mjs <tool> --json '<payload>'
```

Host verzia pre Adamov terminal:

```bash
node /Users/xvadur_mac/Jakub_Astro/ops/openclaw/tools/site-listings.mjs <tool> --json '<payload>'
```

### Dostupne prikazy

Vypis listingov:

```bash
node /home/node/Jakub_Astro/ops/openclaw/tools/site-listings.mjs site.listings.list
node /home/node/Jakub_Astro/ops/openclaw/tools/site-listings.mjs site.listings.list --json '{"group":"available"}'
node /home/node/Jakub_Astro/ops/openclaw/tools/site-listings.mjs site.listings.list --json '{"group":"sold"}'
```

Audit listing dat:

```bash
node /home/node/Jakub_Astro/ops/openclaw/tools/site-listings.mjs site.listings.audit
```

Vytvorenie property draftu z Jakubovho vstupu:

```bash
node /home/node/Jakub_Astro/ops/openclaw/tools/site-listings.mjs site.listings.createDraft --json '{"title":"2-izbovy byt v Ruzinove","place":"Ruzinov, Bratislava","group":"available"}'
```

Priprava approval requestu na novy listing:

```bash
node /home/node/Jakub_Astro/ops/openclaw/tools/site-listings.mjs site.listings.prepareAddListing --json '{"title":"2-izbovy byt v Ruzinove","place":"Ruzinov, Bratislava","group":"available"}'
```

Priprava approval requestu na presun do predanych:

```bash
node /home/node/Jakub_Astro/ops/openclaw/tools/site-listings.mjs site.listings.prepareMarkSold --json '{"slug":"byt-martincekova","result":"predane"}'
```

## Runtime priecinky mimo repozitara

Agent moze zapisovat operacne drafty mimo web repo:

```text
/home/node/.openclaw/agent-workspaces/jakub-olsa/property-drafts
/home/node/.openclaw/agent-workspaces/jakub-olsa/approval-queue
/home/node/.openclaw/agent-workspaces/jakub-olsa/media-inbox
/home/node/.openclaw/agent-workspaces/jakub-olsa/web-patches
/home/node/.openclaw/agent-workspaces/jakub-olsa/admin-cases
```

Tieto priecinky mozu obsahovat klientsky obsah a osobne udaje. Necommitovat ich do web repozitara.

## Pridanie noveho inzeratu

Ked Jakub posle fotky, hlasovku alebo text k novej nehnutelnosti:

1. Vytiahni dostupne parametre: typ, lokalita, izby, vymera, stav, cena, exterier, parkovanie, pravny stav, vyhody, komu je vhodna.
2. Ak chyba kriticka vec, poloz jednu kratku otazku.
3. Zavolaj `site.listings.createDraft` alebo `site.listings.prepareAddListing`.
4. Nezapisuj verejny web bez approval.
5. Po approval priprav patch v `src/data/site.ts`.
6. Skontroluj, ze fotky existuju v `public/images/listings/...`.
7. Spusti `npm run build`.
8. Najprv staging review, produkcia az po explicitnom approval.

## Presun do sekcie predanych

Ked Jakub povie, ze nehnutelnost je predana:

1. Najdi listing cez `site.listings.list`.
2. Zavolaj `site.listings.prepareMarkSold`.
3. Navrhni zmeny:
   - `group: "sold"`
   - `status: "Predané"`
   - `price: "predané..."` podla Jakubom schvaleneho znenia
   - `cta: "Pozrieť predaj"`
   - upraveny `note`, `summary`, `detail`, aby stranka posobila ako referencny predaj.
4. Priprav patch v `src/data/site.ts` az po approval.
5. Spusti `npm run build`.
6. Over:
   - homepage `#ponuky` uz nehnutelnost neukazuje v aktualnych ponukach,
   - detail `/nehnutelnosti/<slug>/` funguje,
   - CTA na detaile ide na rezervaciu konzultacie,
   - sitemap obsahuje detail.

## Approval pravidlo

Pridanie inzeratu, zmena verejneho textu, zmena fotiek a presun do predanych su verejne web zmeny. Vzdy potrebuju approval pred commit/push/deploy.

CRM poznamka typu "nehnutelnost predana" approval nepotrebuje, ale verejna web zmena ano.
