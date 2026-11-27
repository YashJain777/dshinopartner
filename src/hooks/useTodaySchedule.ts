/**
 * Today's Schedule Hook
 *
 * The partner's whole day, not just the one job they are on. Agencies allow up
 * to maxBookingsPerPartnerPerDay (8 by default), so a single-job view hides
 * most of the day's work and the route order the optimizer produced.
 */

import {useState, useEffect, useCallback} from 'react';
import {getTodaySchedule, ScheduledJob} from '../services/api/schedule.api';
import {TERMINAL_STATUSES, BookingStatus} from '../constants/api.constants';
import {logger} from '../utils/logger';

/** Statuses the partner is actively working through right now. */
const LIVE_STATUSES: BookingStatus[] = [
  'EN_ROUTE',
  'ON_THE_WAY',
  'ARRIVED',
  'IN_PROGRESS',
];

export interface UseTodayScheduleReturn {
  /** The job to act on now: one already started, else the first still open. */
  currentJob: ScheduledJob | null;
  /** Remaining open jobs, in route order, excluding currentJob. */
  upcoming: ScheduledJob[];
  /** Finished today. */
  completed: ScheduledJob[];
  totalJobs: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useTodaySchedule = (): UseTodayScheduleReturn => {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const schedule = await getTodaySchedule();
      setJobs(schedule.bookings);
      setError(null);
    } catch (err: any) {
      logger.error('[TodaySchedule] Fetch failed', err);
      setError(err.response?.data?.message || "Could not load today's jobs.");
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // The list arrives in route order, so the first open job is the next stop.
  const completed = jobs.filter(job => TERMINAL_STATUSES.includes(job.status));
  const open = jobs.filter(job => !TERMINAL_STATUSES.includes(job.status));
  const live = open.find(job => LIVE_STATUSES.includes(job.status));
  const currentJob = live ?? open[0] ?? null;
  const upcoming = open.filter(job => job.id !== currentJob?.id);

  return {
    currentJob,
    upcoming,
    completed,
    totalJobs: jobs.length,
    loading,
    refreshing,
    error,
    refresh: () => fetchSchedule(true),
  };
};
