import { existsSync, readFileSync, writeFileSync } from "node:fs";

const candidatesPath = "ops/leads/manual-owner-hunting-candidates-2026-06-19.csv";
const logPath = "ops/leads/manual-owner-hunting-log-2026-06-19.csv";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bratislava",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const outputMarkdownPath = `ops/leads/manual-owner-hunting-reply-triage-${today}.md`;
const outputJsonPath = `ops/leads/manual-owner-hunting-reply-triage-${today}.json`;
const outputTemplatePath = `ops/leads/manual-owner-hunting-reply-triage-template-${today}.txt`;

const parseArgs = (argv) =>
  argv.reduce((acc, arg) => {
    if (!arg.startsWith("--")) return acc;
    const [key, ...valueParts] = arg.slice(2).split("=");
    acc[key] = valueParts.length ? valueParts.join("=") : "true";
    return acc;
  }, {});

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
  const headers = rows[0] || [];
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
  );
};

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const hasPrivateContact = (value) => {
  const text = String(value || "");
  return (
    /\b09\d{2}[\s./-]?\d{3}[\s./-]?\d{3}\b/.test(text) ||
    /\b\+421[\s./-]?\d{3}[\s./-]?\d{3}[\s./-]?\d{3}\b/.test(text) ||
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)
  );
};

const redactPrivateContact = (value) =>
  String(value || "")
    .replace(/\b09\d{2}[\s./-]?\d{3}[\s./-]?\d{3}\b/g, "[phone-redacted]")
    .replace(/\b\+421[\s./-]?\d{3}[\s./-]?\d{3}[\s./-]?\d{3}\b/g, "[phone-redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email-redacted]")
    .replace(/\s+/g, " ")
    .trim();

const includesAny = (text, terms) => terms.some((term) => text.includes(term));

const declinedSignals = [
  "nemam zaujem",
  "nemame zaujem",
  "neprajem si",
  "nepiste",
  "nekontaktujte",
  "stop",
  "nie dakujem",
  "nie, dakujem",
  "dakujem nie",
  "realitky ne",
  "rk ne",
  "nevolat",
  "nevolajte",
  "uz neaktualne",
  "predane",
  "rezervovane",
];

const qualifiedSignals = [
  "zavolajte",
  "mozete zavolat",
  "mozte zavolat",
  "kontaktujte ma",
  "telefon",
  "tel.",
  "cislo",
  "obhliadka",
  "stretnutie",
  "chcem predat",
  "potrebujem predat",
  "odhad ceny",
  "ocenenie",
  "valuacia",
  "strategia",
  "kedy mozeme",
  "poslite kontakt",
  "nech sa ozve",
  "moze sa ozvat",
  "jakub",
];

const auditSignals = [
  "poslite",
  "posli",
  "poslite ich",
  "poslite postrehy",
  "ano",
  "ok",
  "dobre",
  "zaujima",
  "zaujimalo by ma",
  "ake postrehy",
  "sem s tym",
  "mozete poslat",
  "mozte poslat",
];

const classifyReply = (replyText) => {
  const normalized = normalize(replyText);
  const privateContactDetected = hasPrivateContact(replyText);

  if (!normalized) {
    return {
      suggested_label: "manual_check",
      suggested_status: "",
      confidence: "low",
      reason: "empty_reply",
      private_contact_detected: privateContactDetected,
    };
  }

  if (includesAny(normalized, declinedSignals)) {
    return {
      suggested_label: "declined",
      suggested_status: "do_not_contact",
      confidence: "high",
      reason: "decline_or_stop_signal",
      private_contact_detected: privateContactDetected,
    };
  }

  if (privateContactDetected || includesAny(normalized, qualifiedSignals)) {
    return {
      suggested_label: "qualified",
      suggested_status: "qualified",
      confidence: privateContactDetected ? "high" : "medium",
      reason: privateContactDetected ? "private_contact_or_call_permission_detected" : "qualified_intent_signal",
      private_contact_detected: privateContactDetected,
    };
  }

  if (includesAny(normalized, auditSignals)) {
    return {
      suggested_label: "audit",
      suggested_status: "replied",
      confidence: "medium",
      reason: "audit_interest_signal",
      private_contact_detected: privateContactDetected,
    };
  }

  return {
    suggested_label: "manual_check",
    suggested_status: "",
    confidence: "low",
    reason: "no_clear_signal",
    private_contact_detected: privateContactDetected,
  };
};

const parseReplyReport = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return {
        raw_line: line,
        candidate_id: parts[0] || "",
        reply_text: parts.slice(1).join(" | "),
      };
    });

const options = parseArgs(process.argv.slice(2));
const reportPath = options.report || "";
const reportText = options.text || "";
const candidates = readTable(candidatesPath).filter((row) => row.candidate_id);
const logRows = readTable(logPath).filter(
  (row) => row.source_url && row.status && !row.status.includes("|"),
);
const candidatesByUrl = new Map(candidates.map((row) => [row.source_url, row]));
const candidatesById = new Map(candidates.map((row) => [row.candidate_id, row]));
const contactedRows = logRows.filter((row) => ["contacted", "replied", "qualified"].includes(row.status));
const readyRows = logRows.filter((row) => row.status === "ready_to_send");
const templateSourceRows = contactedRows.length ? contactedRows : readyRows;
const templateMode = contactedRows.length ? "contacted" : "ready_to_send_preview";

const template = `# Paste owner replies after the pipe. Keep phone/email/private details out of this file.
# Mode: ${templateMode}
${templateSourceRows
  .map((row) => {
    const candidate = candidatesByUrl.get(row.source_url);
    return `${candidate?.candidate_id || "UNKNOWN"} | `;
  })
  .join("\n")}
`;

writeFileSync(outputTemplatePath, template);

const errors = [];
const warnings = [];
const parsedReplies =
  reportPath || reportText
    ? parseReplyReport(reportPath ? readFileSync(reportPath, "utf8") : reportText)
    : [];

const rows = [];
for (const reply of parsedReplies) {
  if (!/^HUNT-\d{3}$/.test(reply.candidate_id)) {
    errors.push(`Invalid candidate id: ${reply.raw_line}`);
    continue;
  }

  const candidate = candidatesById.get(reply.candidate_id);
  if (!candidate) {
    errors.push(`Unknown candidate id: ${reply.candidate_id}`);
    continue;
  }

  const logRow = logRows.find((row) => row.source_url === candidate.source_url);
  if (!logRow) {
    errors.push(`${reply.candidate_id} is not in the lead log.`);
    continue;
  }

  if (!["contacted", "replied", "qualified", "sent_to_jakub"].includes(logRow.status)) {
    warnings.push(`${reply.candidate_id} reply triage from status ${logRow.status}; check that outreach was actually sent.`);
  }

  const classification = classifyReply(reply.reply_text);
  const sanitizedReply = redactPrivateContact(reply.reply_text);
  const applyLine =
    classification.suggested_label === "manual_check"
      ? ""
      : `${reply.candidate_id} | ${classification.suggested_label} | ${classification.reason}; ${sanitizedReply}`.trim();

  rows.push({
    candidate_id: reply.candidate_id,
    current_status: logRow.status,
    source: logRow.source,
    location: logRow.location,
    asking_price: logRow.asking_price,
    source_url: logRow.source_url,
    reply_text_sanitized: sanitizedReply,
    apply_line: applyLine,
    handoff_gate:
      classification.suggested_status === "qualified"
        ? "If owner gave call/valuation permission, keep private phone/email outside repo and hand context to Jakub."
        : "",
    ...classification,
  });
}

const applyLines = rows.map((row) => row.apply_line).filter(Boolean);
const markdownRows = rows.length
  ? rows
      .map(
        (row, index) => `## ${index + 1}. ${row.candidate_id} - ${row.suggested_label}

- Current status: ${row.current_status}
- Confidence: ${row.confidence}
- Reason: ${row.reason}
- Private contact detected: ${row.private_contact_detected ? "yes - keep it outside repo" : "no"}
- Listing: ${row.source_url}

Sanitized reply:

\`\`\`text
${row.reply_text_sanitized}
\`\`\`

Apply line:

\`\`\`text
${row.apply_line || "# manual_check: decide status manually before applying"}
\`\`\`

${row.handoff_gate ? `Handoff gate: ${row.handoff_gate}` : ""}
`,
      )
      .join("\n")
  : "No reply report supplied. Template generated only.";

const markdown = `# Manual owner hunting reply triage

Date: ${today}

Purpose: classify owner replies into truthful status suggestions before applying \`leads:manual-apply-reply-report\`.

Template: \`${outputTemplatePath}\`

## Summary

\`\`\`json
${JSON.stringify(
  {
    template_mode: templateMode,
    template_rows: templateSourceRows.length,
    parsed_replies: parsedReplies.length,
    apply_lines: applyLines.length,
    warnings,
    errors,
  },
  null,
  2,
)}
\`\`\`

## Apply Report Candidate

\`\`\`text
${applyLines.join("\n") || "# no apply lines"}
\`\`\`

Dry-run command after copying only valid apply lines:

\`\`\`bash
tmpfile=$(mktemp)
pbpaste > "$tmpfile"
npm run leads:manual-apply-reply-report -- --report="$tmpfile"
rm "$tmpfile"
\`\`\`

${markdownRows}
`;

const result = {
  ok: errors.length === 0,
  date: today,
  template_mode: templateMode,
  template_rows: templateSourceRows.length,
  parsed_replies: parsedReplies.length,
  apply_lines: applyLines.length,
  rows,
  warnings,
  errors,
  outputs: {
    markdown: outputMarkdownPath,
    json: outputJsonPath,
    template: outputTemplatePath,
  },
};

writeFileSync(outputMarkdownPath, markdown);
writeFileSync(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      ok: result.ok,
      template_mode: templateMode,
      template_rows: templateSourceRows.length,
      parsed_replies: parsedReplies.length,
      apply_lines: applyLines.length,
      markdown: outputMarkdownPath,
      json: outputJsonPath,
      template: outputTemplatePath,
      warnings,
      errors,
    },
    null,
    2,
  ),
);

if (!result.ok) {
  process.exit(1);
}
