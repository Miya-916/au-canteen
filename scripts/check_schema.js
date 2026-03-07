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
    console.log("Checking users table schema...");
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    
    console.log("Columns:", res.rows.map(r => r.column_name));
    
    const hasName = res.rows.some(r => r.column_name === 'name');
    const hasImage = res.rows.some(r => r.column_name === 'image_url');
    
    if (hasName && hasImage) {
        console.log("Schema is correct.");
    } else {
        console.log("Schema is MISSING columns!");
        if (!hasName) console.log("Missing: name");
        if (!hasImage) console.log("Missing: image_url");
    }

  } catch (e) {
    console.error("Error:", e);
  } finally {
    await pool.end();
  }
}

main();
