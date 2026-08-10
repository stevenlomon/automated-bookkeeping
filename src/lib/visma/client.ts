import { getValidAccessToken } from "./auth";
import { VISMA_CONFIG } from "./config";
import type {
  PaginatedResponse,
  Voucher,
  VoucherDraft,
  VoucherDraftPayload,
} from "./types";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getValidAccessToken();

  const response = await fetch(`${VISMA_CONFIG.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Visma API error (${response.status}): ${body}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function getVouchers(
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<Voucher>> {
  const params = new URLSearchParams({
    $page: String(page),
    $pageSize: String(pageSize),
  });
  return request(`/vouchers?${params}`);
}

export async function createVoucherDraft(
  payload: VoucherDraftPayload,
): Promise<VoucherDraft> {
  return request("/voucherdrafts?amountIncludesVat=false", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getVoucherDrafts(
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<VoucherDraft>> {
  const params = new URLSearchParams({
    $page: String(page),
    $pageSize: String(pageSize),
  });
  return request(`/voucherdrafts?${params}`);
}

export async function getVoucherDraft(id: string): Promise<VoucherDraft> {
  return request(`/voucherdrafts/${encodeURIComponent(id)}`);
}

export async function convertVoucherDraft(id: string): Promise<void> {
  await request(`/voucherdrafts/${encodeURIComponent(id)}/convert`, {
    method: "POST",
  });
}
