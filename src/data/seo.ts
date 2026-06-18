import { site } from "./site";

type PageMetaOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

type Listing = (typeof site.listings)[number];

const agentId = `${site.siteUrl}/#jakub-olsa`;
const personId = `${site.siteUrl}/#jakub-olsa-person`;
const websiteId = `${site.siteUrl}/#website`;
const serviceId = `${site.siteUrl}/#realitne-sluzby`;

function absoluteUrl(pathOrUrl: string): string {
  return new URL(pathOrUrl, site.siteUrl).toString();
}

function cleanPhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function createPageMeta(options: PageMetaOptions) {
  const image = options.image ?? site.heroImage;

  return {
    title: options.title,
    description: options.description,
    canonicalUrl: absoluteUrl(options.path),
    imageUrl: absoluteUrl(image),
  };
}

function createAgentEntity(imageUrl: string) {
  const phone = cleanPhone(site.contact.phone);
  const hasPhone = phone.length >= 10;
  const hasEmail = site.contact.email.includes("@") && !site.contact.email.includes("example.");
  const hasInstagram = site.contact.instagram.startsWith("http");

  return {
    "@type": "RealEstateAgent",
    "@id": agentId,
    name: site.brand,
    url: site.siteUrl,
    description: `${site.brand}, ${site.role}. ${site.shortPromise}`,
    image: imageUrl,
    areaServed: [
      { "@type": "Country", name: "Slovensko" },
      { "@type": "City", name: "Bratislava" },
    ],
    parentOrganization: {
      "@type": "Organization",
      name: "BOSEN Group",
      url: "https://www.bosen.sk/",
    },
    employee: { "@id": personId },
    ...(hasPhone ? { telephone: site.contact.phone } : {}),
    ...(hasEmail ? { email: site.contact.email } : {}),
    ...(hasInstagram ? { sameAs: [site.contact.instagram] } : {}),
  };
}

function createPersonEntity(imageUrl: string) {
  const hasInstagram = site.contact.instagram.startsWith("http");

  return {
    "@type": "Person",
    "@id": personId,
    name: site.brand,
    jobTitle: site.role,
    image: imageUrl,
    worksFor: {
      "@type": "Organization",
      name: "BOSEN Group",
      url: "https://www.bosen.sk/",
    },
    ...(hasInstagram ? { sameAs: [site.contact.instagram] } : {}),
  };
}

function createWebsiteEntity() {
  return {
    "@type": "WebSite",
    "@id": websiteId,
    name: site.brand,
    url: site.siteUrl,
    inLanguage: site.locale,
    publisher: { "@id": agentId },
  };
}

function createServiceEntity() {
  return {
    "@type": "Service",
    "@id": serviceId,
    name: "Realitné služby a predajný audit",
    serviceType: "Realitné maklérske služby",
    provider: { "@id": agentId },
    areaServed: [
      { "@type": "Country", name: "Slovensko" },
      { "@type": "City", name: "Bratislava" },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Realitné služby",
      itemListElement: site.services.map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: service.title,
          description: service.text,
        },
      })),
    },
  };
}

export function createHomeJsonLd(meta: ReturnType<typeof createPageMeta>) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      createPersonEntity(meta.imageUrl),
      createAgentEntity(meta.imageUrl),
      createWebsiteEntity(),
      createServiceEntity(),
      {
        "@type": "WebPage",
        "@id": meta.canonicalUrl,
        url: meta.canonicalUrl,
        name: meta.title,
        description: meta.description,
        inLanguage: site.locale,
        isPartOf: { "@id": websiteId },
        about: [{ "@id": agentId }, { "@id": serviceId }],
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: meta.imageUrl,
        },
      },
    ],
  };
}

export function createReservationJsonLd(meta: ReturnType<typeof createPageMeta>) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      createPersonEntity(meta.imageUrl),
      createAgentEntity(meta.imageUrl),
      createWebsiteEntity(),
      createServiceEntity(),
      {
        "@type": "WebPage",
        "@id": meta.canonicalUrl,
        url: meta.canonicalUrl,
        name: meta.title,
        description: meta.description,
        inLanguage: site.locale,
        isPartOf: { "@id": websiteId },
        about: { "@id": serviceId },
        potentialAction: {
          "@type": "ReserveAction",
          name: "Rezervovať realitnú konzultáciu",
          target: {
            "@type": "EntryPoint",
            urlTemplate: meta.canonicalUrl,
            actionPlatform: "https://schema.org/DesktopWebPlatform",
          },
        },
      },
    ],
  };
}

export function createSellerIntentJsonLd(
  meta: ReturnType<typeof createPageMeta>,
  faqs: FaqItem[],
) {
  const faqId = `${meta.canonicalUrl}#faq`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      createPersonEntity(meta.imageUrl),
      createAgentEntity(meta.imageUrl),
      createWebsiteEntity(),
      createServiceEntity(),
      {
        "@type": "BreadcrumbList",
        "@id": `${meta.canonicalUrl}#breadcrumbs`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Úvod",
            item: site.siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Predaj bytu Bratislava",
            item: meta.canonicalUrl,
          },
        ],
      },
      {
        "@type": "WebPage",
        "@id": meta.canonicalUrl,
        url: meta.canonicalUrl,
        name: meta.title,
        description: meta.description,
        inLanguage: site.locale,
        isPartOf: { "@id": websiteId },
        about: [{ "@id": agentId }, { "@id": serviceId }],
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: meta.imageUrl,
        },
        breadcrumb: { "@id": `${meta.canonicalUrl}#breadcrumbs` },
        mainEntity: { "@id": faqId },
        potentialAction: {
          "@type": "ContactAction",
          name: "Rezervovať konzultáciu k predaju bytu v Bratislave",
          target: {
            "@type": "EntryPoint",
            urlTemplate: absoluteUrl("/rezervacia/"),
            actionPlatform: "https://schema.org/DesktopWebPlatform",
          },
        },
      },
      {
        "@type": "FAQPage",
        "@id": faqId,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };
}

export function createListingJsonLd(
  listing: Listing,
  meta: ReturnType<typeof createPageMeta>,
) {
  const gallery = listing.gallery?.length ? listing.gallery : [listing.image];

  return {
    "@context": "https://schema.org",
    "@graph": [
      createPersonEntity(absoluteUrl(site.heroImage)),
      createAgentEntity(absoluteUrl(site.heroImage)),
      createWebsiteEntity(),
      createServiceEntity(),
      {
        "@type": "BreadcrumbList",
        "@id": `${meta.canonicalUrl}#breadcrumbs`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Úvod",
            item: site.siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: listing.group === "sold" ? "Referenčné predaje" : "Aktuálne ponuky",
            item: absoluteUrl("/#ponuky"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: listing.title,
            item: meta.canonicalUrl,
          },
        ],
      },
      {
        "@type": "WebPage",
        "@id": meta.canonicalUrl,
        url: meta.canonicalUrl,
        name: meta.title,
        description: meta.description,
        inLanguage: site.locale,
        isPartOf: { "@id": websiteId },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: meta.imageUrl,
        },
        breadcrumb: { "@id": `${meta.canonicalUrl}#breadcrumbs` },
        about: {
          "@type": "Residence",
          name: listing.title,
          description: listing.summary,
          address: {
            "@type": "PostalAddress",
            streetAddress: listing.place,
            addressCountry: "SK",
          },
          image: gallery.map((image) => absoluteUrl(image)),
        },
      },
    ],
  };
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
