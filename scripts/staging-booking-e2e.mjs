const DEFAULT_TARGET = "https://staging.jakubolsa.sk";

const target = (process.env.E2E_TARGET_ORIGIN || process.argv[2] || DEFAULT_TARGET).replace(/\/+$/, "");
const bookingPage = `${target}/rezervacia/?zamer=Preda%C5%A5%20byt&entry=internal-e2e`;
const analyticsConversionId =
  globalThis.crypto?.randomUUID?.() || `lead_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;

const dateAfterDays = (days) => {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
};

const findAvailableSlot = async () => {
  for (let dayOffset = 1; dayOffset <= 21; dayOffset += 1) {
    const date = dateAfterDays(dayOffset);
    const response = await fetch(`${target}/api/availability?date=${encodeURIComponent(date)}`, {
      headers: { Accept: "application/json", Origin: target },
    });
    const body = await response.json().catch(() => null);

    if (!response.ok || body?.ok !== true || !Array.isArray(body.slots)) continue;

    const slot = body.slots.find((item) => item?.available && item?.time);
    if (slot) return { date, time: slot.time };
  }

  throw new Error("No available staging slot found in the next 21 days.");
};

const slot = await findAvailableSlot();

const payload = {
  e2e_test_mode: "internal",
  meno: "Interny Test Lead",
  telefon: "+421900000000",
  email: "internal-e2e@example.test",
  zamer: "Predať byt",
  typ: "Byt",
  typ_detail: "Byt",
  lokalita: "Ružinov, Bratislava",
  lokalita_overena: "false",
  datum: slot.date,
  cas: slot.time,
  gdpr_suhlas: "ano",
  horizont: "1-3 mesiace",
  vztah_k_nehnutelnosti: "Som vlastník",
  stav_predaja: "Zatiaľ neinzerujem",
  cenova_predstava: "260 000 €",
  lead_score: "A",
  lead_title: "Predajná stratégia bytu",
  subject_prefix: "Predaj bytu",
  parametre: ["Izby: 3 izby", "Výmera: 72 m²", "Stav: Kompletná rekonštrukcia"],
  kvalifikacia: [
    "Vzťah k nehnuteľnosti: Som vlastník",
    "Časový horizont: 1-3 mesiace",
    "Stav predaja: Zatiaľ neinzerujem",
    "Cenová predstava: 260 000 €",
  ],
  sprava: "Interný staging E2E test. Tento lead nema byt kontaktovany.",
  analytics_conversion_id: analyticsConversionId,
  page_url: bookingPage,
  booking_page: bookingPage,
  booking_path: "/rezervacia/?zamer=Preda%C5%A5%20byt&entry=internal-e2e",
  landing_page: `${target}/predaj-bytu-bratislava/`,
  landing_path: "/predaj-bytu-bratislava/",
  created_at: new Date().toISOString(),
  first_seen_at: new Date().toISOString(),
  last_seen_at: new Date().toISOString(),
  utm_source: "internal",
  utm_medium: "e2e",
  utm_campaign: "seller_20_lead_sprint",
  utm_content: "staging_booking_e2e",
};

const response = await fetch(`${target}/api/book`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Origin: target,
  },
  body: JSON.stringify(payload),
});

const body = await response.json().catch(() => null);

console.log(
  JSON.stringify(
    {
      target,
      status: response.status,
      ok: body?.ok === true,
      mode: body?.mode || "",
      bookingStatus: body?.bookingStatus || "",
      crmStatus: body?.crmStatus || "",
      eventId: body?.eventId || "",
      leadId: body?.crmRecords?.leadId || "",
      appointmentId: body?.crmRecords?.appointmentId || "",
      analyticsConversionId: body?.analyticsConversionId || "",
      error: body?.error || "",
    },
    null,
    2,
  ),
);

if (!response.ok || body?.ok !== true) {
  process.exitCode = 1;
}
