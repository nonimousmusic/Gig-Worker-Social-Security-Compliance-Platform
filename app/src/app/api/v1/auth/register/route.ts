import { NextRequest, NextResponse } from "next/server";
import { isWorkEmail, validatePassword } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, fullName, companyName, sector, cinOrRegistration, gstin } = body;

    if (!email || !companyName) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Company name and email are required" } },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();

    if (!isWorkEmail(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: { code: "WORK_EMAIL_REQUIRED", message: "Please use a corporate / work email to register" } },
        { status: 400 }
      );
    }

    const pwCheck = validatePassword(password || "");
    if (!pwCheck.valid) {
      return NextResponse.json(
        { success: false, error: { code: "WEAK_PASSWORD", message: pwCheck.errors.join(". ") } },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 1. Create the auth user (bypasses email confirmation for scaffold).
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || "" },
    });

    if (authError || !authData.user) {
      const code = authError?.code || "REGISTRATION_FAILED";
      const isDuplicate = /already registered|duplicate|exists/i.test(authError?.message || "");
      return NextResponse.json(
        { success: false, error: { code: isDuplicate ? "EMAIL_TAKEN" : code, message: authError?.message || "Registration failed" } },
        { status: isDuplicate ? 409 : 400 }
      );
    }

    // 2. Create the organization.
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: companyName,
        type: "AGGREGATOR",
        sector: sector || "OTHER",
        cin_or_registration: cinOrRegistration || null,
        gstin: gstin || null,
        is_trial_audit: true,
      })
      .select()
      .single();

    if (orgError || !org) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { success: false, error: { code: "ORG_CREATE_FAILED", message: "Failed to create organization" } },
        { status: 500 }
      );
    }

    // 3. Create the profile (id mirrors auth.users.id).
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      organization_id: org.id,
      email: cleanEmail,
      full_name: fullName || "Compliance Lead",
      role: "ORG_ADMIN",
      is_email_verified: true,
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      await supabase.from("organizations").delete().eq("id", org.id);
      return NextResponse.json(
        { success: false, error: { code: "PROFILE_CREATE_FAILED", message: "Failed to create user profile" } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: authData.user.id,
          email: cleanEmail,
          fullName: fullName || "Compliance Lead",
          role: "ORG_ADMIN",
          organizationId: org.id,
        },
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Registration failed" } },
      { status: 500 }
    );
  }
}