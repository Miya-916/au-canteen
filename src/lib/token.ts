import crypto from "crypto";

function base64url(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function createAccessToken(payload: Record<string, any>, expiresInSec = 3600) {
  const secret = process.env.AUTH_TOKEN_SECRET || "dev-secret";
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + expiresInSec, ...payload };
  const h = base64url(JSON.stringify(header));
  const b = base64url(JSON.stringify(body));
  const data = `${h}.${b}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  const s = base64url(sig);
  return `${data}.${s}`;
}

export function verifyAccessToken(token: string) {
  const secret = process.env.AUTH_TOKEN_SECRET || "dev-secret";
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, b, s] = parts;
  const data = `${h}.${b}`;
  const expected = base64url(crypto.createHmac("sha256", secret).update(data).digest());
  if (s !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(b.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}