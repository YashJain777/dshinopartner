/**
 * Settings API Service
 * Handles all configurations, notifications settings, and FCM device tokens
 */

import apiClient, {ApiResponse} from './client';
import {API_ENDPOINTS} from '../../constants/api.constants';
import {RegisterFCMRequest, RemoveFCMRequest, Settings, UpdateSettingsRequest} from '../../types/api.types';

/**
 * Get notification and language settings
 */
export const getSettings = async (): Promise<Settings> => {
  const response = await apiClient.get<ApiResponse<Settings>>(
    API_ENDPOINTS.SETTINGS,
  );
  return response.data.data;
};

/**
 * Update notification and language settings
 */
export const updateSettings = async (
  data: UpdateSettingsRequest,
): Promise<Settings> => {
  const response = await apiClient.patch<ApiResponse<Settings>>(
    API_ENDPOINTS.UPDATE_SETTINGS,
    data,
  );
  return response.data.data;
};

/**
 * Register FCM device token
 */
export const registerFcmToken = async (
  data: RegisterFCMRequest,
): Promise<{deviceId: string; registered: boolean; message: string}> => {
  const response = await apiClient.post<ApiResponse<{deviceId: string; registered: boolean; message: string}>>(
    API_ENDPOINTS.REGISTER_FCM,
    data,
  );
  return response.data.data;
};

/**
 * Remove FCM device token (logout)
 */
export const removeFcmToken = async (
  data: RemoveFCMRequest,
): Promise<{deviceId: string; message: string}> => {
  try {
    const response = await apiClient.delete<ApiResponse<{deviceId: string; message: string}>>(
      API_ENDPOINTS.REMOVE_FCM,
      {
        data, // Axios DELETE requests require body inside the config.data property
      },
    );
    return response.data?.data || { deviceId: data.deviceId, message: 'FCM token removed' };
  } catch (error: any) {
    console.warn('[removeFcmToken] Silently ignoring error during FCM token removal:', error?.message);
    return { deviceId: data.deviceId, message: 'FCM token removal skipped or failed' };
  }
};
