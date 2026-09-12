import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const filing = dataStore.getFilingById(id);

  if (!filing) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Filing not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: filing,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updated = dataStore.updateFiling(id, body);
  if (!updated) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Filing not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: updated,
  });
}
