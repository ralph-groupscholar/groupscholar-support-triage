const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const STORAGE_FILE = path.join(__dirname, 'data', 'local-cases.json');
const SCHEMA = 'groupscholar_support_triage';
const TABLE = 'cases';

app.use(express.json({ limit: '1mb' }));

let pool;
let dbReady;

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!hasDatabase()) return null;
  if (!pool) {
    const sslMode = String(process.env.PGSSLMODE || '').toLowerCase();
    const host = String(process.env.DATABASE_URL || '');
    const disableSsl = sslMode === 'disable' || host.includes('db-acupinir.groupscholar.com');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: disableSsl ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function ensureDatabase() {
  if (!hasDatabase()) return;
  if (dbReady) return dbReady;

  dbReady = (async () => {
    const pool = getPool();
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.${TABLE} (
        id uuid PRIMARY KEY,
        scholar text NOT NULL,
        summary text NOT NULL,
        channel text NOT NULL,
        category text NOT NULL,
        urgency text NOT NULL,
        status text NOT NULL,
        owner text,
        next_step text,
        created date NOT NULL,
        last_touch date NOT NULL,
        due date,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS ${TABLE}_status_idx ON ${SCHEMA}.${TABLE} (status)`);
  })();

  return dbReady;
}

async function readLocalCases() {
  try {
    const raw = await fs.readFile(STORAGE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

async function writeLocalCases(cases) {
  await fs.mkdir(path.dirname(STORAGE_FILE), { recursive: true });
  await fs.writeFile(STORAGE_FILE, JSON.stringify(cases, null, 2));
}

function shiftDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function sampleCases() {
  return [
    {
      scholar: 'Avery Hill',
      summary: 'Tuition payment gap for spring term',
      channel: 'Email',
      category: 'Financial aid',
      urgency: 'High',
      status: 'Open',
      owner: 'Maya',
      nextStep: 'Confirm balance and send payment plan options',
      created: shiftDate(-6),
      lastTouch: shiftDate(-4),
      due: shiftDate(2),
    },
    {
      scholar: 'Luis Carter',
      summary: 'Housing insecurity update from advisor',
      channel: 'Phone',
      category: 'Wellbeing',
      urgency: 'Critical',
      status: 'Open',
      owner: 'Jordan',
      nextStep: 'Escalate to care partner and document resources',
      created: shiftDate(-2),
      lastTouch: shiftDate(-1),
      due: shiftDate(1),
    },
    {
      scholar: 'Renee Brooks',
      summary: 'Laptop repair request stalled',
      channel: 'Form',
      category: 'Technology access',
      urgency: 'Medium',
      status: 'Pending',
      owner: '',
      nextStep: 'Assign owner and confirm loaner availability',
      created: shiftDate(-12),
      lastTouch: shiftDate(-8),
      due: shiftDate(-1),
    },
    {
      scholar: 'Sami Patel',
      summary: 'Missed tutoring sessions, check-in needed',
      channel: 'Slack',
      category: 'Academic support',
      urgency: 'Low',
      status: 'Open',
      owner: 'Nia',
      nextStep: 'Schedule reset call and confirm attendance plan',
      created: shiftDate(-14),
      lastTouch: shiftDate(-10),
      due: shiftDate(4),
    },
    {
      scholar: 'Jordan Ellis',
      summary: 'Confusion about internship stipend timeline',
      channel: 'Email',
      category: 'Program operations',
      urgency: 'Medium',
      status: 'Open',
      owner: 'Priya',
      nextStep: 'Send stipend schedule and confirm payroll contact',
      created: shiftDate(-3),
      lastTouch: shiftDate(-2),
      due: shiftDate(3),
    },
  ];
}

function normalizeCase(payload) {
  return {
    id: payload.id || crypto.randomUUID(),
    scholar: payload.scholar,
    summary: payload.summary,
    channel: payload.channel,
    category: payload.category,
    urgency: payload.urgency,
    status: payload.status,
    owner: payload.owner || '',
    nextStep: payload.nextStep || '',
    created: payload.created,
    lastTouch: payload.lastTouch,
    due: payload.due || null,
  };
}

function validateCase(payload) {
  const required = ['scholar', 'summary', 'channel', 'category', 'urgency', 'status', 'created', 'lastTouch'];
  const missing = required.filter((key) => !payload[key]);
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

async function readCases() {
  if (!hasDatabase()) {
    const cases = await readLocalCases();
    return cases.sort((a, b) => String(b.created).localeCompare(String(a.created)));
  }

  await ensureDatabase();
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id,
            scholar,
            summary,
            channel,
            category,
            urgency,
            status,
            owner,
            next_step AS "nextStep",
            to_char(created, 'YYYY-MM-DD') AS created,
            to_char(last_touch, 'YYYY-MM-DD') AS "lastTouch",
            to_char(due, 'YYYY-MM-DD') AS due
     FROM ${SCHEMA}.${TABLE}
     ORDER BY created DESC`
  );
  return rows;
}

async function createCase(payload) {
  validateCase(payload);
  const normalized = normalizeCase(payload);

  if (!hasDatabase()) {
    const cases = await readLocalCases();
    cases.push(normalized);
    await writeLocalCases(cases);
    return normalized;
  }

  await ensureDatabase();
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO ${SCHEMA}.${TABLE}
      (id, scholar, summary, channel, category, urgency, status, owner, next_step, created, last_touch, due)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id,
               scholar,
               summary,
               channel,
               category,
               urgency,
               status,
               owner,
               next_step AS "nextStep",
               to_char(created, 'YYYY-MM-DD') AS created,
               to_char(last_touch, 'YYYY-MM-DD') AS "lastTouch",
               to_char(due, 'YYYY-MM-DD') AS due`,
    [
      normalized.id,
      normalized.scholar,
      normalized.summary,
      normalized.channel,
      normalized.category,
      normalized.urgency,
      normalized.status,
      normalized.owner,
      normalized.nextStep,
      normalized.created,
      normalized.lastTouch,
      normalized.due,
    ]
  );
  return rows[0];
}

async function updateCase(id, updates) {
  if (!hasDatabase()) {
    const cases = await readLocalCases();
    const index = cases.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const next = { ...cases[index], ...updates, id };
    cases[index] = next;
    await writeLocalCases(cases);
    return next;
  }

  await ensureDatabase();
  const pool = getPool();
  const fields = {
    scholar: updates.scholar,
    summary: updates.summary,
    channel: updates.channel,
    category: updates.category,
    urgency: updates.urgency,
    status: updates.status,
    owner: updates.owner,
    next_step: updates.nextStep,
    created: updates.created,
    last_touch: updates.lastTouch,
    due: updates.due,
  };

  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (!entries.length) return null;

  const setClause = entries.map(([key], index) => `${key} = $${index + 2}`).join(', ');
  const values = entries.map(([, value]) => value);

  const { rows } = await pool.query(
    `UPDATE ${SCHEMA}.${TABLE}
     SET ${setClause}, updated_at = now()
     WHERE id = $1
     RETURNING id,
               scholar,
               summary,
               channel,
               category,
               urgency,
               status,
               owner,
               next_step AS "nextStep",
               to_char(created, 'YYYY-MM-DD') AS created,
               to_char(last_touch, 'YYYY-MM-DD') AS "lastTouch",
               to_char(due, 'YYYY-MM-DD') AS due`,
    [id, ...values]
  );

  return rows[0] || null;
}

async function replaceCases(list) {
  if (!Array.isArray(list)) return [];

  if (!hasDatabase()) {
    await writeLocalCases(list.map(normalizeCase));
    return list;
  }

  await ensureDatabase();
  const pool = getPool();
  await pool.query(`TRUNCATE ${SCHEMA}.${TABLE}`);

  const normalized = list.map(normalizeCase);
  for (const item of normalized) {
    await pool.query(
      `INSERT INTO ${SCHEMA}.${TABLE}
        (id, scholar, summary, channel, category, urgency, status, owner, next_step, created, last_touch, due)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        item.id,
        item.scholar,
        item.summary,
        item.channel,
        item.category,
        item.urgency,
        item.status,
        item.owner,
        item.nextStep,
        item.created,
        item.lastTouch,
        item.due,
      ]
    );
  }

  return normalized;
}

async function seedCases() {
  const seeded = sampleCases().map(normalizeCase);

  if (!hasDatabase()) {
    const cases = await readLocalCases();
    await writeLocalCases([...cases, ...seeded]);
    return seeded;
  }

  await ensureDatabase();
  const pool = getPool();
  for (const item of seeded) {
    await pool.query(
      `INSERT INTO ${SCHEMA}.${TABLE}
        (id, scholar, summary, channel, category, urgency, status, owner, next_step, created, last_touch, due)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        item.id,
        item.scholar,
        item.summary,
        item.channel,
        item.category,
        item.urgency,
        item.status,
        item.owner,
        item.nextStep,
        item.created,
        item.lastTouch,
        item.due,
      ]
    );
  }

  return seeded;
}

async function clearCases() {
  if (!hasDatabase()) {
    await writeLocalCases([]);
    return;
  }

  await ensureDatabase();
  const pool = getPool();
  await pool.query(`TRUNCATE ${SCHEMA}.${TABLE}`);
}

app.get('/api/health', async (req, res) => {
  try {
    if (hasDatabase()) {
      await ensureDatabase();
    }
    res.json({
      status: 'ok',
      storage: hasDatabase() ? 'postgres' : 'local-file',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/cases', async (req, res) => {
  try {
    const cases = await readCases();
    res.json({ cases });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cases', async (req, res) => {
  try {
    const created = await createCase(req.body || {});
    res.status(201).json({ case: created });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.put('/api/cases/:id', async (req, res) => {
  try {
    const updated = await updateCase(req.params.id, req.body || {});
    if (!updated) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }
    res.json({ case: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/cases', async (req, res) => {
  try {
    const list = req.body?.cases || [];
    const replaced = await replaceCases(list);
    res.json({ cases: replaced });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/seed', async (req, res) => {
  try {
    const seeded = await seedCases();
    res.json({ seeded: seeded.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cases', async (req, res) => {
  try {
    await clearCases();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Support triage server running on port ${PORT}`);
  });
}

module.exports = app;
