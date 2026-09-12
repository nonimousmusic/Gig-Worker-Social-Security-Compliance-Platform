import { NextResponse } from "next/server";

export async function GET() {
  const clients = [
    {
      id: "org-quickmove-01",
      legalName: "QuickMove Technologies Pvt Ltd",
      sector: "LOGISTICS_DELIVERY",
      cin: "U72900DL2021PTC389102",
      activeWorkers: 1850,
      eligibleWorkers: 1410,
      nextFilingDue: "2025-10-31",
      complianceStatus: "COMPLIANT",
      riskScore: 94,
      cessLiabilityQ2: 577500,
    },
    {
      id: "org-swiftcab-02",
      legalName: "SwiftCab Mobility Solutions Ltd",
      sector: "RIDE_HAILING",
      cin: "U63040MH2019PLC318290",
      activeWorkers: 3200,
      eligibleWorkers: 2450,
      nextFilingDue: "2025-10-31",
      complianceStatus: "ATTENTION_REQUIRED",
      riskScore: 78,
      cessLiabilityQ2: 920000,
    },
    {
      id: "org-bitefast-03",
      legalName: "BiteFast Hyperlocal Delivery LLP",
      sector: "FOOD_DELIVERY",
      cin: "AAX-1940",
      activeWorkers: 950,
      eligibleWorkers: 680,
      nextFilingDue: "2025-10-31",
      complianceStatus: "OVERDUE",
      riskScore: 62,
      cessLiabilityQ2: 245000,
    },
  ];

  return NextResponse.json({
    success: true,
    data: {
      partnerFirm: "Singhania & Partners LLP (Labour Law & Tax Advisory)",
      totalClients: clients.length,
      clients,
    },
  });
}
