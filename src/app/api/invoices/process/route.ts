import { NextRequest, NextResponse } from "next/server";
import { parseInvoice } from "@/lib/parser";
import {
  buildMappingIndex,
  findExpenseAccount,
  buildVoucherDraft,
} from "@/lib/matcher";
import type { MatchResult } from "@/lib/matcher";
import { getVouchers } from "@/lib/visma/client";
import { isAuthenticated } from "@/lib/visma/auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const invoice = await parseInvoice(buffer);

    let match: MatchResult;
    try {
      if (await isAuthenticated()) {
        const { Data: vouchers } = await getVouchers(1, 100);
        const index = buildMappingIndex(vouchers);
        match = findExpenseAccount(invoice.supplier_name, index);
      } else {
        match = { expenseAccount: 4000, confidence: "default" };
      }
    } catch {
      match = { expenseAccount: 4000, confidence: "default" };
    }

    const proposal = buildVoucherDraft(invoice, match.expenseAccount);

    return NextResponse.json({ invoice, proposal, match });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
