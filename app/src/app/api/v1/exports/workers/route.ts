import { NextResponse } from "next/server";
import { requireTenant, getWorkerRecords } from "@/lib/data-access";
import Papa from "papaparse";

export async function GET() {
  const tenant = await requireTenant();
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const workers = await getWorkerRecords(tenant);

  const exportData = workers.map((w) => ({
    Worker_ID: w.aggregatorWorkerId,
    Full_Name: w.fullName,
    Aadhaar_Masked: w.maskedAadhaar,
    UAN: w.uan || "N/A",
    Phone: w.phone || "N/A",
    Sector: w.sector,
    State: w.state,
    Compliance_Status: w.status,
    Active_Days_Last_90d: w.daysInLast90,
    Cumulative_Days_FY: w.cumulativeDaysFY,
    Gross_Payout_FY_INR: w.grossPayoutFY,
    Cross_Platform_Declared_Days: w.otherPlatformDays,
    Last_Active_Date: w.lastActiveDate,
    Registered_At: w.registeredAt,
  }));

  const csv = Papa.unparse(exportData);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gig_workers_compliance_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}