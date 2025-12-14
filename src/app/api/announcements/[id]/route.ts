import { NextResponse } from "next/server";
import { updateAnnouncement, deleteAnnouncement } from "@/lib/db";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { title, content, is_published, publish_time, is_sticky, category, visibility } = body;
  await updateAnnouncement(
    id, 
    title, 
    content, 
    is_published,
    publish_time || null,
    is_sticky || false,
    category || null,
    visibility || 'both'
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteAnnouncement(id);
  return NextResponse.json({ success: true });
}
