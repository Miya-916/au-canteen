import { Pool as PgPool } from "pg";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import WebSocket from "ws";

const connectionString = process.env.DATABASE_URL;

const pool =
  connectionString && (connectionString.includes("neon.tech") || connectionString.includes("neon.com"))
    ? (() => {
        neonConfig.webSocketConstructor = WebSocket;
        return new NeonPool({ connectionString });
      })()
    : connectionString
      ? new PgPool({
          connectionString,
          ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
          keepAlive: true,
          connectionTimeoutMillis: 10000,
        })
      : new PgPool({
          user: process.env.POSTGRES_USER || "postgres",
          password: process.env.POSTGRES_PASSWORD || "postgres",
          host: process.env.POSTGRES_HOST || "localhost",
          port: parseInt(process.env.POSTGRES_PORT || "5432"),
          database: process.env.POSTGRES_DB || "postgres",
        });

export async function ensureSchema() {
  await pool.query(`
    create table if not exists users (
      uid text primary key,
      email text unique,
      password_hash text,
      role text,
      shop_id text,
      created_at timestamp default now()
    );
  `);
  await pool.query(`
    create table if not exists shops (
      sid text primary key,
      name text,
      status text,
      owner_uid text,
      owner_name text,
      cuisine text,
      open_date text,
      email text,
      phone text,
      line_id text,
      address text,
      image_url text,
      qr_url text,
      category text,
      created_at timestamp default now()
    );
  `);
  await pool.query(`
    create table if not exists menu_items (
      id text primary key,
      shop_id text,
      name text,
      price decimal,
      stock integer,
      image_url text,
      category text,
      created_at timestamp default now(),
      updated_at timestamp default now()
    );
  `);
  await pool.query(`
    create table if not exists orders (
      id text primary key,
      shop_id text,
      user_id text,
      total_amount decimal,
      status text,
      pickup_time timestamp,
      note text,
      created_at timestamp default now()
    );
  `);
  await pool.query(`
    create table if not exists order_items (
      id text primary key,
      order_id text,
      menu_item_id text,
      quantity integer,
      price decimal,
      name text
    );
  `);
  
  // Add image_url column if it doesn't exist (for existing tables)
  try {
    await pool.query("alter table menu_items add column if not exists image_url text");
    await pool.query("alter table menu_items add column if not exists category text");
    await pool.query("alter table shops add column if not exists category text");
    await pool.query("alter table shops add column if not exists email text");
    await pool.query("alter table shops add column if not exists image_url text");
    await pool.query("alter table shops add column if not exists qr_url text");
    await pool.query("alter table orders add column if not exists pickup_time timestamp");
    await pool.query("alter table orders add column if not exists note text");
  } catch (e) {
    console.error("Error adding columns:", e);
  }
}

export async function listShops() {
  await ensureSchema();
  const res = await pool.query("select * from shops order by created_at desc");
  return res.rows;
}

export async function updateOrderStatus(orderId: string, status: string) {
  await ensureSchema();
  await pool.query(
    "update orders set status = $2 where id = $1",
    [orderId, status]
  );
  return { id: orderId, status };
}

export async function updateOrderStatusForShop(orderId: string, shopId: string, status: string) {
  await ensureSchema();
  const res = await pool.query(
    "update orders set status = $3 where id = $1 and shop_id = $2",
    [orderId, shopId, status]
  );
  return { updated: res.rowCount || 0 };
}

export async function getShop(sid: string) {
  await ensureSchema();
  const res = await pool.query("select * from shops where sid = $1", [sid]);
  return res.rows[0];
}

export async function createShop(
  name: string,
  status: string,
  ownerUid: string | null,
  ownerName: string | null,
  cuisine: string | null,
  openDate: string | null,
  ownerEmail: string | null,
  phone: string,
  lineId: string,
  address: string,
  category: string | null,
  imageUrl: string | null,
  qrUrl: string | null
) {
  await ensureSchema();
  const sid = crypto.randomUUID();
  await pool.query(
    "insert into shops(sid, name, status, owner_uid, owner_name, cuisine, open_date, email, phone, line_id, address, category, image_url, qr_url) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)",
    [sid, name, status, ownerUid, ownerName, cuisine, openDate, ownerEmail, phone, lineId, address, category, imageUrl, qrUrl]
  );
  
  if (ownerUid) {
    await pool.query("update users set shop_id = $1 where uid = $2", [sid, ownerUid]);
  }
  
  return { sid, name, status, ownerUid, ownerName, cuisine, openDate, email: ownerEmail, phone, lineId, address, category, image_url: imageUrl, qr_url: qrUrl };
}

export async function updateShop(
  sid: string,
  name: string,
  status: string,
  ownerUid: string | null,
  ownerName: string | null,
  cuisine: string | null,
  openDate: string | null,
  ownerEmail: string | null,
  phone: string,
  lineId: string,
  address: string,
  category: string | null,
  imageUrl: string | null,
  qrUrl: string | null
) {
  await ensureSchema();
  await pool.query(
    "update shops set name=$2, status=$3, owner_uid=$4, owner_name=$5, cuisine=$6, open_date=$7, email=$8, phone=$9, line_id=$10, address=$11, category=$12, image_url=$13, qr_url=$14 where sid=$1",
    [sid, name, status, ownerUid, ownerName, cuisine, openDate, ownerEmail, phone, lineId, address, category, imageUrl, qrUrl]
  );

  if (ownerUid) {
    await pool.query("update users set shop_id = $1 where uid = $2", [sid, ownerUid]);
  }
}

export async function deleteShop(sid: string) {
  await ensureSchema();
  await pool.query("delete from shops where sid = $1", [sid]);
  await pool.query("update users set shop_id = null where shop_id = $1", [sid]);
}

export async function getUserByEmail(email: string) {
  await ensureSchema();
  const res = await pool.query("select * from users where email = $1", [email]);
  return res.rows[0];
}

export async function getUser(uid: string) {
  await ensureSchema();
  const res = await pool.query("select * from users where uid = $1", [uid]);
  return res.rows[0];
}

export async function listOwners() {
  await ensureSchema();
  const res = await pool.query("select * from users where role = 'owner'");
  return res.rows;
}

export async function listPendingUpdates() {
  await ensureSchema();
  // TODO: Implement pending updates table and logic
  return [];
}

export async function listAnnouncements() {
  await ensureSchema();
  await pool.query(`
    create table if not exists announcements (
      id text primary key,
      title text,
      content text,
      is_published boolean default false,
      publish_time timestamp,
      is_sticky boolean default false,
      category text,
      visibility text default 'both',
      created_at timestamp default now()
    );
  `);
  
  // Ensure new columns exist
  try {
    await pool.query("alter table announcements add column if not exists publish_time timestamp");
    await pool.query("alter table announcements add column if not exists is_sticky boolean default false");
    await pool.query("alter table announcements add column if not exists category text");
    await pool.query("alter table announcements add column if not exists visibility text default 'both'");
  } catch (e) {
    console.error("Error adding announcement columns:", e);
  }

  const res = await pool.query("select * from announcements order by created_at desc");
  return res.rows;
}

export async function listAnnouncementsForRole(role: 'owner' | 'user') {
  await ensureSchema();
  const now = new Date().toISOString();
  
  // 基础查询：已发布 + 发布时间已到
  let query = `
    select * from announcements 
    where is_published = true 
    and (publish_time is null or publish_time <= $1)
  `;
  
  const params: [string] = [now];
  
  // 根据角色过滤可见性
  if (role === 'owner') {
    // 店主可见：owners + both
    query += ` and (visibility = 'owners' or visibility = 'both')`;
  } else if (role === 'user') {
    // 用户可见：users + both
    query += ` and (visibility = 'users' or visibility = 'both')`;
  }
  
  query += ` order by is_sticky desc, publish_time desc, created_at desc`;
  
  const res = await pool.query(query, params);
  return res.rows;
}

export async function createAnnouncement(
  title: string, 
  content: string, 
  isPublished: boolean,
  publishTime: string | null,
  isSticky: boolean,
  category: string | null,
  visibility: string | null
) {
  await ensureSchema();
  const id = crypto.randomUUID();
  await pool.query(
    "insert into announcements(id, title, content, is_published, publish_time, is_sticky, category, visibility) values($1, $2, $3, $4, $5, $6, $7, $8)",
    [id, title, content, isPublished, publishTime, isSticky, category, visibility || 'both']
  );
  return { id, title, content, is_published: isPublished, publish_time: publishTime, is_sticky: isSticky, category, visibility: visibility || 'both' };
}

export async function updateAnnouncement(
  id: string, 
  title: string, 
  content: string, 
  isPublished: boolean,
  publishTime: string | null,
  isSticky: boolean,
  category: string | null,
  visibility: string | null
) {
  await ensureSchema();
  await pool.query(
    "update announcements set title = $2, content = $3, is_published = $4, publish_time = $5, is_sticky = $6, category = $7, visibility = $8 where id = $1",
    [id, title, content, isPublished, publishTime, isSticky, category, visibility || 'both']
  );
  return { id, title, content, is_published: isPublished, publish_time: publishTime, is_sticky: isSticky, category, visibility: visibility || 'both' };
}

export async function deleteAnnouncement(id: string) {
  await ensureSchema();
  await pool.query("delete from announcements where id = $1", [id]);
}

export async function createUserLocal(email: string, hash: string, role: string) {
  await ensureSchema();
  const uid = crypto.randomUUID();
  await pool.query("insert into users(uid, email, password_hash, role) values($1, $2, $3, $4)", [uid, email, hash, role]);
  return { uid, email, role };
}

export async function setRoleByEmail(email: string, role: string) {
  await ensureSchema();
  await pool.query("update users set role = $2 where email = $1", [email, role]);
}

export async function updateUserPassword(uid: string, passwordHash: string) {
  await ensureSchema();
  await pool.query("update users set password_hash = $2 where uid = $1", [uid, passwordHash]);
}

export async function upsertUser(uid: string, email: string, role: string) {
  await ensureSchema();
  await pool.query(
    `insert into users(uid, email, role) values($1, $2, $3)
     on conflict(uid) do update set email = excluded.email, role = excluded.role`,
    [uid, email, role]
  );
}

export async function syncShopBindings() {
  await ensureSchema();
  const res = await pool.query(
    `update users u
     set shop_id = s.sid
     from shops s
     where s.owner_uid is not null
       and s.owner_uid = u.uid
       and (u.shop_id is null or u.shop_id <> s.sid)`
  );
  return res.rowCount || 0;
}

export async function getShopByOwnerUid(uid: string) {
  await ensureSchema();
  const res = await pool.query("select * from shops where owner_uid = $1", [uid]);
  return res.rows[0];
}

export async function getMenuItems(shopId: string) {
  await ensureSchema();
  const res = await pool.query(
    "select * from menu_items where shop_id = $1 order by created_at desc",
    [shopId]
  );
  return res.rows;
}

export async function createMenuItem(shopId: string, name: string, price: number, stock: number, imageUrl: string | null, category: string | null) {
  await ensureSchema();
  const id = crypto.randomUUID();
  await pool.query(
    "insert into menu_items(id, shop_id, name, price, stock, image_url, category) values($1, $2, $3, $4, $5, $6, $7)",
    [id, shopId, name, price, stock, imageUrl, category]
  );
  return { id, shop_id: shopId, name, price, stock, image_url: imageUrl, category };
}

export async function updateMenuItem(id: string, name: string, price: number, stock: number, imageUrl: string | null, category: string | null) {
  await ensureSchema();
  await pool.query(
    "update menu_items set name = $2, price = $3, stock = $4, image_url = $5, category = $6, updated_at = now() where id = $1",
    [id, name, price, stock, imageUrl, category]
  );
  return { id, name, price, stock, image_url: imageUrl, category };
}

export async function deleteMenuItem(id: string) {
  await ensureSchema();
  await pool.query("delete from menu_items where id = $1", [id]);
}

export async function bulkUpdateMenuStock(ids: string[], stock: number) {
  await ensureSchema();
  if (ids.length === 0) return;
  await pool.query(
    "update menu_items set stock = $2, updated_at = now() where id = any($1)",
    [ids, stock]
  );
}

export async function getShopStats(shopId: string) {
  await ensureSchema();
  const today = new Date().toISOString().split('T')[0];
  
  const ordersRes = await pool.query(
    "select count(*) as count, sum(total_amount) as revenue from orders where shop_id = $1 and created_at::date = $2",
    [shopId, today]
  );
  
  const topDishRes = await pool.query(
    `select name, sum(quantity) as total_qty 
     from order_items 
     join orders on orders.id = order_items.order_id 
     where orders.shop_id = $1 and orders.created_at::date = $2 
     group by name 
     order by total_qty desc 
     limit 1`,
    [shopId, today]
  );

  return {
    todayOrders: parseInt(ordersRes.rows[0]?.count || "0"),
    todayRevenue: parseFloat(ordersRes.rows[0]?.revenue || "0"),
    topDish: topDishRes.rows[0]?.name || "N/A"
  };
}

export async function getNewOrdersCount(shopId: string) {
  await ensureSchema();
  // For demo purposes, we just count pending orders
  const res = await pool.query(
    "select count(*) as count from orders where shop_id = $1 and status = 'pending'",
    [shopId]
  );
  return parseInt(res.rows[0]?.count || "0");
}

export async function getOrders(shopId: string) {
  await ensureSchema();
  const res = await pool.query(`
    select 
      o.*,
      json_agg(
        json_build_object(
          'id', oi.id,
          'name', oi.name,
          'quantity', oi.quantity,
          'price', oi.price
        )
      ) as items
    from orders o
    left join order_items oi on o.id = oi.order_id
    where o.shop_id = $1
    group by o.id
    order by o.created_at desc
  `, [shopId]);
  return res.rows;
}

export async function getOrdersForUser(userId: string) {
  await ensureSchema();
  const res = await pool.query(
    `
      select 
        o.*,
        s.name as shop_name,
        json_agg(
          json_build_object(
            'id', oi.id,
            'name', oi.name,
            'quantity', oi.quantity,
            'price', oi.price
          )
        ) as items
      from orders o
      join shops s on s.sid = o.shop_id
      left join order_items oi on o.id = oi.order_id
      where o.user_id = $1
      group by o.id, s.name
      order by o.created_at desc
    `,
    [userId]
  );
  return res.rows;
}

export async function getPickupSlotCounts(shopId: string, date: string) {
  await ensureSchema();
  const res = await pool.query(
    `
      select to_char(pickup_time, 'HH24:MI') as slot, count(*)::int as count
      from orders
      where shop_id = $1
        and pickup_time is not null
        and pickup_time::date = $2::date
      group by slot
    `,
    [shopId, date]
  );
  const out: Record<string, number> = {};
  for (const row of res.rows as { slot: string; count: number }[]) {
    out[row.slot] = Number(row.count) || 0;
  }
  return out;
}

export async function createOrder(
  shopId: string,
  userId: string,
  pickupTime: string,
  note: string | null,
  items: { menuItemId: string; quantity: number }[]
) {
  await ensureSchema();
  if (!items.length) throw new Error("empty-items");

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`${shopId}:${pickupTime}`]);

    const capacityRes = await client.query(
      `
        select count(*)::int as count
        from orders
        where shop_id = $1
          and pickup_time is not null
          and pickup_time >= $2::timestamp
          and pickup_time < ($2::timestamp + interval '15 minutes')
      `,
      [shopId, pickupTime]
    );
    const used = Number((capacityRes.rows[0] as { count?: number })?.count || 0);
    if (used >= 8) throw new Error("slot-full");

    const ids = items.map((it) => it.menuItemId);
    const menuRes = await client.query(
      `
        select id, name, price::float8 as price, stock
        from menu_items
        where shop_id = $2
          and id = any($1)
        for update
      `,
      [ids, shopId]
    );
    const menuMap = new Map<string, { id: string; name: string; price: number; stock: number }>();
    for (const row of menuRes.rows as { id: string; name: string; price: number; stock: number }[]) {
      menuMap.set(row.id, { id: row.id, name: row.name, price: Number(row.price), stock: Number(row.stock) });
    }

    let total = 0;
    for (const it of items) {
      const qty = Number(it.quantity);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error("invalid-quantity");
      const m = menuMap.get(it.menuItemId);
      if (!m) throw new Error("invalid-item");
      if (m.stock < qty) throw new Error("out-of-stock");
      total += m.price * qty;
    }

    const orderId = crypto.randomUUID();
    await client.query(
      `
        insert into orders(id, shop_id, user_id, total_amount, status, pickup_time, note)
        values($1, $2, $3, $4, $5, $6::timestamp, $7)
      `,
      [orderId, shopId, userId, total, "pending", pickupTime, note]
    );

    for (const it of items) {
      const qty = Number(it.quantity);
      const m = menuMap.get(it.menuItemId)!;

      const updated = await client.query(
        "update menu_items set stock = stock - $2, updated_at = now() where id = $1 and stock >= $2",
        [m.id, qty]
      );
      if (updated.rowCount !== 1) throw new Error("out-of-stock");

      await client.query(
        "insert into order_items(id, order_id, menu_item_id, quantity, price, name) values($1, $2, $3, $4, $5, $6)",
        [crypto.randomUUID(), orderId, m.id, qty, m.price, m.name]
      );
    }

    await client.query("commit");
    return { id: orderId, shop_id: shopId, user_id: userId, total_amount: total, status: "pending", pickup_time: pickupTime, note };
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
