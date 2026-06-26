import { readFile } from "node:fs/promises";

const files = {
  consent: "src/components/AnalyticsConsent.astro",
  reservation: "src/pages/rezervacia.astro",
  envExample: ".env.example",
};

const read = async (path) => readFile(path, "utf8");

const checks = [
  {
    file: files.consent,
    label: "Google Ads ID env is wired",
    patterns: ["PUBLIC_GOOGLE_ADS_ID", "googleAdsId"],
  },
  {
    file: files.consent,
    label: "Google Ads conversion label env is wired",
    patterns: ["PUBLIC_GOOGLE_ADS_CONVERSION_LABEL", "googleAdsConversionLabel"],
  },
  {
    file: files.consent,
    label: "Consent defaults deny analytics and ads storage",
    patterns: ['window.gtag("consent", "default"', 'analytics_storage: "denied"', 'ad_storage: "denied"'],
  },
  {
    file: files.consent,
    label: "Google tag boots before consent with denied storage",
    patterns: ["loadGoogleTag({ sendPageView: false })", "googleTagPromise", "send_page_view: sendPageView"],
  },
  {
    file: files.consent,
    label: "Successful booking emits GA4 generate_lead",
    patterns: ['eventName === "booking_submit_success"', '"generate_lead"'],
  },
  {
    file: files.consent,
    label: "Successful booking emits Google Ads conversion",
    patterns: ['"conversion"', "send_to", "googleAdsConversionLabel"],
  },
  {
    file: files.consent,
    label: "Google Ads conversion uses transaction dedupe",
    patterns: ["transaction_id", "lead_correlation_id"],
  },
  {
    file: files.reservation,
    label: "Reservation success passes lead correlation id",
    patterns: ['trackFunnelEvent("submit_success"', "lead_correlation_id"],
  },
  {
    file: files.envExample,
    label: "Env example documents analytics and ads IDs",
    patterns: [
      "PUBLIC_GA_MEASUREMENT_ID",
      "PUBLIC_GOOGLE_ADS_ID",
      "PUBLIC_GOOGLE_ADS_CONVERSION_LABEL",
      "PUBLIC_ANALYTICS_DEBUG",
    ],
  },
];

const contents = new Map();
const failures = [];

for (const check of checks) {
  if (!contents.has(check.file)) {
    contents.set(check.file, await read(check.file));
  }

  const content = contents.get(check.file);
  const missing = check.patterns.filter((pattern) => !content.includes(pattern));

  if (missing.length > 0) {
    failures.push({ ...check, missing });
  }
}

if (failures.length > 0) {
  console.error("Analytics conversion audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure.label} (${failure.file}) missing: ${failure.missing.join(", ")}`);
  }
  process.exit(1);
}

console.log("Analytics conversion audit passed.");
