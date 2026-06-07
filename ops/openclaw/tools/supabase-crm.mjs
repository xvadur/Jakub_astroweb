#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const REST_PREFIX = "/rest/v1";
const DEFAULT_TENANT_SLUG = "jakub-olsa";
const DEFAULT_TENANT_NAME = "Jakub Olša";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const COMMANDS = new Map([
  ["crm.searchContacts", searchContacts],
  ["crm.createContact", createContact],
  ["crm.createLead", createLead],
  ["crm.updateLead", updateLead],
  ["crm.addNote", addNote],
  ["crm.createTask", createTask],
  ["crm.createAppointment", createAppointment],
  ["crm.writeAuditLog", writeAuditLog],
]);

const ALIASES = new Map([
  ["search-contacts", "crm.searchContacts"],
  ["create-contact", "crm.createContact"],
  ["create-lead", "crm.createLead"],
  ["update-lead", "crm.updateLead"],
  ["add-note", "crm.addNote"],
  ["create-task", "crm.createTask"],
  ["create-appointment", "crm.createAppointment"],
  ["write-audit-log", "crm.writeAuditLog"],
]);

main().catch((error) => {
  writeJson({
    ok: false,
    error: error instanceof Error ? error.message : "Unknown error",
  });
  process.exitCode = 1;
});

async function main() {
  const args = process.argv.slice(2);
  const commandArg = args.find((arg) => !arg.startsWith("--"));

  if (!commandArg || args.includes("--help") || args.includes("-h")) {
    writeJson({ ok: true, usage: buildUsage() });
    return;
  }

  const command = normalizeCommand(commandArg);
  const handler = COMMANDS.get(command);

  if (!handler) {
    throw new Error(`Unknown command "${commandArg}". Run with --help for commands.`);
  }

  const payload = await readPayload(args);
  const ctx = await buildContext(payload);
  const result = await handler(ctx, payload);

  writeJson({
    ok: true,
    tool: command,
    ...result,
  });
}

function buildUsage() {
  return {
    command: "node ops/openclaw/tools/supabase-crm.mjs <command> --json '<json>'",
    stdin: "echo '{\"name\":\"Test\"}' | node ops/openclaw/tools/supabase-crm.mjs crm.createContact",
    env: [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY_FILE",
      "SUPABASE_TENANT_SLUG optional, default jakub-olsa",
      "SUPABASE_TENANT_NAME optional, default Jakub Olša",
    ],
    commands: Array.from(COMMANDS.keys()),
  };
}

function normalizeCommand(command) {
  return ALIASES.get(command) || command;
}

async function readPayload(args) {
  const jsonIndex = args.indexOf("--json");
  if (jsonIndex !== -1) {
    const raw = args[jsonIndex + 1];
    if (!raw) throw new Error("--json requires a JSON string");
    return parseJson(raw);
  }

  if (process.stdin.isTTY) {
    return {};
  }

  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? parseJson(raw) : {};
}

function parseJson(raw) {
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Payload must be a JSON object");
    }
    return value;
  } catch (error) {
    if (error instanceof Error && error.message === "Payload must be a JSON object") {
      throw error;
    }
    throw new Error("Invalid JSON payload");
  }
}

async function buildContext(payload) {
  const supabaseUrl = cleanEnv("SUPABASE_URL") || cleanEnv("PUBLIC_SUPABASE_URL");
  const serviceKey =
    cleanEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    cleanEnv("SUPABASE_SERVICE_KEY") ||
    cleanEnv("SUPABASE_SECRET_KEY") ||
    (await readSecretFile(
      cleanEnv("SUPABASE_SERVICE_ROLE_KEY_FILE") ||
        cleanEnv("SUPABASE_SERVICE_KEY_FILE") ||
        cleanEnv("SUPABASE_SECRET_KEY_FILE"),
    ));

  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
  if (!serviceKey) throw new Error("Missing Supabase service role key env or key file");

  const tenantSlug = clean(payload.tenant_slug) || cleanEnv("SUPABASE_TENANT_SLUG") || DEFAULT_TENANT_SLUG;
  const tenantName = clean(payload.tenant_name) || cleanEnv("SUPABASE_TENANT_NAME") || DEFAULT_TENANT_NAME;

  const ctx = {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    serviceKey,
    tenantSlug,
    tenantName,
  };

  ctx.tenant = await ensureTenant(ctx);
  return ctx;
}

async function readSecretFile(path) {
  if (!path) return "";
  return (await readFile(path, "utf8")).trim();
}

async function ensureTenant(ctx) {
  const existing = await supabaseRequest(
    ctx,
    "GET",
    `/tenants?slug=eq.${encodeURIComponent(ctx.tenantSlug)}&select=*&limit=1`,
  );

  if (existing[0]?.id) return existing[0];

  const created = await supabaseRequest(ctx, "POST", "/tenants?select=*", {
    slug: ctx.tenantSlug,
    name: ctx.tenantName,
  });

  if (!created[0]?.id) throw new Error("Tenant bootstrap did not return id");
  return created[0];
}

async function searchContacts(ctx, payload) {
  const filters = [`tenant_id=eq.${ctx.tenant.id}`, "deleted_at=is.null", "select=*", "order=updated_at.desc", "limit=20"];
  const orTerms = [];
  const phone = clean(payload.phone);
  const email = clean(payload.email);
  const name = clean(payload.name);
  const query = clean(payload.query);

  if (phone) orTerms.push(`phone.eq.${escapePostgrestValue(phone)}`);
  if (email) orTerms.push(`email.eq.${escapePostgrestValue(email.toLowerCase())}`);
  if (name) orTerms.push(`name.ilike.*${escapePostgrestLike(name)}*`);
  if (query) {
    orTerms.push(`name.ilike.*${escapePostgrestLike(query)}*`);
    orTerms.push(`phone.ilike.*${escapePostgrestLike(query)}*`);
    orTerms.push(`email.ilike.*${escapePostgrestLike(query)}*`);
  }

  if (orTerms.length > 0) {
    filters.push(`or=(${orTerms.join(",")})`);
  }

  const contacts = await supabaseRequest(ctx, "GET", `/contacts?${filters.map(encodeFilter).join("&")}`);
  return { contacts };
}

async function createContact(ctx, payload) {
  const name = required(payload.name, "name");
  const phone = clean(payload.phone);
  const email = clean(payload.email);

  const duplicate = await findExistingContact(ctx, { phone, email });
  if (duplicate) {
    return { contact_id: duplicate.id, contact: duplicate, created: false };
  }

  const row = await insertOne(ctx, "contacts", {
    tenant_id: ctx.tenant.id,
    name,
    phone: phone || null,
    email: email ? email.toLowerCase() : null,
    source: clean(payload.source) || "openclaw",
    notes_summary: clean(payload.notes_summary) || null,
    raw_payload: safeObject(payload.raw_payload),
  });

  await audit(ctx, {
    actor_type: clean(payload.actor_type) || "agent",
    actor_id: clean(payload.actor_id) || "jakub-olsa",
    action: "crm.createContact",
    entity_type: "contact",
    entity_id: row.id,
    after: row,
  });

  return { contact_id: row.id, contact: row, created: true };
}

async function createLead(ctx, payload) {
  const contact = await resolveContact(ctx, payload);
  const lead = await insertOne(ctx, "leads", {
    tenant_id: ctx.tenant.id,
    contact_id: contact?.id || clean(payload.contact_id) || null,
    intent: normalizeIntent(payload.intent),
    status: normalizeLeadStatus(payload.status),
    location: clean(payload.location) || null,
    location_place_id: clean(payload.location_place_id) || null,
    property_type: clean(payload.property_type) || clean(payload.property) || null,
    budget: clean(payload.budget) || null,
    time_horizon: clean(payload.time_horizon) || null,
    source: clean(payload.source) || "openclaw",
    qualification_score: readInteger(payload.qualification_score),
    next_follow_up_at: clean(payload.next_follow_up_at) || null,
    raw_payload: safeObject(payload.raw_payload),
  });

  await audit(ctx, {
    actor_type: clean(payload.actor_type) || "agent",
    actor_id: clean(payload.actor_id) || "jakub-olsa",
    action: "crm.createLead",
    entity_type: "lead",
    entity_id: lead.id,
    after: lead,
  });

  return { lead_id: lead.id, lead, contact_id: lead.contact_id };
}

async function updateLead(ctx, payload) {
  const leadId = required(payload.lead_id || payload.id, "lead_id");
  const beforeRows = await supabaseRequest(
    ctx,
    "GET",
    `/leads?id=eq.${encodeURIComponent(leadId)}&tenant_id=eq.${ctx.tenant.id}&select=*&limit=1`,
  );

  const before = beforeRows[0];
  if (!before) throw new Error(`Lead not found: ${leadId}`);

  const patch = pickDefined({
    status: payload.status ? normalizeLeadStatus(payload.status) : undefined,
    intent: payload.intent ? normalizeIntent(payload.intent) : undefined,
    location: cleanOrUndefined(payload.location),
    location_place_id: cleanOrUndefined(payload.location_place_id),
    property_type: cleanOrUndefined(payload.property_type),
    budget: cleanOrUndefined(payload.budget),
    time_horizon: cleanOrUndefined(payload.time_horizon),
    source: cleanOrUndefined(payload.source),
    qualification_score: payload.qualification_score === undefined ? undefined : readInteger(payload.qualification_score),
    next_follow_up_at: cleanOrUndefined(payload.next_follow_up_at),
    raw_payload: payload.raw_payload === undefined ? undefined : safeObject(payload.raw_payload),
  });

  if (Object.keys(patch).length === 0) {
    throw new Error("No supported lead fields to update");
  }

  const updated = await supabaseRequest(
    ctx,
    "PATCH",
    `/leads?id=eq.${encodeURIComponent(leadId)}&tenant_id=eq.${ctx.tenant.id}&select=*`,
    patch,
  );

  const after = updated[0];
  await audit(ctx, {
    actor_type: clean(payload.actor_type) || "agent",
    actor_id: clean(payload.actor_id) || "jakub-olsa",
    action: "crm.updateLead",
    entity_type: "lead",
    entity_id: leadId,
    before,
    after,
  });

  return { lead_id: leadId, lead: after };
}

async function addNote(ctx, payload) {
  const entityType = normalizeEntityType(payload.entity_type);
  const entityId = required(payload.entity_id, "entity_id");
  const body = required(payload.body, "body");

  const note = await insertOne(ctx, "notes", {
    tenant_id: ctx.tenant.id,
    entity_type: entityType,
    entity_id: entityId,
    author_type: normalizeAuthorType(payload.author_type),
    body,
    source: clean(payload.source) || "openclaw",
  });

  await audit(ctx, {
    actor_type: clean(payload.actor_type) || "agent",
    actor_id: clean(payload.actor_id) || "jakub-olsa",
    action: "crm.addNote",
    entity_type: "note",
    entity_id: note.id,
    after: note,
  });

  return { note_id: note.id, note };
}

async function createTask(ctx, payload) {
  const title = required(payload.title, "title");
  const assignedTo = clean(payload.assigned_to);
  const task = await insertOne(ctx, "tasks", {
    tenant_id: ctx.tenant.id,
    lead_id: clean(payload.lead_id) || null,
    title,
    status: normalizeTaskStatus(payload.status),
    due_at: clean(payload.due_at) || null,
    assigned_to: UUID_RE.test(assignedTo) ? assignedTo : null,
  });

  await audit(ctx, {
    actor_type: clean(payload.actor_type) || "agent",
    actor_id: clean(payload.actor_id) || "jakub-olsa",
    action: "crm.createTask",
    entity_type: "task",
    entity_id: task.id,
    after: task,
  });

  return {
    task_id: task.id,
    task,
    assigned_to_ignored: assignedTo && !UUID_RE.test(assignedTo) ? assignedTo : undefined,
  };
}

async function createAppointment(ctx, payload) {
  const appointment = await insertOne(ctx, "appointments", {
    tenant_id: ctx.tenant.id,
    contact_id: clean(payload.contact_id) || null,
    lead_id: clean(payload.lead_id) || null,
    google_event_id: clean(payload.google_event_id) || null,
    starts_at: clean(payload.starts_at) || null,
    ends_at: clean(payload.ends_at) || null,
    status: normalizeAppointmentStatus(payload.status),
    qualification_payload: safeObject(payload.qualification_payload),
    source: clean(payload.source) || "openclaw",
  });

  await audit(ctx, {
    actor_type: clean(payload.actor_type) || "agent",
    actor_id: clean(payload.actor_id) || "jakub-olsa",
    action: "crm.createAppointment",
    entity_type: "appointment",
    entity_id: appointment.id,
    after: appointment,
  });

  return { appointment_id: appointment.id, appointment };
}

async function writeAuditLog(ctx, payload) {
  const row = await insertAudit(ctx, {
    actor_type: normalizeActorType(payload.actor_type),
    actor_id: clean(payload.actor_id) || "jakub-olsa",
    action: required(payload.action, "action"),
    entity_type: clean(payload.entity_type) || null,
    entity_id: clean(payload.entity_id) || null,
    before: payload.before === undefined ? null : safeObject(payload.before),
    after: payload.after === undefined ? null : safeObject(payload.after),
  });

  return { audit_log_id: row.id, audit_log: row };
}

async function resolveContact(ctx, payload) {
  const contactId = clean(payload.contact_id);
  if (contactId) return null;

  const contactPayload = payload.contact && typeof payload.contact === "object" ? payload.contact : payload;
  if (!clean(contactPayload.name)) return null;

  const result = await createContact(ctx, {
    ...contactPayload,
    source: clean(contactPayload.source) || clean(payload.source) || "openclaw",
    actor_type: clean(payload.actor_type) || "agent",
    actor_id: clean(payload.actor_id) || "jakub-olsa",
    raw_payload: safeObject(contactPayload.raw_payload || payload.raw_payload),
  });

  return result.contact;
}

async function findExistingContact(ctx, { phone, email }) {
  const filters = [`tenant_id=eq.${ctx.tenant.id}`, "deleted_at=is.null", "select=*", "limit=1"];
  const orTerms = [];

  if (phone) orTerms.push(`phone.eq.${escapePostgrestValue(phone)}`);
  if (email) orTerms.push(`email.eq.${escapePostgrestValue(email.toLowerCase())}`);
  if (orTerms.length === 0) return null;

  filters.push(`or=(${orTerms.join(",")})`);
  const rows = await supabaseRequest(ctx, "GET", `/contacts?${filters.map(encodeFilter).join("&")}`);
  return rows[0] || null;
}

async function insertOne(ctx, table, body) {
  const rows = await supabaseRequest(ctx, "POST", `/${table}?select=*`, body);
  if (!rows[0]?.id) throw new Error(`Insert into ${table} did not return id`);
  return rows[0];
}

async function audit(ctx, payload) {
  await insertAudit(ctx, {
    actor_type: normalizeActorType(payload.actor_type),
    actor_id: clean(payload.actor_id) || null,
    action: required(payload.action, "action"),
    entity_type: clean(payload.entity_type) || null,
    entity_id: clean(payload.entity_id) || null,
    before: payload.before === undefined ? null : safeObject(payload.before),
    after: payload.after === undefined ? null : safeObject(payload.after),
  });
}

async function insertAudit(ctx, body) {
  return insertOne(ctx, "audit_logs", {
    tenant_id: ctx.tenant.id,
    ...body,
  });
}

async function supabaseRequest(ctx, method, path, body) {
  const response = await fetch(`${ctx.supabaseUrl}${REST_PREFIX}${path}`, {
    method,
    headers: {
      apikey: ctx.serviceKey,
      Authorization: `Bearer ${ctx.serviceKey}`,
      "Content-Type": "application/json",
      Prefer: method === "GET" ? "" : "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const parsed = text ? parseSupabaseJson(text) : [];

  if (!response.ok) {
    const message = typeof parsed === "object" && parsed?.message ? parsed.message : text.slice(0, 240);
    throw new Error(`Supabase ${method} ${path.split("?")[0]} failed: ${response.status} ${message}`);
  }

  return parsed;
}

function parseSupabaseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function encodeFilter(filter) {
  const [key, ...valueParts] = filter.split("=");
  return `${key}=${encodeURIComponent(valueParts.join("="))}`;
}

function escapePostgrestValue(value) {
  return String(value).replaceAll(",", "\\,").replaceAll(")", "\\)");
}

function escapePostgrestLike(value) {
  return escapePostgrestValue(value).replaceAll("*", "\\*");
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanOrUndefined(value) {
  const cleaned = clean(value);
  return cleaned || undefined;
}

function cleanEnv(name) {
  return clean(process.env[name]);
}

function required(value, name) {
  const cleaned = clean(value);
  if (!cleaned) throw new Error(`Missing required field: ${name}`);
  return cleaned;
}

function safeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function pickDefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function readInteger(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeIntent(value) {
  const intent = clean(value).toLowerCase();
  if (["sell", "buy", "rent", "consult", "estimate", "unknown"].includes(intent)) return intent;

  const map = new Map([
    ["predaj", "sell"],
    ["predat", "sell"],
    ["predať", "sell"],
    ["kupa", "buy"],
    ["kúpa", "buy"],
    ["kupit", "buy"],
    ["kúpiť", "buy"],
    ["prenajom", "rent"],
    ["prenájom", "rent"],
    ["konzultacia", "consult"],
    ["konzultácia", "consult"],
    ["odhad", "estimate"],
    ["ocenenie", "estimate"],
  ]);

  return map.get(intent) || "unknown";
}

function normalizeLeadStatus(value) {
  const status = clean(value).toLowerCase();
  if (["new", "qualified", "contacted", "meeting", "won", "lost", "archived"].includes(status)) return status;
  return "new";
}

function normalizeTaskStatus(value) {
  const status = clean(value).toLowerCase();
  if (["open", "done", "cancelled"].includes(status)) return status;
  return "open";
}

function normalizeAppointmentStatus(value) {
  const status = clean(value).toLowerCase();
  if (["requested", "confirmed", "cancelled", "rescheduled", "no_show"].includes(status)) return status;
  return "confirmed";
}

function normalizeEntityType(value) {
  const entityType = clean(value).toLowerCase();
  if (["contact", "lead", "property", "deal", "appointment", "task"].includes(entityType)) return entityType;
  throw new Error(`Unsupported entity_type: ${value}`);
}

function normalizeAuthorType(value) {
  const authorType = clean(value).toLowerCase();
  if (["jakub", "agent", "adam", "system"].includes(authorType)) return authorType;
  return "agent";
}

function normalizeActorType(value) {
  const actorType = clean(value).toLowerCase();
  if (["jakub", "adam", "agent", "system"].includes(actorType)) return actorType;
  return "agent";
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
