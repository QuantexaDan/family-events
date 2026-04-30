import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { invites, users } from "@/lib/schema";
import { requireAdmin } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";
import { eq } from "drizzle-orm";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 403 });

  const allInvites = db
    .select({
      id: invites.id,
      code: invites.code,
      email: invites.email,
      usedBy: invites.usedBy,
      createdAt: invites.createdAt,
      usedByName: users.displayName,
    })
    .from(invites)
    .leftJoin(users, eq(invites.usedBy, users.id))
    .orderBy(invites.createdAt)
    .all();

  return Response.json(allInvites);
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 403 });

  const { email } = await request.json();

  const code = nanoid(10);
  const now = new Date();

  const normalizedEmail = email?.toLowerCase() || null;

  db.insert(invites).values({
    id: nanoid(),
    code,
    email: normalizedEmail,
    createdBy: admin.id,
    createdAt: now,
  }).run();

  const link = `/join/${code}`;
  let emailSent = false;

  if (normalizedEmail) {
    const origin = request.headers.get("origin") || `http://${request.headers.get("host")}`;
    const fullLink = `${origin}${link}`;
    const result = await sendInviteEmail(normalizedEmail, fullLink);
    emailSent = result.sent;
  }

  return Response.json({ ok: true, code, link, emailSent });
}
