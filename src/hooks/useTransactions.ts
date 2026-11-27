/**
 * Transactions Hook
 * Paginated wallet transaction list with a credit/debit filter.
 */

import {useState, useEffect, useCallback, useRef} from 'react';
import {getTransactions} from '../services/api/wallet.api';
import {Transaction} from '../types/api.types';
import {logger} from '../utils/logger';

export type TransactionFilter = 'ALL' | 'CREDIT' | 'DEBIT';

const PAGE_SIZE = 20;

export interface UseTransactionsReturn {
  transactions: Transaction[];
  filter: TransactionFilter;
  setFilter: (filter: TransactionFilter) => void;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export const useTransactions = (): UseTransactionsReturn => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<TransactionFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const pageRef = useRef(1);
  // Guards against a filter change landing after a slower earlier request.
  const requestIdRef = useRef(0);

  const fetchPage = useCallback(
    async (
      page: number,
      activeFilter: TransactionFilter,
      mode: 'initial' | 'refresh' | 'more',
    ) => {
      const requestId = ++requestIdRef.current;

      if (mode === 'refresh') setRefreshing(true);
      else if (mode === 'more') setLoadingMore(true);
      else setLoading(true);

      try {
        const {transactions: rows, total} = await getTransactions({
          page,
          limit: PAGE_SIZE,
          type: activeFilter === 'ALL' ? undefined : activeFilter,
        });

        // A newer request has started — drop this response.
        if (requestId !== requestIdRef.current) return;

        setTransactions(prev => (mode === 'more' ? [...prev, ...rows] : rows));
        setHasMore(page * PAGE_SIZE < total);
        pageRef.current = page;
        setError(null);
      } catch (err: any) {
        if (requestId !== requestIdRef.current) return;
        logger.error('[Transactions] Fetch failed', err);
        setError(err.response?.data?.message || 'Could not load your transactions.');
        if (mode !== 'more') setTransactions([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    fetchPage(1, filter, 'initial');
  }, [filter, fetchPage]);

  const refresh = useCallback(
    () => fetchPage(1, filter, 'refresh'),
    [fetchPage, filter],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading || refreshing) return;
    await fetchPage(pageRef.current + 1, filter, 'more');
  }, [fetchPage, filter, hasMore, loadingMore, loading, refreshing]);

  return {
    transactions,
    filter,
    setFilter,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  };
};
