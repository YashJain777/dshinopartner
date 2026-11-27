/**
 * Job History Hook
 * Paginated past-jobs list with a status filter.
 */

import {useState, useEffect, useCallback, useRef} from 'react';
import {getBookings} from '../services/api/booking.api';
import {Booking} from '../types/api.types';
import {logger} from '../utils/logger';

export type JobHistoryFilter = 'ALL' | 'COMPLETED' | 'CANCELLED';

/** Maps a filter tab to the statuses the API should return. */
const FILTER_STATUSES: Record<JobHistoryFilter, string | undefined> = {
  ALL: undefined,
  COMPLETED: 'COMPLETED,REVIEWED',
  CANCELLED: 'CANCELLED,SLA_BREACHED',
};

const PAGE_SIZE = 20;

export interface UseJobHistoryReturn {
  jobs: Booking[];
  filter: JobHistoryFilter;
  setFilter: (filter: JobHistoryFilter) => void;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export const useJobHistory = (): UseJobHistoryReturn => {
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<JobHistoryFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const pageRef = useRef(1);
  // Guards against a filter change landing after a slower earlier request.
  const requestIdRef = useRef(0);

  const fetchPage = useCallback(
    async (page: number, activeFilter: JobHistoryFilter, mode: 'initial' | 'refresh' | 'more') => {
      const requestId = ++requestIdRef.current;

      if (mode === 'refresh') setRefreshing(true);
      else if (mode === 'more') setLoadingMore(true);
      else setLoading(true);

      try {
        const {bookings, total} = await getBookings({
          page,
          limit: PAGE_SIZE,
          status: FILTER_STATUSES[activeFilter],
        });

        // A newer request has started — drop this response.
        if (requestId !== requestIdRef.current) return;

        setJobs(prev => (mode === 'more' ? [...prev, ...bookings] : bookings));
        setHasMore(page * PAGE_SIZE < total);
        pageRef.current = page;
        setError(null);
      } catch (err: any) {
        if (requestId !== requestIdRef.current) return;
        logger.error('[JobHistory] Fetch failed', err);
        setError(err.response?.data?.message || 'Could not load your job history.');
        if (mode !== 'more') setJobs([]);
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
    jobs,
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
