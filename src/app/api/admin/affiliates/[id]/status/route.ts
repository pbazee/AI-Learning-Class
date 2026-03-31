import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAuditLog } from "@/lib/audit-log";

async function getAdminUser(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    select: { id: true, role: true },
  });

  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "SUPER_ADMIN")) {
    return null;
  }

  return dbUser;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const adminUser = await getAdminUser(supabase);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const status = body.status as string;

  if (!["pending", "active", "suspended", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const affiliate = await prisma.affiliate.update({
    where: { id },
    data: { status },
  });

  await createAuditLog({
    actorId: adminUser.id,
    action: "affiliate.updated",
    entityType: "Affiliate",
    entityId: affiliate.id,
    summary: `Affiliate status moved to ${status}.`,
    metadata: {
      status,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json({ success: true, affiliate });
}
