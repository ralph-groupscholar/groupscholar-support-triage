const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

module.exports = async (_req, res) => {
  if (!process.env.DATABASE_URL) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ storage: 'DATABASE_URL not configured' }));
    return;
  }

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ storage: 'Postgres online' }));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ storage: 'Postgres unavailable' }));
  }
};
