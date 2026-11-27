/**
 * Dashboard Hook
 * Custom hook for fetching and managing dashboard data with actions
 */

import {useState, useEffect, useCallback} from 'react';
import {getHomeSnapshot, HomeAttendanceSnapshot} from '../services/api/home.api';
import {getProfile} from '../services/api/profile.api';
import {getWalletBalance, requestWithdrawal} from '../services/api/wallet.api';
import {
  getNotifications,
  markNotificationAsRead,
} from '../services/api/notification.api';
import {toggleAvailability} from '../services/api/availability.api';
import {
  PartnerProfile,
  WalletBalance,
  DashboardStats,
  Notification,
} from '../types/api.types';

export interface DashboardData {
  profile: PartnerProfile | null;
  wallet: WalletBalance | null;
  stats: DashboardStats | null;
  notifications: Notification[];
  unreadCount: number;
  attendance?: HomeAttendanceSnapshot | null;
  activeJob?: any | null;
}

export interface UseDashboardReturn {
  data: DashboardData;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
  toggleOnlineStatus: (isOnline: boolean) => Promise<void>;
  withdrawFunds: (amount: number) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
}

export const useDashboard = (): UseDashboardReturn => {
  const [data, setData] = useState<DashboardData>({
    profile: null,
    wallet: null,
    stats: null,
    notifications: [],
    unreadCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all dashboard data
   */
  const fetchDashboardData = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Consolidate dashboard to single aggregated GET /home call + lightweight notifications/profile enrichment
      const [homeResult, profileResult, notificationsResult] = await Promise.allSettled([
        getHomeSnapshot(),
        getProfile(),
        getNotifications({page: 1, limit: 5}),
      ]);

      const home = homeResult.status === 'fulfilled' ? homeResult.value : null;
      const fullProfile = profileResult.status === 'fulfilled' ? profileResult.value : null;
      const notificationsData = notificationsResult.status === 'fulfilled' ? notificationsResult.value : [];

      // Build unified profile from fullProfile + home snapshot
      const profile: PartnerProfile | null = fullProfile
        ? {
            ...fullProfile,
            isOnline: home?.partner?.isOnline ?? fullProfile.isOnline,
            kycStatus: (home?.partner?.kycStatus as any) ?? fullProfile.kycStatus,
            avgRating: home?.partner?.avgRating ?? fullProfile.avgRating,
          }
        : home?.partner
          ? ({
              id: home.partner.id,
              isOnline: home.partner.isOnline,
              kycStatus: home.partner.kycStatus,
              rating: home.partner.avgRating,
              avgRating: home.partner.avgRating,
            } as any)
          : null;

      // Wallet from /home snapshot
      const wallet: WalletBalance | null = home?.partner
        ? {
            balance: Number(home.partner.walletBalance || 0),
            currency: 'INR',
          }
        : null;

      // Calculate online time from /home attendance snapshot
      const todayAttendance = home?.attendance || null;
      let onlineTimeStr = '0';
      if (todayAttendance) {
        if (todayAttendance.workHours) {
          const minutes = Math.round(Number(todayAttendance.workHours) * 60);
          onlineTimeStr = String(minutes);
        } else if (todayAttendance.checkInAt && !todayAttendance.checkOutAt) {
          const checkInTime = new Date(todayAttendance.checkInAt).getTime();
          const diffMs = Date.now() - checkInTime;
          if (diffMs > 0) {
            onlineTimeStr = String(Math.floor(diffMs / 60000));
          }
        }
      }

      const stats: DashboardStats | null = home?.todayStats
        ? {
            totalBookings: home.todayStats.totalBooked || 0,
            completedBookings: home.todayStats.completed || 0,
            totalEarnings: home.todayStats.earnings || 0,
            averageRating: Number(home.partner?.avgRating ?? profile?.rating ?? 0),
            todayJobs: home.todayStats.completed || 0,
            todayEarnings: home.todayStats.earnings || 0,
            onlineTime: onlineTimeStr,
          }
        : null;

      setData({
        profile,
        wallet,
        stats,
        notifications: Array.isArray(notificationsData)
          ? notificationsData
          : ((notificationsData as any)?.data || []),
        unreadCount: home?.unreadNotifications ?? 0,
        attendance: todayAttendance,
        activeJob: home?.activeJob ?? null,
      });

      if (homeResult.status === 'rejected' && !isRefreshing) {
        setError('Some data could not be loaded. Pull to refresh.');
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Refresh dashboard data
   */
  const refresh = useCallback(async () => {
    await fetchDashboardData(true);
  }, [fetchDashboardData]);

  /**
   * Toggle online/offline status
   */
  const toggleOnlineStatus = useCallback(
    async (isOnline: boolean) => {
      try {
        await toggleAvailability({isOnline});

        // Update local state immediately for better UX
        setData(prev => ({
          ...prev,
          profile: prev.profile
            ? {...prev.profile, isOnline}
            : null,
        }));
      } catch (err: any) {
        console.error('Toggle availability error:', err);
        throw new Error(
          err.response?.data?.message || 'Failed to update availability',
        );
      }
    },
    [],
  );

  /**
   * Request payout/withdrawal and refresh wallet balance
   */
  const withdrawFunds = useCallback(async (amount: number) => {
    try {
      await requestWithdrawal({amount});
      // Fetch fresh balance after successful withdrawal
      const freshWallet = await getWalletBalance();
      setData(prev => ({
        ...prev,
        wallet: freshWallet,
      }));
    } catch (err: any) {
      console.error('Withdrawal request error:', err);
      throw new Error(
        err.response?.data?.message || 'Failed to request withdrawal',
      );
    }
  }, []);

  /**
   * Mark a specific notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setData(prev => ({
        ...prev,
        notifications: prev.notifications.map(n =>
          n.id === notificationId ? {...n, isRead: true} : n
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    } catch (err: any) {
      console.error('Mark notification as read error:', err);
      // Fallback local update to keep UI clean even if API call fails
      setData(prev => ({
        ...prev,
        notifications: prev.notifications.map(n =>
          n.id === notificationId ? {...n, isRead: true} : n
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    }
  }, []);

  /**
   * Initial data fetch
   */
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    data,
    loading,
    error,
    refreshing,
    refresh,
    toggleOnlineStatus,
    withdrawFunds,
    markAsRead,
  };
};
