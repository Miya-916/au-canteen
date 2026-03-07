const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  for (const line of envConfig.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    const res = await pool.query(`SELECT uid, name, image_url FROM users`);
    console.log("Users in DB:");
    res.rows.forEach(r => {
        console.log(`- UID: ${r.uid}`);
        console.log(`  Name: ${r.name}`);
        console.log(`  Image: ${r.image_url}`);
    });
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await pool.end();
  }
}

main();
