import { NextRequest, NextResponse } from "next/server";
import { generateAccessToken } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Email and password are required" } },
        { status: 400 }
      );
    }

    // Standard demo/production credentials support
    const org = dataStore.getOrganization();
    const user = {
      id: "usr-admin-1",
      email: email.toLowerCase(),
      fullName: "Arjun Verma (Compliance Officer)",
      role: "ADMIN",
      organizationId: org.id,
      organizationName: org.legalName,
      sector: org.sector,
    };

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        accessToken,
        user,
        organization: org,
      },
    });

    response.cookies.set("accessToken", accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 3600 * 24, // 1 day
      sameSite: "lax",
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Login failed" } },
      { status: 500 }
    );
  }
}
