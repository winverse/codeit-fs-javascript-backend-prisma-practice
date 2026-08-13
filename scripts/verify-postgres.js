import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const { Client } = pg;
const root = new URL('../src/practices/01-sql-basics/', import.meta.url);
const fixture = JSON.parse(
  readFileSync(new URL('fixtures/expected.json', root), 'utf8'),
);
const sql = readFileSync(new URL('answers/task.sql', root), 'utf8');
const connectionString = process.env.PRACTICE_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'PRACTICE_DATABASE_URL is required for explicit PostgreSQL verification',
  );
}

const target = new URL(connectionString);
const databaseName = target.pathname.slice(1);
if (!['127.0.0.1', 'localhost', '::1'].includes(target.hostname)) {
  throw new Error('Only a local PostgreSQL host is allowed');
}
if (!databaseName.startsWith(fixture.databasePrefix)) {
  throw new Error(`Database name must start with ${fixture.databasePrefix}`);
}

const schemaName = `practice_${process.pid}_${Date.now()}`;
const client = new Client({ connectionString });
let connected = false;

async function expectPgError(statement, code) {
  await client.query('SAVEPOINT expected_failure');
  let captured;
  try {
    await client.query(statement);
  } catch (error) {
    captured = error;
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT expected_failure');
    await client.query('RELEASE SAVEPOINT expected_failure');
  }
  assert.equal(captured?.code, code);
}

try {
  await client.connect();
  connected = true;
  const server = await client.query(
    "SELECT current_setting('server_version_num')::int AS version_num, current_database() AS database_name",
  );
  assert.equal(
    Math.floor(server.rows[0].version_num / 10000),
    fixture.postgresMajor,
  );
  assert.equal(server.rows[0].database_name, databaseName);

  await client.query('BEGIN');
  await client.query(`CREATE SCHEMA "${schemaName}"`);
  await client.query(`SET LOCAL search_path TO "${schemaName}"`);
  await client.query(sql);

  const tables = await client.query(
    'SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename',
    [schemaName],
  );
  assert.deepEqual(
    tables.rows.map(({ tablename }) => tablename),
    [...fixture.tables].sort(),
  );

  const expensive = await client.query(
    'SELECT "name" FROM "Products" WHERE "price" >= $1 ORDER BY "id"',
    [fixture.minimumPrice],
  );
  assert.deepEqual(
    expensive.rows.map(({ name }) => name),
    fixture.expensiveProducts,
  );
  const purchases = await client.query(
    'SELECT COUNT(*)::int AS count FROM "Purchases" WHERE "customerId" = $1',
    [fixture.customerId],
  );
  assert.equal(purchases.rows[0].count, fixture.purchaseCount);

  await expectPgError(
    `INSERT INTO "Customers" ("id", "email", "name") VALUES (1, 'new@test.com', 'PK 중복')`,
    '23505',
  );
  await expectPgError(
    `INSERT INTO "Customers" ("email", "name") VALUES ('customer1@test.com', '중복')`,
    '23505',
  );
  await expectPgError(
    'INSERT INTO "Purchases" ("customerId", "productId", "quantity") VALUES (999, 1, 1)',
    '23503',
  );
  await expectPgError(
    'INSERT INTO "Purchases" ("customerId", "productId", "quantity") VALUES (1, 1, 0)',
    '23514',
  );

  console.log('PostgreSQL 18 SQL contract passed');
} finally {
  if (connected) {
    try {
      await client.query('ROLLBACK');
    } finally {
      await client.end();
    }
  }
}
