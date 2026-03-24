import pg from 'pg';

const client = new pg.Client(process.env.DATABASE_URL);
await client.connect();
const res = await client.query(
  `UPDATE "user" SET is_admin = false WHERE email = $1`,
  [process.argv[2] || 'jenin@hackclub.com']
);
console.log('Updated', res.rowCount, 'row(s)');
await client.end();
