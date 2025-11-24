// @ts-expect-error pg types
import { Pool } from "pg";
import crypto from "crypto";
const connectionString = process.env.DATABASE_URL;
const useSSL = !!connectionString && (connectionString.includes("neon.tech") || connectionString.includes("sslmode=require"));
const pool = new Pool({ connectionString, ssl: useSSL ? { rejectUnauthorized: false } : undefined });
let initialized = false;
async function ensureSchema() {
  if (initialized) return;
  initialized = true;
  await pool.query(`
    create table if not exists users (
      uid text primary key,
      email text not null,
      role text not null,
      created_at timestamptz default now()
    )`);
  await pool.query(`alter table users add column if not exists password_hash text`);
  await pool.query(`
    create table if not exists sessions (
      token text primary key,
      uid text not null references users(uid) on delete cascade,
      expires_at timestamptz not null
    )`);
  await pool.query(`
    create table if not exists shops (
      sid text primary key,
      name text not null,
      status text not null,
      owner_uid text references users(uid) on delete set null,
      owner_name text,
      created_at timestamptz default now()
    )`);
  await pool.query(`alter table shops add column if not exists cuisine text`);
  await pool.query(`alter table shops add column if not exists open_date date`);
  await pool.query(`alter table shops add column if not exists owner_email text`);
}
export async function getUser(uid: string) {
  await ensureSchema();
  const res = await pool.query("select uid, email, role from users where uid = $1", [uid]);
  return res.rows[0] || null;
}
export async function upsertUser(uid: string, email: string, role: string) {
  await ensureSchema();
  await pool.query(
    "insert into users(uid, email, role) values($1, $2, $3) on conflict(uid) do update set email = excluded.email, role = excluded.role",
    [uid, email, role]
  );
}
export async function getUserByEmail(email: string) {
  await ensureSchema();
  const res = await pool.query("select uid, email, role, password_hash from users where email = $1", [email]);
  return res.rows[0] || null;
}
export async function setRoleByEmail(email: string, role: string) {
  await ensureSchema();
  await pool.query("update users set role = $2 where email = $1", [email, role]);
}
export async function createUserLocal(email: string, passwordHash: string, role: string) {
  await ensureSchema();
  const uid = crypto.randomUUID();
  await pool.query(
    "insert into users(uid, email, role, password_hash) values($1, $2, $3, $4)",
    [uid, email, role, passwordHash]
  );
  return { uid, email, role };
}
export async function createSession(uid: string) {
  await ensureSchema();
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await pool.query("insert into sessions(token, uid, expires_at) values($1, $2, $3)", [token, uid, expires]);
  return { token, expires };
}
export async function deleteSession(token: string) {
  await ensureSchema();
  await pool.query("delete from sessions where token = $1", [token]);
}
export async function getUserBySessionToken(token: string) {
  await ensureSchema();
  const res = await pool.query(
    "select u.uid, u.email, u.role from sessions s join users u on u.uid = s.uid where s.token = $1 and s.expires_at > now()",
    [token]
  );
  return res.rows[0] || null;
}

export async function createShop(
  name: string,
  status: string,
  ownerUid: string | null,
  ownerName: string | null,
  cuisine: string | null = null,
  openDate: string | null = null,
  ownerEmail: string | null = null
) {
  await ensureSchema();
  const sid = crypto.randomUUID();
  await pool.query(
    "insert into shops(sid, name, status, owner_uid, owner_name, cuisine, open_date, owner_email) values($1, $2, $3, $4, $5, $6, $7, $8)",
    [sid, name, status, ownerUid, ownerName, cuisine, openDate, ownerEmail]
  );
  return { sid, name, status, owner_uid: ownerUid, owner_name: ownerName };
}

export async function listShops() {
  await ensureSchema();
  const res = await pool.query(
    `select s.sid, s.name, s.status, s.owner_uid, s.owner_name,
            s.cuisine, s.open_date, coalesce(s.owner_email, u.email) as owner_email
       from shops s
       left join users u on u.uid = s.owner_uid
       order by s.created_at desc`
  );
  return res.rows as {
    sid: string;
    name: string;
    status: string;
    owner_uid: string | null;
    owner_name: string | null;
    cuisine: string | null;
    open_date: string | null;
    owner_email: string | null;
  }[];
}

export async function getShop(sid: string) {
  await ensureSchema();
  const res = await pool.query(
    `select s.sid, s.name, s.status, s.owner_uid, s.owner_name,
            s.cuisine, s.open_date, coalesce(s.owner_email, u.email) as owner_email
       from shops s
       left join users u on u.uid = s.owner_uid
      where s.sid = $1`,
    [sid]
  );
  return res.rows[0] || null;
}

export async function updateShop(
  sid: string,
  name: string,
  status: string,
  ownerUid: string | null,
  ownerName: string | null,
  cuisine: string | null,
  openDate: string | null,
  ownerEmail: string | null
) {
  await ensureSchema();
  await pool.query(
    "update shops set name = $2, status = $3, owner_uid = $4, owner_name = $5, cuisine = $6, open_date = $7, owner_email = $8 where sid = $1",
    [sid, name, status, ownerUid, ownerName, cuisine, openDate, ownerEmail]
  );
}