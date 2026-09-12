import { NextRequest, NextResponse } from "next/server";
import { dataStore, ChallanItem } from "@/lib/data-store";
import { logAuditEvent } from "@/lib/audit-logger";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const filing = dataStore.getFilingById(id);

    if (!filing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Filing not found" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { challanNumber, bankName, utrNumber, amount, paymentDate } = body;

    if (!challanNumber || !utrNumber) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Challan number and UTR number are required" } },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const payloadToHash = `${challanNumber}:${utrNumber}:${amount}:${paymentDate}:${nowIso}`;
    const sha256Hash = crypto.createHash("sha256").update(payloadToHash).digest("hex");

    const newChallan: Omit<ChallanItem, "id"> = {
      filingId: id,
      challanNumber,
      bankName: bankName || "State Bank of India — Treasury Branch",
      utrNumber,
      amount: amount || filing.finalCessPayable,
      paymentDate: paymentDate || new Date().toISOString().split("T")[0],
      verified: true,
      lockedAt: nowIso,
      sha256Hash,
      documentUrl: `/uploads/challans/${challanNumber}.pdf`,
    };

    const savedChallan = dataStore.addChallan(newChallan);

    // Lock filing to PAID
    dataStore.updateFiling(id, {
      status: "PAID",
      challanId: savedChallan.id,
      challanNumber: savedChallan.challanNumber,
      challanUrl: savedChallan.documentUrl,
      submittedAt: nowIso,
    });

    await logAuditEvent({
      action: "CHALLAN_LOCKED_AUDIT_PROOF",
      entity: "Challan",
      entityId: savedChallan.id,
      metadata: {
        filingId: id,
        challanNumber,
        utrNumber,
        sha256Hash,
        amount: savedChallan.amount,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        challan: savedChallan,
        filingStatus: "PAID",
        auditLocked: true,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Challan upload failed" } },
      { status: 500 }
    );
  }
}
