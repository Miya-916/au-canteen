import { NextResponse } from "next/server";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const useSSL = !!connectionString && (connectionString.includes("neon.tech") || connectionString.includes("sslmode=require"));
const pool = new Pool({ connectionString, ssl: useSSL ? { rejectUnauthorized: false } : undefined });

export async function GET() {
  try {
    const serverNow = new Date();
    const serverNowBangkok = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(serverNow);

    const dbNowRes = await pool.query(`
      select
        now() as now_timestamptz,
        timezone('Asia/Bangkok', now()) as now_bangkok_timestamp,
        current_setting('TIMEZONE') as session_timezone
    `);

    const pickupTypeRes = await pool.query(`
      select
        (select data_type from information_schema.columns where table_name = 'orders' and column_name = 'pickup_time') as orders_pickup_time_type,
        (select data_type from information_schema.columns where table_name = 'slot_reservations' and column_name = 'pickup_time') as reservations_pickup_time_type,
        (select data_type from information_schema.columns where table_name = 'slot_reservations' and column_name = 'expires_at') as reservations_expires_at_type
    `);

    const usersRes = await pool.query("select uid, email, role, shop_id from users");
    const shopsRes = await pool.query("select sid, name, email as owner_email, owner_uid from shops");
    const ordersRes = await pool.query(`
      select
        id,
        shop_id,
        user_id,
        status,
        total_amount,
        created_at,
        pickup_time,
        to_char(timezone('Asia/Bangkok', pickup_time), 'YYYY-MM-DD HH24:MI') as pickup_time_bangkok
      from orders
      order by created_at desc
      limit 10
    `);
    
    return NextResponse.json({
      server: {
        now_string: serverNow.toString(),
        now_iso: serverNow.toISOString(),
        now_bangkok: serverNowBangkok,
        tz_offset_minutes: serverNow.getTimezoneOffset(),
      },
      db: {
        now: dbNowRes.rows[0],
        columns: pickupTypeRes.rows[0],
      },
      users: usersRes.rows,
      shops: shopsRes.rows,
      orders: ordersRes.rows,
      items: (await pool.query("select * from order_items limit 10")).rows
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
