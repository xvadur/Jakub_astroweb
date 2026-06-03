import { site } from "../data/site";

const siteEnv = import.meta.env.PUBLIC_SITE_ENV ?? "production";
const isStaging = siteEnv !== "production";

export function GET() {
  const body = isStaging
    ? `User-agent: *
Disallow: /
`
    : `User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: OAI-SearchBot
Allow: /

Sitemap: ${new URL("/sitemap.xml", site.siteUrl).toString()}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
