# CSS Architecture Audit

Dátum: 2026-06-05

## Záver

Audit potvrdzuje problém: projekt zatiaľ nemal globálnu CSS vrstvu. Každá hlavná stránka drží vlastný veľký `<style>` blok, takže farby, fonty, header, footer, tlačidlá a základné HTML pravidlá sa opakujú na viacerých miestach.

## Aktuálny stav

| Súbor | CSS stav | Riziko |
| --- | --- | --- |
| `src/pages/index.astro` | veľký stránkový `<style>` blok, cca 1470 riadkov | homepage obsahuje veľa globálne pôsobiacich vzorov |
| `src/pages/rezervacia.astro` | veľký stránkový `<style>` blok, cca 750 riadkov | wizard má vlastný dark-mode systém |
| `src/pages/nehnutelnosti/[slug].astro` | veľký stránkový `<style>` blok, cca 530 riadkov | detail nehnuteľnosti duplikuje header/footer/button štýly |
| `src/pages/404.astro` | samostatný menší `<style>` blok | izolovaný error layout |
| `src/pages/ochrana-osobnych-udajov.astro` | samostatný menší `<style>` blok | izolovaná právna stránka |

## Najväčšie duplicity

- `:root` tokeny: farby, fonty, tiene, linky.
- Base reset: `*`, `html`, `body`, `a`, `img`.
- Header/brand: `site-header`, `wizard-header`, `brand`, `brand-cluster`, `brand-divider`, BOSEN logo.
- Footer: `footer`, `wizard-footer`, `footer-brand`, `footer-links`, `social-icon`.
- Buttons/CTA: `button`, `button.primary`, `button.secondary`.

## Čo som spravil teraz

Pridaný je prvý globálny CSS scaffold:

- `src/styles/global.css`
- importnutý do všetkých aktuálnych stránok
- používa `@layer tokens` a `@layer base`

Toto je zámerne bezpečný krok. Existujúce stránkové CSS ostáva zatiaľ silnejšie než globálna vrstva, takže by nemalo dôjsť k náhodnej vizuálnej zmene.

## Odporúčaná cieľová architektúra

1. `src/styles/global.css`
   - import order a základný vstupný bod

2. `src/styles/tokens.css`
   - farby, fonty, spacing, radii, shadow, breakpoints

3. `src/styles/base.css`
   - reset, `html`, `body`, `a`, `img`, accessibility základy

4. `src/styles/components.css`
   - header, footer, brand cluster, buttons, social icons, listing cards, CTA pásy

5. page-specific CSS
   - homepage sekcie
   - rezervačný wizard
   - listing detail
   - právna stránka
   - 404

## Bezpečný refactor postup

1. Najprv presunúť iba tokeny a base reset.
2. Potom presunúť footer, lebo je takmer identický na homepage, rezervácii a detailoch.
3. Potom presunúť header/brand/BOSEN logo.
4. Potom button systém.
5. Až nakoniec riešiť veľké špecifické layouty homepage a wizardu.

## Prečo nie všetko naraz

V projekte je skoro 3 000 riadkov inline CSS. Jednorazový refactor by síce vyzeral čisto v diffe, ale riskoval by rozbitie vizuálu na produkčnej stránke. Lepší postup je rozobrať to po vrstvách a po každej vrstve pustiť build a vizuálnu kontrolu.
