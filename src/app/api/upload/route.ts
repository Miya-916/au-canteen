import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const sid = (form.get("sid") as string) || "temp";
    const uid = (form.get("uid") as string) || "";
    const kindRaw = (form.get("kind") as string) || "menu";
    let kind = String(kindRaw).trim().toLowerCase();
    if (!["receipt", "profile", "qr", "menu", "user-profile"].includes(kind)) {
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
      } else if (kind === "user-profile") {
        // User profile picture: unique name to bypass cache
        const ext = type.split("/")[1] || "jpg";
        key = `users/${uid}/profile-${Date.now()}.${ext}`;
        
        // Clean up old profile pictures
        try {
          const listCmd = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: `users/${uid}/profile-`,
          });
          const listRes = await client.send(listCmd);
          if (listRes.Contents) {
            for (const obj of listRes.Contents) {
              if (obj.Key) {
                await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
              }
            }
          }
        } catch (err) {
          console.error("Error cleaning up old profile pictures:", err);
        }
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
      const isUser = kind === "user-profile";
      const uploadsDir = isUser 
        ? path.join(process.cwd(), "public", "uploads", "users", uid)
        : path.join(process.cwd(), "public", "uploads", sid);
      await fs.promises.mkdir(uploadsDir, { recursive: true });
      
      let folder = kind;
      if (kind === "receipt" && orderId) {
        // nested structure for order receipts
        // do nothing here, handled below
      } else if (!["profile", "qr", "menu", "receipt", "user-profile"].includes(folder)) {
        folder = "menu";
      }

      const ext = type.split("/")[1] || "jpg";
      let fileName = `${name}.${ext}`;
      
      // Override filename for specific kinds to allow replacement
      if (kind === "profile") fileName = `profile.${ext}`;
      // if (kind === "user-profile") fileName = `profile.${ext}`; // Allow unique filename for user profile to prevent caching
      if (kind === "qr") fileName = `qr.${ext}`;
      if (kind === "menu" && menuId) fileName = `${menuId}.${ext}`;

      const filePath = path.join(uploadsDir, fileName);
      
      // If user-profile, delete old files first to keep folder clean
      if (isUser) {
        try {
          const files = await fs.promises.readdir(uploadsDir);
          for (const f of files) {
            await fs.promises.unlink(path.join(uploadsDir, f));
          }
        } catch (e) {
          // ignore
        }
      }

      await fs.promises.writeFile(filePath, buf);
      
      const url = isUser
        ? `/uploads/users/${uid}/${fileName}`
        : `/uploads/${sid}/${fileName}`;
      return NextResponse.json({ url });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
