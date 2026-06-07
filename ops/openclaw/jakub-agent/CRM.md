# CRM.md - Jakub OpenClaw CRM fallback

Tento subor definuje fallback CRM rezim pre agenta `jakub-olsa`.

## Stav

Supabase je cielovy CRM backend pre web booking, dashboard a OpenClaw. OpenClaw ma pripraveny lokalny deterministicky Supabase tool:

```bash
node /home/node/Jakub_Astro/ops/openclaw/tools/supabase-crm.mjs <tool> --json '<payload>'
```

Lokalna CRM V0 databaza vo workspace sa pouziva iba vtedy, ked Supabase tool nie je dostupny, chyba env/secret, alebo zapis zlyha.

Runtime path v kontajneri:

```text
/home/node/.openclaw/agent-workspaces/jakub-olsa/crm-v0
```

Host path:

```text
/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/agent-workspaces/jakub-olsa/crm-v0
```

Toto nie je web repo a nesmie sa commitovat do GitHubu.

## Ucel fallbacku

CRM V0 sluzi na to, aby Jakub mohol cez Telegram dalej pracovat aj vtedy, ked realny Supabase zapis nie je dostupny. Fallback vie drzat:

- nove kontakty,
- predajne alebo kupne leady,
- poznamky po telefonate,
- follow-up ulohy,
- zakladne property/listing drafty,
- admin pripady pre Adama.

Agent ma z kratkej Telegram spravy najprv skusit Supabase tool. Ak zlyha, vytvori strukturovany fallback zaznam a vrati Jakubovi kratke potvrdenie bez technickych detailov.

Technicke chyby, nepodarene vyhladavanie, path chyby alebo tool diagnostiku neposielaj Jakubovi. Zapis ich do `crm-v0/audit/` alebo admin case a Jakubovi vrat iba prakticky stav.

## Adresare

```text
crm-v0/
  contacts/
  leads/
  notes/
  tasks/
  properties/
  intake/
  audit/
```

## Format zaznamu

Pouzivaj Markdown subor s YAML-like front matter blokom. Nazov suboru nema obsahovat cele osobne udaje. Pouzi format:

```text
lead-YYYYMMDD-HHMMSS.md
contact-YYYYMMDD-HHMMSS.md
task-YYYYMMDD-HHMMSS.md
property-YYYYMMDD-HHMMSS.md
```

Minimalny lead:

```markdown
---
record_type: lead
status: new
source: telegram
created_at: 2026-06-06T00:00:00+01:00
owner: jakub-olsa
contact_name:
phone:
email:
intent:
property_type:
location:
budget:
time_horizon:
follow_up_at:
supabase_sync_status: pending
approval_required: false
---

## Raw input

...

## Summary

...

## Next action

...

## Missing data

...
```

## Telegram pravidla

Ked Jakub napise napr.:

```text
Pridaj klienta Novak, chce predat 3 izbovy byt v Ruzinove, volat zajtra.
```

Agent ma najprv pouzit Supabase tooly. Ak nie su dostupne, fallback:

1. vytvorit alebo doplnit lead v `crm-v0/leads/`,
2. vytvorit task v `crm-v0/tasks/`, ak je jasny follow-up,
3. ak chyba telefon alebo termin, spytat sa jednu kratku doplnujucu otazku,
4. odpovedat kratko:

```text
Zapísané.
Lead: Novák - predaj 3i byt, Ružinov
Follow-up: zajtra zavolať
Chýba: telefón
```

## Co agent nesmie v CRM V0

- mazat zaznamy,
- publikovat cokolvek na web,
- posielat klientovi spravu,
- tvrdit, ze data su v Supabase, ak su iba v `crm-v0`,
- zapisovat API tokeny, service role key alebo ine secrety.

## Sync do Supabase

Kazdy V0 zaznam ma mat:

```text
supabase_sync_status: pending
```

Po stabilnom Supabase runtime sa tieto zaznamy mozu migrovat alebo synchronizovat. Nikdy netvrd, ze fallback zaznam je v Supabase, kym nebol realne zapisany.

## GDPR/PII poznamka

CRM V0 obsahuje osobne udaje a bezi na Adamovom Macu v OpenClaw state. Pred ostrym pouzivanim s realnymi klientmi treba mat potvrdene:

- kto je GDPR prevadzkovatel,
- ci je Adam sprostredkovatel alebo interny/externy IT operator,
- legalny zaklad pre lead intake,
- retencne lehoty,
- spracovatelov a prenosy,
- pravidla vymazu a oprav.
