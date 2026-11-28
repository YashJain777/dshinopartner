/**
 * API Client
 * Axios instance with interceptors for authentication, error handling, and logging
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_CONFIG} from '../../constants/api.constants';
import {useAuthStore} from '../../store/auth.store';

/**
 * Single-flight token refresh.
 *
 * The backend rotates refresh tokens and treats a reused one as theft: it
 * deletes every session for that user. Screens fire 3-4 requests in parallel,
 * so without this gate an expired access token would send several refreshes
 * carrying the same token and log the partner out.
 *
 * The first 401 performs the refresh; every other 401 awaits the same promise
 * and then retries with the new token.
 */
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const {refreshToken, setTokens} = useAuthStore.getState();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Plain axios, not apiClient — the interceptor must not recurse.
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/public/auth/refresh-token`,
      {refreshToken},
    );

    const {accessToken, refreshToken: newRefreshToken} = response.data.data;
    if (!accessToken) {
      throw new Error('Refresh response did not include an access token');
    }

    await setTokens(accessToken, newRefreshToken);
    return accessToken;
  })();

  // Clear the gate once settled so a later expiry can refresh again.
  refreshPromise
    .catch(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

/**
 * Create Axios instance with base configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Request Interceptor
 * Adds authentication token to all requests
 */
apiClient.interceptors.request.use(
  (config: any) => {
    const {token} = useAuthStore.getState();

    // Add auth token if available
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (__DEV__) {
      const hasToken = !!config.headers?.Authorization;
      const tokenPreview = token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : 'NO TOKEN';
      console.log(
        `📤 [${config.method?.toUpperCase()}] ${config.url}${hasToken ? ' ✅ (with token)' : ' ⚠️ (no token)'}`,
        {
          token: tokenPreview,
          data: config.data,
        },
      );
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  },
);

/**
 * Response Interceptor
 * Handles responses and errors globally
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (__DEV__) {
      console.log('📥 API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Log error in development
    if (__DEV__) {
      const status = error.response?.status;
      const url = error.config?.url;
      const method = error.config?.method?.toUpperCase();

      if (status === 403) {
        console.error(`🚫 [403 FORBIDDEN] ${method} ${url}`, {
          message: (error.response?.data as any)?.message || error.message,
          data: error.response?.data,
        });
      } else {
        console.error(`❌ [${status}] ${method} ${url}`, {
          message: error.message,
          data: error.response?.data,
        });
      }
    }

    // Handle 403 Forbidden Guard (Role mismatch / Token invalid)
    if (error.response && error.response.status === 403) {
      const url = error.config?.url || '';

      // Ignore 403 on auth public endpoints or cleanup endpoints to prevent recursive loops
      const isAuthOrCleanupEndpoint =
        url.includes('/public/auth/') ||
        url.includes('/fcm-token') ||
        url.includes('/logout');

      const { isAuthenticated } = useAuthStore.getState();
      const body = (error.response.data as any) || {};

      // The server now says which kind of 403 this is, so stop guessing from
      // the message text.
      //
      // KYC_PENDING is the state EVERY partner is in between registering and
      // an admin approving their documents — the backend suspends the account
      // until then. It is not a rejection, and signing them out of the flow
      // they are halfway through is the worst possible response. The KYC and
      // profile endpoints stay open for exactly this reason; everything else
      // answers KYC_PENDING and the app leaves the session alone.
      if (body.code === 'KYC_PENDING') {
        return Promise.reject(error);
      }

      // An explicit forceLogout is the server ending the session: a real
      // suspension, a termination. Honour it rather than waiting for the
      // message to happen to match one of the strings below.
      if (body.forceLogout === true && isAuthenticated) {
        await useAuthStore.getState().logout();
        Alert.alert(
          'Signed out',
          body.message || 'Your account is no longer active. Please contact support.',
        );
        return Promise.reject(error);
      }

      if (!isAuthOrCleanupEndpoint && isAuthenticated) {
        const message = body.message || '';
        if (
          message.includes('Required role') ||
          message.includes('Access denied') ||
          message.includes('Forbidden') ||
          !message
        ) {
          // 1. Clear Auth Store state first (switches app to Login screen & halts requests)
          await useAuthStore.getState().logout();

          // 2. Purana token clear karein
          await AsyncStorage.multiRemove([
            'accessToken',
            'refreshToken',
            'user',
            '@dshino_access_token',
            '@dshino_refresh_token',
            '@dshino_user',
          ]);

          // 3. User ko Alert dikhayein
          Alert.alert(
            'Access Denied',
            'This account does not have Partner permissions. Please login with a Partner account.',
          );
        }
      }
    }

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Don't refresh for the auth endpoints themselves, or for the logout
      // cleanup calls — those run while logging out, and refreshing on their
      // behalf would call logout again.
      const url = originalRequest.url || '';
      if (
        url.includes('/public/auth/') ||
        url.includes('/fcm-token') ||
        url.includes('/logout')
      ) {
        return Promise.reject(error);
      }

      try {
        const accessToken = await refreshAccessToken();

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        await useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    return Promise.reject(error);
  },
);

/**
 * Helper function to replace URL parameters
 * Example: replaceUrlParams('/bookings/:id', {id: '123'}) => '/bookings/123'
 */
export const replaceUrlParams = (
  url: string,
  params: Record<string, string | number>,
): string => {
  let replacedUrl = url;
  Object.keys(params).forEach(key => {
    replacedUrl = replacedUrl.replace(`:${key}`, String(params[key]));
  });
  return replacedUrl;
};

/**
 * API Error Response Type
 */
export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

/**
 * API Success Response Type
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export default apiClient;
