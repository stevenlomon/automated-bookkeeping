import Anthropic from "@anthropic-ai/sdk";
import type { InvoiceData } from "./types";

const SYSTEM_PROMPT = `You are an invoice data extraction assistant. You extract structured data from invoice text.
The invoices may be in Swedish or English. Handle both languages.

Extract exactly these fields:
- supplier_name: The company or person who issued the invoice
- invoice_date: The invoice date in YYYY-MM-DD format
- gross_amount: The total amount including VAT (look for "Att betala", "Total", "Amount due", "Summa att betala")
- vat_amount: The VAT/moms amount (look for "Moms", "VAT", "Mervärdesskatt")
- currency: Three-letter currency code (SEK, EUR, USD, etc.)

Respond with ONLY a JSON object, no markdown fencing, no explanation.`;

export async function extractInvoiceData(text: string): Promise<InvoiceData> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Extract the invoice data from this text:\n\n${text}`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  return JSON.parse(block.text) as InvoiceData;
}
