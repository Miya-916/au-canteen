import { pool } from "./src/lib/db";

async function main() {
  const args = process.argv.slice(2);
  const orderId = args[0];

  if (!orderId) {
    console.log("Usage: npx tsx fix-order.ts <order_id>");
    
    // List pending orders to help
    console.log("\nRecent Pending Orders:");
    try {
        const res = await pool.query(`
            select o.id, o.status, o.created_at, s.name as shop_name 
            from orders o 
            join shops s on o.shop_id = s.sid 
            where o.status = 'pending' 
            order by o.created_at desc 
            limit 5
        `);
        console.table(res.rows.map(r => ({
            id: r.id,
            shop: r.shop_name,
            status: r.status,
            created: r.created_at.toLocaleString()
        })));
    } catch (e) {
        console.error("Failed to list orders:", e);
    }
    process.exit(1);
  }

  console.log(`Updating order ${orderId} to 'accepted'...`);
  try {
    const res = await pool.query(
      "update orders set status = 'accepted' where id = $1",
      [orderId]
    );
    if (res.rowCount === 1) {
      console.log("✅ Order status updated to 'accepted'.");
      console.log("User should now see the 'Pay Now' button.");
    } else {
      console.log("❌ Order not found or not updated.");
    }
  } catch (e) {
    console.error("Error updating order:", e);
  }
  process.exit(0);
}

main();
