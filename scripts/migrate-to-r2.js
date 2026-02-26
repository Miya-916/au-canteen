
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Pool } = require('pg');

// Parse .env.local manually since dotenv is not installed
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    env[key] = value;
  }
});

const R2_ENDPOINT = env.R2_ENDPOINT;
const R2_BUCKET = env.R2_BUCKET;
const R2_ACCESS_KEY_ID = env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_BASE_URL = env.R2_PUBLIC_BASE_URL;
const DATABASE_URL = env.DATABASE_URL;

if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_BASE_URL) {
  console.error("Missing R2 credentials in .env.local");
  process.exit(1);
}

const s3 = new S3Client({
  endpoint: R2_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // R2 requires this
});

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon DB usually requires SSL
});

async function uploadFile(filePath, key) {
  const fileContent = fs.readFileSync(filePath);
  // Simple MIME type inference
  let contentType = 'application/octet-stream';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
  else if (filePath.endsWith('.png')) contentType = 'image/png';
  else if (filePath.endsWith('.webp')) contentType = 'image/webp';
  else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';

  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: fileContent,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  try {
    await s3.send(cmd);
    console.log(`Uploaded: ${key}`);
    return true;
  } catch (e) {
    console.error(`Failed to upload ${key}:`, e);
    return false;
  }
}

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

async function migrate() {
  const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log("No uploads directory found.");
    return;
  }

  const allFiles = getAllFiles(uploadsDir);
  console.log(`Found ${allFiles.length} files to migrate.`);

  let uploadedCount = 0;
  for (const filePath of allFiles) {
    // Determine relative path from public/uploads
    // e.g. /Users/.../public/uploads/sid/file.jpg -> sid/file.jpg
    const relativePath = path.relative(uploadsDir, filePath);
    
    // Map to R2 key: shops/sid/file.jpg
    // Note: Windows paths need to be converted to forward slashes for S3 keys
    const r2Key = `shops/${relativePath.split(path.sep).join('/')}`;
    
    console.log(`Migrating: ${relativePath} -> ${r2Key}`);
    const success = await uploadFile(filePath, r2Key);
    if (success) uploadedCount++;
  }

  console.log(`Uploaded ${uploadedCount}/${allFiles.length} files.`);

  // Now update DB
  // We need to replace '/uploads/' with '${R2_PUBLIC_BASE_URL}/shops/' in relevant columns
  // The public base url should not have trailing slash, but our replacement string needs to handle the path correctly.
  
  const publicBase = R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
  const newBase = `${publicBase}/shops/`;
  const oldBase = '/uploads/';

  console.log(`Updating DB: Replacing '${oldBase}' with '${newBase}'`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update shops.image_url
    const res1 = await client.query(`
      UPDATE shops 
      SET image_url = REPLACE(image_url, $1, $2) 
      WHERE image_url LIKE $3
    `, [oldBase, newBase, `${oldBase}%`]);
    console.log(`Updated shops.image_url: ${res1.rowCount} rows`);

    // Update shops.qr_url
    const res2 = await client.query(`
      UPDATE shops 
      SET qr_url = REPLACE(qr_url, $1, $2) 
      WHERE qr_url LIKE $3
    `, [oldBase, newBase, `${oldBase}%`]);
    console.log(`Updated shops.qr_url: ${res2.rowCount} rows`);

    // Update menu_items.image_url
    const res3 = await client.query(`
      UPDATE menu_items 
      SET image_url = REPLACE(image_url, $1, $2) 
      WHERE image_url LIKE $3
    `, [oldBase, newBase, `${oldBase}%`]);
    console.log(`Updated menu_items.image_url: ${res3.rowCount} rows`);

    // Update orders.receipt_url
    const res4 = await client.query(`
      UPDATE orders 
      SET receipt_url = REPLACE(receipt_url, $1, $2) 
      WHERE receipt_url LIKE $3
    `, [oldBase, newBase, `${oldBase}%`]);
    console.log(`Updated orders.receipt_url: ${res4.rowCount} rows`);

    await client.query('COMMIT');
    console.log("DB Update successful.");

  } catch (e) {
    await client.query('ROLLBACK');
    console.error("DB Update failed:", e);
  } finally {
    client.release();
    pool.end();
  }
}

migrate().catch(console.error);
