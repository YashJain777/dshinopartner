/**
 * Analytics API Service
 * Handles all analytics and dashboard-related API calls
 */

import apiClient, {ApiResponse} from './client';
import {API_ENDPOINTS} from '../../constants/api.constants';

/**
 * Get dashboard overview stats
 */
export const getDashboardStats = async (
  params: {period?: string} = {},
): Promise<any> => {
  const response = await apiClient.get<ApiResponse<any>>(
    API_ENDPOINTS.ANALYTICS_DASHBOARD,
    {params},
  );
  return response.data.data;
};

/**
 * Get earnings chart data
 */
export interface GetEarningsChartParams {
  period: 'day' | 'week' | 'month' | 'year';
}

export const getEarningsChart = async (
  params: GetEarningsChartParams,
): Promise<any> => {
  const { period } = params;
  let groupBy: 'hour' | 'day' | 'week' | 'month' = 'day';
  let startDate = new Date();
  const endDate = new Date().toISOString();

  if (period === 'day') {
    groupBy = 'hour';
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    groupBy = 'day';
    startDate.setDate(startDate.getDate() - 7);
  } else if (period === 'month') {
    groupBy = 'week';
    startDate.setDate(1); // Start of month
  } else if (period === 'year') {
    groupBy = 'month';
    startDate.setMonth(0, 1); // Start of year
  }

  const response = await apiClient.get<ApiResponse<any>>(
    API_ENDPOINTS.EARNINGS_CHART,
    {
      params: {
        groupBy,
        startDate: startDate.toISOString(),
        endDate: endDate,
      },
    },
  );
  return response.data.data;
};

/**
 * Get performance trends
 */
export interface TrendItem {
  month: string;
  totalBookings: number;
  completedBookings: number;
  completionRate: number;
  avgRating: string;
}

export interface PerformanceTrends {
  trends: TrendItem[];
}

export const getPerformanceTrends = async (): Promise<PerformanceTrends> => {
  const response = await apiClient.get<ApiResponse<PerformanceTrends>>(
    API_ENDPOINTS.PERFORMANCE_TRENDS,
  );
  return response.data.data;
};
