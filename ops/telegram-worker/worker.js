const FIELD_LABELS = {
  meno: "Meno",
  telefon: "Telefón",
  email: "Email",
  zamer: "Dôvod kontaktu",
  "preferovany-den": "Preferovaný deň",
  "preferovany-cas": "Preferovaný čas",
  lokalita: "Lokalita alebo typ nehnuteľnosti",
  poznamka: "Poznámka",
  suhlas: "Súhlas so spracovaním údajov",
  source: "Zdroj",
  createdAt: "Vytvorené",
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = buildCorsHeaders(origin, env.ALLOWED_ORIGINS);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405, corsHeaders);
    }

    if (!env.TELEGRAM_BOT_TOKEN) {
      return json({ ok: false, error: "Telegram bot token is not configured" }, 500, corsHeaders);
    }

    let payload;

    try {
      payload = await readPayload(request);
    } catch {
      return json({ ok: false, error: "Invalid form payload" }, 400, corsHeaders);
    }

    const client = resolveClient(payload.source, env);
    const chatId = client.chatId || env.TELEGRAM_CHAT_ID;

    if (!chatId) {
      return json({ ok: false, error: "Telegram chat ID is not configured" }, 500, corsHeaders);
    }

    const text = buildTelegramMessage(payload, client.label);
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
      },
    );

    if (!telegramResponse.ok) {
      const details = await telegramResponse.text();
      return json({ ok: false, error: "Telegram send failed", details }, 502, corsHeaders);
    }

    return json({ ok: true }, 200, corsHeaders);
  },
};

function buildCorsHeaders(origin, allowedOrigins = "") {
  const allowed = allowedOrigins
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const allowOrigin = allowed.includes(origin) || allowed.includes("*") ? origin || "*" : allowed[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

async function readPayload(request) {
  const contentType = request.headers.get("Content-Type") || "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

function resolveClient(source, env) {
  if (!env.CLIENTS_JSON) {
    return {};
  }

  try {
    const clients = JSON.parse(env.CLIENTS_JSON);
    return clients[source] || {};
  } catch {
    return {};
  }
}

function buildTelegramMessage(payload, label = "") {
  const title = label ? `Nový dopyt: ${label}` : "Nový dopyt z webu";
  const lines = Object.entries(payload)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => `${FIELD_LABELS[key] || key}: ${value}`);

  return `${title}\n\n${lines.join("\n")}`;
}
