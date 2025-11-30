const { Pool } = require('pg');

async function test(password) {
  console.log(`Testing password: '${password}'`);
  const pool = new Pool({
    user: 'postgres',
    password: password,
    host: 'localhost',
    port: 5432,
    database: 'postgres'
  });
  try {
    await pool.query('SELECT 1');
    console.log(`SUCCESS with password: '${password}'`);
    process.exit(0);
  } catch (e) {
    console.log('Failed:', e.message);
  }
  await pool.end();
}

async function run() {
  const passwords = ['postgres', 'password', '123456', 'admin', 'root', ''];
  for (const p of passwords) {
    await test(p);
  }
}

run();
