import { NextRequest, NextResponse } from "next/server";
import { calculatePenalty } from "@/lib/penalty-calc";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cessAmount, dueDate, paymentDate } = body;

    if (!cessAmount || !dueDate) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Cess amount and due date are required" } },
        { status: 400 }
      );
    }

    const due = new Date(dueDate);
    const pay = paymentDate ? new Date(paymentDate) : new Date();

    const penalty = calculatePenalty(
      parseFloat(cessAmount),
      due,
      pay
    );

    return NextResponse.json({
      success: true,
      data: {
        ...penalty,
        legalCitation: "Section 114(4) & Section 133 of the Code on Social Security 2020: Interest at 1% per month plus statutory damages up to 100% of cess payable",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "CALCULATION_ERROR", message: "Penalty calculation failed" } },
      { status: 500 }
    );
  }
}
