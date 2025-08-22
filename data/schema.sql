CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS support_triage;

CREATE TABLE IF NOT EXISTS support_triage.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar text NOT NULL,
  summary text NOT NULL,
  channel text,
  category text,
  urgency text,
  status text,
  owner text,
  next_step text,
  created_date date,
  last_touch date,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_triage_cases_status_idx ON support_triage.cases(status);
CREATE INDEX IF NOT EXISTS support_triage_cases_created_idx ON support_triage.cases(created_at DESC);
