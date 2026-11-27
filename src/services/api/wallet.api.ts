/**
 * Wallet API Service
 * Handles all wallet and earnings-related API calls
 */

import apiClient, {ApiResponse} from './client';
import {API_ENDPOINTS} from '../../constants/api.constants';
import {
  WalletBalance,
  Transaction,
  Withdrawal,
  EarningsSummary,
} from '../../types/api.types';

/**
 * Get wallet balance
 */
export const getWalletBalance = async (): Promise<WalletBalance> => {
  const response = await apiClient.get<ApiResponse<WalletBalance>>(
    API_ENDPOINTS.WALLET_BALANCE,
  );
  return response.data.data;
};

/**
 * Get transactions with pagination
 */
export interface GetTransactionsParams {
  page?: number;
  limit?: number;
  /** CREDIT or DEBIT; omit for both. */
  type?: 'CREDIT' | 'DEBIT';
}

export interface TransactionsPage {
  transactions: Transaction[];
  /** Total matching the filter, across all pages. */
  total: number;
}

export const getTransactions = async (
  params: GetTransactionsParams = {},
): Promise<TransactionsPage> => {
  const response = await apiClient.get<any>(
    API_ENDPOINTS.WALLET_TRANSACTIONS,
    {params},
  );
  const body = response.data;

  // The controller spreads its paginated result onto the response, so the rows
  // sit at `data` and the count at `pagination`. Older builds returned the
  // array under `data.data`; reading the wrong one yields a silently empty
  // list, so accept both.
  const payload = body?.data;
  const transactions: Transaction[] = Array.isArray(payload)
    ? payload
    : payload?.data ?? [];

  const pagination = body?.pagination ?? payload?.pagination;

  return {
    transactions: transactions.map(toTransaction),
    total: Number(pagination?.total ?? transactions.length),
  };
};

/**
 * Normalises a wallet transaction row.
 *
 * The id is taken as-is: generating one client-side would change on every
 * fetch and break list keys. Missing amounts become 0; nothing else is
 * invented.
 */
const toTransaction = (row: any): Transaction => ({
  id: String(row?.id ?? ''),
  type: row?.type === 'DEBIT' ? 'DEBIT' : 'CREDIT',
  amount: Number(row?.amount ?? 0),
  description: row?.description ?? '',
  date: row?.date ?? row?.createdAt ?? '',
  balance: Number(row?.balanceAfter ?? row?.balance ?? 0),
});

/**
 * Request withdrawal
 */
export interface WithdrawalRequest {
  amount: number;
}

export const requestWithdrawal = async (
  data: WithdrawalRequest,
): Promise<Withdrawal> => {
  const response = await apiClient.post<ApiResponse<Withdrawal>>(
    API_ENDPOINTS.REQUEST_WITHDRAWAL,
    data,
  );
  return response.data.data;
};

/**
 * Get withdrawal history
 */
export const getWithdrawalHistory = async (): Promise<Withdrawal[]> => {
  const response = await apiClient.get<ApiResponse<Withdrawal[]>>(
    API_ENDPOINTS.WITHDRAWAL_HISTORY,
  );
  return response.data.data;
};

/**
 * Get earnings summary
 */
export interface GetEarningsSummaryParams {
  period: 'day' | 'week' | 'month' | 'year';
}

export const getEarningsSummary = async (
  params: GetEarningsSummaryParams,
): Promise<EarningsSummary> => {
  const response = await apiClient.get<ApiResponse<EarningsSummary>>(
    API_ENDPOINTS.EARNINGS_SUMMARY,
    {params},
  );
  return response.data.data;
};
