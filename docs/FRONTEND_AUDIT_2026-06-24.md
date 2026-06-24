# Frontend audit - 2026-06-24

Ucel: auditovat aktualny web pred dizajn/polish fazou a oddelit deploy blockery od vizualnych polish uloh.

Screenshot evidence:

```text
/tmp/jakub-frontend-audit-2026-06-24/
```

Zachytene obrazovky:

```text
01-home-desktop.png
02-home-mobile.png
03-listing-detail-desktop.png
04-listing-detail-mobile.png
05-wizard-step1-desktop.png
06-wizard-step2-desktop.png
07-wizard-step3-desktop.png
08-wizard-step4-desktop.png
09-wizard-confirmation-desktop.png
09c-wizard-confirmation-fixed-rebuilt-desktop.png
10-wizard-step1-mobile.png
```

## Zaver

Frontend je deploy-ready z hladiska hlavnej funkcnosti:

- homepage sa nacita a prvy viewport jasne komunikuje Jakuba + BOSEN,
- detail nehnutelnosti funguje na desktope aj mobile,
- wizard prejde od kroku 1 po confirmation,
- Google Places vyber adresy funguje,
- `/api/availability` a `/api/book` odpovedaju,
- confirmation stav bol po audite opraveny.

Nie je to este finalny polish. Najviac prace ostava vo vizualnom zhusteni wizardu, mobilnom detaili nehnutelnosti a kontraste drobnych formularovych textov.

## Najdene a opravene

### Wizard confirmation stale ukazoval stare akcie

Evidence:

```text
09-wizard-confirmation-desktop.png
```

Po uspesnom bookingu ostavali viditelne stare ovladacie prvky:

```text
Späť
Odosielam...
4 / 4
progress bar
```

Pricina:

```text
.wizard-actions a .wizard-progress mali vlastne display pravidla, ktore prebili hidden atribut.
```

Oprava:

```css
.wizard-actions[hidden],
.wizard-progress[hidden] {
  display: none;
}
```

Overenie:

```text
09c-wizard-confirmation-fixed-rebuilt-desktop.png
```

Po novom builde je viditelne iba potvrdenie a CTA `Späť na úvod`.

## UX/design findings

### 1. Homepage desktop

Evidence:

```text
01-home-desktop.png
```

Stav: zdrave.

- Silny prvy signal: Jakub, meno, portrét, BOSEN.
- CTA je nad zlomom.
- Layout je pouzitelny pre demo aj staging.

Polish:

- Farebny smer je uz pouzitelny, ale pred finalom treba zjednotit hnedo-zlatu paletu s BOSEN referenciou.

### 2. Homepage mobile

Evidence:

```text
02-home-mobile.png
```

Stav: pouzitelne.

- Text je citatelny.
- CTA su dostupne.
- Portrét sa ukaze pod textom.

Polish:

- Header je hutny: logo, BOSEN a CTA su v jednej hrane. Nie je to blocker, ale pri mensich zariadeniach moze posobit natlacene.

### 3. Listing detail desktop

Evidence:

```text
03-listing-detail-desktop.png
```

Stav: zdrave.

- Fotka a hlavne udaje su viditelne.
- Cena/lokalita/CTA su jasne.

Polish:

- Svetly detail ma iny charakter ako tmavy homepage/wizard. Nie je to chyba, ale pri dizajne treba rozhodnut, ci ma detail ostat editorial-svetly alebo sa viac zladit s hlavnou paletou.

### 4. Listing detail mobile

Evidence:

```text
04-listing-detail-mobile.png
```

Stav: pouzitelne, ale kandidat na polish.

- Dlhe serif H1 zaberie vacsinu prvej obrazovky.
- Primarna fotka sa odsúva nizsie, co oslabuje realitny proof.

Odporucanie:

- Pri polishi zmensit mobilny H1 na detailoch alebo posunut prvu fotku vyssie.

### 5. Wizard desktop

Evidence:

```text
05-wizard-step1-desktop.png
06-wizard-step2-desktop.png
07-wizard-step3-desktop.png
08-wizard-step4-desktop.png
```

Stav: funkcne zdrave.

- Copy je kratke a normalne formularove.
- Krok 1 a 2 su jasne.
- Krok 4 je najcistejsi.

Polish:

- Krok 3 ma vela casovych slotov. Na 1440x1000 viewporte spodne akcie/progress nie su hned viditelne.
- Footer pri niektorych krokoch presvita do viewportu a posobi ako odrezany spodok.
- Placeholdery a drobne labely maju nizsi kontrast.

Odporucanie:

- Pri polishi zvazit kompaktnejsi grid terminov alebo sticky actions bar.
- Zjednotit vertikalne medzery tak, aby wizard karta nekolidovala s footerom.

### 6. Wizard mobile

Evidence:

```text
10-wizard-step1-mobile.png
```

Stav: pouzitelne.

- Prvy krok je citatelny.
- Choice buttony su dostatocne velke.

Polish:

- Hero nad wizard kartou je na mobile stale vysoke. Ak chceme rychlejsi formularovy pocit, zmensit intro cast na mobiloch.

## Accessibility risks zo screenshotov

Toto nie je plny accessibility audit, iba rizika viditelne zo screenshotov:

- Nizsi kontrast pri niektorych labeloch, placeholderoch a sekundarnych textoch na tmavom pozadi.
- Niektore velke serif nadpisy su vizualne silne, ale na mobile mozu zhorsovat rychle skenovanie.
- Slot grid v kroku 3 vyzaduje scroll; treba otestovat keyboard/focus order pri realnom accessibility pass.

## Dalsie odporucane kroky

Pred dizajn/polish:

1. Nechat aktualny funkcny stav ako baseline.
2. Nastavit externe env/secrets a spravit staging smoke.
3. Potom robit dizajn/polish cielene:
   - mobilny header,
   - listing detail mobile H1/fotka,
   - wizard step 3 density,
   - kontrasty formularov,
   - zjednotenie svetlych detailov s tmavym hlavnym webom.
