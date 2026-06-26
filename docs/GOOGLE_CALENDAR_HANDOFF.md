# Google Calendar OAuth handoff

Posledná aktualizácia: 26. jún 2026

## Cieľ

Tento dokument drží prevádzkový snapshot pre napojenie Jakubovho Google Calendaru na OpenClaw/gog a neskôr na web/lead workflow.

Do GitHubu patria iba tieto inštrukcie a názvy klientov. OAuth client secret, refresh tokeny, Telegram tokeny a lokálne credentials súbory nepatria do repozitára.

## Aktuálny stav

- Google účet, ktorý autorizoval Calendar: `jakubolsa90@gmail.com`.
- OAuth client typ: Desktop app.
- Lokálny `gog` OAuth client name: `jakub-calendar`.
- OAuth client credentials boli importnuté do `gog` na tomto stroji.
- Jakubov Google účet prešiel OAuth consent flow.
- Refresh token pre `jakubolsa90@gmail.com` je uložený mimo repozitára v `.secrets/` a v Cloudflare Worker secrets.
- Calendar ID je samostatný Google Calendar `Konzultácie`.
- `jakubastroweb-staging` aj `jakubastroweb` majú nastavené Google Calendar secrets.
- Read-only smoke overil, že `/api/availability` vracia `mode: "google"` na stagingu aj produkcii.

## Lokálne súbory mimo Git

Na pracovnom MacBooku sú credentials uložené mimo repozitára:

```text
/Users/_xvadur/Jakub_astroweb/.secrets/google-oauth-client-id.txt
/Users/_xvadur/Jakub_astroweb/.secrets/google-oauth-client-secret.txt
/Users/_xvadur/Jakub_astroweb/.secrets/google-oauth-desktop-client.json
/Users/_xvadur/Jakub_astroweb/.secrets/jakub-calendar-refresh-token.json
/Users/_xvadur/Jakub_astroweb/.secrets/gog-keyring-password
```

`gog` má importovaný klientsky credentials súbor:

```text
~/Library/Application Support/gogcli/credentials-jakub-calendar.json
```

Tieto súbory sa nepridávajú do GitHubu. `.secrets/` je v `.gitignore`.

## Lokálny transfer balík

Na pracovnom MacBooku je pripravený lokálny balík:

```text
/Users/_xvadur/Jakub_astroweb/.secrets/jakub-mac-transfer-2026-06-05.tgz
```

Obsahuje:

- `project-secrets/google-oauth-desktop-client.json`
- `gogcli/credentials-jakub-calendar.json`
- `openclaw/credentials/jakub-telegram-bot-token`
- `README_TRANSFER.txt`

Balík obsahuje tajné hodnoty. Nepatrí do GitHubu ani do bežného chatu/emailu. Prenášať ho iba cez AirDrop, SSH/scp, šifrovaný disk image alebo správcu hesiel. Po importe na cieľový Mac ho ideálne zmazať z dočasných umiestnení.

## Prenos na cieľový Mac

Najčistejší prenos je preniesť iba Desktop OAuth JSON a token vytvoriť až na stroji, kde bude Calendar integrácia reálne bežať.

1. Na cieľovom Macu klonovať repo:

```bash
git clone https://github.com/xvadur/Jakub_astroweb.git
cd Jakub_astroweb
```

2. Preniesť `google-oauth-desktop-client.json` bezpečne mimo GitHubu.

Príklady bezpečného prenosu:

```bash
scp .secrets/google-oauth-desktop-client.json user@target-mac:~/Desktop/google-oauth-desktop-client.json
```

alebo AirDrop/1Password/šifrovaný disk image. Neposielať cez GitHub, issue, Slack screenshot ani README.

3. Na cieľovom Macu uložiť súbor mimo gitu:

```bash
mkdir -p .secrets
chmod 700 .secrets
mv ~/Desktop/google-oauth-desktop-client.json .secrets/google-oauth-desktop-client.json
chmod 600 .secrets/google-oauth-desktop-client.json
```

4. Importnúť OAuth client do `gog`:

```bash
gog auth credentials set .secrets/google-oauth-desktop-client.json --client=jakub-calendar
```

5. Spustiť Jakubov OAuth consent:

```bash
gog auth add jakubolsa90@gmail.com --client=jakub-calendar --services=calendar --force-consent --manual --timeout=15m
```

Otvoriť vygenerovaný Google URL v private/incognito okne, prihlásiť sa ako `jakubolsa90@gmail.com`, povoliť Calendar a po redirecte na `127.0.0.1` skopírovať celý URL z adresného riadku späť do terminálu.

Ak treba dvojkrokový remote flow:

```bash
gog auth add jakubolsa90@gmail.com --client=jakub-calendar --services=calendar --force-consent --remote --step=1
gog auth add jakubolsa90@gmail.com --client=jakub-calendar --services=calendar --remote --step=2 --auth-url '<redirect-url>'
```

Nepoužívať staré OAuth linky zo zápiskov. OAuth `state` a lokálny port sú krátkodobé a musia sa generovať čerstvo.

## Overenie po autorizácii

```bash
gog auth list --client=jakub-calendar
gog calendar calendars --client=jakub-calendar --account=jakubolsa90@gmail.com
gog calendar events primary --client=jakub-calendar --account=jakubolsa90@gmail.com --days=7 --max=5
```

Úspešný stav:

- `gog auth list --client=jakub-calendar` ukáže `jakubolsa90@gmail.com`.
- `gog calendar calendars` vypíše Jakubove kalendáre vrátane `Konzultácie`.
- `gog calendar events primary` vráti udalosti alebo prázdny zoznam bez auth chyby.

Ak je `gog` nastavený na file keyring backend, pred overením nastav:

```bash
export GOG_KEYRING_PASSWORD="$(cat .secrets/gog-keyring-password)"
```

## Produkčné rozhodnutia

- Google Cloud OAuth consent screen má byť v režime Production, nie Testing, inak refresh token môže expirovať po testovacom období.
- Pre web V1 je najjednoduchší verejný booking stále Google Calendar appointment schedule link cez `PUBLIC_BOOKING_URL`.
- Priame zapisovanie udalostí cez `gog calendar create` zapnúť až po potvrdení, ktorý kalendár sa má používať.
- Bez výslovného potvrdenia neposielať klientom pozvánky ani neupravovať existujúce udalosti.
