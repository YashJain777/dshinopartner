import {useState, useEffect, useCallback} from 'react';
import {getDashboardStats, getPerformanceTrends, getEarningsChart} from '../services/api/analytics.api';
import {getReviewSummary} from '../services/api/reviews.api';
import {getEarningsSummary} from '../services/api/wallet.api';
import {
  PerformancePeriod,
  KPIMetric,
  ChartDataPoint,
  RatingBreakdownItem,
  ServicePerformance,
} from '../modules/performance/screens/PerformanceScreen/PerformanceScreen.types';

// ─── Zero Baselines ───────────────────────────────────────────────────────────

const generateZeroBaseline = (period: PerformancePeriod): ChartDataPoint[] => {
  const now = new Date();
  switch (period) {
    case 'today':
      return [
        { label: '09 AM', value: 0 },
        { label: '12 PM', value: 0 },
        { label: '03 PM', value: 0 },
        { label: '06 PM', value: 0 },
        { label: '09 PM', value: 0 },
      ];

    case 'week': {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const baseline: ChartDataPoint[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        baseline.push({ label: days[d.getDay()], value: 0 });
      }
      return baseline;
    }

    case 'month': {
      // Generate week labels for current month: Wk 1 … Wk N
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const baseline: ChartDataPoint[] = [];

      let weekStart = new Date(firstDay);
      let weekNum = 1;
      while (weekStart <= lastDay && weekNum <= 6) {
        baseline.push({ label: `Wk ${weekNum}`, value: 0 });
        weekStart.setDate(weekStart.getDate() + 7);
        weekNum++;
      }
      return baseline;
    }

    case 'year': {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const baseline: ChartDataPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        baseline.push({ label: months[d.getMonth()], value: 0 });
      }
      return baseline;
    }

    default:
      return [];
  }
};

// Helper: given a Date, return which "Wk N" of the month it falls in
const getWeekOfMonth = (date: Date): number => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
};

// ─── Constants ────────────────────────────────────────────────────────────────

const RATING_COLORS: Record<number, string> = {
  5: '#FF6B00', 4: '#FFB380', 3: '#FFC72C', 2: '#16A34A', 1: '#CED4DA',
};

/**
 * Five zeroed star buckets.
 *
 * A rating distribution always has five rows, and RatingDistribution sizes its
 * animations from the array it first receives — so the length must stay 5 even
 * with no reviews yet. Counts are real zeros, never sample numbers.
 */
const emptyRatingBreakdown = (): RatingBreakdownItem[] =>
  [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: 0,
    percentage: 0,
    color: RATING_COLORS[stars],
  }));

// ─── Hook Types ───────────────────────────────────────────────────────────────

export interface UsePerformanceReturn {
  activePeriod: PerformancePeriod;
  setActivePeriod: (period: PerformancePeriod) => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  kpiMetrics: KPIMetric[];
  chartData: ChartDataPoint[];
  ratingBreakdown: RatingBreakdownItem[];
  totalRatings: number;
  averageRating: number;
  topServices: ServicePerformance[];
  refresh: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const usePerformance = (): UsePerformanceReturn => {
  const [activePeriod, setActivePeriod] = useState<PerformancePeriod>('week');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const [kpiMetrics,     setKpiMetrics]     = useState<KPIMetric[]>([]);
  const [chartData,      setChartData]      = useState<ChartDataPoint[]>([]);
  const [ratingBreakdown,setRatingBreakdown]= useState<RatingBreakdownItem[]>(emptyRatingBreakdown);
  const [totalRatings,   setTotalRatings]   = useState(0);
  const [averageRating,  setAverageRating]  = useState(0);
  const [topServices,    setTopServices]    = useState<ServicePerformance[]>([]);

  const fetchPerformanceData = useCallback(
    async (period: PerformancePeriod, isRefreshing = false) => {
      try {
        if (isRefreshing) setRefreshing(true);
        else              setLoading(true);
        setError(null);

        // ── API period mapping ─────────────────────────────────────────────
        // Backend /analytics/dashboard supports: today | week | month
        // Backend /earnings/summary   supports: week  | month (ignores 'day'/'year')
        // Backend /analytics/earnings-chart supports: groupBy hour|day|week|month
        // Backend /analytics/performance-trends returns last 6 months always

        const dashPeriod =
          period === 'today' ? 'today' :
          period === 'week'  ? 'week'  :
          'month'; // month & year both fall back to 'month' for dashboard

        const summaryPeriod =
          period === 'today' ? 'week'  : // 'today' not supported; use week but read .today field
          period === 'week'  ? 'week'  :
          'month';                        // month & year use month summary

        // ── Parallel fetch ─────────────────────────────────────────────────
        const [
          dashResult,
          reviewResult,
          trendsResult,
          earningsChartResult,
          summaryResult,
        ] = await Promise.allSettled([
          getDashboardStats({ period: dashPeriod }),
          getReviewSummary(),
          getPerformanceTrends(),                          // always fetches 6-month history
          getEarningsChart({ period:
            period === 'today' ? 'day'   :
            period === 'week'  ? 'week'  :
            period === 'month' ? 'month' :
                                 'year'
          }),
          getEarningsSummary({ period: summaryPeriod }),
        ]);

        const dashStats      = dashResult.status      === 'fulfilled' ? dashResult.value      : null;
        const reviewSummary  = reviewResult.status    === 'fulfilled' ? reviewResult.value    : null;
        const trendsData     = trendsResult.status    === 'fulfilled' ? trendsResult.value    : null;
        const chartStats     = earningsChartResult.status === 'fulfilled' ? earningsChartResult.value : null;
        const earningsSummary= summaryResult.status   === 'fulfilled' ? summaryResult.value   : null;

        const trends = trendsData?.trends || [];

        // ══════════════════════════════════════════════════════════════════
        // 1. KPI METRICS
        // ══════════════════════════════════════════════════════════════════

        let completed       = 0;
        let completionRateStr = '0%';

        if (period === 'today' || period === 'week') {
          // dashboard stats are accurate for today/week
          completed         = dashStats?.bookings?.completed ?? 0;
          completionRateStr = dashStats?.bookings?.completionRate ?? '0%';
        } else if (period === 'month') {
          // Use current month's entry from performance-trends (most accurate)
          const now = new Date();
          const currentMonthLabel = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getMonth()]} ${now.getFullYear()}`;
          const monthEntry = trends.find((t: any) => t.month === currentMonthLabel);
          if (monthEntry) {
            completed         = monthEntry.completedBookings || 0;
            completionRateStr = `${monthEntry.completionRate || 0}%`;
          } else {
            // fallback to dashboard stats
            completed         = dashStats?.bookings?.completed ?? 0;
            completionRateStr = dashStats?.bookings?.completionRate ?? '0%';
          }
        } else if (period === 'year') {
          // Aggregate all 6-month trends for YTD
          completed = trends.reduce((sum: number, t: any) => sum + (t.completedBookings || 0), 0);
          const activeMonths = trends.filter((t: any) => t.totalBookings > 0);
          if (activeMonths.length > 0) {
            const avgRate = Math.round(
              activeMonths.reduce((sum: number, t: any) => sum + (t.completionRate || 0), 0) / activeMonths.length,
            );
            completionRateStr = `${avgRate}%`;
          }
        }

        // Earnings value — always from summary (most accurate, already period-aware)
        const earningsVal =
          period === 'today' ? (earningsSummary?.today   ?? 0) :
          period === 'week'  ? (earningsSummary?.thisWeek  ?? 0) :
                               (earningsSummary?.thisMonth ?? 0); // month & year

        const formattedEarnings = `₹${Number(earningsVal).toLocaleString('en-IN')}`;

        // Average rating
        const rawRating  = reviewSummary?.avgRating;
        const avgRatingVal = rawRating
          ? (typeof rawRating === 'number' ? rawRating : parseFloat(String(rawRating)))
          : 4.7;

        setKpiMetrics([
          {
            id: 'jobs',
            label: 'Jobs Completed',
            value: String(completed),
            change: period === 'today' ? 'Today' : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'This Year',
            isPositive: true,
            icon: 'briefcase-outline',
          },
          {
            id: 'rating',
            label: 'Average Rating',
            value: avgRatingVal.toFixed(1),
            change: 'Rating',
            isPositive: true,
            icon: 'star-outline',
          },
          {
            id: 'completion',
            label: 'Completion Rate',
            value: completionRateStr,
            change: 'Completed',
            isPositive: true,
            icon: 'clock-outline',
          },
          {
            id: 'earnings',
            label: 'Total Earnings',
            value: formattedEarnings,
            change: period === 'today' ? 'Today' : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'This Year',
            isPositive: true,
            icon: 'wallet-outline',
          },
        ]);

        // ══════════════════════════════════════════════════════════════════
        // 2. RATING BREAKDOWN
        // ══════════════════════════════════════════════════════════════════

        if (reviewSummary) {
          setAverageRating(avgRatingVal);
          setTotalRatings(reviewSummary.totalReviews || 0);

          const dist     = reviewSummary.ratingDistribution  || {};
          const percents = reviewSummary.ratingPercentages   || {};
          setRatingBreakdown(
            [5, 4, 3, 2, 1].map(stars => ({
              stars,
              count:      dist[stars]     || 0,
              percentage: percents[stars] || 0,
              color:      RATING_COLORS[stars],
            })),
          );
        }

        // ══════════════════════════════════════════════════════════════════
        // 3. CHART DATA
        // ══════════════════════════════════════════════════════════════════

        const chartItems: any[] = chartStats?.data || [];
        const baseline = generateZeroBaseline(period);

        if (period === 'today') {
          // hourly — period looks like "2026-06-27 09:00:00"
          chartItems.forEach((item: any) => {
            try {
              const timePart = item.period.split(' ')[1]; // "09:00:00"
              const hour = parseInt(timePart.split(':')[0], 10);
              const label =
                hour <= 10 ? '09 AM' :
                hour <= 13 ? '12 PM' :
                hour <= 16 ? '03 PM' :
                hour <= 19 ? '06 PM' :
                             '09 PM';
              const idx = baseline.findIndex(b => b.label === label);
              if (idx !== -1) {
                baseline[idx].value += item.bookingCount || 0;
                baseline[idx].subLabel = `${baseline[idx].value} Jobs`;
              }
            } catch {}
          });

        } else if (period === 'week') {
          // daily — period looks like "2026-06-21"
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          chartItems.forEach((item: any) => {
            try {
              const d = new Date(item.period + 'T00:00:00'); // force local midnight
              const label = dayNames[d.getDay()];
              const idx = baseline.findIndex(b => b.label === label);
              if (idx !== -1) {
                baseline[idx].value = item.bookingCount || 0;
                baseline[idx].subLabel = `${item.bookingCount} Jobs`;
              }
            } catch {}
          });

        } else if (period === 'month') {
          // weekly — period looks like "2026-26" (ISO year-week)
          // Map each ISO week to the Wk N label by computing which calendar week-of-month
          // the Monday of that ISO week falls in.
          const now = new Date();
          const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

          chartItems.forEach((item: any) => {
            try {
              // item.period = "2026-26" — parse ISO year and week
              const parts  = item.period.split('-'); // ["2026", "26"]
              const isoYear  = parseInt(parts[0], 10);
              const isoWeek  = parseInt(parts[1], 10);

              // Get the Monday of that ISO week (ISO week 1 = first week with Thursday)
              const jan4     = new Date(isoYear, 0, 4);
              const dayOfJan4 = (jan4.getDay() + 6) % 7; // 0=Mon … 6=Sun
              const monday    = new Date(jan4);
              monday.setDate(jan4.getDate() - dayOfJan4 + (isoWeek - 1) * 7);

              // Only count weeks in current month
              const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}`;
              if (mondayStr !== monthYear) return;

              const wkNum = getWeekOfMonth(monday);
              const label = `Wk ${wkNum}`;
              const idx   = baseline.findIndex(b => b.label === label);
              if (idx !== -1) {
                baseline[idx].value += item.bookingCount || 0;
                baseline[idx].subLabel = `${baseline[idx].value} Jobs`;
              }
            } catch {}
          });

        } else if (period === 'year') {
          // monthly from performance-trends
          const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          trends.forEach((item: any) => {
            const shortMonth = item.month?.split(' ')[0]; // "Jun 2026" → "Jun"
            const idx = baseline.findIndex(b => b.label === shortMonth);
            if (idx !== -1) {
              baseline[idx].value = item.completedBookings || 0;
              baseline[idx].subLabel = `${item.completedBookings} Jobs`;
            }
          });
          // suppress unused variable warning
          void monthNames;
        }

        setChartData([...baseline]);

        // ══════════════════════════════════════════════════════════════════
        // 4. TOP SERVICES
        // ══════════════════════════════════════════════════════════════════

        const breakdown = earningsSummary?.serviceBreakdown || [];
        if (breakdown.length > 0) {
          const mapped: ServicePerformance[] = breakdown
            .map((item: any) => ({
              id:         item.serviceId,
              name:       item.serviceName,
              jobsCount:  item.bookingCount   || 0,
              revenue:    item.totalEarnings  || 0,
              growth:     '0%',
              isPositive: true,
              icon:       item.serviceName?.toLowerCase().includes('wash') ? 'car-wash' : 'vacuum',
            }))
            .sort((a: ServicePerformance, b: ServicePerformance) => b.jobsCount - a.jobsCount);
          setTopServices(mapped);
        } else {
          setTopServices([]);
        }

        // ── Error signal ───────────────────────────────────────────────────
        if (dashResult.status === 'rejected' && reviewResult.status === 'rejected') {
          setError('Could not load performance data. Pull to refresh.');
        }

      } catch (err: any) {
        console.error('[usePerformance] unexpected error:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchPerformanceData(activePeriod);
  }, [activePeriod, fetchPerformanceData]);

  const refresh = useCallback(async () => {
    await fetchPerformanceData(activePeriod, true);
  }, [activePeriod, fetchPerformanceData]);

  return {
    activePeriod,
    setActivePeriod,
    loading,
    refreshing,
    error,
    kpiMetrics,
    chartData,
    ratingBreakdown,
    totalRatings,
    averageRating,
    topServices,
    refresh,
  };
};
