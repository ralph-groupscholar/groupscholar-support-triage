const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

function formatRow(row) {
  return {
    id: row.id,
    scholar: row.scholar,
    summary: row.summary,
    channel: row.channel,
    category: row.category,
    urgency: row.urgency,
    status: row.status,
    owner: row.owner,
    nextStep: row.next_step,
    created: row.created,
    lastTouch: row.last_touch,
    due: row.due,
  };
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function fetchCases(client) {
  const result = await client.query(
    `SELECT
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
      to_char(due_date, 'YYYY-MM-DD') AS due
    FROM support_triage.cases
    ORDER BY created_at DESC`
  );
  return result.rows.map(formatRow);
}

async function insertCases(client, cases) {
  const inserted = [];
  for (const item of cases) {
    const result = await client.query(
      `INSERT INTO support_triage.cases
      (id, scholar, summary, channel, category, urgency, status, owner, next_step, created_date, last_touch, due_date)
      VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        item.id || null,
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
    inserted.push(formatRow(result.rows[0]));
  }
  return inserted;
}

module.exports = async (req, res) => {
  if (!process.env.DATABASE_URL) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'DATABASE_URL not configured' }));
    return;
  }

  const client = await pool.connect();
  try {
    if (req.method === 'GET') {
      const cases = await fetchCases(client);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ cases }));
      return;
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      if (!body || !body.scholar) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing case payload' }));
        return;
      }
      const inserted = await insertCases(client, [body]);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ case: inserted[0] }));
      return;
    }

    if (req.method === 'PUT') {
      const body = await parseBody(req);
      const incoming = Array.isArray(body.cases) ? body.cases : [];
      await client.query('BEGIN');
      await client.query('DELETE FROM support_triage.cases');
      let inserted = [];
      if (incoming.length) {
        inserted = await insertCases(client, incoming);
      }
      await client.query('COMMIT');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ cases: inserted }));
      return;
    }

    if (req.method === 'DELETE') {
      await client.query('DELETE FROM support_triage.cases');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    res.end();
  } catch (error) {
    console.error(error);
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(rollbackError);
    }
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Server error' }));
  } finally {
    client.release();
  }
};
