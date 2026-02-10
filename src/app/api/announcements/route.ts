import { NextResponse } from "next/server";
import { listAnnouncements, listAnnouncementsForRole, createAnnouncement } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roleParam = (url.searchParams.get("role") || "").toLowerCase();
  const rows =
    roleParam === "user" || roleParam === "owner"
      ? await listAnnouncementsForRole(roleParam as "user" | "owner")
      : await listAnnouncements();
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, content, is_published, publish_time, is_sticky, category, visibility } = body;
  const result = await createAnnouncement(
    title, 
    content, 
    is_published,
    publish_time || null,
    is_sticky || false,
    category || null,
    visibility || 'both'
  );
  return NextResponse.json(result);
}
