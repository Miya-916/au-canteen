import { NextResponse } from "next/server";
import { listAnnouncements, createAnnouncement } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await listAnnouncements();
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
