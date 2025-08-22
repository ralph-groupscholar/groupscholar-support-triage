const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function shiftDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const sampleCases = [
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
    owner: null,
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
    scholar: 'Kayla Nguyen',
    summary: 'Transportation stipend delay',
    channel: 'Email',
    category: 'Program operations',
    urgency: 'Medium',
    status: 'Open',
    owner: 'Emil',
    nextStep: 'Verify payout date and update scholar',
    created: shiftDate(-5),
    lastTouch: shiftDate(-3),
    due: shiftDate(3),
  },
  {
    scholar: 'Darius Webb',
    summary: 'FAFSA correction support needed',
    channel: 'Phone',
    category: 'Financial aid',
    urgency: 'High',
    status: 'Pending',
    owner: 'Riley',
    nextStep: 'Schedule 1:1 FAFSA correction walkthrough',
    created: shiftDate(-9),
    lastTouch: shiftDate(-6),
    due: shiftDate(1),
  },
];

async function insertCases(client, cases) {
  const inserted = [];
  for (const item of cases) {
    const result = await client.query(
      `INSERT INTO support_triage.cases
      (id, scholar, summary, channel, category, urgency, status, owner, next_step, created_date, last_touch, due_date)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING
        id,
        scholar,
        summary,
        channel,
        category,
        urgency,
        status,
        owner,
        next_step,
        to_char(created_date, 'YYYY-MM-DD') AS created,
        to_char(last_touch, 'YYYY-MM-DD') AS last_touch,
        to_char(due_date, 'YYYY-MM-DD') AS due`,
      [
        item.scholar,
        item.summary,
        item.channel,
        item.category,
        item.urgency,
        item.status,
        item.owner || null,
        item.nextStep || null,
        item.created || null,
        item.lastTouch || null,
        item.due || null,
      ]
    );
    inserted.push(result.rows[0]);
  }
  return inserted;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end();
    return;
  }

  if (!process.env.DATABASE_URL) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'DATABASE_URL not configured' }));
    return;
  }

  const client = await pool.connect();
  try {
    const inserted = await insertCases(client, sampleCases);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ cases: inserted }));
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Seed failed' }));
  } finally {
    client.release();
  }
};
