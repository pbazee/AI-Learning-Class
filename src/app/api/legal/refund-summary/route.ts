import { NextResponse } from "next/server";
import { getRefundPolicySummary } from "@/lib/legal-documents";

export async function GET() {
  const refundPolicy = await getRefundPolicySummary();

  return NextResponse.json(refundPolicy);
}
