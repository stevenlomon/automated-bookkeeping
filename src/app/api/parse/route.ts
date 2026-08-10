import { NextRequest, NextResponse } from "next/server";
import { parseInvoice } from "@/lib/parser";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await parseInvoice(buffer);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Parsing failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
