import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

export async function GET() {
  const notifications = dataStore.getNotifications();
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
  const body = await req.json();
  const { id } = body;

  if (id) {
    const updated = dataStore.markNotificationRead(id);
    return NextResponse.json({ success: true, data: updated });
  }

  // Mark all read
  dataStore.getNotifications().forEach((n) => (n.read = true));
  return NextResponse.json({ success: true, message: "All notifications marked as read" });
}
