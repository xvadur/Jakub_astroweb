# Broker system roadmap - 2026-06-07

Tento dokument zachytáva aktuálne rozhodnutia pre posun z webu + booking wizardu na použiteľný maklérsky operačný systém pre Jakuba.

## Cieľový stav

Jakub má mať vlastný realitný systém:

```text
Verejný web
  -> rezervačný wizard
  -> Cloudflare Worker
  -> Google Calendar
  -> Supabase CRM
  -> OpenClaw agent
  -> dashboard / follow-up / review / web draft workflow
```

Cloudflare drží verejný booking a bezpečné API. Supabase drží obchodné dáta. OpenClaw robí operatívu, databázové workflowy, follow-upy, briefingy, review requesty a prípravu webových zmien.

## Rozhodnutia

### Dashboard auth

- Dashboard bude mať login pred reálnymi dátami.
- Preferovaný prvý smer: Cloudflare Access s Google loginom.
- Vlastný Astro/Supabase login nerobiť vo V1, ak Cloudflare Access stačí.
- To, že Jakub si dashboard dá na plochu ako PWA, nemení potrebu auth. Access session by mala zostať použiteľná aj pre PWA-like používanie.
- Multi-tenant auth príde až po Jakubovom pilote.

### Dashboard data

- Aktuálny dashboard je prvá vizuálna iterácia.
- Verejný staging ostáva demo-only.
- Po auth sa zapne Supabase CRM read mód pre `/dashboard/*` a `/api/dashboard/*`.
- Dashboard treba dorobiť ako pracovný nástroj:
  - lead zoznam,
  - lead detail,
  - statusy,
  - poznámky,
  - úlohy,
  - nehnuteľnosti,
  - kalendár,
  - OpenClaw approval queue,
  - review/follow-up panel.

### OpenClaw

- OpenClaw ešte nie je nakonfigurovaný ako plnohodnotný maklérsky agent.
- Chýbajú dobré spojenia s webom a Supabase.
- Chýbajú briefingy, review workflowy a jasné maklérske lanes.
- OpenClaw nemá byť booking autorita; booking drží Cloudflare Worker.
- OpenClaw má robiť:
  - notifikácie,
  - CRM zápisy a čítania,
  - follow-upy,
  - databázové workflowy,
  - denné/operatívne briefingy,
  - návrhy webových zmien,
  - review requesty klientom,
  - approval queue pred verejnými alebo citlivými zmenami.

### Supabase

- Supabase je cieľová databázová pravda.
- OpenClaw potrebuje deterministické Supabase tools.
- Web booking už vie zapisovať Supabase cez Worker, ale dashboard aj OpenClaw tools treba dopojiť produkčne.

### Web <-> OpenClaw tunnel

- Treba Cloudflare Tunnel alebo ekvivalentný zabezpečený HTTPS endpoint na lokálny Docker OpenClaw `/hooks/agent`.
- Staging Worker potom dostane:
  - `OPENCLAW_HOOK_URL`,
  - `OPENCLAW_HOOK_TOKEN`,
  - voliteľne Cloudflare Access service token.
- Worker nesmie dostať `localhost` hook URL.

### Follow-up komunikácia

- Follow-upy bude riadiť OpenClaw.
- Prvý realistický kanál: email.
- SMS/WhatsApp môže byť lepšie pre realitu makléra, ale treba zistiť náklady, API, GDPR a doručiteľnosť.
- Email provider sa bude riešiť cez API, nie cez `mailto`.

### GDPR/legal

- GDPR bude samostatný research a právny checklist.
- Pred právnikom treba pripraviť otázky a návrh reality spracovania:
  - kto je prevádzkovateľ,
  - či je Adam sprostredkovateľ,
  - čo robí BOSEN,
  - aké dáta ide cez web, Supabase, Telegram, OpenClaw, Google a email,
  - retenčné lehoty,
  - právo na výmaz,
  - cookie/analytics režim,
  - review requesty klientom.
- Finálne právne znenie musí potvrdiť právnik alebo BOSEN právne zázemie.

### Git a prostredia

- Zachovať `staging` a `main`.
- `staging` ostáva pracovný review environment.
- `main` je produkcia.
- Git treba vyčistiť po práci viacerých agentov:
  - zistiť, čo je rozrobené,
  - rozdeliť zmeny do logických commitov,
  - nestratiť dashboard/Worker/OpenClaw zmeny,
  - produkciu deployovať až po review.

### SEO, AI a reviews

- Web musí byť vyhľadateľný cez Google aj čitateľný pre AI.
- Treba doplniť review/referencie sekciu.
- OpenClaw má vedieť po uzavretí spolupráce pripraviť alebo poslať klientovi email so žiadosťou o Google review.
- Review request flow musí byť súčasťou CRM/follow-up systému:
  - ktorý obchod,
  - ktorý klient,
  - kedy požiadať,
  - aký text,
  - link na Google review,
  - status odoslané/odpovedané.

## P0 - čo musí byť hotové, aby sme zapli reálne CRM dáta

1. Cloudflare Access / Google login pre `/dashboard/*` a `/api/dashboard/*`.
2. Zapnúť `DASHBOARD_DATA_MODE=crm` až za auth.
3. Vyčistiť smoke test dáta v Supabase a Google Calendar.
4. Rotovať Supabase service role key.
5. Commitnúť a pushnúť aktuálny staging stav.

## P1 - aby OpenClaw bol maklérsky agent

1. Vytvoriť Supabase CRM tools:
   - contact search/create/update,
   - lead create/update,
   - note create,
   - task create/update,
   - appointment read/link,
   - audit log write.
2. Nastaviť Cloudflare Tunnel/Access pre OpenClaw hook.
3. Nastaviť staging `OPENCLAW_HOOK_URL` a `OPENCLAW_HOOK_TOKEN`.
4. Otestovať booking -> OpenClaw -> CRM/audit.
5. Vytvoriť OpenClaw briefing workflow:
   - dnešné hovory,
   - nové leady,
   - urgentné follow-upy,
   - návrhy akcií.

## P2 - dashboard a obchodný polish

1. Dorobiť dashboard moduly.
2. Pridať review sekciu na web.
3. Pripraviť Google review email workflow.
4. Rozšíriť SEO/AI obsah: FAQ, lokálne služby, recenzie, referenčné predaje.
5. Pripraviť právny/GDPR research pre právnika.

