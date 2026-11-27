/**
 * Profile API Service
 * Handles all profile-related API calls
 */

import apiClient, {ApiResponse} from './client';
import {API_ENDPOINTS} from '../../constants/api.constants';
import {
  PartnerProfile,
  ChangePasswordRequest,
  DeactivateAccountRequest,
  PerformanceTrendData,
} from '../../types/api.types';

/**
 * Get partner profile
 */
export const getProfile = async (): Promise<PartnerProfile> => {
  const response = await apiClient.get<ApiResponse<PartnerProfile>>(
    API_ENDPOINTS.PROFILE,
  );
  return response.data.data;
};

/**
 * Update partner profile
 */
export interface UpdateProfileData {
  name?: string;
  email?: string;
  phone?: string;
  bio?: string;
}

export const updateProfile = async (
  data: UpdateProfileData,
): Promise<PartnerProfile> => {
  const response = await apiClient.patch<ApiResponse<PartnerProfile>>(
    API_ENDPOINTS.UPDATE_PROFILE,
    data,
  );
  return response.data.data;
};

/**
 * Upload profile image
 */
export const uploadProfileImage = async (
  imageUri: string,
): Promise<PartnerProfile> => {
  const formData = new FormData();
  formData.append('avatar', {
    uri: imageUri,
    type: 'image/jpeg',
    name: `profile_${Date.now()}.jpg`,
  } as any);

  const response = await apiClient.patch<ApiResponse<PartnerProfile>>(
    API_ENDPOINTS.UPLOAD_AVATAR,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return response.data.data;
};

/**
 * Change account password
 */
export const changePassword = async (
  data: ChangePasswordRequest,
): Promise<void> => {
  await apiClient.post<ApiResponse<void>>(
    API_ENDPOINTS.CHANGE_PASSWORD,
    data,
  );
};

/**
 * Deactivate account
 */
export const deactivateAccount = async (
  data: DeactivateAccountRequest,
): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>(
    API_ENDPOINTS.DEACTIVATE_ACCOUNT,
    {
      data,
    },
  );
};

/**
 * Get profile performance analytics
 */
export const getProfilePerformance = async (): Promise<PerformanceTrendData[]> => {
  const response = await apiClient.get<ApiResponse<PerformanceTrendData[]>>(
    API_ENDPOINTS.PROFILE_PERFORMANCE,
  );
  return response.data.data;
};
