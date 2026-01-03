import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const sid = (form.get("sid") as string) || "temp";
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "no file" }, { status: 400 });
    }
    const type = file.type || "";
    if (!type.startsWith("image/")) {
      return NextResponse.json({ error: "invalid type" }, { status: 400 });
    }
    const maxBytes = 8 * 1024 * 1024;
    if ((file.size || 0) > maxBytes) {
      return NextResponse.json({ error: "file too large" }, { status: 413 });
    }
    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);
    const orig = (file as any).name || `upload-${Date.now()}`;
    const safe = orig.replace(/[^a-zA-Z0-9._-]/g, "_");
    const name = `profile-${Date.now()}-${safe}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", sid);
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    const dest = path.join(uploadsDir, name);
    await fs.promises.writeFile(dest, buf);
    const url = `/uploads/${sid}/${name}`;
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "upload failed" }, { status: 500 });
  }
}
