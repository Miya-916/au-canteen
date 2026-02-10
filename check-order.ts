
// @ts-expect-error esm import path uses extension
import { pool } from "./src/lib/db.ts";

async function main() {
  console.log("Checking orders...");
  try {
    const res = await pool.query("select id, status, shop_id, user_id, created_at from orders order by created_at desc limit 5");
    console.table(res.rows.map(r => ({
        id: r.id,
        shop_id: r.shop_id,
        status: r.status,
        created: r.created_at
    })));
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

main();
