import { NextRequest, NextResponse } from "next/server";
import { requireTenant, getNotifications } from "@/lib/data-access";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const tenant = await requireTenant();
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const notifications = await getNotifications(tenant.organizationId);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({
    success: true,
    data: {
      notifications,
      unreadCount,
      total: notifications.length,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const tenant = await requireTenant();
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { id } = body;

  const supabase = await createClient();

  if (id) {
    const { data: updated } = await supabase
      .from("notification_logs")
      .update({ read: true })
      .eq("id", id)
      .eq("organization_id", tenant.organizationId)
      .select()
      .single();

    return NextResponse.json({
      success: true,
      data: updated
        ? {
            id: updated.id,
            title: updated.subject,
            message: updated.content_summary,
            type: updated.type,
            read: updated.read,
            createdAt: updated.sent_at,
          }
        : null,
    });
  }

  // Mark all read.
  await supabase
    .from("notification_logs")
    .update({ read: true })
    .eq("organization_id", tenant.organizationId)
    .eq("read", false);

  return NextResponse.json({ success: true, message: "All notifications marked as read" });
}