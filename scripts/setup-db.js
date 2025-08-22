const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const schemaPath = path.join(__dirname, '..', 'data', 'schema.sql');
const seedPath = path.join(__dirname, '..', 'data', 'seed.sql');

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    await client.query(schemaSql);
    await client.query(seedSql);

    console.log('Database schema and seed data applied.');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
