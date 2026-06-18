#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import { readFile } from "node:fs/promises";

const REST_PREFIX = "/rest/v1";
const STORAGE_PREFIX = "/storage/v1";
const DEFAULT_SUPABASE_URL = "https://cnwfafunbzzelstnnxzr.supabase.co";
const DEFAULT_TENANT_SLUG = "jakub-olsa";
const DEFAULT_TENANT_NAME = "Jakub Olša";
const DEFAULT_MEDIA_BUCKET = "jakub-media";
const DEFAULT_AGENT_ID = "jakub-olsa";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

const DEFAULT_SUPABASE_KEY_FILES = [
  "/home/node/.openclaw/secrets/jakub-supabase-service-role-key",
  "/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/secrets/jakub-supabase-service-role-key",
];

const DEFAULT_TELEGRAM_TOKEN_FILES = [
  "/home/node/.openclaw/credentials/jakub-telegram-bot-token",
  "/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/credentials/jakub-telegram-bot-token",
  "/Users/xvadur_mac/.openclaw/credentials/jakub-telegram-bot-token",
];

const COMMANDS = new Map([
  ["media.saveLocalFile", saveLocalFile],
  ["media.saveTelegramPhoto", saveTelegramPhoto],
  ["media.createPropertyDraft", createPropertyDraft],
  ["media.ingestPropertyMedia", ingestPropertyMedia],
]);

const ALIASES = new Map([
  ["save-local-file", "media.saveLocalFile"],
  ["save-telegram-photo", "media.saveTelegramPhoto"],
  ["create-property-draft", "media.createPropertyDraft"],
  ["ingest-property-media", "media.ingestPropertyMedia"],
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
  if (!handler) throw new Error(`Unknown command "${commandArg}". Run with --help for commands.`);

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
    command: "node ops/openclaw/tools/supabase-media.mjs <command> --json '<json>'",
    commands: Array.from(COMMANDS.keys()),
    env: [
      "SUPABASE_URL optional, defaults to Jakub project",
      "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY_FILE",
      "SUPABASE_MEDIA_BUCKET optional, default jakub-media",
      "TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN_FILE for Telegram downloads",
    ],
    examples: [
      "node ops/openclaw/tools/supabase-media.mjs media.saveLocalFile --json '{\"local_path\":\"/tmp/photo.jpg\",\"property_id\":\"uuid\"}'",
      "node ops/openclaw/tools/supabase-media.mjs media.saveTelegramPhoto --json '{\"telegram_file_id\":\"file-id\",\"property_id\":\"uuid\"}'",
      "node ops/openclaw/tools/supabase-media.mjs media.ingestPropertyMedia --json '{\"title\":\"Byt Ruzinov\",\"missing_fields\":[\"price_text\"],\"local_files\":[{\"local_path\":\"/tmp/photo.jpg\"}]}'",
    ],
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

  if (process.stdin.isTTY) return {};

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
    if (error instanceof Error && error.message === "Payload must be a JSON object") throw error;
    throw new Error("Invalid JSON payload");
  }
}

async function buildContext(payload) {
  const supabaseUrl = cleanEnv("SUPABASE_URL") || cleanEnv("PUBLIC_SUPABASE_URL") || DEFAULT_SUPABASE_URL;
  const serviceKey =
    cleanEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    cleanEnv("SUPABASE_SERVICE_KEY") ||
    cleanEnv("SUPABASE_SECRET_KEY") ||
    (await readFirstSecretFile([
      cleanEnv("SUPABASE_SERVICE_ROLE_KEY_FILE"),
      cleanEnv("SUPABASE_SERVICE_KEY_FILE"),
      cleanEnv("SUPABASE_SECRET_KEY_FILE"),
      ...DEFAULT_SUPABASE_KEY_FILES,
    ]));

  if (!serviceKey) throw new Error("Missing Supabase service role key env or key file");

  const tenantSlug = clean(payload.tenant_slug) || cleanEnv("SUPABASE_TENANT_SLUG") || DEFAULT_TENANT_SLUG;
  const tenantName = clean(payload.tenant_name) || cleanEnv("SUPABASE_TENANT_NAME") || DEFAULT_TENANT_NAME;
  const bucket = clean(payload.bucket) || cleanEnv("SUPABASE_MEDIA_BUCKET") || DEFAULT_MEDIA_BUCKET;

  const ctx = {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    serviceKey,
    tenantSlug,
    tenantName,
    bucket,
  };

  ctx.tenant = await ensureTenant(ctx);
  return ctx;
}

async function readFirstSecretFile(paths) {
  for (const path of paths) {
    if (!path) continue;
    try {
      const value = (await readFile(path, "utf8")).trim();
      if (value) return value;
    } catch {
      // Try the next configured secret file.
    }
  }
  return "";
}

async function saveLocalFile(ctx, payload) {
  const localPath = required(payload.local_path, "local_path");
  const buffer = await readFile(localPath);
  const originalFilename = clean(payload.original_filename) || basename(localPath);
  const contentType = clean(payload.content_type) || inferContentType(originalFilename);
  const storagePath = buildStoragePath(ctx, payload, originalFilename);

  await uploadObject(ctx, storagePath, buffer, contentType);
  const media = await insertMedia(ctx, payload, {
    storagePath,
    originalFilename,
    contentType,
    byteSize: buffer.byteLength,
    checksum: sha256(buffer),
    rawPayload: {
      ...safeObject(payload.raw_payload),
      local_path: localPath,
    },
  });

  return {
    media_id: media.id,
    media,
    bucket: ctx.bucket,
    storage_path: storagePath,
  };
}

async function saveTelegramPhoto(ctx, payload) {
  const telegramFileId = required(payload.telegram_file_id || payload.file_id, "telegram_file_id");
  const token = await getTelegramToken(payload);
  const fileInfo = await getTelegramFile(token, telegramFileId);
  const filePath = required(fileInfo.file_path, "telegram file_path");
  const buffer = await downloadTelegramFile(token, filePath);
  const originalFilename = clean(payload.original_filename) || basename(filePath) || `${telegramFileId}.jpg`;
  const contentType = clean(payload.content_type) || inferContentType(originalFilename);
  const storagePath = buildStoragePath(ctx, payload, originalFilename);

  await uploadObject(ctx, storagePath, buffer, contentType);
  const media = await insertMedia(ctx, payload, {
    storagePath,
    originalFilename,
    contentType,
    byteSize: buffer.byteLength,
    checksum: sha256(buffer),
    telegramFileId,
    telegramFileUniqueId: clean(payload.telegram_file_unique_id) || clean(fileInfo.file_unique_id),
    rawPayload: {
      ...safeObject(payload.raw_payload),
      telegram_file: fileInfo,
    },
  });

  return {
    media_id: media.id,
    media,
    bucket: ctx.bucket,
    storage_path: storagePath,
  };
}

async function createPropertyDraft(ctx, payload) {
  const property = await insertPropertyDraft(ctx, payload);
  const missingFields = normalizeMissingFields(payload.missing_fields || inferMissingPropertyFields(payload));
  const note = missingFields.length ? await writeMissingInfoNote(ctx, property.id, missingFields, payload) : null;
  const task = missingFields.length ? await createMissingInfoTask(ctx, property.id, payload.lead_id, missingFields) : null;

  return {
    property_id: property.id,
    property,
    missing_fields: missingFields,
    note_id: note?.id,
    task_id: task?.id,
    next_question: buildNextQuestion(missingFields),
  };
}

async function ingestPropertyMedia(ctx, payload) {
  const propertyId = clean(payload.property_id) || (await insertPropertyDraft(ctx, payload)).id;
  const missingFields = normalizeMissingFields(payload.missing_fields || inferMissingPropertyFields(payload));
  const savedMedia = [];

  for (const filePayload of normalizeFiles(payload.local_files)) {
    const result = await saveLocalFile(ctx, { ...payload, ...filePayload, property_id: propertyId });
    savedMedia.push(result.media);
  }

  for (const filePayload of normalizeFiles(payload.telegram_files)) {
    const result = await saveTelegramPhoto(ctx, { ...payload, ...filePayload, property_id: propertyId });
    savedMedia.push(result.media);
  }

  const note = missingFields.length ? await writeMissingInfoNote(ctx, propertyId, missingFields, payload) : null;
  const task = missingFields.length ? await createMissingInfoTask(ctx, propertyId, payload.lead_id, missingFields) : null;

  await audit(ctx, {
    actor_type: "agent",
    actor_id: clean(payload.actor_id) || DEFAULT_AGENT_ID,
    action: "media.ingestPropertyMedia",
    entity_type: "property",
    entity_id: propertyId,
    after: {
      property_id: propertyId,
      media_ids: savedMedia.map((media) => media.id),
      missing_fields: missingFields,
    },
  });

  return {
    property_id: propertyId,
    media_ids: savedMedia.map((media) => media.id),
    media: savedMedia,
    missing_fields: missingFields,
    note_id: note?.id,
    task_id: task?.id,
    next_question: buildNextQuestion(missingFields),
  };
}

async function insertPropertyDraft(ctx, payload) {
  const title =
    clean(payload.title) ||
    clean(payload.property_title) ||
    clean(payload.address) ||
    `Telegram draft ${new Date().toISOString().slice(0, 10)}`;

  const property = await insertOne(ctx, "properties", {
    tenant_id: ctx.tenant.id,
    lead_id: uuidOrNull(payload.lead_id),
    title,
    slug: clean(payload.slug) || slugify(title),
    listing_type: normalizeListingType(payload.listing_type),
    status: normalizePropertyStatus(payload.status),
    address: clean(payload.address) || null,
    location: clean(payload.location) || null,
    price_text: clean(payload.price_text) || clean(payload.price) || null,
    transaction_price: readNumber(payload.transaction_price),
    description: clean(payload.description) || null,
    short_note: clean(payload.short_note) || null,
    source_text: clean(payload.source_text) || clean(payload.message) || null,
    created_from: clean(payload.created_from) || "telegram",
    published_url: clean(payload.published_url) || null,
    raw_payload: safeObject(payload.raw_payload || payload),
  });

  await audit(ctx, {
    actor_type: "agent",
    actor_id: clean(payload.actor_id) || DEFAULT_AGENT_ID,
    action: "property.createDraft",
    entity_type: "property",
    entity_id: property.id,
    after: property,
  });

  return property;
}

async function insertMedia(ctx, payload, details) {
  const media = await insertOne(ctx, "media", {
    tenant_id: ctx.tenant.id,
    property_id: uuidOrNull(payload.property_id),
    lead_id: uuidOrNull(payload.lead_id),
    storage_path: details.storagePath,
    original_filename: details.originalFilename,
    media_type: normalizeMediaType(payload.media_type, details.contentType),
    status: normalizeMediaStatus(payload.status),
    source: clean(payload.source) || "telegram",
    telegram_file_id: details.telegramFileId || clean(payload.telegram_file_id) || null,
    telegram_file_unique_id: details.telegramFileUniqueId || clean(payload.telegram_file_unique_id) || null,
    content_type: details.contentType,
    byte_size: details.byteSize,
    checksum_sha256: details.checksum,
    sort_order: readInteger(payload.sort_order) || 0,
    caption: clean(payload.caption) || null,
    raw_payload: safeObject(details.rawPayload),
  });

  await audit(ctx, {
    actor_type: "agent",
    actor_id: clean(payload.actor_id) || DEFAULT_AGENT_ID,
    action: "media.save",
    entity_type: "media",
    entity_id: media.id,
    after: media,
  });

  return media;
}

async function writeMissingInfoNote(ctx, propertyId, missingFields, payload) {
  const note = await insertOne(ctx, "notes", {
    tenant_id: ctx.tenant.id,
    entity_type: "property",
    entity_id: propertyId,
    author_type: "agent",
    body: `Chýbajúce údaje k property draftu: ${missingFields.join(", ")}.${clean(payload.note) ? ` Poznámka: ${clean(payload.note)}` : ""}`,
    source: "openclaw_media_ingest",
  });

  await audit(ctx, {
    actor_type: "agent",
    actor_id: clean(payload.actor_id) || DEFAULT_AGENT_ID,
    action: "crm.addNote",
    entity_type: "note",
    entity_id: note.id,
    after: note,
  });

  return note;
}

async function createMissingInfoTask(ctx, propertyId, leadId, missingFields) {
  const task = await insertOne(ctx, "tasks", {
    tenant_id: ctx.tenant.id,
    lead_id: uuidOrNull(leadId),
    property_id: propertyId,
    title: `Doplniť údaje k nehnuteľnosti: ${missingFields.join(", ")}`,
    status: "open",
  });

  await audit(ctx, {
    actor_type: "agent",
    actor_id: DEFAULT_AGENT_ID,
    action: "crm.createTask",
    entity_type: "task",
    entity_id: task.id,
    after: task,
  });

  return task;
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

async function getTelegramToken(payload) {
  const token =
    clean(payload.telegram_bot_token) ||
    cleanEnv("TELEGRAM_BOT_TOKEN") ||
    (await readFirstSecretFile([cleanEnv("TELEGRAM_BOT_TOKEN_FILE"), ...DEFAULT_TELEGRAM_TOKEN_FILES]));

  if (!token) throw new Error("Missing Telegram bot token env or token file");
  return token;
}

async function getTelegramFile(token, fileId) {
  const response = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    throw new Error(`Telegram getFile failed: ${response.status} ${body?.description || ""}`.trim());
  }
  return body.result;
}

async function downloadTelegramFile(token, filePath) {
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!response.ok) throw new Error(`Telegram file download failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function uploadObject(ctx, storagePath, buffer, contentType) {
  const response = await fetch(
    `${ctx.supabaseUrl}${STORAGE_PREFIX}/object/${encodeURIComponent(ctx.bucket)}/${storagePath
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      method: "POST",
      headers: {
        apikey: ctx.serviceKey,
        Authorization: `Bearer ${ctx.serviceKey}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: buffer,
    },
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase Storage upload failed: ${response.status} ${text.slice(0, 240)}`);
  }
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

async function insertOne(ctx, table, body) {
  const rows = await supabaseRequest(ctx, "POST", `/${table}?select=*`, body);
  if (!rows[0]?.id) throw new Error(`Insert into ${table} did not return id`);
  return rows[0];
}

async function audit(ctx, body) {
  return insertOne(ctx, "audit_logs", {
    tenant_id: ctx.tenant.id,
    actor_type: normalizeActorType(body.actor_type),
    actor_id: clean(body.actor_id) || DEFAULT_AGENT_ID,
    action: required(body.action, "action"),
    entity_type: clean(body.entity_type) || null,
    entity_id: uuidOrNull(body.entity_id),
    before: body.before === undefined ? null : safeObject(body.before),
    after: body.after === undefined ? null : safeObject(body.after),
  });
}

function buildStoragePath(ctx, payload, filename) {
  const propertyPart = clean(payload.property_id) || clean(payload.property_slug) || clean(payload.slug) || "inbox";
  const leadPart = clean(payload.lead_id) ? `lead-${clean(payload.lead_id)}` : "";
  const safeName = safeFilename(filename);
  return [
    ctx.tenantSlug,
    "telegram",
    propertyPart,
    leadPart,
    `${new Date().toISOString().slice(0, 10)}-${randomUUID()}-${safeName}`,
  ]
    .filter(Boolean)
    .join("/");
}

function normalizeFiles(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry));
}

function normalizeMissingFields(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((field) => clean(field)).filter(Boolean))];
}

function inferMissingPropertyFields(payload) {
  const missing = [];
  if (!clean(payload.title) && !clean(payload.property_title) && !clean(payload.address)) missing.push("title");
  if (!clean(payload.location) && !clean(payload.address)) missing.push("location");
  if (!clean(payload.price_text) && !clean(payload.price)) missing.push("price_text");
  return missing;
}

function buildNextQuestion(missingFields) {
  if (!missingFields.length) return "";
  if (missingFields.includes("price_text")) {
    return "Aká má byť cena, alebo mám pri tejto nehnuteľnosti zatiaľ zapísať: cena ešte nie je stanovená?";
  }
  if (missingFields.includes("location")) {
    return "V akej lokalite je táto nehnuteľnosť?";
  }
  if (missingFields.includes("title")) {
    return "Ako mám pracovný názov tejto nehnuteľnosti uložiť?";
  }
  return `Doplň prosím: ${missingFields.join(", ")}.`;
}

function parseSupabaseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function inferContentType(filename) {
  const ext = extname(filename).toLowerCase();
  if ([".jpg", ".jpeg"].includes(ext)) return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".heic") return "image/heic";
  if (ext === ".heif") return "image/heif";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

function normalizeMediaType(value, contentType) {
  const type = clean(value).toLowerCase();
  if (["image", "video", "document", "audio", "other"].includes(type)) return type;
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType === "application/pdf") return "document";
  return "other";
}

function normalizeMediaStatus(value) {
  const status = clean(value).toLowerCase();
  if (["inbox", "selected", "rejected", "approved", "published", "archived"].includes(status)) return status;
  return "inbox";
}

function normalizeListingType(value) {
  const listingType = clean(value).toLowerCase();
  return listingType === "sold_reference" ? "sold_reference" : "offered";
}

function normalizePropertyStatus(value) {
  const status = clean(value).toLowerCase();
  if (["draft", "review", "published", "archived"].includes(status)) return status;
  return "draft";
}

function normalizeActorType(value) {
  const actorType = clean(value).toLowerCase();
  if (["jakub", "adam", "agent", "system"].includes(actorType)) return actorType;
  return "agent";
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function safeFilename(value) {
  const name = basename(value || "photo.jpg")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return name || "photo.jpg";
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
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

function uuidOrNull(value) {
  const cleaned = clean(value);
  return UUID_RE.test(cleaned) ? cleaned : null;
}

function readInteger(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function readNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
