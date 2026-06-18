#!/usr/bin/env node

const DEFAULT_TIMEOUT_MS = 8000;
const SUPABASE_REST_PREFIX = "/rest/v1";

const DEFAULT_TARGETS = [
  {
    service: "jakub-web-staging",
    url: "https://staging.jakubolsa.sk/api/health",
  },
  {
    service: "jakub-web-production",
    url: "https://jakubolsa.sk/api/health",
  },
  {
    service: "openclaw-public",
    url: "https://openclaw.jakubolsa.sk/healthz",
  },
];

const LOCAL_OPENCLAW_TARGET = {
  service: "openclaw-local",
  url: "http://127.0.0.1:18789/healthz",
};

function parseTimeoutMs() {
  const raw = process.env.JAKUB_HEALTH_TIMEOUT_MS;
  if (!raw) return DEFAULT_TIMEOUT_MS;

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("JAKUB_HEALTH_TIMEOUT_MS must be a positive integer");
  }

  return value;
}

function parseTargets() {
  const rawTargets = process.env.JAKUB_HEALTH_TARGETS;
  const targets = rawTargets ? parseJsonTargets(rawTargets) : [...DEFAULT_TARGETS];

  if (process.env.JAKUB_HEALTH_INCLUDE_LOCAL_OPENCLAW === "1") {
    targets.push(LOCAL_OPENCLAW_TARGET);
  }

  return targets.map(normalizeTarget);
}

function parseJsonTargets(rawTargets) {
  let parsed;
  try {
    parsed = JSON.parse(rawTargets);
  } catch (error) {
    throw new Error(`JAKUB_HEALTH_TARGETS is not valid JSON: ${error.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("JAKUB_HEALTH_TARGETS must be a JSON array");
  }

  return parsed;
}

function normalizeTarget(target) {
  if (!target || typeof target !== "object") {
    throw new Error("Each health target must be an object");
  }

  const service = String(target.service || "").trim();
  const url = String(target.url || "").trim();

  if (!service) throw new Error("Each health target needs a service name");
  if (!url) throw new Error(`Health target ${service} needs a url`);

  const parsedUrl = new URL(url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`Health target ${service} must use http or https`);
  }

  return { service, url: parsedUrl.toString() };
}

function getSupabaseConfig() {
  return {
    url: String(process.env.JAKUB_SUPABASE_URL || process.env.SUPABASE_URL || "").trim().replace(/\/+$/, ""),
    key: String(process.env.JAKUB_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
    tenantSlug: String(process.env.JAKUB_SUPABASE_TENANT_SLUG || process.env.SUPABASE_TENANT_SLUG || "jakub-olsa").trim(),
  };
}

async function checkTarget(target, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(target.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "jakub-health-check/1.0",
      },
    });

    await response.arrayBuffer();

    return buildResult(target, {
      ok: response.ok,
      status: response.status,
      latency_ms: elapsedMs(startedAt),
    });
  } catch (error) {
    return buildResult(target, {
      ok: false,
      status: null,
      latency_ms: elapsedMs(startedAt),
      error: error.name === "AbortError" ? "timeout" : error.message,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function buildResult(target, fields) {
  const result = {
    service: target.service,
    url: target.url,
    ok: fields.ok,
    status: fields.status,
    latency_ms: fields.latency_ms,
    checked_at: new Date().toISOString(),
  };

  if (fields.error) {
    result.error = fields.error;
  }

  return result;
}

function elapsedMs(startedAt) {
  return Math.round(performance.now() - startedAt);
}

async function supabaseRead(path, timeoutMs) {
  const { url, key } = getSupabaseConfig();

  if (!url || !key) {
    throw new Error("Supabase URL or service role key is missing");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${url}${SUPABASE_REST_PREFIX}${path}`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "User-Agent": "jakub-health-check/1.0",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase read failed: ${response.status} ${text.slice(0, 180)}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function checkSupabaseAdminCases(timeoutMs) {
  const startedAt = performance.now();
  const target = {
    service: "jakub-admin-cases-open",
    url: "supabase://admin_cases?status=open",
  };

  try {
    const { tenantSlug } = getSupabaseConfig();
    const tenants = await supabaseRead(
      `/tenants?select=id,slug&slug=eq.${encodeURIComponent(tenantSlug)}&limit=1`,
      timeoutMs,
    );
    const tenant = Array.isArray(tenants) ? tenants[0] : null;

    if (!tenant?.id) {
      return buildResult(target, {
        ok: false,
        status: null,
        latency_ms: elapsedMs(startedAt),
        error: `Tenant not found: ${tenantSlug}`,
      });
    }

    const cases = await supabaseRead(
      `/admin_cases?select=id,severity,title,created_at&tenant_id=eq.${encodeURIComponent(
        tenant.id,
      )}&status=eq.open&order=created_at.desc&limit=5`,
      timeoutMs,
    );
    const openCases = Array.isArray(cases) ? cases : [];
    const result = buildResult(target, {
      ok: openCases.length === 0,
      status: 200,
      latency_ms: elapsedMs(startedAt),
      error: openCases.length ? `${openCases.length} open admin case(s)` : "",
    });

    result.open_cases = openCases.length;
    result.cases = openCases.map((item) => ({
      id: item.id,
      severity: item.severity,
      title: item.title,
      created_at: item.created_at,
    }));

    return result;
  } catch (error) {
    return buildResult(target, {
      ok: false,
      status: null,
      latency_ms: elapsedMs(startedAt),
      error: error.name === "AbortError" ? "timeout" : error.message,
    });
  }
}

try {
  const timeoutMs = parseTimeoutMs();
  const targets = parseTargets();
  const checks = targets.map((target) => checkTarget(target, timeoutMs));

  if (process.env.JAKUB_HEALTH_INCLUDE_SUPABASE_ADMIN_CASES === "1") {
    checks.push(checkSupabaseAdminCases(timeoutMs));
  }

  const results = await Promise.all(checks);

  console.log(JSON.stringify(results, null, 2));

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 2;
}
