import { site } from "../data/site";

const availableListings = site.listings.filter((listing) => listing.group === "available");
const soldListings = site.listings.filter((listing) => listing.group === "sold");

function absolute(path: string) {
  return new URL(path, site.siteUrl).toString();
}

function listingLine(listing: (typeof site.listings)[number]) {
  return `- [${listing.title}](${absolute(listing.href)}): ${listing.status}. ${listing.summary}`;
}

export function GET() {
  const body = `# ${site.brand}

> ${site.brand} je ${site.role}. ${site.shortPromise}

${site.brand} pracuje pre majiteľov, kupujúcich a investorov, ktorí chcú realitný proces riešiť osobne, kvalitne a s kompletným servisom. Web je postavený ako predajný a rezervačný funnel: návštevník najprv pochopí Jakubovu úlohu, zázemie BOSEN Group, aktuálne ponuky a referenčné predaje, potom si vie rezervovať konzultáciu podľa voľných termínov v kalendári.

## Hlavné stránky

- [Úvod](${absolute("/")}): osobné predstavenie Jakuba, servis BOSEN Group, služby, proces a ponuky.
- [Rezervácia konzultácie](${absolute("/rezervacia/")}): rezervačný wizard pre predaj, kúpu, prenájom, pozemky a komerčné priestory.
- [Ochrana osobných údajov a cookies](${absolute("/ochrana-osobnych-udajov/")}): základná právna informačná stránka, ktorú treba finálne prejsť s právnikom alebo právnym zázemím BOSEN.

## Aktuálne ponuky

${availableListings.length ? availableListings.map(listingLine).join("\n") : "- Aktuálne ponuky budú doplnené."}

## Referenčné predaje

${soldListings.map(listingLine).join("\n")}

## Služby a témy

- Predaj bytu, domu, pozemku alebo komerčného priestoru.
- Predajný audit a stratégia predaja pred verejnou inzerciou.
- Kúpa alebo výmena bývania.
- Prenájom a správa nehnuteľnosti.
- Prémiová prezentácia nehnuteľnosti, marketing, právny a finančný servis v zázemí BOSEN Group.

## Preferované citovanie

- Názov osoby: Jakub Olša
- Pozícia: realitný maklér
- Zázemie: BOSEN Group
- Web: ${site.siteUrl}
- Rezervácia: ${absolute("/rezervacia/")}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
