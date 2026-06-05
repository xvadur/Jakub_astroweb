# Developer workstation pre Jakub projekt

Posledná aktualizácia: 4. jún 2026

Tento dokument je štartovací panel pre prácu na Jakubovom webe, booking systéme a OpenClaw vrstve.

## Stav stroja

- Disk je v poriadku: približne 331 GiB voľných.
- `Jakub_Astro` má približne 179 MB.
- `Downloads` mal približne 2.7 GB a obsahoval Google credentials. Tie boli presunuté do ignorovaného `private/secrets/downloads-archive-2026-06-04/`.
- Node, npm, Wrangler, Docker a GitHub CLI sú nainštalované.

Rýchla kontrola:

```bash
cd /Users/xvadur_mac/Jakub_Astro
npm run health
```

## Kanonické miesta

```text
/Users/xvadur_mac/Diera
```

Nový developer workspace: aktívne projekty, parked kódy, OpenClaw, nástroje a one-person business infra.

```text
/Users/xvadur_mac/Diera/active/jakub/Jakub_Astro
/Users/xvadur_mac/Jakub_Astro -> /Users/xvadur_mac/Diera/active/jakub/Jakub_Astro
/Users/xvadur_mac/Projects/Jakub_Astro -> /Users/xvadur_mac/Diera/active/jakub/Jakub_Astro
```

Web projekt: Astro web, booking wizard, Cloudflare Worker, docs, assety, listingy.

```text
/Users/xvadur_mac/Diera/active/jakub/OpenClaw
/Users/xvadur_mac/OpenClaw -> /Users/xvadur_mac/Diera/active/jakub/OpenClaw
```

OpenClaw runtime/state/workspaces. Toto nie je git repo.

```text
/Users/xvadur_mac/Diera/active/jakub/OpenClaw_Control
/Users/xvadur_mac/Workspace/04_OpenClaw -> /Users/xvadur_mac/Diera/active/jakub/OpenClaw_Control
```

OpenClaw identita a pracovný kontext. Je to samostatné git repo, zatiaľ bez prvého commitu.

```text
/Users/xvadur_mac/Jakub_Astro/ops/openclaw
```

Projektová OpenClaw špecifikácia pre Jakuba: agent pravidlá, Supabase schema, tool contracts, runbooky.

## Pracovné režimy

### 1. Web implementácia

Použi, keď meníš homepage, listingy, booking UI, CSS, assety alebo SEO.

```bash
cd /Users/xvadur_mac/Diera/active/jakub/Jakub_Astro
git status --short --branch
npm run dev -- --host 127.0.0.1
```

Lokálne URL:

```text
http://127.0.0.1:4321/
http://127.0.0.1:4321/rezervacia/
http://127.0.0.1:4321/prototypy/proof/
```

Pred deployom:

```bash
npm run build
git status --short
```

### 2. Booking backend

Použi, keď riešiš Google Calendar, availability, booking eventy, Telegram/OpenClaw hook.

```bash
cd /Users/xvadur_mac/Diera/active/jakub/Jakub_Astro
npm run worker:dev
```

Lokálne API:

```text
http://127.0.0.1:8787/api/availability?date=2026-06-04
http://127.0.0.1:8787/api/book
```

### 3. Dizajn a prototypy

Prototypy patria do:

```text
src/pages/prototypy/
```

Výber a rozhodnutia patria do:

```text
docs/HERO_DIRECTION_SELECTION_2026-06-03.md
docs/BOSEN_COPY_WORKSHOP_2026-06-03.md
```

Pravidlo: nerobiť 20 celých webov. Robiť 20 rezov jednej časti: hero, proof sekcia, listing template, booking step, CTA blok.

### 4. Listingy a nehnuteľnosti

Dáta a texty:

```text
src/data/site.ts
```

Detail šablóna:

```text
src/pages/nehnutelnosti/[slug].astro
```

Používané obrázky:

```text
public/images/listings/
```

Originály:

```text
source-assets/originals/images/listings/
```

### 5. OpenClaw pre Jakuba

OpenClaw nikdy nemá byť kritická booking transakcia. Booking musí fungovať aj bez neho.

OpenClaw rieši:

- Telegram-first komunikáciu s Jakubom,
- CRM/Supabase zápisy,
- drafty textov a inzerátov,
- spracovanie fotiek,
- staging zmeny,
- approval pred public publikovaním.

Projektová špecifikácia:

```text
docs/OPENCLAW_ONBOARDING_2026-06-03.md
docs/OPENCLAW_RUNBOOK_2026-06-03.md
docs/OPENCLAW_TOOL_CONTRACTS_2026-06-03.md
ops/openclaw/
```

## Git režim

- `staging` je pracovná vetva pre Jakub web.
- `main` je produkcia.
- Experimenty najprv staging.
- Produkciu nasadiť až po kontrole na reálnej staging URL.
- Necommitovať secrets.
- Necommitovať cudzie alebo paralelné zmeny bez kontroly.

Aktuálne pozor: v worktree sú rozrobené OpenClaw/n8n súbory. Pri commite treba stageovať iba súbory konkrétnej úlohy.

## Deploy príkazy

Staging:

```bash
export CLOUDFLARE_API_TOKEN="..."
npm run deploy:staging
```

Produkcia:

```bash
export CLOUDFLARE_API_TOKEN="..."
npm run deploy:production
```

## Secrets

Lokálne secrety patria iba sem:

```text
private/secrets/
```

Cloudflare runtime secrety patria do Wrangler secrets, nie do repa:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GOOGLE_CALENDAR_ID
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
OPENCLAW_HOOK_URL
OPENCLAW_HOOK_TOKEN
```

## Denný štart

```bash
cd /Users/xvadur_mac/Diera/active/jakub/Jakub_Astro
npm run health
git status --short --branch
npm run dev -- --host 127.0.0.1
```

Potom otvor:

```text
http://127.0.0.1:4321/
http://127.0.0.1:4321/rezervacia/
```

## Denný koniec

```bash
npm run build
git status --short
```

Zapíš rozhodnutia do:

```text
docs/DECISIONS.md
docs/PROJECT_STATUS.md
docs/TODO_2026-06-03.md
```

Ak išlo o deploy, aktualizuj:

```text
docs/STAGING_DEPLOYMENT.md
```
