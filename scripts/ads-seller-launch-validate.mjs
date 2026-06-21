import { readFileSync } from "node:fs";

const csvPath = "ops/ads/seller-audit-launch-links-2026-06-19.csv";
const jsonPath = "ops/ads/seller-audit-launch-pack-2026-06-19.json";

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((item) => item.some((value) => value.trim()));
};

const readTable = (path) => {
  const rows = parseCsv(readFileSync(path, "utf8"));
  const headers = rows[0];
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
  );
};

const requiredSharedParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
const allowedChannels = new Map([
  ["google_search", { utm_source: "google", utm_medium: "cpc", minRows: 12 }],
  ["meta_paid_social", { utm_source: "meta", utm_medium: "paid_social", minRows: 3 }],
]);

const fail = [];
const warn = [];
const rows = readTable(csvPath);
const pack = JSON.parse(readFileSync(jsonPath, "utf8"));
const bookingUrls = new Set();

if (rows.length !== pack.launch_readiness.tracked_links) {
  fail.push(
    `CSV row count ${rows.length} does not match JSON tracked_links ${pack.launch_readiness.tracked_links}.`,
  );
}

if (pack.launch_readiness.google_negative_rows < 20) {
  fail.push(`Only ${pack.launch_readiness.google_negative_rows} Google negative keywords are configured.`);
}

if (pack.launch_readiness.google_rsa_rows < 4) {
  fail.push(`Only ${pack.launch_readiness.google_rsa_rows} Google RSA copy rows are configured.`);
}

for (const [channel, rule] of allowedChannels) {
  const count = rows.filter((row) => row.channel === channel).length;
  if (count < rule.minRows) {
    fail.push(`${channel} has ${count} rows; minimum is ${rule.minRows}.`);
  }
}

rows.forEach((row, index) => {
  const rowLabel = `${index + 1} ${row.channel || "missing_channel"} ${row.asset_id || "missing_asset"}`;
  const rule = allowedChannels.get(row.channel);

  if (!rule) {
    fail.push(`${rowLabel}: unsupported channel.`);
    return;
  }

  let landing;
  let booking;

  try {
    landing = new URL(row.landing_url);
  } catch {
    fail.push(`${rowLabel}: invalid landing_url.`);
  }

  try {
    booking = new URL(row.booking_url);
  } catch {
    fail.push(`${rowLabel}: invalid booking_url.`);
  }

  if (!landing || !booking) return;

  if (landing.origin !== "https://jakubolsa.sk" || landing.pathname !== "/predaj-bytu-bratislava/") {
    fail.push(`${rowLabel}: landing_url must route to production seller landing page.`);
  }

  if (booking.origin !== "https://jakubolsa.sk" || booking.pathname !== "/rezervacia/") {
    fail.push(`${rowLabel}: booking_url must route to production reservation page.`);
  }

  if (booking.searchParams.get("zamer") !== "Predať byt") {
    fail.push(`${rowLabel}: booking_url missing zamer=Predať byt.`);
  }

  if (booking.searchParams.get("entry") !== "predaj-bytu-bratislava") {
    fail.push(`${rowLabel}: booking_url missing entry=predaj-bytu-bratislava.`);
  }

  for (const param of requiredSharedParams) {
    const landingValue = landing.searchParams.get(param);
    const bookingValue = booking.searchParams.get(param);

    if (!landingValue) {
      fail.push(`${rowLabel}: landing_url missing ${param}.`);
    }

    if (landingValue && landingValue !== bookingValue) {
      fail.push(`${rowLabel}: booking_url does not preserve ${param}.`);
    }
  }

  for (const [param, expected] of Object.entries(rule)) {
    if (param === "minRows") continue;
    if (landing.searchParams.get(param) !== expected || booking.searchParams.get(param) !== expected) {
      fail.push(`${rowLabel}: expected ${param}=${expected} on landing and booking URLs.`);
    }
  }

  if (row.channel === "google_search" && !booking.searchParams.get("utm_term")) {
    fail.push(`${rowLabel}: Google booking_url missing utm_term.`);
  }

  if (row.channel === "meta_paid_social" && !/housing special ad category/i.test(row.notes)) {
    warn.push(`${rowLabel}: Meta notes do not explicitly mention Housing special ad category.`);
  }

  if (bookingUrls.has(row.booking_url)) {
    fail.push(`${rowLabel}: duplicate booking_url.`);
  }

  bookingUrls.add(row.booking_url);
});

const result = {
  ok: fail.length === 0,
  rows: rows.length,
  channels: Object.fromEntries(
    [...allowedChannels.keys()].map((channel) => [
      channel,
      rows.filter((row) => row.channel === channel).length,
    ]),
  ),
  warnings: warn,
  failures: fail,
};

console.log(JSON.stringify(result, null, 2));

if (fail.length > 0) {
  process.exitCode = 1;
}
