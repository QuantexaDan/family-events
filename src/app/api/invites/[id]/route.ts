import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { invites } from "@/lib/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const invite = db.select().from(invites).where(eq(invites.id, id)).get();

  if (!invite) {
    return Response.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.usedBy) {
    return Response.json({ error: "Cannot revoke an invite that has already been used" }, { status: 400 });
  }

  db.delete(invites).where(eq(invites.id, id)).run();

  return Response.json({ ok: true });
}
