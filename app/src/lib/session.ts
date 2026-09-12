import { createClient } from "@/lib/supabase/server";

export interface SessionProfile {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface SessionOrganization {
  id: string;
  name: string;
  type: string;
  sector: string | null;
  cin_or_registration: string | null;
  gstin: string | null;
  annual_turnover: number | null;
  annual_worker_payouts: number | null;
  is_trial_audit: boolean;
  registered_address: string | null;
}

export interface SessionData {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  profile: SessionProfile;
  organization: SessionOrganization;
}

/**
 * Resolves the current authenticated user's profile + organization.
 * Respects Row-Level Security (user client + session cookies).
 * Returns null when unauthenticated or profile is missing.
 */
export async function getSessionData(): Promise<SessionData | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .single();

  if (!organization) return null;

  return {
    userId: user.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    profile: profile as SessionProfile,
    organization: organization as SessionOrganization,
  };
}