export const site = {
  brand: "Jakub Olša",
  role: "realitný maklér",
  locale: "sk-SK",
  cityLabel: "Slovensko",
  shortPromise: "Riadim predaj tak, aby sme z neho vyťažili maximum.",
  intro:
    "Nehnuteľnosť nie je len inzerát. Od prvého stretnutia nastavíme stratégiu, cenu, marketing a cieľ. Vy viete, čo sa deje, ja držím proces.",
  contact: {
    phone: "+421 944 844 489",
    email: "olsa@bosen.sk",
    instagram: "",
    instagramLabel: "Instagram doplniť",
  },
  lead: {
    responseLabel: "Ozvem sa vám s návrhom ďalšieho kroku.",
    endpoint: "",
    source: "jakub-olsa-web",
  },
  heroImage: "/images/jakub-portrait.png",
  handshakeImage: "/images/jakub-handshake.png",
  proofPoints: [
    "individuálny prístup",
    "jasný plán pred prvým inzerátom",
    "komunikácia od prvého hovoru po podpis",
  ],
  trackRecord: {
    eyebrow: "Výsledky a skúsenosť",
    title: "Skúsenosť z bankovníctva, výsledky z realít.",
    text:
      "Tri a pol roka ako osobný bankár vo VÚB Magnifica a rok a pol ako realitný maklér. Za posledných 12 mesiacov Jakub uzavrel 19 predajov nehnuteľností, z toho dva miliónové obchody.",
    stats: [
      {
        value: "19",
        label: "uzavretých predajov za posledných 12 mesiacov",
      },
      {
        value: "2",
        label: "miliónové obchody s náročným klientom",
      },
      {
        value: "5 rokov",
        label: "skúseností v obchode, bankovníctve a realitách",
      },
    ],
  },
  positioning: {
    title: "Väčšina maklérov čaká na klienta. Ja ho aktívne vytváram.",
    text:
      "Cez marketing, databázu a prácu s dopytom. Mojou úlohou nie je iba zverejniť ponuku, ale riadiť predaj tak, aby mal klient čo najlepší výsledok.",
  },
  services: [
    {
      title: "Predaj nehnuteľnosti",
      text: "Nastavíme stratégiu, cenu, marketing a cieľ. Jakub zabezpečí prezentáciu, obhliadky, vyjednávanie aj právny servis.",
    },
    {
      title: "Kúpa bývania",
      text: "Pomôžem vám čítať trh prakticky: čo dáva zmysel, kde sú riziká a kedy sa oplatí konať rýchlo.",
    },
    {
      title: "Prenájom",
      text: "Nastavíme ponuku, filtrujeme záujemcov a držíme proces tak, aby bol pre majiteľa aj nájomcu zrozumiteľný.",
    },
    {
      title: "Odhad a konzultácia",
      text: "Keď ešte neviete, či predávať alebo čakať, začneme krátkym rozhovorom a realistickým pohľadom na situáciu.",
    },
  ],
  process: [
    {
      step: "01",
      title: "Stratégia, cena a cieľ",
      text: "Najprv si ujasníme, čo má byť dobrý výsledok. Až potom riešime inzerciu, termíny a komunikáciu.",
    },
    {
      step: "02",
      title: "Marketing a dopyt",
      text: "Ponuka nesmie len čakať. Pracujem s prezentáciou, databázou, marketingom a kupujúcimi, ktorí dávajú zmysel.",
    },
    {
      step: "03",
      title: "Vyjednávanie a servis",
      text: "Držím obhliadky, komunikáciu, dohodu aj právny servis pokope. Vy sa nemusíte starať o nič.",
    },
  ],
  saleTime: {
    eyebrow: "Ako dlho trvá predaj?",
    title: "Niektoré nehnuteľnosti sa predajú za pár dní. Cieľom však nie je rýchlosť za každú cenu.",
    text:
      "Ak je správne nastavená cena a marketing, výsledok sa často dá dosiahnuť v horizonte niekoľkých týždňov. Priorita je najlepší možný výsledok pre klienta, nie iba najrýchlejší podpis.",
  },
  listingsIntro: {
    eyebrow: "Nehnuteľnosti",
    title: "Aktuálne ponuky a predané byty na jednom mieste.",
    text:
      "Každá nehnuteľnosť má vlastnú detailnú stránku s fotkami, parametrami, textom a jasnou výzvou na kontakt. Aktuálne ponuky aj predané byty tak ostávajú priamo na Jakubovom webe.",
  },
  listings: [
    {
      slug: "4-izbovy-byt-drotarska-cesta",
      group: "available",
      status: "V ponuke",
      title: "4-izbový byt s predzáhradkou",
      place: "Drotárska cesta, Bratislava-Staré Mesto",
      price: "1 600 €/mesiac + energie",
      image: "/images/drotarska-01.jpg",
      gallery: ["/images/drotarska-01.jpg", "/images/drotarska-02.jpg", "/images/drotarska-03.jpg"],
      note: "Zariadený byt s podlahovou plochou 90 m², predzáhradkou a parkovacím miestom.",
      summary:
        "Aktuálna ukážka detailu ponuky. Pred verejným spustením vymeníme texty a fotografie za Jakubove vlastné podklady.",
      specs: [
        { label: "Typ", value: "4-izbový byt" },
        { label: "Výmera", value: "90 m² + predzáhradka" },
        { label: "Lokalita", value: "Bratislava-Staré Mesto" },
        { label: "Stav", value: "zariadený" },
      ],
      highlights: ["predzáhradka", "parkovacie miesto", "dobrá dostupnosť", "zariadený interiér"],
      detail:
        "Detail ponuky bude fungovať ako samostatná stránka: galéria, parametre, popis, kontakt a ďalší krok. Vďaka tomu už netreba posielať človeka na externý portál.",
      href: "/nehnutelnosti/4-izbovy-byt-drotarska-cesta/",
      cta: "Detail ponuky",
    },
    {
      slug: "referencny-predaj-stare-mesto",
      group: "sold",
      status: "Predané",
      title: "Referenčný predaj v Starom Meste",
      place: "Bratislava-Staré Mesto",
      price: "predané",
      image: "/images/drotarska-02.jpg",
      gallery: ["/images/drotarska-02.jpg", "/images/drotarska-01.jpg"],
      note: "Ukážka formátu pre predaný byt. Konkrétne údaje, cenu a fotky doplníme po dodaní Jakubom.",
      summary:
        "Predané nehnuteľnosti budú slúžiť ako dôkaz procesu: čo sa riešilo, ako bol nastavený marketing a aký bol výsledok.",
      specs: [
        { label: "Typ", value: "byt" },
        { label: "Lokalita", value: "Bratislava-Staré Mesto" },
        { label: "Výsledok", value: "predané" },
        { label: "Dáta", value: "doplníme" },
      ],
      highlights: ["referenčný predaj", "marketing", "vyjednávanie", "práca s dopytom"],
      detail:
        "Toto je pripravený tvar referencie. Po dodaní reálnych podkladov tu môže byť anonymizovaný príbeh predaja alebo konkrétny predaný byt s fotkami a výsledkom.",
      href: "/nehnutelnosti/referencny-predaj-stare-mesto/",
      cta: "Pozrieť predaj",
    },
    {
      slug: "milionovy-obchod-referencia",
      group: "sold",
      status: "Predané",
      title: "Miliónový obchod",
      place: "Bratislava a okolie",
      price: "predané",
      image: "/images/drotarska-03.jpg",
      gallery: ["/images/drotarska-03.jpg", "/images/drotarska-02.jpg"],
      note: "Miesto pre jeden z Jakubových miliónových obchodov. Detaily doplníme po schválení rozsahu zverejnenia.",
      summary:
        "Niektoré predaje je vhodné ukázať ako case study bez citlivých údajov. Dôležitý je kontext, stratégia a výsledok.",
      specs: [
        { label: "Typ", value: "prémiová nehnuteľnosť" },
        { label: "Lokalita", value: "doplníme" },
        { label: "Výsledok", value: "miliónový obchod" },
        { label: "Dáta", value: "po schválení" },
      ],
      highlights: ["náročný klient", "prémiový segment", "vyjednávanie", "diskrétny predaj"],
      detail:
        "Táto detailná stránka je pripravená pre case study. Môže vysvetliť, ako sa nastavila stratégia, ako prebiehali rokovania a prečo bol výsledok silný.",
      href: "/nehnutelnosti/milionovy-obchod-referencia/",
      cta: "Pozrieť predaj",
    },
  ],
  principles: [
    {
      title: "Nehnuteľnosť nepredávam len ako inzerát",
      text: "Riadim celý proces predaja: prípravu, cenu, prezentáciu, obhliadky, vyjednávanie a ďalší krok.",
    },
    {
      title: "Dopyt sa dá vytvárať",
      text: "Dobrý maklér nečaká len na reakciu z portálu. Pracuje s databázou, marketingom a konkrétnymi kupujúcimi.",
    },
    {
      title: "Klient má vedieť, čo sa deje",
      text: "Od prvého stretnutia má byť jasné, čo robíme, prečo to robíme a čo bude nasledovať.",
    },
  ],
};

export const formOptions = {
  goals: ["Predávam", "Kupujem", "Prenajímam", "Chcem odhad", "Ešte neviem"],
  contactTimes: ["Dopoludnia", "Popoludní", "Večer", "Čo najskôr"],
  contactMethods: ["Telefonát", "SMS", "Email", "WhatsApp"],
};
