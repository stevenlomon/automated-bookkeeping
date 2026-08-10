import type { Voucher, VoucherDraftPayload, VoucherRow } from "../visma/types";
import type { InvoiceData } from "../parser/types";

const ACCOUNTS_PAYABLE = 2440;
const VAT_ACCOUNTS = new Set([2641, 2642, 2643]);
const DEFAULT_EXPENSE_ACCOUNT = 4000;

export interface SupplierMatch {
  expenseAccount: number;
  count: number;
}

export type MappingIndex = Map<string, SupplierMatch>;

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

export function buildMappingIndex(vouchers: Voucher[]): MappingIndex {
  const counts = new Map<string, Map<number, number>>();

  for (const voucher of vouchers) {
    if (!voucher.VoucherText) continue;

    const name = normalize(voucher.VoucherText.split("-")[0]);
    if (!name) continue;

    for (const row of voucher.Rows) {
      if (row.AccountNumber === ACCOUNTS_PAYABLE) continue;
      if (VAT_ACCOUNTS.has(row.AccountNumber)) continue;
      if (row.DebitAmount <= 0) continue;

      const supplierCounts = counts.get(name) ?? new Map<number, number>();
      supplierCounts.set(
        row.AccountNumber,
        (supplierCounts.get(row.AccountNumber) ?? 0) + 1,
      );
      counts.set(name, supplierCounts);
    }
  }

  const index: MappingIndex = new Map();
  for (const [name, accountCounts] of counts) {
    let bestAccount = DEFAULT_EXPENSE_ACCOUNT;
    let bestCount = 0;

    for (const [account, count] of accountCounts) {
      if (count > bestCount) {
        bestAccount = account;
        bestCount = count;
      }
    }

    index.set(name, { expenseAccount: bestAccount, count: bestCount });
  }

  return index;
}

export function findExpenseAccount(
  supplierName: string,
  index: MappingIndex,
): number {
  const needle = normalize(supplierName);

  const exact = index.get(needle);
  if (exact) return exact.expenseAccount;

  for (const [key, { expenseAccount }] of index) {
    if (key.includes(needle) || needle.includes(key)) {
      return expenseAccount;
    }
  }

  return DEFAULT_EXPENSE_ACCOUNT;
}

function determineVatAccount(
  grossAmount: number,
  vatAmount: number,
): number {
  if (vatAmount <= 0) return 2641;

  const netAmount = grossAmount - vatAmount;
  if (netAmount <= 0) return 2641;

  const rate = Math.round((vatAmount / netAmount) * 100);

  if (rate >= 10 && rate <= 14) return 2642;
  if (rate >= 4 && rate <= 8) return 2643;
  return 2641;
}

export function buildVoucherDraft(
  invoice: InvoiceData,
  expenseAccount: number,
): VoucherDraftPayload {
  const netAmount = invoice.gross_amount - invoice.vat_amount;

  const rows: VoucherRow[] = [
    {
      AccountNumber: ACCOUNTS_PAYABLE,
      DebitAmount: 0,
      CreditAmount: invoice.gross_amount,
    },
    {
      AccountNumber: expenseAccount,
      DebitAmount: netAmount,
      CreditAmount: 0,
    },
  ];

  if (invoice.vat_amount > 0) {
    rows.push({
      AccountNumber: determineVatAccount(
        invoice.gross_amount,
        invoice.vat_amount,
      ),
      DebitAmount: invoice.vat_amount,
      CreditAmount: 0,
    });
  }

  const totalDebit = rows.reduce((sum, r) => sum + r.DebitAmount, 0);
  const totalCredit = rows.reduce((sum, r) => sum + r.CreditAmount, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Unbalanced voucher: debit=${totalDebit} credit=${totalCredit}`,
    );
  }

  return {
    VoucherDate: invoice.invoice_date,
    VoucherText: invoice.supplier_name,
    Rows: rows,
  };
}
