import { NextRequest, NextResponse } from "next/server";
import { generateAccessToken } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, fullName, companyName, sector, cinOrRegistration, gstin } = body;

    if (!email || !companyName) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Company name and email are required" } },
        { status: 400 }
      );
    }

    const org = dataStore.getOrganization();
    const user = {
      id: `usr-${Date.now()}`,
      email: email.toLowerCase(),
      fullName: fullName || "Compliance Lead",
      role: "ADMIN",
      organizationId: org.id,
      organizationName: companyName,
      sector: sector || "LOGISTICS_DELIVERY",
      cin: cinOrRegistration || "",
      gstin: gstin || "",
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
      },
    });

    response.cookies.set("accessToken", accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 3600 * 24,
      sameSite: "lax",
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Registration failed" } },
      { status: 500 }
    );
  }
}
