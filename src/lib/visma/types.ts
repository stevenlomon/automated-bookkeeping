export interface VoucherRow {
  AccountNumber: number;
  DebitAmount: number;
  CreditAmount: number;
  TransactionText?: string;
}

export interface VoucherDraftPayload {
  VoucherDate: string;
  VoucherText: string;
  Rows: VoucherRow[];
}

export interface VoucherDraft {
  Id: string;
  VoucherDate: string;
  VoucherText: string;
  Rows: VoucherRow[];
}

export interface Voucher {
  Id: string;
  VoucherDate: string;
  VoucherText: string;
  VoucherType: number;
  Rows: VoucherRow[];
}

export interface PaginatedResponse<T> {
  Data: T[];
  Meta: {
    CurrentPage: number;
    PageSize: number;
    TotalNumberOfPages: number;
    TotalNumberOfResults: number;
  };
}
