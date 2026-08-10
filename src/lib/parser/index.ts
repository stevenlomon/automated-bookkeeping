import { PDFParse } from "pdf-parse";
import { extractInvoiceData } from "./extract";
import type { InvoiceData } from "./types";

export type { InvoiceData } from "./types";

export async function parseInvoice(pdfBuffer: Buffer): Promise<InvoiceData> {
  const pdf = new PDFParse(pdfBuffer);
  const { text } = await pdf.getText();

  if (!text.trim()) {
    throw new Error(
      "No text extracted from PDF. This may be a scanned document.",
    );
  }

  return extractInvoiceData(text);
}
