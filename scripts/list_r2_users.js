const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

// Load .env.local manually without dotenv
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

const endpoint = process.env.R2_ENDPOINT;
const bucket = process.env.R2_BUCKET;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
  console.error("Missing R2 environment variables");
  process.exit(1);
}

const client = new S3Client({
  endpoint,
  region: "auto",
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
});

async function listUserFiles() {
  try {
    console.log(`Listing files in bucket '${bucket}' under 'users/' prefix...`);
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: "users/",
    });

    const response = await client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log("No files found in 'users/' folder.");
      return;
    }

    console.log("\nFound the following user profiles:");
    response.Contents.forEach(obj => {
      console.log(`- ${obj.Key}`);
    });

  } catch (error) {
    console.error("Error listing files:", error);
  }
}

listUserFiles();
