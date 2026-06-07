#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_REPO_PATH = fs.existsSync("/home/node/Jakub_Astro")
  ? "/home/node/Jakub_Astro"
  : process.cwd();

const DEFAULT_WORKSPACE_PATH = fs.existsSync(
  "/home/node/.openclaw/agent-workspaces/jakub-olsa",
)
  ? "/home/node/.openclaw/agent-workspaces/jakub-olsa"
  : "/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/agent-workspaces/jakub-olsa";

const repoPath = process.env.JAKUB_ASTRO_REPO || DEFAULT_REPO_PATH;
const workspacePath =
  process.env.JAKUB_OPENCLAW_WORKSPACE || DEFAULT_WORKSPACE_PATH;

const REQUIRED_LISTING_FIELDS = [
  "slug",
  "group",
  "status",
  "title",
  "place",
  "price",
  "image",
  "gallery",
  "note",
  "summary",
  "specs",
  "highlights",
  "detail",
  "href",
  "cta",
];

function printUsage() {
  console.error(`Usage:
  node site-listings.mjs site.listings.list [--json '{"group":"sold"}']
  node site-listings.mjs site.listings.audit
  node site-listings.mjs site.listings.createDraft --json '{"title":"...","place":"..."}'
  node site-listings.mjs site.listings.prepareAddListing --json '{"title":"...","place":"..."}'
  node site-listings.mjs site.listings.prepareMarkSold --json '{"slug":"byt-martincekova","result":"predané za ..."}'
`);
}

function parsePayload(argv) {
  const jsonIndex = argv.indexOf("--json");
  if (jsonIndex === -1) return {};
  const raw = argv[jsonIndex + 1];
  if (!raw) {
    throw new Error("--json requires a JSON payload");
  }
  return JSON.parse(raw);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, value);
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function publicImageExists(imagePath) {
  if (!imagePath || !imagePath.startsWith("/")) return false;
  return fs.existsSync(path.join(repoPath, "public", imagePath));
}

function unique(values) {
  return [...new Set(values)];
}

async function loadSite() {
  const siteFile = path.join(repoPath, "src/data/site.ts");
  const siteUrl = `${pathToFileURL(siteFile).href}?cacheBust=${Date.now()}`;
  const module = await import(siteUrl);
  if (!module.site?.listings) {
    throw new Error(`Could not load site.listings from ${siteFile}`);
  }
  return module.site;
}

function toListingSummary(listing) {
  return {
    slug: listing.slug,
    group: listing.group,
    status: listing.status,
    title: listing.title,
    place: listing.place,
    price: listing.price,
    href: listing.href,
    image: listing.image,
    galleryCount: Array.isArray(listing.gallery) ? listing.gallery.length : 0,
    cta: listing.cta,
  };
}

function auditListings(listings) {
  const slugs = listings.map((listing) => listing.slug);
  const hrefs = listings.map((listing) => listing.href);
  const duplicateSlugs = unique(slugs.filter((slug, index) => slugs.indexOf(slug) !== index));
  const duplicateHrefs = unique(hrefs.filter((href, index) => hrefs.indexOf(href) !== index));

  const records = listings.map((listing) => {
    const missingFields = REQUIRED_LISTING_FIELDS.filter((field) => {
      const value = listing[field];
      return value === undefined || value === null || value === "";
    });
    const gallery = Array.isArray(listing.gallery) ? listing.gallery : [];
    const missingImages = [listing.image, ...gallery].filter(
      (image) => !publicImageExists(image),
    );
    const hrefMatchesSlug = listing.href === `/nehnutelnosti/${listing.slug}/`;

    return {
      slug: listing.slug,
      group: listing.group,
      status: listing.status,
      href: listing.href,
      hrefMatchesSlug,
      missingFields,
      missingImages,
      ok:
        missingFields.length === 0 &&
        missingImages.length === 0 &&
        hrefMatchesSlug &&
        ["available", "sold"].includes(listing.group),
    };
  });

  return {
    counts: {
      total: listings.length,
      available: listings.filter((listing) => listing.group === "available").length,
      sold: listings.filter((listing) => listing.group === "sold").length,
    },
    duplicateSlugs,
    duplicateHrefs,
    records,
    ok:
      duplicateSlugs.length === 0 &&
      duplicateHrefs.length === 0 &&
      records.every((record) => record.ok),
  };
}

function normalizeDraft(payload) {
  const title = String(payload.title || "").trim();
  const slug = slugify(payload.slug || title || `listing-${nowStamp()}`);
  const group = payload.group === "sold" ? "sold" : "available";
  const status = payload.status || (group === "sold" ? "Predané" : "V predaji");
  const href = `/nehnutelnosti/${slug}/`;
  const specs = Array.isArray(payload.specs) ? payload.specs : [];
  const highlights = Array.isArray(payload.highlights) ? payload.highlights : [];
  const gallery = Array.isArray(payload.gallery) ? payload.gallery : [];

  return {
    slug,
    group,
    status,
    title,
    place: payload.place || "",
    price: payload.price || (group === "sold" ? "predané" : "cena na vyžiadanie"),
    image: payload.image || gallery[0] || "",
    gallery,
    note: payload.note || "",
    summary: payload.summary || "",
    specs,
    highlights,
    detail: payload.detail || "",
    href,
    cta: payload.cta || (group === "sold" ? "Pozrieť predaj" : "Rezervovať konzultáciu"),
    source: payload.source || "telegram",
    owner: payload.owner || "jakub-olsa",
    createdAt: new Date().toISOString(),
    approvalRequired: true,
  };
}

function draftMarkdown(draft) {
  return `# Listing draft: ${draft.title || draft.slug}

- slug: ${draft.slug}
- group: ${draft.group}
- status: ${draft.status}
- href: ${draft.href}
- price: ${draft.price}
- place: ${draft.place}
- source: ${draft.source}
- approvalRequired: ${draft.approvalRequired}

## Summary

${draft.summary || "-"}

## Detail

${draft.detail || "-"}

## Specs

${
  draft.specs.length
    ? draft.specs.map((spec) => `- ${spec.label}: ${spec.value}`).join("\n")
    : "-"
}

## Highlights

${
  draft.highlights.length
    ? draft.highlights.map((highlight) => `- ${highlight}`).join("\n")
    : "-"
}

## Gallery

${draft.gallery.length ? draft.gallery.map((image) => `- ${image}`).join("\n") : "-"}

## Next

1. Doplniť chýbajúce parametre a fotky.
2. Pripraviť patch do \`src/data/site.ts\`.
3. Spustiť \`npm run build\`.
4. Publikovať iba na staging.
5. Po Jakubovom/Adamovom schválení presunúť do produkcie.
`;
}

function approvalMarkdown(type, payload) {
  const listing = payload.listing || payload.draft;
  const title = listing?.title || listing?.slug || payload.slug || "listing";
  const proposed = payload.proposed || {};

  return `# Approval request: ${type} - ${title}

- type: ${type}
- createdAt: ${new Date().toISOString()}
- approvalRequired: true
- targetBranch: staging
- source: ${payload.source || "telegram/openclaw"}

## Target

- slug: ${listing?.slug || payload.slug || "-"}
- href: ${listing?.href || `/nehnutelnosti/${payload.slug || ""}/`}
- currentGroup: ${listing?.group || "-"}
- currentStatus: ${listing?.status || "-"}

## Proposed change

${Object.entries(proposed)
  .map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
  .join("\n") || "-"}

## Reason / context

${payload.reason || payload.note || "-"}

## Required checks

- [ ] Patch pripravený v \`src/data/site.ts\`.
- [ ] Fotky existujú v \`public/images/listings/<slug>/\`.
- [ ] Detail URL funguje.
- [ ] Homepage sekcia \`#ponuky\` zaradí nehnuteľnosť do správnej skupiny.
- [ ] \`npm run build\` prešiel.
- [ ] Staging review prešiel.
- [ ] Produkcia až po explicitnom approval.
`;
}

async function listListings(payload) {
  const site = await loadSite();
  const listings = payload.group
    ? site.listings.filter((listing) => listing.group === payload.group)
    : site.listings;
  return {
    ok: true,
    repoPath,
    total: listings.length,
    listings: listings.map(toListingSummary),
  };
}

async function auditCommand() {
  const site = await loadSite();
  return {
    ok: true,
    repoPath,
    listingSource: path.join(repoPath, "src/data/site.ts"),
    audit: auditListings(site.listings),
  };
}

async function createDraft(payload) {
  const draft = normalizeDraft(payload);
  const base = path.join(workspacePath, "property-drafts", draft.slug);
  const jsonFile = path.join(base, "draft.json");
  const mdFile = path.join(base, "README.md");

  writeJson(jsonFile, draft);
  writeText(mdFile, draftMarkdown(draft));

  return {
    ok: true,
    draft,
    files: {
      json: jsonFile,
      markdown: mdFile,
    },
    next: [
      "review draft fields",
      "prepare staging patch in src/data/site.ts",
      "run npm run build",
      "request approval before public deploy",
    ],
  };
}

async function prepareAddListing(payload) {
  const draftResult = await createDraft(payload);
  const approvalFile = path.join(
    workspacePath,
    "approval-queue",
    `${nowStamp()}-${draftResult.draft.slug}-add-listing.md`,
  );

  writeText(
    approvalFile,
    approvalMarkdown("add-listing", {
      draft: draftResult.draft,
      proposed: {
        group: draftResult.draft.group,
        status: draftResult.draft.status,
        href: draftResult.draft.href,
      },
      reason: payload.reason || "Nový listing pripravený z Jakubovho vstupu.",
      source: payload.source,
    }),
  );

  return {
    ok: true,
    draft: draftResult.draft,
    files: {
      ...draftResult.files,
      approval: approvalFile,
    },
  };
}

async function prepareMarkSold(payload) {
  if (!payload.slug) {
    throw new Error("prepareMarkSold requires payload.slug");
  }
  const site = await loadSite();
  const listing = site.listings.find((item) => item.slug === payload.slug);
  if (!listing) {
    throw new Error(`Listing not found: ${payload.slug}`);
  }

  const proposed = {
    group: "sold",
    status: payload.status || "Predané",
    price: payload.result || payload.price || listing.price || "predané",
    cta: "Pozrieť predaj",
    note: payload.note || listing.note,
    summary: payload.summary || listing.summary,
    detail: payload.detail || listing.detail,
  };

  const approvalFile = path.join(
    workspacePath,
    "approval-queue",
    `${nowStamp()}-${listing.slug}-mark-sold.md`,
  );

  writeText(
    approvalFile,
    approvalMarkdown("mark-sold", {
      listing,
      proposed,
      reason:
        payload.reason ||
        "Jakub oznámil, že nehnuteľnosť je predaná a má ísť do sekcie predaných.",
      source: payload.source,
    }),
  );

  return {
    ok: true,
    listing: toListingSummary(listing),
    proposed,
    files: {
      approval: approvalFile,
    },
    next: [
      "apply proposed fields in src/data/site.ts",
      "run npm run build",
      "review staging /#ponuky and listing detail",
      "deploy production only after approval",
    ],
  };
}

async function main() {
  const [, , command, ...rest] = process.argv;
  if (!command) {
    printUsage();
    process.exit(2);
  }

  const payload = parsePayload(rest);
  let result;

  if (command === "site.listings.list") {
    result = await listListings(payload);
  } else if (command === "site.listings.audit") {
    result = await auditCommand();
  } else if (command === "site.listings.createDraft") {
    result = await createDraft(payload);
  } else if (command === "site.listings.prepareAddListing") {
    result = await prepareAddListing(payload);
  } else if (command === "site.listings.prepareMarkSold") {
    result = await prepareMarkSold(payload);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
