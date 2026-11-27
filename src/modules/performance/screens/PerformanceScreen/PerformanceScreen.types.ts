/**
 * Performance Dashboard Screen Types
 */

export type PerformancePeriod = 'today' | 'week' | 'month' | 'year';

export interface KPIMetric {
  id: string;
  label: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  icon: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  subLabel?: string;
}

export interface RatingBreakdownItem {
  stars: number;
  count: number;
  percentage: number;
  color: string;
}

export interface ServicePerformance {
  id: string;
  name: string;
  jobsCount: number;
  revenue: number;
  growth: string;
  isPositive: boolean;
  icon: string;
}

export interface TimeFilterTabsProps {
  activePeriod: PerformancePeriod;
  onPeriodChange: (period: PerformancePeriod) => void;
  dateRangeText: string;
}

export interface PerformanceOverviewProps {
  metrics: KPIMetric[];
  loading?: boolean;
}


export interface TrendChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
  activeMetricLabel?: string;
}

export interface RatingDistributionProps {
  averageRating: number;
  totalRatings: number;
  breakdown: RatingBreakdownItem[];
  loading?: boolean;
}

export interface ServicePerformanceListProps {
  services: ServicePerformance[];
  onViewAllPress?: () => void;
}
