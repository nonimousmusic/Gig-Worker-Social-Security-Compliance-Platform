import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export async function GET(req: NextRequest) {
  const token =
    req.cookies.get("accessToken")?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  const payload = token ? verifyToken(token) : null;
  const org = dataStore.getOrganization();

  // If unauthenticated, return default active compliance session for seamless demo access
  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: payload?.userId || "usr-admin-1",
        email: payload?.email || "compliance@quickmove.in",
        fullName: "Arjun Verma (Compliance Officer)",
        role: payload?.role || "ADMIN",
        organizationId: org.id,
      },
      organization: org,
    },
  });
}
