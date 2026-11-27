import {useState, useEffect, useCallback} from 'react';
import {
  getProfile,
  updateProfile,
  uploadProfileImage,
  changePassword as apiChangePassword,
  deactivateAccount as apiDeactivateAccount,
  getProfilePerformance,
} from '../services/api/profile.api';
import {getWalletBalance, requestWithdrawal} from '../services/api/wallet.api';
import {getDashboardStats} from '../services/api/analytics.api';
import {
  PartnerProfile,
  WalletBalance,
  DashboardStats,
  ChangePasswordRequest,
  DeactivateAccountRequest,
  PerformanceTrendData,
} from '../types/api.types';

export interface UseProfileReturn {
  profile: PartnerProfile | null;
  wallet: WalletBalance | null;
  analyticsStats: DashboardStats | null;
  performanceTrends: PerformanceTrendData[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  withdrawFunds: (amount: number) => Promise<void>;
  updateAvatar: (imageUri: string) => Promise<void>;
  updateProfileInfo: (name: string, email: string, phone?: string) => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  deactivateAccount: (data: DeactivateAccountRequest) => Promise<void>;
}

export const useProfile = (): UseProfileReturn => {
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [analyticsStats, setAnalyticsStats] = useState<DashboardStats | null>(null);
  const [performanceTrends, setPerformanceTrends] = useState<PerformanceTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch profile, wallet, analytics stats, and performance trends
   */
  const fetchData = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [profileResult, walletResult, statsResult, performanceResult] = await Promise.allSettled([
        getProfile(),
        getWalletBalance(),
        getDashboardStats(),
        getProfilePerformance(),
      ]);

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
      } else {
        console.error('Failed to load profile:', profileResult.reason);
      }

      if (walletResult.status === 'fulfilled') {
        setWallet(walletResult.value);
      } else {
        console.error('Failed to load wallet:', walletResult.reason);
      }

      if (statsResult.status === 'fulfilled') {
        setAnalyticsStats(statsResult.value);
      } else {
        console.error('Failed to load analytics stats:', statsResult.reason);
      }

      if (performanceResult.status === 'fulfilled') {
        setPerformanceTrends(performanceResult.value);
      } else {
        console.error('Failed to load performance trends:', performanceResult.reason);
      }

      // Check if critical ones failed
      if (profileResult.status === 'rejected' && walletResult.status === 'rejected') {
        setError('Failed to load profile data. Pull to refresh.');
      }
    } catch (err: any) {
      console.error('Profile fetch data error:', err);
      setError(err.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Refresh profile screen data
   */
  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  /**
   * Request payout/withdrawal and refresh balance
   */
  const withdrawFunds = useCallback(async (amount: number) => {
    try {
      await requestWithdrawal({amount});
      // Refresh wallet balance
      const freshWallet = await getWalletBalance();
      setWallet(freshWallet);
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      throw new Error(err.response?.data?.message || 'Failed to request withdrawal');
    }
  }, []);

  /**
   * Upload and update profile avatar photo
   */
  const updateAvatar = useCallback(async (imageUri: string) => {
    try {
      const updatedProfile = await uploadProfileImage(imageUri);
      setProfile(prev => {
        if (!prev) {
          return updatedProfile;
        }
        const newAvatar = updatedProfile.User?.profileImage || updatedProfile.profileImage;
        return {
          ...prev,
          ...updatedProfile,
          User: prev.User ? {
            ...prev.User,
            profileImage: newAvatar || prev.User.profileImage,
          } : undefined
        };
      });
    } catch (err: any) {
      console.error('Upload profile image error:', err);
      throw new Error(err.response?.data?.message || 'Failed to upload profile photo');
    }
  }, []);

  /**
   * Update profile info (name, email, phone)
   */
  const updateProfileInfo = useCallback(
    async (name: string, email: string, phone?: string) => {
      try {
        const updatedProfile = await updateProfile({name, email, phone});
        setProfile(prev => {
          if (!prev) {
            return updatedProfile;
          }
          return {
            ...prev,
            ...updatedProfile,
            User: prev.User ? {
              ...prev.User,
              name: name || prev.User.name,
              email: email || prev.User.email,
              phone: phone || prev.User.phone,
              profileImage: updatedProfile.User?.profileImage || updatedProfile.profileImage || prev.User.profileImage,
            } : undefined
          };
        });
      } catch (err: any) {
        console.error('Update profile info error:', err);
        throw new Error(err.response?.data?.message || 'Failed to update profile details');
      }
    },
    [],
  );

  /**
   * Change account password
   */
  const changePassword = useCallback(async (data: ChangePasswordRequest) => {
    try {
      await apiChangePassword(data);
    } catch (err: any) {
      console.error('Change password error:', err);
      throw new Error(err.response?.data?.message || 'Failed to change password');
    }
  }, []);

  /**
   * Deactivate account
   */
  const deactivateAccount = useCallback(async (data: DeactivateAccountRequest) => {
    try {
      await apiDeactivateAccount(data);
    } catch (err: any) {
      console.error('Deactivate account error:', err);
      throw new Error(err.response?.data?.message || 'Failed to deactivate account');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    profile,
    wallet,
    analyticsStats,
    performanceTrends,
    loading,
    refreshing,
    error,
    refresh,
    withdrawFunds,
    updateAvatar,
    updateProfileInfo,
    changePassword,
    deactivateAccount,
  };
};
