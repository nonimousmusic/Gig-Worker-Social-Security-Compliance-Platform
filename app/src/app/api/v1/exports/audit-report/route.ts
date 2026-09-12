import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import { getAuditLogs } from "@/lib/audit-logger";

export async function GET() {
  const org = dataStore.getOrganization();
  const workers = dataStore.getWorkers();
  const filings = dataStore.getFilings();
  const challans = dataStore.getChallans();
  const auditLogs = getAuditLogs(20);

  const eligibleWorkers = workers.filter((w) => w.status === "ELIGIBLE");
  const paidFilings = filings.filter((f) => f.status === "PAID");
  const totalCessPaid = paidFilings.reduce((sum, f) => sum + f.finalCessPayable, 0);

  return NextResponse.json({
    success: true,
    data: {
      reportGeneratedAt: new Date().toISOString(),
      statutoryReference: "Section 114 & Rule 32 of the Code on Social Security 2020",
      organization: {
        legalName: org.legalName,
        cin: org.cin,
        gstin: org.gstin,
        sector: org.sector,
        registeredAddress: org.registeredAddress,
      },
      summary: {
        totalRegisteredWorkers: workers.length,
        eligibleWorkersCount: eligibleWorkers.length,
        totalFilingsCompleted: paidFilings.length,
        totalCessPaidINR: totalCessPaid,
        complianceScore: 96,
        auditStatus: "COMPLIANT",
      },
      filings,
      challans,
      immutableAuditTrail: auditLogs,
    },
  });
}
