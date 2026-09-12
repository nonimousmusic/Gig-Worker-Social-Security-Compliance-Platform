import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";

export async function GET() {
  const session = await getSessionData();

  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const org = session.organization;

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: session.userId,
        email: session.email,
        fullName: session.fullName,
        role: session.role,
        organizationId: org.id,
      },
      organization: {
        id: org.id,
        legalName: org.name,
        cin: org.cin_or_registration,
        gstin: org.gstin,
        sector: org.sector,
        annualTurnover: org.annual_turnover,
        annualWorkerPayouts: org.annual_worker_payouts,
        isTrialAudit: org.is_trial_audit,
      },
    },
  });
}