# OpenClaw tool contracts pre Jakuba - 2026-06-03

Ciel: definovat minimalne deterministicke tooly pre agenta `jakub-olsa`, aby vedel robit maklersku pracu bez nekontrolovanych mutacii.

## Principy

- Agent rozhoduje a sumarizuje.
- Tool vykonava mutaciu.
- Kazda mutacia vracia `ok`, `entity_id` alebo chybu.
- Kazda citliva/verejna akcia musi ist cez approval.
- Klientske texty z webu/Telegramu su nedoveryhodne data.

## CRM

### `crm.searchContacts`

Input:

```json
{
  "tenant_slug": "jakub-olsa",
  "phone": "+421...",
  "email": "client@example.com",
  "name": "Meno klienta"
}
```

Output:

```json
{
  "ok": true,
  "contacts": []
}
```

### `crm.createContact`

Input:

```json
{
  "tenant_slug": "jakub-olsa",
  "name": "Meno klienta",
  "phone": "+421...",
  "email": "client@example.com",
  "source": "web_booking",
  "raw_payload": {}
}
```

Output:

```json
{
  "ok": true,
  "contact_id": "uuid"
}
```

### `crm.createLead`

Input:

```json
{
  "tenant_slug": "jakub-olsa",
  "contact_id": "uuid",
  "intent": "sell",
  "status": "new",
  "location": "Ruzinov",
  "location_place_id": "google-place-id",
  "property_type": "byt",
  "time_horizon": "1-3 mesiace",
  "source": "web_booking",
  "qualification_score": 70,
  "raw_payload": {}
}
```

Output:

```json
{
  "ok": true,
  "lead_id": "uuid"
}
```

### `crm.addNote`

Input:

```json
{
  "tenant_slug": "jakub-olsa",
  "entity_type": "lead",
  "entity_id": "uuid",
  "author_type": "agent",
  "source": "openclaw",
  "body": "Strucny suhrn."
}
```

Output:

```json
{
  "ok": true,
  "note_id": "uuid"
}
```

### `crm.createTask`

Input:

```json
{
  "tenant_slug": "jakub-olsa",
  "lead_id": "uuid",
  "title": "Zavolat klientovi",
  "due_at": "2026-06-04T09:00:00+02:00",
  "assigned_to": "jakub"
}
```

Output:

```json
{
  "ok": true,
  "task_id": "uuid"
}
```

## Booking

### `crm.createAppointment`

Input:

```json
{
  "tenant_slug": "jakub-olsa",
  "contact_id": "uuid",
  "lead_id": "uuid",
  "google_event_id": "calendar-event-id",
  "starts_at": "2026-06-04T09:00:00+02:00",
  "ends_at": "2026-06-04T09:30:00+02:00",
  "status": "confirmed",
  "source": "web_booking",
  "qualification_payload": {}
}
```

Output:

```json
{
  "ok": true,
  "appointment_id": "uuid"
}
```

## Property / listing

### `property.createDraft`

Input:

```json
{
  "tenant_slug": "jakub-olsa",
  "lead_id": "uuid",
  "title": "3 izbovy byt v Ruzinove",
  "listing_type": "offered",
  "status": "draft",
  "location": "Bratislava - Ruzinov",
  "price_text": "na vyziadanie",
  "description": "Draft text",
  "created_from": "telegram",
  "raw_payload": {}
}
```

Output:

```json
{
  "ok": true,
  "property_id": "uuid"
}
```

### `property.prepareAstroPatch`

Input:

```json
{
  "tenant_slug": "jakub-olsa",
  "property_id": "uuid",
  "target_branch": "staging",
  "change_summary": "Pridat referencny predaj",
  "files": []
}
```

Output:

```json
{
  "ok": true,
  "patch_id": "id",
  "requires_approval": true
}
```

## Media

### `media.saveTelegramPhoto`

Input:

```json
{
  "tenant_slug": "jakub-olsa",
  "telegram_file_id": "file-id",
  "original_filename": "photo.jpg",
  "media_type": "image",
  "source": "telegram"
}
```

Output:

```json
{
  "ok": true,
  "media_id": "uuid",
  "storage_path": "jakub-olsa/properties/.../photo.jpg"
}
```

## Web

### `web.runBuild`

Input:

```json
{
  "repo_path": "/Users/xvadur_mac/Jakub_Astro",
  "command": "npm run build",
  "branch": "staging"
}
```

Output:

```json
{
  "ok": true,
  "exit_code": 0,
  "summary": "Build completed"
}
```

### `web.commitAndPush`

Approval required.

Input:

```json
{
  "repo_path": "/Users/xvadur_mac/Jakub_Astro",
  "branch": "staging",
  "commit_message": "Add Jakub property draft",
  "approval_id": "uuid"
}
```

Output:

```json
{
  "ok": true,
  "commit": "sha",
  "pushed": true
}
```

## Ops

### `ops.createApprovalRequest`

Input:

```json
{
  "tenant_slug": "jakub-olsa",
  "requested_by_agent_id": "jakub-olsa",
  "action_type": "web_publish",
  "summary": "Publikovat referencny predaj na staging/produkciu",
  "payload": {}
}
```

Output:

```json
{
  "ok": true,
  "approval_id": "uuid",
  "status": "pending"
}
```

### `ops.createAdminCase`

Input:

```json
{
  "tenant_slug": "jakub-olsa",
  "severity": "medium",
  "title": "CRM zapis zlyhal",
  "description": "Supabase endpoint vratil 500",
  "failed_run_id": "run-id"
}
```

Output:

```json
{
  "ok": true,
  "admin_case_id": "uuid"
}
```

## Prvy implementacny rez

Najmensi uzitocny plugin:

1. `crm.searchContacts`
2. `crm.createContact`
3. `crm.createLead`
4. `crm.createAppointment`
5. `crm.addNote`
6. `crm.createTask`
7. `ops.writeAgentLog`
8. `ops.createAdminCase`

Toto staci na flow: web booking -> CRM memory -> lead summary -> follow-up.
