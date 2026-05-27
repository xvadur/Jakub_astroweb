export const site = {
  brand: "Jakub Olša",
  role: "realitný maklér",
  locale: "sk-SK",
  cityLabel: "Slovensko",
  shortPromise: "Predaj, kúpu aj prenájom držím pokope.",
  intro:
    "Hral som hokej na profesionálnej úrovni, potom som pracoval s klientmi vo financiách a dnes tieto skúsenosti používam v realitách. Pri predaji alebo kúpe nejde len o inzerát. Ide o prípravu, čísla, komunikáciu a človeka, ktorý proces dotiahne.",
  contact: {
    phone: "+421 944 844 489",
    whatsapp: "+421 944 844 489",
    telegram: "",
    email: "olsa@bosen.sk",
    instagram: "https://www.instagram.com/jakubolsa_reality?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    instagramLabel: "@jakubolsa_reality",
  },
  bookingUrl: import.meta.env.PUBLIC_BOOKING_URL ?? "",
  logoImage: "/images/brand/jakub-logo-mark-transparent.png",
  heroImage: "/images/brand/jakub-official-clean.jpg",
  cityPanoramaImage: "/images/brand/bratislava-panorama.jpg",
  posterImage: "/images/brand/jakub-poster.jpg",
  handshakeImage: "/images/jakub-handshake.png",
  proofPoints: [
    "disciplína z hokeja, pokoj pri tlaku",
    "presnosť z bankovníctva a práca s číslami",
    "osobná komunikácia od prvého hovoru po podpis",
  ],
  trackRecord: {
    eyebrow: "Skúsenosť bez pózy",
    title: "Z hokeja cez banku do realít. Stále rozhoduje príprava, komunikácia a dôvera.",
    text:
      "V hokeji som sa naučil fungovať pod tlakom, vo VÚB Magnifica pracovať s klientmi a číslami. Pri nehnuteľnostiach to dávam dokopy prakticky: dobrá príprava, realistická cena, jasná komunikácia a proces dotiahnutý do podpisu.",
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
    title: "Dobrý predaj nie je čakanie na portáli. Je to práca s ľuďmi, cenou a načasovaním.",
    text:
      "Pripravím prezentáciu, nastavím cenu a aktívne pracujem s dopytom. Komunikácia má byť jednoduchá: keď niečo viem, poviem to; keď treba rozhodnúť, pomenujem možnosti.",
  },
  services: [
    {
      title: "Predaj nehnuteľnosti",
      text: "Ak chcete predať byt, dom alebo investičnú nehnuteľnosť, pripravím cenu, prezentáciu, marketing, obhliadky, vyjednávanie aj právny servis.",
    },
    {
      title: "Kúpa bývania",
      text: "Pri kúpe vám pomôžem čítať trh prakticky: čo dáva zmysel, kde sú riziká, čo si preveriť a kedy sa oplatí konať rýchlo.",
    },
    {
      title: "Prenájom",
      text: "Pri prenájme nastavím ponuku, prefiltrujem záujemcov a podržím proces tak, aby bol pre majiteľa aj nájomcu zrozumiteľný.",
    },
    {
      title: "Odhad a konzultácia",
      text: "Ak ešte neviete, či predávať, čakať alebo len preveriť cenu, začnem krátkym rozhovorom a realistickým pohľadom na vašu situáciu.",
    },
  ],
  process: [
    {
      step: "01",
      title: "Stratégia, cena a cieľ",
      text: "Najprv si s vami ujasním, čo má byť dobrý výsledok. Až potom riešim inzerciu, termíny a marketing.",
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
    title: "Rýchlosť je dobrá. Dôležitejší je však výsledok.",
    text:
      "Každá nehnuteľnosť je iná, ale ak je správne nastavená cena a marketing, výsledok sa dá dosiahnuť v horizonte niekoľkých týždňov. Mojím cieľom je najlepší možný výsledok pre klienta.",
  },
  listingsIntro: {
    eyebrow: "Nehnuteľnosti",
    title: "Aktuálne ponuky a predaje, ktoré ukazujú môj spôsob práce.",
    text:
      "Pozrite si aktuálne nehnuteľnosti v ponuke a referenčné predaje, pri ktorých rozhodovalo správne nastavenie ceny, marketingu, vyjednávania a práce s dopytom.",
  },
  listings: [
    {
      slug: "byt-mamateyova",
      group: "available",
      status: "V ponuke",
      title: "Byt na Mamateyovej ulici",
      place: "Mamateyova ulica, Bratislava",
      price: "cena na vyžiadanie",
      image: "/images/listings/mamateyova-byt/01-obyvacka.jpg",
      gallery: [
        "/images/listings/mamateyova-byt/01-obyvacka.jpg",
        "/images/listings/mamateyova-byt/02-izba.jpg",
        "/images/listings/mamateyova-byt/03-kuchyna.jpg",
        "/images/listings/mamateyova-byt/04-spalna.jpg",
        "/images/listings/mamateyova-byt/05-kupelna.jpg",
      ],
      note: "Byt s priestrannou dennou časťou a klasickým zariadením. Detaily ponuky doplním po potvrdení parametrov.",
      summary:
        "Aktuálna ponuka bytu na Mamateyovej ulici v Bratislave. Detaily, cenu a obhliadku riešim individuálne podľa záujmu.",
      specs: [
        { label: "Typ", value: "byt" },
        { label: "Lokalita", value: "Mamateyova ulica, Bratislava" },
        { label: "Cena", value: "na vyžiadanie" },
        { label: "Status", value: "v ponuke" },
      ],
      highlights: ["Mamateyova ulica", "byt", "Bratislava", "cena na vyžiadanie"],
      detail:
        "Ponuka je pripravená ako aktuálny inzerát s fotogalériou. Presné parametre, cenu a možnosti obhliadky odporúčam riešiť priamo v krátkom telefonáte alebo emaile, aby ste dostali informácie podľa vašej situácie.",
      href: "/nehnutelnosti/byt-mamateyova/",
      cta: "Pozrieť ponuku",
    },
    {
      slug: "byt-martincekova",
      group: "available",
      status: "V ponuke",
      title: "Byt na Martinčekovej ulici",
      place: "Martinčekova ulica, Bratislava",
      price: "cena na vyžiadanie",
      image: "/images/listings/martincekova-byt/01-obyvacka.jpg",
      gallery: [
        "/images/listings/martincekova-byt/01-obyvacka.jpg",
        "/images/listings/martincekova-byt/02-izba.jpg",
        "/images/listings/martincekova-byt/03-kuchyna.jpg",
        "/images/listings/martincekova-byt/04-spalna.jpg",
        "/images/listings/martincekova-byt/05-kupelna.jpg",
      ],
      note: "Svetlý byt s čistým interiérom a príjemnou prezentáciou. Detaily ponuky doplním po potvrdení parametrov.",
      summary:
        "Aktuálna ponuka bytu na Martinčekovej ulici v Bratislave. Detaily, cenu a obhliadku riešim individuálne podľa záujmu.",
      specs: [
        { label: "Typ", value: "byt" },
        { label: "Lokalita", value: "Martinčekova ulica, Bratislava" },
        { label: "Cena", value: "na vyžiadanie" },
        { label: "Status", value: "v ponuke" },
      ],
      highlights: ["Martinčekova ulica", "byt", "Bratislava", "cena na vyžiadanie"],
      detail:
        "Ponuka je pripravená ako aktuálny inzerát s fotogalériou. Presné parametre, cenu a možnosti obhliadky odporúčam riešiť priamo v krátkom telefonáte alebo emaile, aby ste dostali informácie podľa vašej situácie.",
      href: "/nehnutelnosti/byt-martincekova/",
      cta: "Pozrieť ponuku",
    },
    {
      slug: "byt-salviova",
      group: "available",
      status: "V ponuke",
      title: "Byt na Šalviovej ulici",
      place: "Šalviová ulica, Bratislava",
      price: "cena na vyžiadanie",
      image: "/images/listings/salviova-byt/01-obyvacka.jpg",
      gallery: [
        "/images/listings/salviova-byt/01-obyvacka.jpg",
        "/images/listings/salviova-byt/02-izba.jpg",
        "/images/listings/salviova-byt/03-kuchyna.jpg",
        "/images/listings/salviova-byt/04-spalna.jpg",
      ],
      note: "Byt so svetlým interiérom a upravenou dennou časťou. Detaily ponuky doplním po potvrdení parametrov.",
      summary:
        "Aktuálna ponuka bytu na Šalviovej ulici v Bratislave. Detaily, cenu a obhliadku riešim individuálne podľa záujmu.",
      specs: [
        { label: "Typ", value: "byt" },
        { label: "Lokalita", value: "Šalviová ulica, Bratislava" },
        { label: "Cena", value: "na vyžiadanie" },
        { label: "Status", value: "v ponuke" },
      ],
      highlights: ["Šalviová ulica", "byt", "Bratislava", "cena na vyžiadanie"],
      detail:
        "Ponuka je pripravená ako aktuálny inzerát s fotogalériou. Presné parametre, cenu a možnosti obhliadky odporúčam riešiť priamo v krátkom telefonáte alebo emaile, aby ste dostali informácie podľa vašej situácie.",
      href: "/nehnutelnosti/byt-salviova/",
      cta: "Pozrieť ponuku",
    },
    {
      slug: "polyfunkcny-objekt-orenburska",
      group: "sold",
      status: "Predané",
      title: "Polyfunkčný objekt na Orenburskej ulici",
      place: "Orenburská ulica, Podunajské Biskupice",
      price: "predané za 810 000 €",
      image: "/images/listings/orenburska-polyfunkcny-objekt/01-exterier.jpg",
      gallery: [
        "/images/listings/orenburska-polyfunkcny-objekt/01-exterier.jpg",
        "/images/listings/orenburska-polyfunkcny-objekt/02-letecky-pohlad.jpg",
        "/images/listings/orenburska-polyfunkcny-objekt/03-interier.jpg",
        "/images/listings/orenburska-polyfunkcny-objekt/04-hala.jpg",
        "/images/listings/orenburska-polyfunkcny-objekt/05-kuchyna.jpg",
      ],
      note: "Veľký objekt s jasným komerčným potenciálom. Predaj sa postavil na využití pre firmu, nie iba na parametroch budovy.",
      summary:
        "Predaj polyfunkčného objektu za 810 000 €. Nehnuteľnosť sa od začiatku komunikovala ako priestor pre rodinné alebo firemné sídlo.",
      specs: [
        { label: "Typ", value: "polyfunkčný objekt" },
        { label: "Výmera", value: "približne 1 000 m²" },
        { label: "Lokalita", value: "Podunajské Biskupice" },
        { label: "Výsledok", value: "predané za 810 000 €" },
        { label: "Využitie", value: "firemné sídlo" },
      ],
      highlights: ["firemné sídlo", "približne 1 000 m²", "polyfunkčné využitie", "výsledok 810 000 €"],
      detail:
        "Pri tomto predaji bolo dôležité nepôsobiť len ako ďalší veľký dom v ponuke. Objekt mal silný potenciál ako reprezentatívne firemné zázemie, preto bolo potrebné pomenovať využitie, kupujúceho a hodnotu širšie než iba cez metre štvorcové. Predaj sa napokon uzavrel práve na firemné účely.",
      href: "/nehnutelnosti/polyfunkcny-objekt-orenburska/",
      cta: "Pozrieť predaj",
    },
    {
      slug: "4-izbovy-byt-skalicka-cesta",
      group: "sold",
      status: "Predané",
      title: "4-izbový byt na Skalickej ceste",
      place: "Skalická cesta, Bratislava",
      price: "predané za 650 000 €",
      image: "/images/listings/skalicka-cesta-4-izbovy-byt/01-obyvacka.jpg",
      gallery: [
        "/images/listings/skalicka-cesta-4-izbovy-byt/01-obyvacka.jpg",
        "/images/listings/skalicka-cesta-4-izbovy-byt/02-terasa.jpg",
        "/images/listings/skalicka-cesta-4-izbovy-byt/03-denna-zona.jpg",
        "/images/listings/skalicka-cesta-4-izbovy-byt/04-spalna.jpg",
        "/images/listings/skalicka-cesta-4-izbovy-byt/05-obyvacka-detail.jpg",
      ],
      note: "Prémiový byt s veľkou výmerou a silnými parametrami. Dôležité bolo rýchlo ukázať, pre koho má takýto byt najväčší zmysel.",
      summary:
        "Predaj 4-izbového bytu za 650 000 € za rekordných 8 dní. Rozhodovali výmera, dve terasy a presne nastavená prezentácia.",
      specs: [
        { label: "Typ", value: "4-izbový byt" },
        { label: "Výmera", value: "156 m²" },
        { label: "Exteriér", value: "2 terasy" },
        { label: "Kúpeľne", value: "3 kúpeľne" },
        { label: "Výsledok", value: "predané za 8 dní" },
      ],
      highlights: ["156 m²", "2 terasy", "3 kúpeľne", "výsledok 650 000 €", "predané za 8 dní"],
      detail:
        "Pri tejto nehnuteľnosti bolo potrebné okamžite zdôrazniť, že nejde o bežný 4-izbový byt. Výmera 156 m², dve terasy a tri kúpeľne vytvárali silný argument pre konkrétny typ kupujúceho. Po správnom nastavení prezentácie a ceny sa predaj uzavrel za 8 dní.",
      href: "/nehnutelnosti/4-izbovy-byt-skalicka-cesta/",
      cta: "Pozrieť predaj",
    },
    {
      slug: "3-izbovy-byt-luxusna-rekonstrukcia",
      group: "sold",
      status: "Predané",
      title: "3-izbový byt po luxusnej rekonštrukcii",
      place: "Bratislava",
      price: "predané za 259 500 €",
      image: "/images/listings/luxusna-rekonstrukcia-3-izbovy-byt/01-obyvacka.jpg",
      gallery: [
        "/images/listings/luxusna-rekonstrukcia-3-izbovy-byt/01-obyvacka.jpg",
        "/images/listings/luxusna-rekonstrukcia-3-izbovy-byt/02-spalna.jpg",
        "/images/listings/luxusna-rekonstrukcia-3-izbovy-byt/03-denna-zona.jpg",
        "/images/listings/luxusna-rekonstrukcia-3-izbovy-byt/04-jedalen.jpg",
        "/images/listings/luxusna-rekonstrukcia-3-izbovy-byt/05-kuchyna.jpg",
      ],
      note: "Byt po výraznej rekonštrukcii, kde bolo potrebné predať kvalitu prevedenia a pocit z interiéru, nie len dispozíciu.",
      summary:
        "Predaj 3-izbového bytu za 259 500 €. Hlavnou hodnotou bola kvalitná rekonštrukcia a čistý vizuálny dojem.",
      specs: [
        { label: "Typ", value: "3-izbový byt" },
        { label: "Stav", value: "luxusná rekonštrukcia" },
        { label: "Lokalita", value: "Bratislava" },
        { label: "Výsledok", value: "predané za 259 500 €" },
      ],
      highlights: ["3-izbový byt", "luxusná rekonštrukcia", "kvalitná prezentácia", "výsledok 259 500 €"],
      detail:
        "Pri zrekonštruovanom byte nestačí napísať, že je pekný. Kupujúci potrebuje vidieť detaily, svetlo, materiály a celkový pocit z bývania. Preto predaj stál na vizuálnej prezentácii, jasne pomenovanej hodnote rekonštrukcie a dôvere v hotový výsledok.",
      href: "/nehnutelnosti/3-izbovy-byt-luxusna-rekonstrukcia/",
      cta: "Pozrieť predaj",
    },
    {
      slug: "2-izbovy-byt-slnecnice",
      group: "sold",
      status: "Predané",
      title: "2-izbový byt v Slnečniciach",
      place: "Slnečnice, Bratislava-Petržalka",
      price: "predané za 255 000 €",
      image: "/images/listings/slnecnice-2-izbovy-byt/01-obyvacka.jpg",
      gallery: [
        "/images/listings/slnecnice-2-izbovy-byt/01-obyvacka.jpg",
        "/images/listings/slnecnice-2-izbovy-byt/02-loggia.jpg",
        "/images/listings/slnecnice-2-izbovy-byt/03-spalna.jpg",
        "/images/listings/slnecnice-2-izbovy-byt/04-kuchyna.jpg",
        "/images/listings/slnecnice-2-izbovy-byt/05-kuchyna-detail.jpg",
      ],
      note: "Moderný 2-izbový byt v lokalite, kde kupujúci veľa porovnávajú. Rozhodovalo jasné odlíšenie od podobných ponúk.",
      summary:
        "Predaj 2-izbového bytu v Slnečniciach za 255 000 €. Pri výmere 65 m² bolo dôležité ukázať praktickosť a lokalitu.",
      specs: [
        { label: "Typ", value: "2-izbový byt" },
        { label: "Výmera", value: "65 m²" },
        { label: "Lokalita", value: "Slnečnice, Petržalka" },
        { label: "Výsledok", value: "predané za 255 000 €" },
      ],
      highlights: ["Slnečnice", "65 m²", "2-izbový byt", "výsledok 255 000 €"],
      detail:
        "Slnečnice sú lokalita, kde kupujúci často porovnávajú viac podobných bytov naraz. Pri tomto predaji preto dávalo zmysel postaviť prezentáciu na praktickej výmere, čistých fotkách a rýchlom pochopení hodnoty. Výsledkom bol predaj za 255 000 €.",
      href: "/nehnutelnosti/2-izbovy-byt-slnecnice/",
      cta: "Pozrieť predaj",
    },
  ],
  principles: [
    {
      title: "Nastavím stratégiu ešte pred prvým inzerátom",
      text: "Predaj nezačína fotografiou na portáli. Začína tým, že si s vami ujasním cieľ, cenu, časový rámec a spôsob prezentácie.",
    },
    {
      title: "Komunikujem priamo, nie iba formálne",
      text: "Pri predaji sa veci hýbu rýchlo. Dôležité informácie neodkladám do neurčita; radšej zavolám, vysvetlím a dohodneme ďalší krok.",
    },
    {
      title: "Držím proces aj vtedy, keď príde tlak",
      text: "Obhliadky, komunikácia, vyjednávanie a právny servis musia držať pokope. Vtedy sa ukáže, či má človek veci pod kontrolou.",
    },
  ],
};
