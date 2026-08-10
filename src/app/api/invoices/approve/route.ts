import { NextRequest, NextResponse } from "next/server";
import { createVoucherDraft, convertVoucherDraft } from "@/lib/visma/client";
import type { VoucherDraftPayload } from "@/lib/visma/types";

export async function POST(request: NextRequest) {
  try {
    const payload: VoucherDraftPayload = await request.json();
    const draft = await createVoucherDraft(payload);
    await convertVoucherDraft(draft.Id);
    return NextResponse.json({ success: true, voucherId: draft.Id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Approval failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
