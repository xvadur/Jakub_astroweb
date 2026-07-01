const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3";
const RESEND_EMAIL_URL = "https://api.resend.com/emails";
const SUPABASE_REST_PREFIX = "/rest/v1";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://jakubolsa.sk",
  "https://staging.jakubolsa.sk",
  "http://127.0.0.1:4321",
  "http://localhost:4321",
  "http://127.0.0.1:8787",
  "http://localhost:8787",
];

const DEFAULT_WORK_START = "09:00";
const DEFAULT_WORK_END = "19:00";
const DEFAULT_WORKING_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_MIN_LEAD_MINUTES = 0;
const DEFAULT_CRM_TENANT_SLUG = "jakub-olsa";
const DEFAULT_CRM_TENANT_NAME = "Jakub Olša";
const DEFAULT_BOOKING_FROM_EMAIL = "Jakub Olša <rezervacie@jakubolsa.sk>";
const DEFAULT_BOOKING_REPLY_TO_EMAIL = "olsa@bosen.sk";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApiRequest(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleApiRequest(request, env, ctx) {
  const origin = request.headers.get("Origin") || "";
  const corsHeaders = buildCorsHeaders(origin, env);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!isAllowedOrigin(origin, env)) {
    return json({ ok: false, error: "Origin is not allowed" }, 403, corsHeaders);
  }

  const url = new URL(request.url);

  try {
    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "jakub-booking-api" }, 200, corsHeaders);
    }

    if (url.pathname === "/api/availability") {
      return handleAvailability(request, env, corsHeaders);
    }

    if (url.pathname === "/api/book") {
      return handleBooking(request, env, ctx, corsHeaders);
    }

    return json({ ok: false, error: "API route not found" }, 404, corsHeaders);
  } catch (error) {
    return json(
      {
        ok: false,
        error: "Unexpected API error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
      corsHeaders,
    );
  }
}

async function handleAvailability(request, env, headers) {
  if (request.method !== "GET") {
    return json({ ok: false, error: "Method not allowed" }, 405, headers);
  }

  const url = new URL(request.url);
  const date = (url.searchParams.get("date") || "").trim();

  if (!isValidDate(date)) {
    return json({ ok: false, error: "Invalid date" }, 400, headers);
  }

  const timeZone = env.BOOKING_TIME_ZONE || "Europe/Bratislava";
  const slotMinutes = readInteger(env.BOOKING_SLOT_MINUTES, 30);
  const minLeadMinutes = readInteger(env.BOOKING_MIN_LEAD_MINUTES, DEFAULT_MIN_LEAD_MINUTES, true);
  const slotTimes = buildSlotTimes(env, slotMinutes);
  const workStart = env.BOOKING_WORK_START || DEFAULT_WORK_START;
  const workEnd = env.BOOKING_WORK_END || DEFAULT_WORK_END;
  const workingDays = readIntegerList(env.BOOKING_WORKING_DAYS, DEFAULT_WORKING_DAYS);
  const workingDay = workingDays.includes(dayOfWeek(date));
  const earliestBookableStart = Date.now() + minLeadMinutes * 60 * 1000;
  const googleEnabled = hasGoogleCalendar(env);

  let busy = [];
  let mode = "mock";

  if (googleEnabled) {
    mode = "google";
    const token = await getGoogleAccessToken(env);
    busy = await fetchBusyIntervals(date, timeZone, token, env);
  }

  const slots = slotTimes.map((time) => {
    const interval = buildInterval(date, time, slotMinutes, timeZone);
    const blocked = busy.some((busyInterval) => overlaps(interval, busyInterval));
    const past = interval.start <= earliestBookableStart;
    const available = workingDay && !past && !blocked;

    return {
      time,
      label: time,
      available,
      reason: available ? "" : !workingDay ? "outside-working-days" : past ? "past" : "busy",
    };
  });

  return json(
    {
      ok: true,
      mode,
      date,
      timeZone,
      slotMinutes,
      workStart,
      workEnd,
      slots,
    },
    200,
    headers,
  );
}

async function handleBooking(request, env, ctx, headers) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405, headers);
  }

  const payload = await readJsonPayload(request);

  if (payload.website) {
    return json({ ok: true, ignored: true }, 200, headers);
  }

  const validationError = validateLeadPayload(payload);

  if (validationError) {
    return json({ ok: false, error: validationError }, 400, headers);
  }

  const timeZone = env.BOOKING_TIME_ZONE || "Europe/Bratislava";
  const slotMinutes = readInteger(env.BOOKING_SLOT_MINUTES, 30);
  const minLeadMinutes = readInteger(env.BOOKING_MIN_LEAD_MINUTES, DEFAULT_MIN_LEAD_MINUTES, true);
  const slotTimes = buildSlotTimes(env, slotMinutes);

  if (!slotTimes.includes(payload.cas)) {
    return json({ ok: false, error: "Vybraný čas nie je dostupný." }, 400, headers);
  }

  const interval = buildInterval(payload.datum, payload.cas, slotMinutes, timeZone);

  if (interval.start <= Date.now() + minLeadMinutes * 60 * 1000) {
    return json({ ok: false, error: "Vybraný čas už nie je dostupný." }, 400, headers);
  }

  const googleEnabled = hasGoogleCalendar(env);
  const leadScore = calculateLeadScore(payload);
  let crmResult = { status: "skipped" };

  let calendarEvent = null;
  let bookingStatus = "pending_calendar_config";
  let mode = "mock";

  if (googleEnabled) {
    mode = "google";
    const token = await getGoogleAccessToken(env);
    const busy = await fetchBusyIntervals(payload.datum, timeZone, token, env);
    const isBlocked = busy.some((busyInterval) => overlaps(interval, busyInterval));

    if (isBlocked) {
      return json(
        {
          ok: false,
          error: "Tento termín sa medzitým obsadil. Vyberte prosím iný čas.",
          code: "slot_unavailable",
        },
        409,
        headers,
      );
    }

    calendarEvent = await createCalendarEvent(payload, interval, timeZone, token, env);
    bookingStatus = "calendar_created";

    crmResult = await tryCreateBookingCrmRecords(payload, {
      env,
      interval,
      source: "jakubolsa.sk/rezervacia",
      appointmentStatus: "confirmed",
      googleEventId: calendarEvent.id || null,
      leadScore,
    });
  } else {
    crmResult = await tryCreateBookingCrmRecords(payload, {
      env,
      interval,
      source: "jakubolsa.sk/rezervacia",
      appointmentStatus: "requested",
      leadScore,
    });
  }

  const telegramResult = await trySendTelegramNotification(payload, {
    env,
    bookingStatus,
    mode,
    calendarEvent,
    crmResult,
    leadScore,
  });
  const emailResult = queueBookingConfirmationEmail(ctx, payload, {
    env,
    bookingStatus,
    mode,
    calendarEvent,
  });

  return json(
    {
      ok: true,
      mode,
      bookingStatus,
      crmStatus: crmResult.status,
      telegramStatus: telegramResult.status,
      emailStatus: emailResult.status,
      leadScore: leadScore.score,
      leadScoreBucket: leadScore.bucket,
      eventId: calendarEvent?.id || "",
      eventLink: calendarEvent?.htmlLink || "",
    },
    200,
    headers,
  );
}

function queueBookingConfirmationEmail(ctx, payload, context) {
  const { env } = context;
  const recipient = clean(payload.email).toLowerCase();

  if (!env.RESEND_API_KEY) {
    return { status: "skipped" };
  }

  if (!isLikelyEmail(recipient)) {
    return { status: "skipped_no_recipient" };
  }

  ctx.waitUntil(sendBookingConfirmationEmail(recipient, payload, context).catch(() => null));
  return { status: "queued" };
}

async function sendBookingConfirmationEmail(recipient, payload, context) {
  const { env } = context;
  const from = clean(env.RESEND_FROM_EMAIL) || DEFAULT_BOOKING_FROM_EMAIL;
  const replyTo = clean(env.BOOKING_REPLY_TO_EMAIL) || DEFAULT_BOOKING_REPLY_TO_EMAIL;
  const subject = "Rezervácia konzultácie - Jakub Olša";
  const text = buildBookingConfirmationText(payload, context);

  const body = {
    from,
    to: [recipient],
    reply_to: replyTo,
    subject,
    text,
  };

  const response = await fetch(RESEND_EMAIL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Resend confirmation email failed");
  }

  return response.json();
}

function buildBookingConfirmationText(payload, context) {
  const statusLine =
    context.bookingStatus === "calendar_created"
      ? "Termín som si zapísal do kalendára."
      : "Termín beriem ako predbežný a ozvem sa s potvrdením.";

  return [
    "Dobrý deň,",
    "",
    "ďakujem za rezerváciu konzultácie.",
    "",
    `Termín: ${clean(payload.datum)} o ${clean(payload.cas)}`,
    `Téma: ${clean(payload.zamer)}`,
    `Lokalita: ${clean(payload.lokalita)}`,
    "",
    statusLine,
    "Ak bude potrebné termín upraviť, odpíšte na tento email alebo zavolajte.",
    "",
    "Jakub Olša",
    "realitný maklér | BOSEN Group",
    "+421 944 844 489",
  ].join("\n");
}

async function tryCreateBookingCrmRecords(payload, context) {
  try {
    return await createBookingCrmRecords(payload, context);
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "CRM write failed",
    };
  }
}

async function createBookingCrmRecords(payload, context) {
  const { env, interval, source, appointmentStatus, googleEventId = null, leadScore = calculateLeadScore(payload) } = context;
  const crmConfig = getCrmConfig(env);

  if (!crmConfig.enabled) {
    return { status: "skipped" };
  }

  const tenant = await ensureCrmTenant(crmConfig);
  const contact = await upsertCrmContact(crmConfig, tenant, payload, source);
  const lead = await insertCrmRow(crmConfig, "leads", {
    tenant_id: tenant.id,
    contact_id: contact.id,
    intent: normalizeCrmIntent(payload.zamer),
    status: "new",
    location: clean(payload.lokalita) || null,
    location_place_id: clean(payload.lokalita_place_id) || null,
    property_type: clean(payload.typ_detail) || clean(payload.typ) || clean(payload.typ_komercneho_priestoru) || null,
    budget: clean(payload.ocakavany_najom) || null,
    time_horizon: clean(payload.horizont) || null,
    source,
    qualification_score: leadScore.score,
    raw_payload: buildCrmRawPayload(payload, source, leadScore),
  });

  const appointment = await insertCrmRow(crmConfig, "appointments", {
    tenant_id: tenant.id,
    contact_id: contact.id,
    lead_id: lead.id,
    google_event_id: googleEventId,
    starts_at: interval.start ? new Date(interval.start).toISOString() : null,
    ends_at: interval.end ? new Date(interval.end).toISOString() : null,
    status: appointmentStatus,
    qualification_payload: buildCrmQualificationPayload(payload, leadScore),
    source,
  });

  await insertCrmRow(crmConfig, "notes", {
    tenant_id: tenant.id,
    entity_type: "lead",
    entity_id: lead.id,
    author_type: "system",
    body: leadLines(payload, { leadScore }).join("\n"),
    source,
  });

  return {
    status: "created",
    contactId: contact.id,
    leadId: lead.id,
    appointmentId: appointment.id,
    appointmentStatus: appointment.status,
  };
}

function getCrmConfig(env) {
  const supabaseUrl = clean(env.SUPABASE_URL || env.PUBLIC_SUPABASE_URL).replace(/\/+$/, "");
  const serviceKey = clean(env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.SUPABASE_SECRET_KEY);
  const hasAnyCrmEnv = Boolean(supabaseUrl || serviceKey);

  if (!hasAnyCrmEnv) {
    return { enabled: false };
  }

  if (!supabaseUrl || !serviceKey) {
    throw new Error("CRM Supabase configuration is incomplete");
  }

  return {
    enabled: true,
    supabaseUrl,
    serviceKey,
    tenantSlug: clean(env.SUPABASE_TENANT_SLUG) || DEFAULT_CRM_TENANT_SLUG,
    tenantName: clean(env.SUPABASE_TENANT_NAME) || DEFAULT_CRM_TENANT_NAME,
  };
}

async function ensureCrmTenant(crmConfig) {
  const rows = await supabaseCrmRequest(
    crmConfig,
    "GET",
    `/tenants?slug=eq.${encodeURIComponent(crmConfig.tenantSlug)}&select=id,slug,name&limit=1`,
  );

  if (rows[0]?.id) {
    return rows[0];
  }

  return insertCrmRow(crmConfig, "tenants", {
    slug: crmConfig.tenantSlug,
    name: crmConfig.tenantName,
  });
}

async function upsertCrmContact(crmConfig, tenant, payload, source) {
  const phone = clean(payload.telefon);
  const email = clean(payload.email).toLowerCase();
  const duplicate = await findCrmContact(crmConfig, tenant.id, { phone, email });

  if (duplicate) {
    return duplicate;
  }

  return insertCrmRow(crmConfig, "contacts", {
    tenant_id: tenant.id,
    name: clean(payload.meno),
    phone: phone || null,
    email: email || null,
    source,
    notes_summary: buildCrmContactSummary(payload),
    raw_payload: buildCrmRawPayload(payload, source),
  });
}

async function findCrmContact(crmConfig, tenantId, values) {
  const orTerms = [];

  if (values.phone) orTerms.push(`phone.eq.${escapePostgrestValue(values.phone)}`);
  if (values.email) orTerms.push(`email.eq.${escapePostgrestValue(values.email)}`);
  if (!orTerms.length) return null;

  const params = new URLSearchParams({
    tenant_id: `eq.${tenantId}`,
    deleted_at: "is.null",
    select: "*",
    limit: "1",
    or: `(${orTerms.join(",")})`,
  });
  const rows = await supabaseCrmRequest(crmConfig, "GET", `/contacts?${params.toString()}`);

  return rows[0] || null;
}

async function insertCrmRow(crmConfig, table, row) {
  const rows = await supabaseCrmRequest(crmConfig, "POST", `/${table}?select=*`, row);

  if (!rows[0]?.id) {
    throw new Error(`CRM insert into ${table} did not return an id`);
  }

  return rows[0];
}

async function supabaseCrmRequest(crmConfig, method, path, body) {
  const headers = {
    apikey: crmConfig.serviceKey,
    Authorization: `Bearer ${crmConfig.serviceKey}`,
    "Content-Type": "application/json",
  };

  if (method !== "GET") {
    headers.Prefer = "return=representation";
  }

  const response = await fetch(`${crmConfig.supabaseUrl}${SUPABASE_REST_PREFIX}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const parsed = text ? parseJsonResponse(text) : [];

  if (!response.ok) {
    throw new Error(`CRM ${method} ${path.split("?")[0]} failed`);
  }

  return parsed;
}

function parseJsonResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

function buildCrmRawPayload(payload, source, leadScore = null) {
  return {
    source,
    booking_payload: payload,
    attribution: payload.attribution && typeof payload.attribution === "object" ? payload.attribution : {},
    lead_score: leadScore,
    correlation: {
      session_id: clean(payload.session_id),
      lead_correlation_id: clean(payload.lead_correlation_id),
      consent_state: clean(payload.consent_state),
    },
  };
}

function buildCrmQualificationPayload(payload, leadScore = null) {
  return {
    zamer: clean(payload.zamer),
    typ: clean(payload.typ),
    typ_detail: clean(payload.typ_detail),
    lokalita: clean(payload.lokalita),
    lokalita_place_id: clean(payload.lokalita_place_id),
    lokalita_lat: clean(payload.lokalita_lat),
    lokalita_lng: clean(payload.lokalita_lng),
    lokalita_overena: clean(payload.lokalita_overena),
    parametre: Array.isArray(payload.parametre) ? payload.parametre.map(clean).filter(Boolean) : [],
    datum: clean(payload.datum),
    cas: clean(payload.cas),
    horizont: clean(payload.horizont),
    sprava: clean(payload.sprava),
    page_url: clean(payload.page_url),
    source_lead_id: clean(payload.source_lead_id),
    offer: clean(payload.offer),
    zdroj: clean(payload.zdroj),
    utm_source: clean(payload.utm_source),
    utm_medium: clean(payload.utm_medium),
    utm_campaign: clean(payload.utm_campaign),
    utm_content: clean(payload.utm_content),
    utm_term: clean(payload.utm_term),
    session_id: clean(payload.session_id),
    lead_correlation_id: clean(payload.lead_correlation_id),
    consent_state: clean(payload.consent_state),
    lead_score: leadScore,
    attribution: payload.attribution && typeof payload.attribution === "object" ? payload.attribution : {},
  };
}

function buildCrmContactSummary(payload) {
  return [clean(payload.zamer), clean(payload.lokalita), `${clean(payload.datum)} ${clean(payload.cas)}`.trim()]
    .filter(Boolean)
    .join(" | ");
}

function normalizeCrmIntent(value) {
  const intent = clean(value).toLowerCase();
  if (["sell", "buy", "rent", "consult", "estimate", "unknown"].includes(intent)) return intent;

  if (["predaj", "predať", "predat", "predávam", "predavam"].some((term) => intent.includes(term))) return "sell";
  if (["kúpa", "kupa", "kúpiť", "kupit", "kupujem"].some((term) => intent.includes(term))) return "buy";
  if (["prenájom", "prenajom", "prenajať", "prenajat"].some((term) => intent.includes(term))) return "rent";
  if (["odhad", "ocenenie", "cena"].some((term) => intent.includes(term))) return "estimate";
  if (["konzultácia", "konzultacia", "audit", "stratégia", "strategia"].some((term) => intent.includes(term))) {
    return "consult";
  }

  return "unknown";
}

function calculateLeadScore(payload) {
  const reasons = [];
  let score = 0;
  const intent = normalizeCrmIntent(payload.zamer);
  const phone = clean(payload.telefon);
  const email = clean(payload.email);
  const name = clean(payload.meno);
  const location = clean(payload.lokalita);
  const placeId = clean(payload.lokalita_place_id);
  const date = clean(payload.datum);
  const time = clean(payload.cas);
  const message = clean(payload.sprava);
  const parameters = Array.isArray(payload.parametre) ? payload.parametre.map(clean).filter(Boolean) : [];

  if (intent === "sell") {
    score += 30;
    reasons.push("seller_intent");
  }

  if (name && phone && email) {
    score += 20;
    reasons.push("complete_contact");
  }

  if (placeId || location) {
    score += 15;
    reasons.push(placeId ? "verified_or_specific_location" : "location_present");
  }

  if (date && time) {
    score += 15;
    reasons.push("selected_slot");
  }

  if (isNearTermHorizon(payload.horizont)) {
    score += 10;
    reasons.push("near_term_horizon");
  }

  if (parameters.length >= 3) {
    score += 10;
    reasons.push("property_context");
  }

  if (message.length >= 40) {
    score += 5;
    reasons.push("useful_message");
  }

  if (!phone) {
    score -= 20;
    reasons.push("missing_phone");
  }

  if (!email) {
    score -= 15;
    reasons.push("missing_email");
  }

  if (!clean(payload.zamer)) {
    score -= 20;
    reasons.push("missing_intent");
  }

  const clamped = Math.max(0, Math.min(100, score));

  return {
    score: clamped,
    bucket: leadScoreBucket(clamped),
    reasons,
    nextAction: leadScoreNextAction(clamped),
  };
}

function isNearTermHorizon(value) {
  const horizon = clean(value).toLowerCase();
  if (!horizon) return false;

  return [
    "hneď",
    "hned",
    "ihneď",
    "ihned",
    "čo najskôr",
    "co najskor",
    "do mesiaca",
    "1 mesiac",
    "do 3 mesiac",
    "3 mesiac",
    "tento mesiac",
  ].some((term) => horizon.includes(term));
}

function leadScoreBucket(score) {
  if (score >= 80) return "hot";
  if (score >= 50) return "qualified";
  if (score >= 25) return "nurture";
  return "weak";
}

function leadScoreNextAction(score) {
  const bucket = leadScoreBucket(score);

  if (bucket === "hot") return "Zavolať alebo potvrdiť konzultáciu do 2 hodín.";
  if (bucket === "qualified") return "Potvrdiť konzultáciu do 24 hodín.";
  if (bucket === "nurture") return "Uložiť follow-up a poslať jemné potvrdenie.";
  return "Skontrolovať manuálne, neeskalovať ako urgent.";
}

function escapePostgrestValue(value) {
  return String(value).replaceAll(",", "\\,").replaceAll(")", "\\)");
}

function buildCorsHeaders(origin, env) {
  const allowed = getAllowedOrigins(env);
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0] || DEFAULT_ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function isAllowedOrigin(origin, env) {
  if (!origin) return true;
  return getAllowedOrigins(env).includes(origin);
}

function getAllowedOrigins(env) {
  return readList(env.BOOKING_ALLOWED_ORIGINS, DEFAULT_ALLOWED_ORIGINS);
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

async function readJsonPayload(request) {
  const contentType = request.headers.get("Content-Type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error("Expected application/json payload");
  }

  const text = await request.text();

  if (text.length > 24000) {
    throw new Error("Payload is too large");
  }

  return JSON.parse(text);
}

function validateLeadPayload(payload) {
  const required = [
    ["meno", "meno"],
    ["telefon", "telefón"],
    ["zamer", "zámer"],
    ["lokalita", "lokalita"],
    ["datum", "dátum"],
    ["cas", "čas"],
    ["gdpr_suhlas", "súhlas so spracovaním údajov"],
  ];

  for (const [key, label] of required) {
    if (!String(payload[key] || "").trim()) {
      return `Chýba ${label}.`;
    }
  }

  if (!isValidDate(payload.datum)) {
    return "Dátum nie je v správnom formáte.";
  }

  if (!isValidTime(payload.cas)) {
    return "Čas nie je v správnom formáte.";
  }

  return "";
}

function hasGoogleCalendar(env) {
  return Boolean(
    env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET &&
      env.GOOGLE_REFRESH_TOKEN &&
      (env.GOOGLE_CALENDAR_ID || env.GOOGLE_CALENDAR_ID === ""),
  );
}

async function getGoogleAccessToken(env) {
  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error("Google OAuth refresh failed");
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("Google OAuth response did not include access_token");
  }

  return data.access_token;
}

async function fetchBusyIntervals(date, timeZone, accessToken, env) {
  const calendarIds = getGoogleBusyCalendarIds(env);
  const response = await fetch(`${GOOGLE_CALENDAR_API_URL}/freeBusy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: zonedDateTimeToUtcIso(date, "00:00", timeZone),
      timeMax: zonedDateTimeToUtcIso(addDays(date, 1), "00:00", timeZone),
      timeZone,
      items: calendarIds.map((id) => ({ id })),
    }),
  });

  if (!response.ok) {
    throw new Error("Google Calendar freeBusy failed");
  }

  const data = await response.json();
  const calendars = data.calendars || {};

  for (const calendarId of calendarIds) {
    if (calendars[calendarId]?.errors?.length) {
      throw new Error("Google Calendar returned freeBusy errors");
    }
  }

  return calendarIds.flatMap((calendarId) =>
    (calendars[calendarId]?.busy || []).map((item) => ({
      start: Date.parse(item.start),
      end: Date.parse(item.end),
    })),
  );
}

async function createCalendarEvent(payload, interval, timeZone, accessToken, env) {
  const calendarId = env.GOOGLE_CALENDAR_ID || "primary";
  const event = {
    summary: buildEventSummary(payload),
    description: buildEventDescription(payload),
    start: {
      dateTime: interval.startLocal,
      timeZone,
    },
    end: {
      dateTime: interval.endLocal,
      timeZone,
    },
    transparency: "opaque",
    extendedProperties: {
      private: {
        source: "jakubolsa.sk/rezervacia",
        zamer: String(payload.zamer || ""),
        phone: String(payload.telefon || ""),
      },
    },
  };

  const response = await fetch(
    `${GOOGLE_CALENDAR_API_URL}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=none`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    },
  );

  if (!response.ok) {
    throw new Error("Google Calendar event creation failed");
  }

  return response.json();
}

function getGoogleBusyCalendarIds(env) {
  const writeCalendarId = env.GOOGLE_CALENDAR_ID || "primary";
  return [...new Set(readList(env.GOOGLE_BUSY_CALENDAR_IDS, [writeCalendarId]))];
}

async function trySendTelegramNotification(payload, context) {
  try {
    const result = await sendTelegramNotification(payload, context);
    if (result?.skipped) {
      return { status: "skipped" };
    }
    return { status: "sent" };
  } catch {
    return { status: "failed" };
  }
}

async function sendTelegramNotification(payload, context) {
  const { env, bookingStatus, mode, calendarEvent, leadScore } = context;

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return { ok: false, skipped: true };
  }

  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: buildTelegramMessage(payload, { bookingStatus, mode, calendarEvent, leadScore }),
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    throw new Error("Telegram notification failed");
  }

  return response.json();
}

function buildEventSummary(payload) {
  const intent = clean(payload.zamer) || "Konzultácia";
  const name = clean(payload.meno) || "kontakt";
  return `${intent}: ${name}`;
}

function buildEventDescription(payload) {
  return [
    "Rezervácia konzultácie",
    "",
    ...leadLines(payload),
    "",
    "Zdroj: jakubolsa.sk/rezervacia",
  ].join("\n");
}

function buildTelegramMessage(payload, context) {
  const status =
    context.bookingStatus === "calendar_created"
      ? "Zapísané v Google kalendári"
      : "Prijaté bez Google kalendára";

  const lines = [
    "Nová rezervácia konzultácie",
    `Status: ${status}`,
    `Režim: ${context.mode}`,
    context.calendarEvent?.htmlLink ? `Kalendár: ${context.calendarEvent.htmlLink}` : "",
    "",
    ...leadLines(payload, { leadScore: context.leadScore }),
  ].filter(Boolean);

  return lines.join("\n");
}

function leadLines(payload, context = {}) {
  const parameters = Array.isArray(payload.parametre) ? payload.parametre : [];
  const leadScore = context.leadScore || null;

  return [
    leadScore ? `Lead score: ${leadScore.score} / ${leadScore.bucket}` : "",
    leadScore?.nextAction ? `Ďalší krok: ${leadScore.nextAction}` : "",
    leadScore ? "" : "",
    `Meno: ${clean(payload.meno)}`,
    `Telefón: ${clean(payload.telefon)}`,
    `Email: ${clean(payload.email) || "-"}`,
    `Zámer: ${clean(payload.zamer)}`,
    `Zdrojový lead: ${clean(payload.source_lead_id) || "-"}`,
    `Offer: ${clean(payload.offer) || "-"}`,
    `Typ / vetva: ${clean(payload.typ) || "-"}`,
    `Lokalita: ${clean(payload.lokalita)}`,
    "",
    "Parametre:",
    ...(parameters.length ? parameters.map((item) => `- ${clean(item)}`) : ["-"]),
    "",
    `Termín: ${clean(payload.datum)} o ${clean(payload.cas)}`,
    `Časový horizont: ${clean(payload.horizont) || "-"}`,
    `Zdroj návštevy: ${buildAttributionSummary(payload.attribution)}`,
    `Correlation ID: ${clean(payload.lead_correlation_id) || "-"}`,
    "",
    "Čo je dôležité:",
    clean(payload.sprava) || "-",
  ].filter((line, index, lines) => line || lines[index - 1]);
}

function buildAttributionSummary(attribution) {
  if (!attribution || typeof attribution !== "object") return "-";

  const parts = [];
  const source = clean(attribution.utm_source);
  const medium = clean(attribution.utm_medium);
  const campaign = clean(attribution.utm_campaign);
  const content = clean(attribution.utm_content);
  const sourceLeadId = clean(attribution.source_lead_id);
  const offer = clean(attribution.offer);
  const referrerHost = clean(attribution.referrer_host);
  const landingPath = clean(attribution.landing_path);
  const gclid = clean(attribution.gclid);
  const gbraid = clean(attribution.gbraid);
  const wbraid = clean(attribution.wbraid);
  const fbclid = clean(attribution.fbclid);
  const msclkid = clean(attribution.msclkid);

  if (source) parts.push(`utm_source=${source}`);
  if (medium) parts.push(`utm_medium=${medium}`);
  if (campaign) parts.push(`utm_campaign=${campaign}`);
  if (content) parts.push(`utm_content=${content}`);
  if (sourceLeadId) parts.push(`source_lead_id=${sourceLeadId}`);
  if (offer) parts.push(`offer=${offer}`);
  if (gclid) parts.push("gclid=present");
  if (gbraid) parts.push("gbraid=present");
  if (wbraid) parts.push("wbraid=present");
  if (fbclid) parts.push("fbclid=present");
  if (msclkid) parts.push("msclkid=present");
  if (referrerHost) parts.push(`referrer=${referrerHost}`);
  if (landingPath) parts.push(`landing=${landingPath}`);

  return parts.length ? parts.join(", ") : "-";
}

function buildInterval(date, time, minutes, timeZone) {
  const [hour, minute] = time.split(":").map(Number);
  const startTotal = hour * 60 + minute;
  const endTotal = startTotal + minutes;
  const endDate = endTotal >= 1440 ? addDays(date, 1) : date;
  const endTime = minutesToTime(endTotal % 1440);
  const startLocal = `${date}T${time}:00`;
  const endLocal = `${endDate}T${endTime}:00`;

  return {
    startLocal,
    endLocal,
    start: Date.parse(zonedDateTimeToUtcIso(date, time, timeZone)),
    end: Date.parse(zonedDateTimeToUtcIso(endDate, endTime, timeZone)),
  };
}

function zonedDateTimeToUtcIso(date, time, timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utcGuess);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  const offset = asUtc - utcGuess.getTime();

  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - offset).toISOString();
}

function overlaps(left, right) {
  return left.start < right.end && right.start < left.end;
}

function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function isValidTime(time) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(time));
}

function isLikelyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
}

function dayOfWeek(date) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function addDays(date, days) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function buildSlotTimes(env, slotMinutes) {
  const explicitSlots = readList(env.BOOKING_SLOT_TIMES, []);

  if (explicitSlots.length) {
    return explicitSlots.filter(isValidTime);
  }

  const start = parseTimeToMinutes(env.BOOKING_WORK_START || DEFAULT_WORK_START);
  const end = parseTimeToMinutes(env.BOOKING_WORK_END || DEFAULT_WORK_END);

  if (start === null || end === null || end <= start) {
    return [];
  }

  const slots = [];

  for (let total = start; total + slotMinutes <= end; total += slotMinutes) {
    slots.push(minutesToTime(total));
  }

  return slots;
}

function parseTimeToMinutes(time) {
  if (!isValidTime(time)) return null;

  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(total) {
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function readList(value, fallback) {
  if (!value) return fallback;

  const items = String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : fallback;
}

function readIntegerList(value, fallback) {
  const items = readList(value, [])
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isInteger(item));

  return items.length ? items : fallback;
}

function readInteger(value, fallback, allowZero = false) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && (allowZero ? parsed >= 0 : parsed > 0) ? parsed : fallback;
}

function clean(value) {
  return String(value || "").trim();
}
