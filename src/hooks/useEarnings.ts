/**
 * useEarnings Hook
 * Custom hook to manage fetching and updating earnings, transactions, charts, and withdrawals
 */

import {useState, useEffect, useCallback} from 'react';
import {
  getWalletBalance,
  getTransactions,
  requestWithdrawal,
  getEarningsSummary,
} from '../services/api/wallet.api';
import {getEarningsChart} from '../services/api/analytics.api';
import {getKycStatus} from '../services/api/kyc.api';
import {Transaction, KYCStatusResponse} from '../types/api.types';

/**
 * Figures for the period currently selected, plus the lifetime job count.
 * Every value comes from the earnings summary — nothing here is estimated.
 */
export interface EarningsStats {
  /** Gross booking value completed in the selected period. */
  periodEarnings: number;
  /** Bookings completed in the selected period. */
  periodJobs: number;
  /** periodEarnings / periodJobs, or null when no jobs in the period. */
  avgPerJob: number | null;
  /** Lifetime completed bookings. */
  totalJobs: number;
}

export interface ChartItem {
  label: string;
  value: number;
  amount: string;
}

export interface SummaryMetricItem {
  id: string;
  label: string;
  value: number | string;
  icon: string;
}

export interface UseEarningsReturn {
  balance: number;
  stats: EarningsStats;
  period: 'day' | 'week' | 'month' | 'year';
  setPeriod: (period: 'day' | 'week' | 'month' | 'year') => void;
  /** Human label for the selected period, e.g. "This Week". */
  periodLabel: string;
  chartData: ChartItem[];
  transactions: Transaction[];
  summaryMetrics: SummaryMetricItem[];
  loading: boolean;
  refreshing: boolean;
  isWithdrawing: boolean;
  refresh: () => Promise<void>;
  withdraw: (amount: number) => Promise<void>;
  kycInfo: KYCStatusResponse | null;
  error: string | null;
}

const PERIOD_LABELS: Record<'day' | 'week' | 'month' | 'year', string> = {
  day: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
};

export const useEarnings = (): UseEarningsReturn => {
  const [balance, setBalance] = useState<number>(0);
  const [stats, setStats] = useState<EarningsStats>({
    periodEarnings: 0,
    periodJobs: 0,
    avgPerJob: null,
    totalJobs: 0,
  });
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');

  const periodLabel = PERIOD_LABELS[period];
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetricItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [kycInfo, setKycInfo] = useState<KYCStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch earnings data from APIs
   */
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Perform parallel requests
      const results = await Promise.allSettled([
        getWalletBalance(),
        getTransactions({page: 1, limit: 10}),
        getEarningsSummary({period}),
        getEarningsChart({period}),
        getKycStatus(),
      ]);

      const walletBalResult = results[0];
      const txnsResult = results[1];
      const summaryResult = results[2];
      const chartResult = results[3];
      const kycResult = results[4];

      if (kycResult.status === 'fulfilled' && kycResult.value) {
        setKycInfo(kycResult.value);
      }

      // 1. Balance Response (Never fallback to fake mock values)
      if (walletBalResult.status === 'fulfilled' && walletBalResult.value) {
        setBalance(Number(walletBalResult.value.balance || 0));
      } else {
        setBalance(0.0);
      }

      // 2. Transactions — getTransactions already normalises the rows.
      setTransactions(
        txnsResult.status === 'fulfilled' ? txnsResult.value.transactions : [],
      );

      // 3. Summary Response
      if (summaryResult.status === 'fulfilled' && summaryResult.value) {
        const sum = summaryResult.value;

        // Earnings and job count for the selected period, read from the same
        // window on the server so the average below is meaningful.
        const byPeriod = {
          day: {earnings: sum.today, jobs: sum.todayBookings},
          week: {earnings: sum.thisWeek, jobs: sum.weekBookings},
          month: {earnings: sum.thisMonth, jobs: sum.monthBookings},
          year: {earnings: sum.thisYear, jobs: sum.yearBookings},
        }[period];

        const periodEarnings = Number(byPeriod?.earnings || 0);
        const periodJobs = Number(byPeriod?.jobs || 0);

        setSummaryMetrics([
          {id: 'today', label: 'Today', value: Number(sum.today || 0), icon: 'calendar-today'},
          {id: 'thisWeek', label: 'This Week', value: Number(sum.thisWeek || 0), icon: 'calendar-week'},
          {id: 'thisMonth', label: 'This Month', value: Number(sum.thisMonth || 0), icon: 'calendar-month'},
          {id: 'thisYear', label: 'This Year', value: Number(sum.thisYear || 0), icon: 'calendar-sync'},
        ]);

        setStats({
          periodEarnings,
          periodJobs,
          avgPerJob:
            periodJobs > 0
              ? Math.round((periodEarnings / periodJobs) * 100) / 100
              : null,
          totalJobs: Number(sum.totalBookings || 0),
        });
      } else {
        setSummaryMetrics([]);
        setStats({periodEarnings: 0, periodJobs: 0, avgPerJob: null, totalJobs: 0});
      }

      // 4. Chart Response
      if (chartResult.status === 'fulfilled' && chartResult.value) {
        const chartDataPoints = (chartResult.value as any)?.data || [];
        if (chartDataPoints.length > 0) {
          const mappedChart = chartDataPoints.map((item: any) => {
            let label = item.period;
            if (period === 'day') {
              try {
                const parts = item.period.split(' ');
                if (parts[1]) {
                  const hour = Number(parts[1].split(':')[0]);
                  const ampm = hour >= 12 ? 'PM' : 'AM';
                  const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
                  label = `${String(formattedHour).padStart(2, '0')} ${ampm}`;
                }
              } catch {
                label = item.period;
              }
            } else if (period === 'week') {
              try {
                const dateParts = item.period.split('-');
                const d = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
                label = d.toLocaleDateString('en-US', { weekday: 'short' });
              } catch {
                label = item.period;
              }
            } else if (period === 'month') {
              try {
                const parts = item.period.split('-');
                if (parts[1]) {
                  label = `Wk ${parts[1]}`;
                }
              } catch {
                label = item.period;
              }
            } else if (period === 'year') {
              try {
                const dateParts = item.period.split('-');
                const d = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, 1);
                label = d.toLocaleDateString('en-US', { month: 'short' });
              } catch {
                label = item.period;
              }
            }
            return {
              label,
              value: Number(item.earnings || 0),
              amount: `₹ ${Number(item.earnings || 0).toLocaleString('en-IN')}`,
            };
          });
          setChartData(mappedChart);
        } else {
          setChartData([]);
        }
      } else {
        setChartData([]);
      }

    } catch (err: any) {
      console.error('Earnings fetch error:', err);
      setError(err.message || 'Failed to load earnings data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  /**
   * Trigger withdrawal
   */
  const withdraw = useCallback(async (amount: number) => {
    try {
      setIsWithdrawing(true);
      await requestWithdrawal({amount});
      // reload data after withdrawal
      await fetchData(true);
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      throw new Error(err.message || 'Payout failed');
    } finally {
      setIsWithdrawing(false);
    }
  }, [fetchData]);

  /**
   * Initial fetch
   */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return {
    balance,
    stats,
    period,
    setPeriod,
    periodLabel,
    chartData,
    transactions,
    summaryMetrics,
    loading,
    refreshing,
    isWithdrawing,
    refresh,
    withdraw,
    kycInfo,
    error,
  };
};
