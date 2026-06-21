import { readFileSync } from "node:fs";

const files = {
  consent: readFileSync("src/components/CookieConsent.astro", "utf8"),
  reservation: readFileSync("src/pages/rezervacia.astro", "utf8"),
  sellerLanding: readFileSync("src/pages/predaj-bytu-bratislava.astro", "utf8"),
  worker: readFileSync("workers/site-worker.js", "utf8"),
};

const failures = [];

const expectIncludes = (name, text, needle) => {
  if (!text.includes(needle)) failures.push(`${name}: missing ${needle}`);
};

const expectNotInAnalyticsAllowlist = (param) => {
  const match = files.consent.match(/const allowed = \[([\s\S]*?)\];/);
  if (!match) {
    failures.push("CookieConsent: could not find analytics allowlist");
    return;
  }

  if (match[1].includes(`"${param}"`) || match[1].includes(`'${param}'`)) {
    failures.push(`CookieConsent: ${param} must not be in GA/Ads event allowlist`);
  }
};

expectIncludes("CookieConsent", files.consent, "sanitizeIdentifier");
expectIncludes("CookieConsent", files.consent, "transaction_id");
expectIncludes("CookieConsent", files.consent, "params.analytics_conversion_id || params.conversion_id");
expectIncludes("CookieConsent", files.consent, "\"lead_score\"");
expectIncludes("CookieConsent", files.consent, "\"time_horizon\"");
expectIncludes("CookieConsent", files.consent, "\"owner_relation\"");
expectIncludes("CookieConsent", files.consent, "\"sale_status\"");
expectIncludes("Reservation", files.reservation, "payload.analytics_conversion_id = buildAnalyticsConversionId()");
expectIncludes("Reservation", files.reservation, "successfulSubmissionTracked");
expectIncludes("Reservation", files.reservation, "internal_lead_id: data.crmRecords?.leadId");
expectIncludes("Reservation", files.reservation, "lead_score: data.leadQualification?.grade || payload.lead_score");
expectIncludes("Reservation", files.reservation, "owner_relation: payload.vztah_k_nehnutelnosti");
expectIncludes("Seller landing", files.sellerLanding, "data-seller-booking-link");
expectIncludes("Seller landing", files.sellerLanding, "const attributionKeys = [");
expectIncludes("Seller landing", files.sellerLanding, "url.searchParams.set(key, value)");
expectIncludes("Worker", files.worker, "payload.analytics_conversion_id = buildAnalyticsConversionId(payload.analytics_conversion_id)");
expectIncludes("Worker", files.worker, "analyticsConversionId: payload.analytics_conversion_id");
expectIncludes("Worker", files.worker, "tracking: {");
expectIncludes("Worker", files.worker, "analytics_conversion_id: clean(payload.analytics_conversion_id)");
expectIncludes("Worker", files.worker, "initialLeadStatusFromQualification");
expectIncludes("Worker", files.worker, "status: leadStatus");
expectIncludes("Worker", files.worker, "initial_lead_status: leadStatus");
expectIncludes("Worker", files.worker, "Prioritne preveriť vlastníka, cenu a pripraviť konzultáciu.");
expectIncludes("Worker", files.worker, "[\"horizont\", \"časový horizont\"]");
expectIncludes("Worker", files.worker, "[\"vztah_k_nehnutelnosti\", \"vzťah k nehnuteľnosti\"]");
expectIncludes("Worker", files.worker, "[\"stav_predaja\", \"stav predaja\"]");
expectIncludes("Worker", files.worker, "leadQualification: {");

[
  "internal_booking_id",
  "internal_lead_id",
  "internal_appointment_id",
  "crm_lead_id",
  "crm_appointment_id",
  "calendar_event_id",
  "meno",
  "telefon",
  "email",
  "sprava",
].forEach(expectNotInAnalyticsAllowlist);

if (failures.length) {
  console.error("Analytics conversion audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Analytics conversion audit passed.");
