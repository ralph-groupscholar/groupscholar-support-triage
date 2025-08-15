const { Pool } = require('pg');

const SCHEMA = 'groupscholar_support_triage';
const TABLE = 'cases';

function shiftDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const sampleCases = [
  {
    id: '51b420bd-f5b9-43b7-b3dd-aa53cd52f5fa',
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
    id: '3a7a9712-fd73-43fe-9826-240252853078',
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
    id: '7d78f8ca-87ee-457f-a1fd-3f28b6d8bec7',
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
    id: '3c942787-8796-4ae3-a886-4d7286f1a019',
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
    id: '64b59171-3397-4928-9ecb-d5193e0ee80c',
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

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  const disableSsl = String(process.env.PGSSLMODE || '').toLowerCase() === 'disable';
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: disableSsl ? false : { rejectUnauthorized: false },
  });
}

async function ensureDatabase(pool) {
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
}

async function seed() {
  if (!hasDatabase()) {
    throw new Error('DATABASE_URL is required to seed the support triage database.');
  }

  const pool = getPool();
  try {
    await ensureDatabase(pool);
    for (const item of sampleCases) {
      await pool.query(
        `INSERT INTO ${SCHEMA}.${TABLE}
          (id, scholar, summary, channel, category, urgency, status, owner, next_step, created, last_touch, due)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
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

    const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM ${SCHEMA}.${TABLE}`);
    console.log(`Seeded support triage cases. Total rows: ${rows[0].count}`);
  } finally {
    await pool.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
