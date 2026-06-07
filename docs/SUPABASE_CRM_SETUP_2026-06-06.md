# Supabase CRM setup

Dátum: 6. jún 2026

Účel: napojiť rezervačný wizard a Jakubov dashboard na reálnu CRM databázu bez toho, aby sa súkromné kľúče dostali do frontend kódu.

## Aktuálny stav

- Supabase project URL je nakonfigurovaný vo `wrangler.toml`.
- `SUPABASE_SERVICE_ROLE_KEY` je uložený iba ako Cloudflare secret na `jakubastroweb-staging`.
- `POST /api/book` sa po úspešnej Google Calendar rezervácii pokúsi zapísať booking do Supabase.
- `GET /api/dashboard/leads` je pripravený pre dashboard lead databázu, ale verejný staging je zatiaľ prepnutý na demo mód.
- `/dashboard/leady/` fetchuje `/api/dashboard/leads`; bez auth má zobrazovať iba demo/test údaje.
- SQL schema bola úspešne spustená v Supabase 6. júna 2026.
- Smoke test prešiel: booking vrátil `crmStatus: "crm_created"` a dashboard endpoint načítal test lead späť zo Supabase.

## Pred setupom

Pred spustením schemy Supabase vracal očakávané zlyhanie:

```text
Supabase request failed because public.tenants does not exist.
```

Po spustení schemy má `GET /api/dashboard/leads` vracať `ok: true`. Verejný staging v bezpečnom režime vracia `mode: "demo"`.

## Setup kroky

1. Otvor Supabase Dashboard.
2. Otvor projekt pripojený vo `wrangler.toml`.
3. Choď do SQL Editora.
4. Vlož a spusti celý súbor:

```text
ops/openclaw/supabase/SUPABASE_SCHEMA.sql
```

5. Over staging API:

```bash
curl https://staging.jakubolsa.sk/api/dashboard/leads
```

Očakávaný výsledok pred reálnymi leadmi:

```json
{"ok":true,"mode":"demo","leads":[...]}
```

6. Odošli jednu test rezerváciu na stagingu:

```text
https://staging.jakubolsa.sk/rezervacia/
```

7. Skontroluj Supabase tabuľky:

```text
contacts
leads
appointments
notes
```

8. Otvor dashboard:

```text
https://staging.jakubolsa.sk/dashboard/leady/
```

Lead list začne používať reálne CRM API dáta až po tom, ako sa dashboard zamkne a Worker sa prepne na CRM read mód.

## Smoke test 6. júna 2026

Výsledok:

```json
{
  "ok": true,
  "mode": "google",
  "bookingStatus": "calendar_created",
  "crmStatus": "crm_created"
}
```

Vytvorený bol test lead:

```text
Supabase Smoke Test
```

Vytvorený bol aj staging Google Calendar event:

```text
b8e7or7j54maq6arfsct3gt8jg
```

Ak test dáta netreba držať, vyčistiť ich zo staging kalendára a Supabase tabuliek.

## Bezpečnostné pravidlo

Service role key nikdy nedávať do:

- frontend kódu,
- `.env` commitnutého do Gitu,
- markdown dokumentácie,
- screenshotov,
- browser JavaScriptu.

Patrí iba do:

- Cloudflare Worker secrets,
- lokálneho `.dev.vars` alebo `.env` ignorovaného Gitom pri lokálnom Worker testovaní.

Pred uložením reálnych klientskych dát treba zamknúť tieto routes:

```text
/dashboard/*
/api/dashboard/*
```

Odporúčaná prvá možnosť: Cloudflare Access. Až potom zapnúť `DASHBOARD_DATA_MODE=crm`.

## Produkčný rollout

Supabase secrets nepridávať do produkcie, kým staging nie je overený end-to-end:

1. SQL schema existuje.
2. `/api/dashboard/leads` vracia `ok: true`.
3. Test booking zapisuje CRM záznamy.
4. Dashboard/API routes sú chránené.
5. Dashboard zobrazuje reálne lead riadky až za auth.
6. Adam a Jakub schvália dátový model.
