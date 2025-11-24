// @ts-ignore
import { Pool } from "pg";
import crypto from "crypto";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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