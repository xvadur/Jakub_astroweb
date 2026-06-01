const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3";

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
  }

  const telegramPromise = sendTelegramNotification(payload, {
    env,
    bookingStatus,
    mode,
    calendarEvent,
  });

  ctx.waitUntil(telegramPromise.catch(() => null));

  return json(
    {
      ok: true,
      mode,
      bookingStatus,
      eventId: calendarEvent?.id || "",
      eventLink: calendarEvent?.htmlLink || "",
    },
    200,
    headers,
  );
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
  const calendarId = env.GOOGLE_CALENDAR_ID || "primary";
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
      items: [{ id: calendarId }],
    }),
  });

  if (!response.ok) {
    throw new Error("Google Calendar freeBusy failed");
  }

  const data = await response.json();
  const calendar = data.calendars?.[calendarId];

  if (calendar?.errors?.length) {
    throw new Error("Google Calendar returned freeBusy errors");
  }

  return (calendar?.busy || []).map((item) => ({
    start: Date.parse(item.start),
    end: Date.parse(item.end),
  }));
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

async function sendTelegramNotification(payload, context) {
  const { env, bookingStatus, mode, calendarEvent } = context;

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return { ok: false, skipped: true };
  }

  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: buildTelegramMessage(payload, { bookingStatus, mode, calendarEvent }),
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
    ...leadLines(payload),
  ].filter(Boolean);

  return lines.join("\n");
}

function leadLines(payload) {
  const parameters = Array.isArray(payload.parametre) ? payload.parametre : [];

  return [
    `Meno: ${clean(payload.meno)}`,
    `Telefón: ${clean(payload.telefon)}`,
    `Email: ${clean(payload.email) || "-"}`,
    `Zámer: ${clean(payload.zamer)}`,
    `Typ / vetva: ${clean(payload.typ) || "-"}`,
    `Lokalita: ${clean(payload.lokalita)}`,
    "",
    "Parametre:",
    ...(parameters.length ? parameters.map((item) => `- ${clean(item)}`) : ["-"]),
    "",
    `Termín: ${clean(payload.datum)} o ${clean(payload.cas)}`,
    `Časový horizont: ${clean(payload.horizont) || "-"}`,
    "",
    "Čo je dôležité:",
    clean(payload.sprava) || "-",
  ];
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
