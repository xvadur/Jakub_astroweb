import { site } from "../data/site";

const lastmod = "2026-06-03";

const staticRoutes = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/predaj-bytu-bratislava/", priority: "0.9", changefreq: "weekly" },
  { path: "/rezervacia/", priority: "0.9", changefreq: "weekly" },
  { path: "/ochrana-osobnych-udajov/", priority: "0.4", changefreq: "monthly" },
];

const listingRoutes = site.listings.map((listing) => ({
  path: listing.href,
  priority: listing.group === "available" ? "0.8" : "0.6",
  changefreq: listing.group === "available" ? "weekly" : "monthly",
}));

const routes = [...staticRoutes, ...listingRoutes];

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function GET() {
  const urls = routes
    .map((route) => {
      const loc = new URL(route.path, site.siteUrl).toString();

      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
