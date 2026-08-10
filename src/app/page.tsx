"use client";

import { useState, useEffect, useCallback } from "react";

interface InvoiceData {
  supplier_name: string;
  invoice_date: string;
  gross_amount: number;
  vat_amount: number;
  currency: string;
}

interface VoucherRow {
  AccountNumber: number;
  DebitAmount: number;
  CreditAmount: number;
  TransactionText?: string;
}

interface VoucherDraftPayload {
  VoucherDate: string;
  VoucherText: string;
  Rows: VoucherRow[];
}

interface MatchResult {
  expenseAccount: number;
  confidence: "exact" | "partial" | "default";
}

interface ProcessResult {
  invoice: InvoiceData;
  proposal: VoucherDraftPayload;
  match: MatchResult;
}

type Status = "idle" | "processing" | "review" | "approving" | "done" | "error";

const BAS_LABELS: Record<number, string> = {
  1930: "Bank",
  2440: "Leverantorsskulder",
  2641: "Ingaende moms 25%",
  2642: "Ingaende moms 12%",
  2643: "Ingaende moms 6%",
  4000: "Inkop varor",
};

function formatAmount(n: number): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    fetch("/api/auth/visma/status")
      .then((r) => r.json())
      .then((d) => setConnected(d.connected))
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file");
      setStatus("error");
      return;
    }

    setStatus("processing");
    setError(null);
    setResult(null);
    setPdfUrl(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/invoices/process", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Processing failed");
      setResult(data);
      setStatus("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Processing failed");
      setStatus("error");
    }
  }, []);

  const handleApprove = useCallback(async () => {
    if (!result) return;
    setStatus("approving");

    try {
      const res = await fetch("/api/invoices/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.proposal),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed");
      setStatus("error");
    }
  }, [result]);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
  }, [pdfUrl]);

  return (
    <main className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Bookkeeping Assistant
          </h1>
          <ConnectionBadge connected={connected} />
        </div>

        {/* Upload zone */}
        {(status === "idle" || status === "error") && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            className={`rounded-xl border-2 border-dashed p-16 text-center transition-colors ${
              dragging
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 bg-white"
            }`}
          >
            <p className="mb-2 text-lg text-gray-600">
              Drop a PDF invoice here, or
            </p>
            <label className="cursor-pointer rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              Choose file
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </label>

            {status === "error" && error && (
              <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Processing spinner */}
        {status === "processing" && (
          <div className="rounded-xl bg-white p-16 text-center shadow-sm">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            <p className="text-gray-600">
              Extracting invoice data and matching accounts...
            </p>
          </div>
        )}

        {/* Review panel */}
        {(status === "review" || status === "approving") && result && (
          <div className="space-y-6">
            {/* Warning banners */}
            {result.match.confidence === "default" && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <p className="font-semibold text-amber-800">
                  No booking history found for this supplier
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  The context database has no prior entries for &quot;
                  {result.invoice.supplier_name}&quot;. A default expense
                  account (4000) was assigned. Consider creating this voucher
                  manually in Visma for accurate bookkeeping.
                </p>
              </div>
            )}

            {result.match.confidence === "partial" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-700">
                  Partial match — account {result.match.expenseAccount} was
                  inferred from a similar supplier name in your history. Please
                  verify.
                </p>
              </div>
            )}

            {/* Side-by-side layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Left: PDF preview */}
              <div className="rounded-xl bg-white shadow-sm">
                <div className="border-b px-5 py-3">
                  <h2 className="font-semibold text-gray-900">
                    Original Invoice
                  </h2>
                </div>
                {pdfUrl && (
                  <iframe
                    src={pdfUrl}
                    className="h-[700px] w-full rounded-b-xl"
                    title="Invoice PDF"
                  />
                )}
              </div>

              {/* Right: Proposal */}
              <div className="space-y-6">
                {/* Extracted data */}
                <div className="rounded-xl bg-white shadow-sm">
                  <div className="border-b px-5 py-3">
                    <h2 className="font-semibold text-gray-900">
                      Extracted Data
                    </h2>
                  </div>
                  <dl className="grid grid-cols-2 gap-4 p-5">
                    <div>
                      <dt className="text-xs text-gray-500">Supplier</dt>
                      <dd className="font-medium text-gray-900">
                        {result.invoice.supplier_name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Date</dt>
                      <dd className="font-medium text-gray-900">
                        {result.invoice.invoice_date}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Gross Amount</dt>
                      <dd className="font-medium text-gray-900">
                        {formatAmount(result.invoice.gross_amount)}{" "}
                        {result.invoice.currency}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">VAT</dt>
                      <dd className="font-medium text-gray-900">
                        {formatAmount(result.invoice.vat_amount)}{" "}
                        {result.invoice.currency}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Voucher rows */}
                <div className="rounded-xl bg-white shadow-sm">
                  <div className="border-b px-5 py-3">
                    <h2 className="font-semibold text-gray-900">
                      Proposed Voucher &mdash;{" "}
                      {result.proposal.VoucherDate}
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                          <th className="px-5 py-2">Account</th>
                          <th className="px-5 py-2">Description</th>
                          <th className="px-5 py-2 text-right">Debit</th>
                          <th className="px-5 py-2 text-right">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.proposal.Rows.map((row, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-5 py-3 font-mono text-gray-900">
                              {row.AccountNumber}
                            </td>
                            <td className="px-5 py-3 text-gray-600">
                              {BAS_LABELS[row.AccountNumber] ??
                                `Account ${row.AccountNumber}`}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-gray-900">
                              {row.DebitAmount > 0
                                ? formatAmount(row.DebitAmount)
                                : ""}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-gray-900">
                              {row.CreditAmount > 0
                                ? formatAmount(row.CreditAmount)
                                : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={2} className="px-5 py-2 text-gray-700">
                            Total
                          </td>
                          <td className="px-5 py-2 text-right font-mono text-gray-900">
                            {formatAmount(
                              result.proposal.Rows.reduce(
                                (s, r) => s + r.DebitAmount,
                                0,
                              ),
                            )}
                          </td>
                          <td className="px-5 py-2 text-right font-mono text-gray-900">
                            {formatAmount(
                              result.proposal.Rows.reduce(
                                (s, r) => s + r.CreditAmount,
                                0,
                              ),
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {connected ? (
                    <button
                      onClick={handleApprove}
                      disabled={status === "approving"}
                      className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      {status === "approving"
                        ? "Posting to Visma..."
                        : "Approve & Post to Visma"}
                    </button>
                  ) : (
                    <a
                      href="/api/auth/visma"
                      className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      Connect Visma to approve
                    </a>
                  )}
                  <button
                    onClick={reset}
                    className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {status === "done" && (
          <div className="rounded-xl bg-white p-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
              ✓
            </div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              Voucher posted
            </h2>
            <p className="mb-6 text-gray-600">
              The voucher has been committed to your Visma general ledger.
            </p>
            <button
              onClick={reset}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Process another invoice
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function ConnectionBadge({ connected }: { connected: boolean | null }) {
  if (connected === null) {
    return (
      <span className="text-sm text-gray-400">Checking Visma connection...</span>
    );
  }
  if (connected) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Visma connected
      </span>
    );
  }
  return (
    <a
      href="/api/auth/visma"
      className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Connect Visma
    </a>
  );
}
