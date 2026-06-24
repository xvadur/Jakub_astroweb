# Email confirmation checkpoint - 2026-06-24

Ucel: rozhodnut najjednoduchsi emailovy setup pre rezervacie na `jakubolsa.sk`.

## Dve rozdielne veci

### 1. Prijimanie a forward emailov

Toto riesi Cloudflare Email Routing.

Priklad:

```text
rezervacie@jakubolsa.sk -> olsa@bosen.sk
kontakt@jakubolsa.sk -> olsa@bosen.sk
info@jakubolsa.sk -> olsa@bosen.sk
```

Toto nie je plnohodnotna emailova schranka. Je to alias / forwarding pravidlo na domene.

Aktualny stav:

- `jakubolsa.sk` je domena pod nasou kontrolou v Cloudflare.
- Cloudflare Email Routing je pripravene pre domenu.
- Destination `olsa@bosen.sk` je pridana, ale treba potvrdit, ze je overena.
- Alias `rezervacie@jakubolsa.sk` nebude stat samostatny poplatok, ak sa robi cez Cloudflare Email Routing.
- Netreba kupovat Google Workspace ani novu mailbox sluzbu len preto, aby existoval alias `rezervacie@jakubolsa.sk`.

Cloudflare uvadza, ze Email Routing / inbound forwarding je free:

```text
https://www.cloudflare.com/products/email-routing/
https://developers.cloudflare.com/email-service/platform/pricing/
```

Poznamka: Cloudflare Email Routing prijima a preposiela emaily. Neriesi normalne odosielanie klientom z aplikacie.

### 2. Odosielanie potvrdzovacich emailov klientovi

Toto musi riesit transactional email provider alebo Cloudflare Email Sending.

Najjednoduchsi navrh pre V1:

```text
Cloudflare Worker /api/book
  -> Resend API
  -> klient dostane potvrdenie rezervacie
```

Resend ma free plan:

```text
0 USD / mesiac
3 000 emailov / mesiac
100 emailov / den
1 domena
```

Oficialne zdroje:

```text
https://resend.com/pricing
https://resend.com/docs/knowledge-base/account-quotas-and-limits
```

Pre Jakubov booking je free tier dostatocny. Ak by web generoval viac ako 100 potvrdzovacich/transactional emailov denne, uz by to bol dobry problem a riesil by sa plateny plan.

## Co bude stat peniaze

### `rezervacie@jakubolsa.sk`

Samotna adresa ako Cloudflare forwarding alias by nemala stat nic.

Nevytvara sa nova inbox schranka. Je to iba pravidlo:

```text
email pride na rezervacie@jakubolsa.sk
Cloudflare ho preposle na potvrdeny destination mailbox
```

Ak by Jakub chcel plnohodnotnu schranku s loginom, webmailom, IMAP/SMTP a samostatnym mailboxom, potom by bolo treba Google Workspace, Microsoft 365, Websupport mailbox alebo inu email hosting sluzbu. To je iny produkt nez Cloudflare forwarding.

### Potvrdzovacie emaily z webu

Na zaciatku cez Resend free plan:

```text
0 USD / mesiac
```

Potrebujeme vsak:

- Resend ucet,
- overit domenu `jakubolsa.sk` alebo vhodnu subdomenu v Resende,
- nastavit DNS zaznamy pre SPF/DKIM/DMARC podla Resendu,
- ulozit `RESEND_API_KEY` ako Cloudflare secret,
- nastavit `RESEND_FROM_EMAIL` a `BOOKING_REPLY_TO_EMAIL` vo Worker environment.

## Odporucany V1 flow

```text
1. Klient vyplni /rezervacia/
2. Worker prijme /api/book
3. Worker vytvori calendar/booking stav, ak su secrets
4. Worker posle Telegram/internal alert
5. Worker posle klientovi potvrdenie cez Resend
6. Ak email zlyha, booking nesmie spadnut; chyba ide do internych logov/notifikacie
```

## Implementacny stav

Worker ma pripravenu Resend podporu pre potvrdzovacie emaily.

Aktivuje sa iba ked je nastavene:

```text
RESEND_API_KEY
RESEND_FROM_EMAIL
BOOKING_REPLY_TO_EMAIL
```

Ak `RESEND_API_KEY` chyba, `/api/book` vrati:

```json
{
  "emailStatus": "skipped"
}
```

Ak je `RESEND_API_KEY` nastavene a payload obsahuje platny email, Worker email zaradi cez `ctx.waitUntil` a API vrati:

```json
{
  "emailStatus": "queued"
}
```

Email je neblokujuci. Zlyhanie Resendu nesmie pokazit prijatu rezervaciu.

## Minimalny email klientovi

Predmet:

```text
Rezervacia konzultacie - Jakub Olsa
```

Telo:

```text
Dobrý deň,

ďakujem za rezerváciu konzultácie.

Termín: <datum> o <cas>
Téma: <zamer>
Lokalita: <lokalita>

Ak bude potrebné termín upraviť, odpíšte na tento email alebo zavolajte.

Jakub Olša
realitný maklér | BOSEN Group
+421 944 844 489
```

## Rozhodnutie

Pre piatkovy demo sprint:

- forwarding alias `rezervacie@jakubolsa.sk` riesit cez Cloudflare Email Routing,
- potvrdzovacie emaily klientom riesit cez Resend free plan,
- neriesit n8n,
- neposielat klientom emaily cez Gmail OAuth vo V1,
- vsetky API kluce iba ako Cloudflare secrets, nikdy nie v repozitari.
