/**
 * Auth Store - Zustand
 * Global authentication state management
 */

import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {authService} from '../services/auth.service';
import {apiService} from '../services/api.service';
import {OTP_TYPES} from '../constants/api.constants';
import {removeFcmToken} from '../services/api/settings.api';
import {registerDeviceForPush} from '../services/notification/registerDevice';
import {getOrCreateDeviceId} from '../utils/device';
import {logger} from '../utils/logger';

interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  profileImage?: string;
  isOnline: boolean;
  rating: number;
  totalJobs: number;
  kycStatus: string;
}

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  otpForTesting: string | null;

  // Actions
  sendOTP: (phone: string, otpType?: string) => Promise<{success: boolean; error?: string}>;
  login: (phone: string, otpCode: string) => Promise<{success: boolean; error?: string}>;
  registerPartner: (formData: FormData) => Promise<{success: boolean; error?: string}>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  clearError: () => void;
  loadStoredAuth: () => Promise<void>;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@dshino_access_token',
  REFRESH_TOKEN: '@dshino_refresh_token',
  USER: '@dshino_user',
};

/** Set while logout's server-side cleanup runs — see logout(). */
let isLoggingOut = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial State
  user: null,
  token: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  otpForTesting: null,

  // Send OTP
  sendOTP: async (phone: string, otpType: string = OTP_TYPES.LOGIN) => {
    set({isLoading: true, error: null, otpForTesting: null});

    try {
      const response = await authService.sendOTP({
        phone,
        otpType: otpType as any,
        userType: 'service_partner',
      });

      // Log the full API response nicely for testing
      console.log('=== [TESTING] Send OTP API Response ===');
      console.log(JSON.stringify(response, null, 2));

      if (response.success) {
        // Try to extract OTP from the API response
        const data = response.data as any;
        const extractedOtp = 
          data?.otp || 
          data?.otpCode || 
          (response as any)?.otp || 
          (response as any)?.otpCode || 
          null;

        console.log(`=== [TESTING] Extracted OTP: ${extractedOtp} ===`);

        set({
          isLoading: false,
          otpForTesting: extractedOtp,
        });
        return {success: true};
      } else {
        const errorMessage = response.error?.message || 'Failed to send OTP';
        set({isLoading: false, error: errorMessage});
        return {success: false, error: errorMessage};
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Network error';
      set({isLoading: false, error: errorMessage});
      return {success: false, error: errorMessage};
    }
  },

  // Login with OTP
  login: async (phone: string, otpCode: string) => {
    set({isLoading: true, error: null});

    try {
      const response = await authService.login({
        phone,
        otpCode,
        userType: 'service_partner',
      });

      // Log full login response
      console.log('=== [LOGIN RESPONSE] Full Response ===');
      console.log(JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        const {user, tokens} = response.data;

        // Log user data and roles
        console.log('=== [LOGIN RESPONSE] User Data ===');
        console.log(JSON.stringify(user, null, 2));
        console.log('=== [LOGIN RESPONSE] Tokens ===');
        console.log({
          accessToken: tokens.accessToken.substring(0, 30) + '...',
          refreshToken: tokens.refreshToken.substring(0, 30) + '...',
        });

        // Store tokens
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken],
          [STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken],
          [STORAGE_KEYS.USER, JSON.stringify(user)],
        ]);

        // Set token in API service
        apiService.setToken(tokens.accessToken);

        set({
          user,
          token: tokens.accessToken,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // Register FCM token in background
        try {
          await registerDeviceForPush();
        } catch (fcmError) {
          console.error('[Auth Store] Background FCM registration failed:', fcmError);
        }

        return {success: true};
      } else {
        const errorMessage = response.error?.message || 'Login failed';
        set({isLoading: false, error: errorMessage});
        return {success: false, error: errorMessage};
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Network error';
      set({isLoading: false, error: errorMessage});
      return {success: false, error: errorMessage};
    }
  },

  // Register Partner
  registerPartner: async (formData: FormData) => {
    set({isLoading: true, error: null});

    try {
      const response = await authService.registerPartner(formData);

      if (response.success && response.data) {
        const {user, tokens} = response.data;

        // Store tokens
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken],
          [STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken],
          [STORAGE_KEYS.USER, JSON.stringify(user)],
        ]);

        // Set token in API service
        apiService.setToken(tokens.accessToken);

        set({
          user,
          token: tokens.accessToken,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // Register FCM token in background
        try {
          await registerDeviceForPush();
        } catch (fcmError) {
          console.error('[Auth Store] Background FCM registration failed:', fcmError);
        }

        return {success: true};
      } else {
        const errorMessage = response.error?.message || 'Registration failed';
        set({isLoading: false, error: errorMessage});
        return {success: false, error: errorMessage};
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Network error';
      set({isLoading: false, error: errorMessage});
      return {success: false, error: errorMessage};
    }
  },

  // Logout
  logout: async () => {
    const {token, isAuthenticated} = get();

    // Guard: If already logged out, do nothing to prevent infinite loops
    if (!token && !isAuthenticated) {
      return;
    }

    // Re-entrancy guard: the cleanup calls below can themselves fail with 401,
    // and a failed refresh calls logout again. Without this, that recurses.
    if (isLoggingOut) {
      return;
    }
    isLoggingOut = true;

    try {
      // 1. Server-side cleanup FIRST, while the token is still valid.
      // DELETE /settings/fcm-token is an authenticated route, so clearing the
      // store before this call makes it a silent 401 and leaves the device
      // registered — the partner keeps receiving pushes after logging out, and
      // so does whoever signs in on that device next.
      try {
        const deviceId = await getOrCreateDeviceId();
        await removeFcmToken({deviceId});
      } catch (fcmError) {
        logger.warn('[Auth Store] FCM token removal failed', fcmError);
      }

      try {
        await authService.logout();
      } catch (authErr) {
        logger.warn('[Auth Store] authService.logout failed', authErr);
      }
    } finally {
      isLoggingOut = false;
    }

    // 2. Clear in-memory auth state to unmount authenticated screens & halt API calls
    apiService.setToken(null);
    set({
      user: null,
      token: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    });

    // 3. Clear persisted credentials
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
        'accessToken',
        'refreshToken',
        'user',
      ]);
    } catch (storageErr) {
      logger.warn('[Auth Store] Storage cleanup error during logout', storageErr);
    }
  },

  // Refresh Tokens
  refreshTokens: async () => {
    const {refreshToken} = get();
    
    if (!refreshToken) {
      return;
    }

    try {
      const response = await authService.refreshToken({refreshToken});

      if (response.success && response.data) {
        const {access, refresh} = response.data;

        // Store new tokens
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.ACCESS_TOKEN, access.token],
          [STORAGE_KEYS.REFRESH_TOKEN, refresh.token],
        ]);

        // Set token in API service
        apiService.setToken(access.token);

        set({
          accessToken: access.token,
          token: access.token,
          refreshToken: refresh.token,
        });
      } else {
        // Refresh failed, logout user
        await get().logout();
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      await get().logout();
    }
  },

  // Set Tokens (for API client)
  setTokens: async (accessToken: string, refreshToken: string) => {
    try {
      // Store new tokens
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
      ]);

      // Set token in API service
      apiService.setToken(accessToken);

      set({
        accessToken,
        token: accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error('Set tokens error:', error);
    }
  },

  // Clear Error
  clearError: () => {
    set({error: null});
  },

  // Load Stored Auth
  loadStoredAuth: async () => {
    try {
      const [[, accessToken], [, refreshToken], [, userJson]] =
        await AsyncStorage.multiGet([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER,
        ]);

      if (accessToken && refreshToken && userJson) {
        const user = JSON.parse(userJson);

        // Log loaded auth data
        console.log('=== [LOAD STORED AUTH] User Data from Storage ===');
        console.log(JSON.stringify(user, null, 2));
        console.log('=== [LOAD STORED AUTH] Access Token ===');
        console.log(accessToken.substring(0, 30) + '...');

        // Set token in API service
        apiService.setToken(accessToken);

        set({
          user,
          token: accessToken,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });

        // Register FCM token on app launch in background
        try {
          await registerDeviceForPush();
        } catch (fcmError) {
          console.error('[Auth Store] App launch FCM registration failed:', fcmError);
        }
      }
    } catch (error) {
      console.error('Load stored auth error:', error);
    }
  },
}));
