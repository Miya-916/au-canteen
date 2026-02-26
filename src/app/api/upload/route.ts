import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const sid = (form.get("sid") as string) || "temp";
    const kindRaw = (form.get("kind") as string) || "menu";
    let kind = String(kindRaw).trim().toLowerCase();
    if (!["receipt", "profile", "qr", "menu"].includes(kind)) {
      kind = "menu"; // Fallback to menu if unknown
    }
    const orderId = (form.get("orderId") as string) || "";
    const menuId = (form.get("menuId") as string) || "";

    if (!file || !(file instanceof File)) {
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
    const orig = file.name || `upload-${Date.now()}`;
    const safe = orig.replace(/[^a-zA-Z0-9._-]/g, "_");
    const name = `${kind}-${Date.now()}-${safe}`;

    const endpoint = process.env.R2_ENDPOINT || "";
    const bucket = process.env.R2_BUCKET || "";
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
    const endpointMatch = endpoint.match(/^https?:\/\/([^\.]+)\.r2\.cloudflarestorage\.com/i);
    const accountId = endpointMatch?.[1] || "";
    const inferredPublicBase = accountId && bucket ? `https://pub-${accountId}.r2.dev/${bucket}` : "";
    const publicBaseRaw = process.env.R2_PUBLIC_BASE_URL || inferredPublicBase;
    const publicBase = publicBaseRaw.trim();
    const useCloud = !!endpoint && !!bucket && !!accessKeyId && !!secretAccessKey;

    if (useCloud) {
      const client = new S3Client({
        endpoint,
        region: "auto",
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
      });

      let key = "";
      if (kind === "receipt") {
        key = orderId ? `shops/${sid}/orders/${orderId}/receipt/${name}` : `shops/${sid}/receipt/${name}`;
      } else if (kind === "profile") {
        // Use fixed filename "profile.jpg" (or preserve extension) to allow overwriting
        const ext = type.split("/")[1] || "jpg";
        key = `shops/${sid}/profile.${ext}`;
      } else if (kind === "qr") {
        const ext = type.split("/")[1] || "jpg";
        key = `shops/${sid}/qr.${ext}`;
      } else {
        // default to menu
        if (menuId) {
          // If we have a menuId, use a fixed path to allow overwriting
          const ext = type.split("/")[1] || "jpg";
          key = `shops/${sid}/menu/${menuId}.${ext}`;
        } else {
          // Fallback to timestamp if no menuId provided (legacy behavior)
          key = `shops/${sid}/menu/${name}`;
        }
      }

      const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: type,
        CacheControl: "public, max-age=31536000, immutable",
      });
      await client.send(cmd);
      const base = publicBase.replace(/\/+$/, "");
      const url = base ? `${base}/${key}` : `/${key}`;
      return NextResponse.json({ url });
    } else {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", sid);
      await fs.promises.mkdir(uploadsDir, { recursive: true });
      
      let folder = kind;
      if (kind === "receipt" && orderId) {
        // nested structure for order receipts
        // do nothing here, handled below
      } else if (!["profile", "qr", "menu", "receipt"].includes(folder)) {
        folder = "menu";
      }

      const orderFolder = kind === "receipt" && orderId 
        ? path.join(uploadsDir, "orders", orderId, "receipt") 
        : path.join(uploadsDir, folder);
        
      await fs.promises.mkdir(orderFolder, { recursive: true });
      const dest = path.join(orderFolder, name);
      await fs.promises.writeFile(dest, buf);
      const localBaseRaw = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
      const localBase = localBaseRaw.trim().replace(/\/+$/, "");
      
      let relative = "";
      if (kind === "receipt") {
        relative = orderId ? `/uploads/${sid}/orders/${orderId}/receipt/${name}` : `/uploads/${sid}/receipt/${name}`;
      } else {
        relative = `/uploads/${sid}/${folder}/${name}`;
      }

      const url = localBase ? `${localBase}${relative}` : relative;
      return NextResponse.json({ url });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
