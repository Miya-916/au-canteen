import { Pool as PgPool } from "pg";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import WebSocket from "ws";

const connectionString = process.env.DATABASE_URL;
const PICKUP_SLOT_WINDOW_MINUTES = 15;
const PICKUP_SLOT_LIMIT = 8;

export const pool =
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

function normalizeToUtcIsoFromBangkokInput(value: string) {
  // Ensure it always has Bangkok timezone
  let s = String(value || "").trim();
  if (!s) throw new Error("invalid-pickup-time");

  // If no timezone exists, force +07:00
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  if (!hasZone) {
    if (s.includes(" ")) s = s.replace(" ", "T");
    s = s + "+07:00";
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new Error("invalid-pickup-time");
  }

  // Convert to proper UTC ISO
  return d.toISOString();
}




export async function ensureSchema() {
  await pool.query(`
    create table if not exists users (
      uid text primary key,
      email text unique,
      password_hash text,
      role text,
      shop_id text,
      name text,
      image_url text,
      is_active boolean default true,
      email_verified boolean default true,
      verified_at timestamptz,
      created_at timestamp default now()
    );
  `);
  // Migration for existing tables
  try {
    await pool.query("alter table users add column if not exists name text");
    await pool.query("alter table users add column if not exists image_url text");
    await pool.query("alter table users add column if not exists is_active boolean default true");
    await pool.query("alter table users add column if not exists email_verified boolean default true");
    await pool.query("alter table users add column if not exists verified_at timestamptz");
    await pool.query("update users set is_active = true where is_active is null");
    await pool.query("update users set email_verified = true where email_verified is null");
  } catch (e) {
    console.error("Error migrating users table:", e);
  }
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
      pickup_time timestamptz,
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
      name text,
      note text
    );
  `);
  await pool.query(`
    create table if not exists slot_reservations (
      id text primary key,
      shop_id text not null,
      user_id text not null,
      pickup_time timestamptz not null,
      expires_at timestamptz not null,
      created_at timestamp default now()
    );
  `);
  await pool.query(`
    create table if not exists pending_updates (
      id text primary key,
      sid text not null,
      shop_name text,
      changes jsonb not null,
      status text default 'pending',
      requested_by text,
      reason text,
      created_at timestamp default now(),
      owner_read_at timestamp
    );
  `);
  try {
    await pool.query("alter table pending_updates add column if not exists shop_name text");
    await pool.query("alter table pending_updates add column if not exists requested_by text");
    await pool.query("alter table pending_updates add column if not exists reason text");
    await pool.query("alter table pending_updates add column if not exists status text default 'pending'");
    await pool.query("alter table pending_updates add column if not exists created_at timestamp default now()");
    await pool.query("alter table pending_updates add column if not exists owner_read_at timestamp");
  } catch {}
  
  // Add image_url column if it doesn't exist (for existing tables)
  try {
    await pool.query("alter table menu_items add column if not exists image_url text");
    await pool.query("alter table menu_items add column if not exists category text");
    await pool.query("alter table menu_items add column if not exists is_active boolean default true");
    await pool.query("alter table shops add column if not exists category text");
    await pool.query("alter table shops add column if not exists email text");
    await pool.query("alter table shops add column if not exists image_url text");
    await pool.query("alter table shops add column if not exists qr_url text");
    await pool.query("alter table orders add column if not exists pickup_time timestamptz");
    await pool.query("alter table orders add column if not exists note text");
    await pool.query("alter table orders add column if not exists receipt_url text");
    await pool.query("alter table orders add column if not exists payment_reference text");
    await pool.query("alter table orders add column if not exists reminder_sent_at timestamptz");
    await pool.query("alter table order_items add column if not exists note text");
    await pool.query("alter table order_items add column if not exists name text");
  } catch (e) {
    console.error("Error adding columns:", e);
  }

  try {
    await pool.query(`
      do $$
      begin
        if exists (
          select 1
          from information_schema.columns
          where table_name = 'orders'
            and column_name = 'pickup_time'
            and data_type = 'timestamp without time zone'
        ) then
          alter table orders
          alter column pickup_time type timestamptz
          using (pickup_time at time zone 'Asia/Bangkok');
        end if;

        if exists (
          select 1
          from information_schema.columns
          where table_name = 'orders'
            and column_name = 'reminder_sent_at'
            and data_type = 'timestamp without time zone'
        ) then
          alter table orders
          alter column reminder_sent_at type timestamptz
          using (reminder_sent_at at time zone 'UTC');
        end if;

        if exists (
          select 1
          from information_schema.columns
          where table_name = 'slot_reservations'
            and column_name = 'pickup_time'
            and data_type = 'timestamp without time zone'
        ) then
          alter table slot_reservations
          alter column pickup_time type timestamptz
          using (pickup_time at time zone 'Asia/Bangkok');
        end if;

        if exists (
          select 1
          from information_schema.columns
          where table_name = 'slot_reservations'
            and column_name = 'expires_at'
            and data_type = 'timestamp without time zone'
        ) then
          alter table slot_reservations
          alter column expires_at type timestamptz
          using (expires_at at time zone 'UTC');
        end if;
      end
      $$;
    `);
  } catch {}
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

const allowedOrderTransitions = new Map<string, Set<string>>([
  ["pending", new Set(["accepted", "cancelled"])],
  ["accepted", new Set(["preparing", "cancelled"])],
  ["preparing", new Set(["ready", "cancelled"])],
  ["ready", new Set(["completed", "cancelled"])],
  ["completed", new Set()],
  ["cancelled", new Set()],
  ["expired", new Set()],
]);

function canMoveOrderStatus(current: string, next: string) {
  return allowedOrderTransitions.get(current)?.has(next) ?? false;
}

export async function updateOrderStatusForShop(orderId: string, shopId: string, status: string) {
  await ensureSchema();
  const normalizedNext = status.trim().toLowerCase();
  const client = await pool.connect();
  try {
    await client.query("begin");

    const orderRes = await client.query(
      "select status from orders where id = $1 and shop_id = $2 for update",
      [orderId, shopId]
    );
    if (orderRes.rows.length === 0) {
      await client.query("rollback");
      return { updated: 0, reason: "not-found" };
    }

    const current = String(orderRes.rows[0].status || "").trim().toLowerCase();
    if (current === normalizedNext) {
      await client.query("rollback");
      return { updated: 0, reason: "already-updated" };
    }

    if (!canMoveOrderStatus(current, normalizedNext)) {
      await client.query("rollback");
      return { updated: 0, reason: "invalid-transition", currentStatus: current };
    }

    if (normalizedNext === "cancelled") {
      const itemsRes = await client.query(
        "select menu_item_id, quantity from order_items where order_id = $1",
        [orderId]
      );
      for (const item of itemsRes.rows) {
        await client.query(
          "update menu_items set stock = stock + $1, updated_at = now() where id = $2",
          [item.quantity, item.menu_item_id]
        );
      }
    }

    const res = await client.query(
      "update orders set status = $3 where id = $1 and shop_id = $2",
      [orderId, shopId, normalizedNext]
    );
    await client.query("commit");
    return { updated: res.rowCount || 0 };
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function getOrder(id: string) {
  await ensureSchema();
  const res = await pool.query("select * from orders where id = $1", [id]);
  return res.rows[0];
}

export async function expireOverdueOrder(orderId: string) {
  await ensureSchema();
  const res = await pool.query(
    `
      update orders
      set status = 'expired'
      where id = $1
        and lower(coalesce(status, '')) in ('pending', 'accepted')
        and receipt_url is null
        and pickup_time is not null
        and pickup_time <= now()
    `,
    [orderId]
  );
  return { updated: res.rowCount || 0 };
}

export async function expireOverdueOrdersForUser(userId: string) {
  await ensureSchema();
  const res = await pool.query(
    `
      update orders
      set status = 'expired'
      where user_id = $1
        and lower(coalesce(status, '')) in ('pending', 'accepted')
        and receipt_url is null
        and pickup_time is not null
        and pickup_time <= now()
    `,
    [userId]
  );
  return { updated: res.rowCount || 0 };
}

export async function expireOverdueOrdersForShop(shopId: string) {
  await ensureSchema();
  const res = await pool.query(
    `
      update orders
      set status = 'expired'
      where shop_id = $1
        and lower(coalesce(status, '')) in ('pending', 'accepted')
        and receipt_url is null
        and pickup_time is not null
        and pickup_time <= now()
    `,
    [shopId]
  );
  return { updated: res.rowCount || 0 };
}

export async function updateOrderStatusForUser(orderId: string, uid: string, status: string) {
  await ensureSchema();
  // Ensure order belongs to user
  const res = await pool.query(
    "update orders set status = $3 where id = $1 and user_id = $2",
    [orderId, uid, status]
  );
  return { updated: res.rowCount || 0 };
}

export async function attachOrderReceipt(orderId: string, uid: string, receiptUrl: string | null, paymentRef: string | null) {
  await ensureSchema();
  const res = await pool.query(
    "update orders set receipt_url = $3, payment_reference = $4 where id = $1 and user_id = $2",
    [orderId, uid, receiptUrl, paymentRef]
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
  address: string,
  category: string | null,
  imageUrl: string | null,
  qrUrl: string | null,
  customSid?: string
) {
  await ensureSchema();
  const sid = customSid || crypto.randomUUID();
  await pool.query(
    "insert into shops(sid, name, status, owner_uid, owner_name, cuisine, open_date, email, phone, address, category, image_url, qr_url) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
    [sid, name, status, ownerUid, ownerName, cuisine, openDate, ownerEmail, phone, address, category, imageUrl, qrUrl]
  );
  
  if (ownerUid) {
    await pool.query("update users set shop_id = $1 where uid = $2", [sid, ownerUid]);
  }
  
  return { sid, name, status, ownerUid, ownerName, cuisine, openDate, email: ownerEmail, phone, address, category, image_url: imageUrl, qr_url: qrUrl };
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
  address: string,
  category: string | null,
  imageUrl: string | null,
  qrUrl: string | null
) {
  await ensureSchema();
  await pool.query(
    "update shops set name=$2, status=$3, owner_uid=$4, owner_name=$5, cuisine=$6, open_date=$7, email=$8, phone=$9, address=$10, category=$11, image_url=$12, qr_url=$13 where sid=$1",
    [sid, name, status, ownerUid, ownerName, cuisine, openDate, ownerEmail, phone, address, category, imageUrl, qrUrl]
  );

  if (ownerUid) {
    await pool.query("update users set shop_id = $1 where uid = $2", [sid, ownerUid]);
  }
}

export async function deleteShop(sid: string) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const ownerRes = await client.query("select owner_uid from shops where sid = $1", [sid]);
    const ownerUid = ownerRes.rows[0]?.owner_uid || null;
    // Delete dependent records first to avoid foreign key constraints
    // 1. Delete order_items linked to orders of this shop
    await client.query("delete from order_items where order_id in (select id from orders where shop_id = $1)", [sid]);
    // 2. Delete orders
    await client.query("delete from orders where shop_id = $1", [sid]);
    // 3. Delete menu_items
    await client.query("delete from menu_items where shop_id = $1", [sid]);
    // 4. Delete slot_reservations
    await client.query("delete from slot_reservations where shop_id = $1", [sid]);
    // 5. Delete pending_updates
    await client.query("delete from pending_updates where sid = $1", [sid]);
    
    // Finally delete the shop
    await client.query("delete from shops where sid = $1", [sid]);
    await client.query("delete from users where shop_id = $1", [sid]);
    if (ownerUid) {
      await client.query("delete from users where uid = $1 and role = 'owner'", [ownerUid]);
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
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
  const res = await pool.query(`
    select distinct on (u.uid) u.*, s.name as shop_name, s.sid as linked_shop_id
    from users u
    inner join shops s on (s.owner_uid = u.uid or s.sid = u.shop_id)
    where u.role = 'owner'
    order by u.uid, s.created_at desc nulls last, s.sid
  `);
  return res.rows;
}

export async function listPendingUpdates() {
  await ensureSchema();
  const res = await pool.query(`
    select id, sid, shop_name, changes, status, created_at, owner_read_at
    from pending_updates
    order by created_at desc
  `);
  return res.rows;
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
  
  // 基础查询：已发布
  let query = `
    select * from announcements 
    where is_published = true 
  `;
  
  // 根据角色过滤可见性
  if (role === 'owner') {
    query += ` and (visibility = 'owners' or visibility = 'both')`;
  } else if (role === 'user') {
    query += ` and (visibility = 'users' or visibility = 'both')`;
  }
  
  query += ` order by is_sticky desc, coalesce(publish_time, created_at) desc, created_at desc`;
  
  const res = await pool.query(query);
  return res.rows;
}

export async function createPendingUpdate(
  sid: string,
  changes: Record<string, unknown>,
  requestedBy: string | null,
  reason: string | null
) {
  await ensureSchema();
  const id = crypto.randomUUID();
  // Try to include current shop name for convenience
  let shopName: string | null = null;
  try {
    const s = await getShop(sid);
    shopName = s?.name || null;
  } catch {}
  // Filter only allowed fields and normalize values
  const allowed = new Set([
    "name",
    "cuisine",
    "address",
    "phone",
    "open_date",
    "message",
  ]);
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(changes || {})) {
    if (allowed.has(k)) {
      filtered[k] = v === "" ? null : v;
    }
  }
  await pool.query(
    "insert into pending_updates(id, sid, shop_name, changes, status, requested_by, reason) values($1, $2, $3, $4::jsonb, 'pending', $5, $6)",
    [id, sid, shopName, JSON.stringify(filtered), requestedBy, reason]
  );
  return { id, sid, shop_name: shopName, changes: filtered, status: "pending" };
}

export async function approvePendingUpdate(id: string) {
  await ensureSchema();
  // Fetch the pending record
  const res = await pool.query("select * from pending_updates where id = $1", [id]);
  if (res.rows.length === 0) return { updated: 0 };
  const row = res.rows[0] as {
    id: string;
    sid: string;
    changes: Record<string, unknown>;
  };
  const sid = row.sid;
  const changes = row.changes || {};

  // Only allow updating whitelisted fields
  const allowed = new Set([
    "name",
    "cuisine",
    "address",
    "phone",
    "open_date",
  ]);
  const assignments: string[] = [];
  const values: unknown[] = [sid];
  let idx = 2;
  for (const [key, val] of Object.entries(changes)) {
    if (allowed.has(key)) {
      assignments.push(`${key} = $${idx}`);
      values.push(val);
      idx += 1;
    }
  }
  if (assignments.length > 0) {
    await pool.query(`update shops set ${assignments.join(", ")} where sid = $1`, values);
  }
  await pool.query("update pending_updates set status = 'approved', owner_read_at = null where id = $1", [id]);
  return { updated: assignments.length, status: "approved" };
}

export async function rejectPendingUpdate(id: string) {
  await ensureSchema();
  const res = await pool.query("update pending_updates set status = 'rejected', owner_read_at = null where id = $1", [id]);
  return { updated: res.rowCount || 0, status: "rejected" };
}

export async function markPendingUpdateUpdated(id: string) {
  await ensureSchema();
  const res = await pool.query("update pending_updates set status = 'updated', owner_read_at = null where id = $1", [id]);
  return { updated: res.rowCount || 0, status: "updated" };
}

export async function markPendingUpdateReadByOwner(id: string) {
  await ensureSchema();
  const res = await pool.query("update pending_updates set owner_read_at = now() where id = $1", [id]);
  return { updated: res.rowCount || 0, status: "read" };
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

export async function createUserLocal(
  email: string,
  hash: string,
  role: string,
  options?: { isActive?: boolean; emailVerified?: boolean }
) {
  await ensureSchema();
  const uid = crypto.randomUUID();
  const isActive = options?.isActive ?? true;
  const emailVerified = options?.emailVerified ?? true;
  await pool.query(
    "insert into users(uid, email, password_hash, role, is_active, email_verified, verified_at) values($1, $2, $3, $4, $5, $6, case when $6 then now() else null end)",
    [uid, email, hash, role, isActive, emailVerified]
  );
  return { uid, email, role };
}

export async function activateUserByUid(uid: string) {
  await ensureSchema();
  const res = await pool.query(
    "update users set is_active = true, email_verified = true, verified_at = now() where uid = $1",
    [uid]
  );
  return { updated: res.rowCount || 0 };
}

export async function setRoleByEmail(email: string, role: string) {
  await ensureSchema();
  await pool.query("update users set role = $2 where email = $1", [email, role]);
}

export async function updateUserPassword(uid: string, passwordHash: string, email?: string | null) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const primary = await client.query(
      "update users set password_hash = $2 where uid = $1",
      [uid, passwordHash]
    );
    let synced = 0;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (normalizedEmail) {
      const extra = await client.query(
        "update users set password_hash = $2 where uid <> $1 and lower(trim(email)) = $3",
        [uid, passwordHash, normalizedEmail]
      );
      synced = extra.rowCount || 0;
    }
    await client.query("commit");
    return { updated: primary.rowCount || 0, synced };
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function updateUserProfile(uid: string, name: string | null, imageUrl: string | null) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("update users set name = $2, image_url = $3 where uid = $1", [uid, name, imageUrl]);
    
    // Also update shop owner name if this user owns a shop
    if (name) {
      await client.query("update shops set owner_name = $2 where owner_uid = $1", [uid, name]);
    }
    
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
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

export async function getMenuItems(shopId: string, onlyActive = false) {
  await ensureSchema();
  if (onlyActive) {
    const res = await pool.query(
      "select * from menu_items where shop_id = $1 and is_active = true order by created_at desc",
      [shopId]
    );
    return res.rows;
  }
  const res = await pool.query(
    "select * from menu_items where shop_id = $1 order by created_at desc",
    [shopId]
  );
  return res.rows;
}

export async function createMenuItem(shopId: string, name: string, price: number, stock: number, imageUrl: string | null, category: string | null, customId?: string, isActive: boolean = true) {
  await ensureSchema();
  const id = customId || crypto.randomUUID();
  await pool.query(
    "insert into menu_items(id, shop_id, name, price, stock, image_url, category, is_active) values($1, $2, $3, $4, $5, $6, $7, $8)",
    [id, shopId, name, price, stock, imageUrl, category, isActive]
  );
  return { id, shop_id: shopId, name, price, stock, image_url: imageUrl, category, is_active: isActive };
}

export async function updateMenuItem(id: string, name: string, price: number, stock: number, imageUrl: string | null, category: string | null, isActive?: boolean) {
  await ensureSchema();
  if (isActive === undefined) {
    await pool.query(
      "update menu_items set name = $2, price = $3, stock = $4, image_url = $5, category = $6, updated_at = now() where id = $1",
      [id, name, price, stock, imageUrl, category]
    );
    return { id, name, price, stock, image_url: imageUrl, category };
  } else {
    await pool.query(
      "update menu_items set name = $2, price = $3, stock = $4, image_url = $5, category = $6, is_active = $7, updated_at = now() where id = $1",
      [id, name, price, stock, imageUrl, category, isActive]
    );
    return { id, name, price, stock, image_url: imageUrl, category, is_active: isActive };
  }
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

export async function getAdminStats() {
  await ensureSchema();
  const [shopsRes, openRes, pendingRes, visitorsRes] = await Promise.all([
    pool.query("select count(*)::int as c from shops"),
    pool.query("select count(*)::int as c from shops where lower(status) = 'open'"),
    pool.query("select count(*)::int as c from pending_updates where lower(status) = 'pending'"),
    pool.query("select count(distinct user_id)::int as c from orders where created_at::date = current_date")
  ]);
  return {
    totalShops: Number(shopsRes.rows[0]?.c || 0),
    openShops: Number(openRes.rows[0]?.c || 0),
    pendingUpdates: Number(pendingRes.rows[0]?.c || 0),
    todaysVisitors: Number(visitorsRes.rows[0]?.c || 0),
  };
}

export async function getOrders(shopId: string) {
  await ensureSchema();
  await expireOverdueOrdersForShop(shopId);
  // Only return today's orders (based on Asia/Bangkok timezone) for the active dashboard
  const res = await pool.query(`
    select 
      o.*,
      json_agg(
        json_build_object(
          'id', oi.id,
          'name', oi.name,
          'quantity', oi.quantity,
          'price', oi.price,
          'note', oi.note
        )
      ) as items
    from orders o
    left join order_items oi on o.id = oi.order_id
    where o.shop_id = $1
      and date(timezone('Asia/Bangkok', o.created_at)) = date(timezone('Asia/Bangkok', now()))
    group by o.id
    order by o.created_at desc
  `, [shopId]);
  return res.rows;
}

export async function getOrdersInRange(shopId: string, fromDate: string, toDate: string, offset: number, limit: number) {
  await ensureSchema();
  const countRes = await pool.query(
    `
      select count(*)::int as total
      from orders
      where shop_id = $1
        and created_at::date >= $2::date
        and created_at::date <= $3::date
    `,
    [shopId, fromDate, toDate]
  );
  const listRes = await pool.query(
    `
      with filtered as (
        select id
        from orders
        where shop_id = $1
          and created_at::date >= $2::date
          and created_at::date <= $3::date
        order by created_at desc
        offset $4
        limit $5
      )
      select 
        o.*,
        coalesce(
          json_agg(
            case 
              when oi.id is null then null
              else json_build_object(
                'id', oi.id,
                'name', oi.name,
                'quantity', oi.quantity,
                'price', oi.price,
                'note', oi.note
              )
            end
          ) filter (where oi.id is not null),
          '[]'::json
        ) as items
      from orders o
      left join order_items oi on o.id = oi.order_id
      where o.id in (select id from filtered)
      group by o.id
      order by o.created_at desc
    `,
    [shopId, fromDate, toDate, offset, limit]
  );
  return { total: Number(countRes.rows[0]?.total || 0), rows: listRes.rows };
}

export async function getBestSellingShops(limit = 6, days: number | null = null) {
  await ensureSchema();
  const since = typeof days === "number" && Number.isFinite(days) ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;
  const res = await pool.query(
    `
      select
        s.sid,
        s.name,
        s.status,
        s.owner_name,
        s.email as owner_email,
        s.cuisine,
        s.address,
        s.category,
        s.image_url,
        count(o.id)::int as orders_count
      from shops s
      join orders o on o.shop_id = s.sid
      where lower(coalesce(o.status, '')) <> 'cancelled'
        and ($2::timestamp is null or o.created_at >= $2::timestamp)
      group by s.sid, s.name, s.status, s.owner_name, s.email, s.cuisine, s.address, s.category, s.image_url
      order by orders_count desc, s.created_at desc
      limit $1
    `,
    [limit, since]
  );
  return res.rows as {
    sid: string;
    name: string;
    status: string;
    owner_name: string | null;
    owner_email: string | null;
    cuisine: string | null;
    address: string | null;
    category: string | null;
    image_url?: string | null;
    orders_count: number;
  }[];
}

export async function getTimeBasedRecommendedShops(
  startHour: number,
  endHour: number,
  limit = 6,
  days = 30
) {
  await ensureSchema();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const res = await pool.query(
    `
      select
        s.sid,
        s.name,
        s.status,
        s.owner_name,
        s.email as owner_email,
        s.cuisine,
        s.address,
        s.category,
        s.image_url,
        count(o.id)::int as orders_count
      from orders o
      join shops s on s.sid = o.shop_id
      where lower(coalesce(o.status, '')) <> 'cancelled'
        and o.created_at >= $4::timestamp
        and extract(hour from timezone('Asia/Bangkok', o.created_at)) >= $1
        and extract(hour from timezone('Asia/Bangkok', o.created_at)) < $2
      group by s.sid, s.name, s.status, s.owner_name, s.email, s.cuisine, s.address, s.category, s.image_url
      order by orders_count desc, s.created_at desc
      limit $3
    `,
    [startHour, endHour, limit, since]
  );
  return res.rows as {
    sid: string;
    name: string;
    status: string;
    owner_name: string | null;
    owner_email: string | null;
    cuisine: string | null;
    address: string | null;
    category: string | null;
    image_url?: string | null;
    orders_count: number;
  }[];
}

export async function getPopularMenuItems(limit = 6, days = 7) {
  await ensureSchema();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const res = await pool.query(
    `
      select
        mi.id as menu_item_id,
        mi.name as menu_item_name,
        mi.image_url as menu_item_image_url,
        mi.price::float8 as menu_item_price,
        s.sid as shop_id,
        s.name as shop_name,
        s.cuisine as shop_cuisine,
        s.address as shop_address,
        s.category as shop_category,
        sum(oi.quantity)::int as sold_qty
      from order_items oi
      join orders o on o.id = oi.order_id
      join shops s on s.sid = o.shop_id
      left join menu_items mi on mi.id = oi.menu_item_id
      where lower(coalesce(o.status, '')) <> 'cancelled'
        and o.created_at >= $2::timestamp
        and mi.id is not null
        and coalesce(mi.is_active, true) = true
      group by mi.id, mi.name, mi.image_url, mi.price, s.sid, s.name, s.cuisine, s.address, s.category
      order by sold_qty desc
      limit $1
    `,
    [limit, since]
  );
  return res.rows as {
    menu_item_id: string;
    menu_item_name: string;
    menu_item_image_url: string | null;
    menu_item_price: number;
    shop_id: string;
    shop_name: string;
    shop_cuisine: string | null;
    shop_address: string | null;
    shop_category: string | null;
    sold_qty: number;
  }[];
}

export async function getShopReports(shopId: string, fromDate: string, toDate: string) {
  await ensureSchema();
  const summaryRes = await pool.query(
    `
      select 
        coalesce(sum(total_amount), 0)::float8 as total_sales, 
        count(*)::int as total_orders
      from orders
      where shop_id = $1
        and created_at::date >= $2::date
        and created_at::date <= $3::date
    `,
    [shopId, fromDate, toDate]
  );
  const categoryRes = await pool.query(
    `
      select 
        coalesce(mi.category, 'Uncategorized') as category,
        sum(oi.quantity)::int as units,
        coalesce(sum(oi.price * oi.quantity), 0)::float8 as sales
      from order_items oi
      join orders o on oi.order_id = o.id
      left join menu_items mi on mi.shop_id = o.shop_id and mi.name = oi.name
      where o.shop_id = $1
        and o.created_at::date >= $2::date
        and o.created_at::date <= $3::date
      group by category
      order by sales desc
    `,
    [shopId, fromDate, toDate]
  );
  const rangeRes = await pool.query(
    `
      with buckets as (
        select
          case
            when extract(hour from created_at) >= 6 and extract(hour from created_at) < 10 then '06–10'
            when extract(hour from created_at) >= 10 and extract(hour from created_at) < 14 then '10–14'
            when extract(hour from created_at) >= 14 and extract(hour from created_at) < 18 then '14–18'
            else null
          end as slot,
          total_amount
        from orders
        where shop_id = $1
          and created_at::date >= $2::date
          and created_at::date <= $3::date
      )
      select slot, count(*)::int as orders, coalesce(sum(total_amount), 0)::float8 as sales
      from buckets
      where slot is not null
      group by slot
      order by slot asc
    `,
    [shopId, fromDate, toDate]
  );
  const timeRes = await pool.query(
    `
      select 
        extract(hour from created_at)::int as hour,
        count(*)::int as orders
      from orders
      where shop_id = $1
        and created_at::date >= $2::date
        and created_at::date <= $3::date
      group by hour
      order by hour asc
    `,
    [shopId, fromDate, toDate]
  );
  const trendRes = await pool.query(
    `
      select 
        created_at::date as day, 
        coalesce(sum(total_amount), 0)::float8 as sales, 
        count(*)::int as orders
      from orders
      where shop_id = $1
        and created_at::date >= $2::date
        and created_at::date <= $3::date
      group by day
      order by day asc
    `,
    [shopId, fromDate, toDate]
  );
  const topRes = await pool.query(
    `
      select 
        oi.name as name, 
        sum(oi.quantity)::int as quantity, 
        coalesce(sum(oi.price * oi.quantity), 0)::float8 as sales
      from order_items oi
      join orders o on oi.order_id = o.id
      where o.shop_id = $1
        and o.created_at::date >= $2::date
        and o.created_at::date <= $3::date
      group by oi.name
      order by quantity desc, sales desc
      limit 5
    `,
    [shopId, fromDate, toDate]
  );
  const totalSales = parseFloat((summaryRes.rows[0]?.total_sales || 0) as number | string as string);
  const totalOrders = parseInt((summaryRes.rows[0]?.total_orders || 0) as number | string as string);
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  return {
    summary: {
      totalSales,
      totalOrders,
      averageOrderValue,
    },
    trend: (trendRes.rows || []).map((r: { day: string; sales: number; orders: number }) => ({
      date: r.day,
      sales: Number(r.sales) || 0,
      orders: Number(r.orders) || 0,
    })),
    topItems: (topRes.rows || []).map((r: { name: string; quantity: number; sales: number }) => ({
      name: r.name,
      quantity: Number(r.quantity) || 0,
      sales: Number(r.sales) || 0,
    })),
    timeOfDay: (timeRes.rows || []).map((r: { hour: number; orders: number }) => ({
      hour: Number(r.hour) || 0,
      orders: Number(r.orders) || 0,
    })),
    categoryDistribution: (categoryRes.rows || []).map((r: { category: string; units: number; sales: number }) => ({
      category: String(r.category || "Uncategorized"),
      units: Number(r.units) || 0,
      sales: Number(r.sales) || 0,
    })),
    timeRangeTrend: (rangeRes.rows || []).map((r: { slot: string; orders: number; sales: number }) => ({
      slot: String(r.slot),
      orders: Number(r.orders) || 0,
      sales: Number(r.sales) || 0,
    })),
  };
}

export async function getOrderForShop(orderId: string, shopId: string) {
  await ensureSchema();
  const res = await pool.query(
    `
      select 
        o.id,
        o.shop_id,
        o.user_id,
        o.total_amount,
        o.status,
        o.created_at,
        o.note,
        o.receipt_url,
        o.payment_reference,

        -- ✅ convert UTC → Bangkok properly
        to_char(timezone('Asia/Bangkok', o.pickup_time), 'HH24:MI') as pickup_time,

        coalesce(
          json_agg(
            case 
              when oi.id is null then null
              else json_build_object(
                'id', oi.id,
                'name', oi.name,
                'quantity', oi.quantity,
                'price', oi.price,
                'note', oi.note
              )
            end
          ) filter (where oi.id is not null),
          '[]'::json
        ) as items
      from orders o
      left join order_items oi on o.id = oi.order_id
      where o.id = $1 and o.shop_id = $2
      group by o.id
    `,
    [orderId, shopId]
  );
  return res.rows[0] || null;
}


export async function getOrdersForUser(userId: string) {
  await ensureSchema();
  await expireOverdueOrdersForUser(userId);
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
          'price', oi.price,
          'note', oi.note
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
      with counts as (
        select to_char(timezone('Asia/Bangkok', o.pickup_time), 'HH24:MI') as slot, count(*)::int as count
        from orders o
        where o.shop_id = $1
          and o.pickup_time is not null
          and timezone('Asia/Bangkok', o.pickup_time)::date = $2::date
        group by slot
        union all
        select to_char(timezone('Asia/Bangkok', r.pickup_time), 'HH24:MI') as slot, count(*)::int as count
        from slot_reservations r
        where r.shop_id = $1
          and r.expires_at > now()
          and timezone('Asia/Bangkok', r.pickup_time)::date = $2::date
        group by slot
      )
      select slot, sum(count)::int as count
      from counts
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

export async function createSlotReservation(
  shopId: string,
  userId: string,
  pickupTime: string,
  holdMinutes = 5
) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    const pickupTimeIso = normalizeToUtcIsoFromBangkokInput(pickupTime);
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`${shopId}:${pickupTimeIso}`]);
    const windowStart = pickupTimeIso;
    const capacityRes = await client.query(
      `
        with used as (
          select count(*)::int as c from orders
          where shop_id = $1
            and pickup_time is not null
            and pickup_time >= ($2::timestamptz)
            and pickup_time < (($2::timestamptz) + ($3 || ' minutes')::interval)
          union all
          select count(*)::int as c from slot_reservations
          where shop_id = $1
            and expires_at > now()
            and pickup_time >= ($2::timestamptz)
            and pickup_time < (($2::timestamptz) + ($3 || ' minutes')::interval)
        )
        select sum(c)::int as count from used
      `,
      [shopId, windowStart, String(PICKUP_SLOT_WINDOW_MINUTES)]
    );
    const used = Number((capacityRes.rows[0] as { count?: number })?.count || 0);
    if (used >= PICKUP_SLOT_LIMIT) {
      await client.query("rollback");
      throw new Error("slot-full");
    }
    const id = crypto.randomUUID();
    const res = await client.query(
      `
        insert into slot_reservations(id, shop_id, user_id, pickup_time, expires_at)
        values($1, $2, $3, ($4::timestamptz), now() + ($5 || ' minutes')::interval)
        returning expires_at
      `,
      [id, shopId, userId, pickupTimeIso, String(holdMinutes)]
    );
    const expires_at = res.rows[0]?.expires_at;
    await client.query("commit");
    return { id, shop_id: shopId, user_id: userId, pickup_time: pickupTimeIso, expires_at };
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function cancelSlotReservation(
  shopId: string,
  userId: string,
  pickupTime: string
) {
  await ensureSchema();
  const pickupTimeIso = normalizeToUtcIsoFromBangkokInput(pickupTime);
  const res = await pool.query(
    `
      delete from slot_reservations
      where shop_id = $1
        and user_id = $2
        and pickup_time >= ($3::timestamptz)
        and pickup_time < (($3::timestamptz) + ($4 || ' minutes')::interval)
    `,
    [shopId, userId, pickupTimeIso, String(PICKUP_SLOT_WINDOW_MINUTES)]
  );
  return { deleted: res.rowCount || 0 };
}


export async function createOrder(
  shopId: string,
  userId: string,
  pickupTime: string | null,
  note: string | null,
  items: { menuItemId: string; quantity: number; note?: string | null }[]
) {
  await ensureSchema();
  if (!items.length) throw new Error("empty-items");

  const client = await pool.connect();
  try {
    const pickupTimeIso = pickupTime || null;
    await client.query("begin");
    console.log("Incoming pickupTime:", pickupTime);
    console.log("Normalized to UTC:", pickupTimeIso);

    if (pickupTimeIso) {
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [`${shopId}:${pickupTimeIso}`]);
      const capacityRes = await client.query(
        `
          with used as (
            select count(*)::int as c from orders
            where shop_id = $1
              and pickup_time is not null
              and pickup_time >= ($2::timestamptz)
              and pickup_time < (($2::timestamptz) + ($3 || ' minutes')::interval)
            union all
            select count(*)::int as c from slot_reservations
            where shop_id = $1
              and expires_at > now()
              and pickup_time >= ($2::timestamptz)
              and pickup_time < (($2::timestamptz) + ($3 || ' minutes')::interval)
          )
          select sum(c)::int as count from used
        `,
        [shopId, pickupTimeIso, String(PICKUP_SLOT_WINDOW_MINUTES)]
      );
      const used = Number((capacityRes.rows[0] as { count?: number })?.count || 0);
      if (used >= PICKUP_SLOT_LIMIT) throw new Error("slot-full");
    }

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
        insert into orders(
          id, shop_id, user_id, total_amount, status, pickup_time, note
        )
        values(
          $1, $2, $3, $4, $5,
          $6::timestamptz,
          $7
        )
      `,
      [orderId, shopId, userId, total, "pending", pickupTimeIso, note]
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
        "insert into order_items(id, order_id, menu_item_id, quantity, price, name, note) values($1, $2, $3, $4, $5, $6, $7)",
        [crypto.randomUUID(), orderId, m.id, qty, m.price, m.name, it.note || null]
      );
    }

    await client.query("commit");
    return { id: orderId, shop_id: shopId, user_id: userId, total_amount: total, status: "pending", pickup_time: pickupTimeIso, note };
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
