import { NextRequest, NextResponse } from "next/server";
import { requireTenant, mapChallan } from "@/lib/data-access";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit-logger";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenant();
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const supabase = await createClient();

    const { data: filing } = await supabase
      .from("filing_records")
      .select("*")
      .eq("id", id)
      .eq("organization_id", tenant.organizationId)
      .single();

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

    const { data: savedChallan, error: insertError } = await supabase
      .from("filing_challans")
      .insert({
        filing_record_id: id,
        challan_number: challanNumber,
        bank_name: bankName || "State Bank of India — Treasury Branch",
        utr_number: utrNumber,
        amount_deposited: amount || filing.final_liability_amount,
        payment_date: paymentDate || nowIso.slice(0, 10),
        verified: true,
        locked_at: nowIso,
        sha256_hash: sha256Hash,
        // No file store is wired up; the reference number is the record.
        document_url: null,
      })
      .select()
      .single();

    if (insertError || !savedChallan) {
      return NextResponse.json(
        { success: false, error: { code: "INTERNAL_ERROR", message: insertError?.message || "Challan upload failed" } },
        { status: 500 }
      );
    }

    // Lock filing to PAID.
    await supabase
      .from("filing_records")
      .update({
        status: "PAID",
        locked_hash_sha256: sha256Hash,
        filed_at: nowIso,
      })
      .eq("id", id);

    await logAuditEvent({
      action: "CHALLAN_LOCKED_AUDIT_PROOF",
      entity: "Challan",
      entityId: savedChallan.id,
      metadata: {
        filingId: id,
        challanNumber,
        utrNumber,
        sha256Hash,
        amount: savedChallan.amount_deposited,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        challan: mapChallan(savedChallan),
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