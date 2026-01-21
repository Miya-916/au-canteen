import { NextResponse } from "next/server";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const useSSL = !!connectionString && (connectionString.includes("neon.tech") || connectionString.includes("sslmode=require"));
const pool = new Pool({ connectionString, ssl: useSSL ? { rejectUnauthorized: false } : undefined });

export async function GET() {
  try {
    const usersRes = await pool.query("select uid, email, role, shop_id from users");
    const shopsRes = await pool.query("select sid, name, owner_email, owner_uid from shops");
    
    return NextResponse.json({
      users: usersRes.rows,
      shops: shopsRes.rows
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
