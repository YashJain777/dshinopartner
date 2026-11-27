/**
 * Home Snapshot API Service
 * Aggregated single-roundtrip endpoint for the Partner Dashboard
 */

import apiClient, { ApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api.constants';

export interface HomePartnerSnapshot {
  id: string;
  isOnline: boolean;
  kycStatus: string;
  kycPending: boolean;
  qualityScore: number;
  avgRating: number;
  totalRatings: number;
  walletBalance: number;
}

export interface HomeTodayStats {
  date: string;
  totalBooked: number;
  completed: number;
  earnings: number;
}

export interface HomeAttendanceSnapshot {
  hasCheckedIn: boolean;
  /** The last session ended; the partner may start another today. */
  hasCheckedOut: boolean;
  /** A session is open right now. This, not hasCheckedOut, means "working". */
  onShift: boolean;
  /** Shift sessions recorded today. */
  sessionCount: number;
  checkInAt: string | null;
  checkOutAt: string | null;
  workHours: number | string | null;
  /** Flattened by the home controller so the Break control knows its label. */
  isOnBreak?: boolean;
}

export interface HomeSnapshotResponse {
  partner: HomePartnerSnapshot;
  activeJob: any | null;
  todayStats: HomeTodayStats;
  attendance: HomeAttendanceSnapshot;
  unreadNotifications: number;
}

/**
 * Fetch aggregated home dashboard snapshot in a single API call
 */
export const getHomeSnapshot = async (): Promise<HomeSnapshotResponse> => {
  const response = await apiClient.get<ApiResponse<HomeSnapshotResponse>>(
    API_ENDPOINTS.HOME,
  );
  return response.data.data;
};
