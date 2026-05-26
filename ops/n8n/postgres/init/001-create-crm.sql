CREATE DATABASE jakub_crm;

\connect jakub_crm;

CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT,
  phone TEXT,
  email TEXT,
  goal TEXT,
  preferred_day TEXT,
  preferred_time TEXT,
  property_context TEXT,
  note TEXT,
  consent BOOLEAN DEFAULT false,
  source TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new'
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
