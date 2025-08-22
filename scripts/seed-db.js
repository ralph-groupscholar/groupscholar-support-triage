const { Client } = require('pg');

const schema = 'groupscholar_support_triage';
const table = 'cases';

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
    {
      scholar: 'Leah Kim',
      summary: 'Missing meal stipend for January',
      channel: 'Email',
      category: 'Financial aid',
      urgency: 'High',
      status: 'Open',
      owner: 'Noah',
      nextStep: 'Check disbursement log and confirm status with finance',
      created: shiftDate(-5),
      lastTouch: shiftDate(-3),
      due: shiftDate(1),
    },
  ];
}

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to seed the database.');
  }

  const sslMode = String(process.env.PGSSLMODE || '').toLowerCase();
  const disableSsl = sslMode === 'disable' || connectionString.includes('db-acupinir.groupscholar.com');

  const client = new Client({
    connectionString,
    ssl: disableSsl ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.${table} (
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
  await client.query(`TRUNCATE ${schema}.${table}`);

  const cases = sampleCases();
  for (const item of cases) {
    await client.query(
      `INSERT INTO ${schema}.${table}
        (id, scholar, summary, channel, category, urgency, status, owner, next_step, created, last_touch, due)
       VALUES
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
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

  await client.end();
  console.log(`Seeded ${cases.length} cases into ${schema}.${table}`);
}

seed().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
