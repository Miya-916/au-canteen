import { NextResponse } from "next/server";
import { getUserByEmail, setRoleByEmail } from "@/lib/db";
import { getFirestoreDb } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export async function POST(req: Request) {
  const secret = req.headers.get("x-setup-secret");
  if (!process.env.ADMIN_SETUP_SECRET || secret !== process.env.ADMIN_SETUP_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const email = (body?.email as string)?.trim().toLowerCase();
  const role = (body?.role as string) || "admin";
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  const user = await getUserByEmail(email);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  await setRoleByEmail(email, role);
  const db = getFirestoreDb();
  if (db) {
    const ref = doc(db, "users", user.uid);
    await setDoc(ref, { role }, { merge: true });
  }
  return NextResponse.json({ ok: true, uid: user.uid, role });
}