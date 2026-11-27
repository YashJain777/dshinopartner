/**
 * Availability API Service
 * Handles availability and location-related API calls
 */

import apiClient, {ApiResponse} from './client';
import {API_ENDPOINTS} from '../../constants/api.constants';
import {AvailabilityStatus, Breadcrumb, LocationUpdate} from '../../types/api.types';

/**
 * Toggle online/offline status
 */
export interface ToggleAvailabilityData {
  isOnline: boolean;
}

export const toggleAvailability = async (
  data: ToggleAvailabilityData,
): Promise<AvailabilityStatus> => {
  const response = await apiClient.patch<ApiResponse<AvailabilityStatus>>(
    API_ENDPOINTS.TOGGLE_AVAILABILITY,
    data,
  );
  return response.data.data;
};

/**
 * Update live location
 */
export const updateLocation = async (
  data: LocationUpdate,
): Promise<{success: boolean}> => {
  const response = await apiClient.patch<ApiResponse<{success: boolean}>>(
    API_ENDPOINTS.UPDATE_LOCATION,
    data,
  );
  return response.data.data;
};

/**
 * Replay fixes that failed to send live, so a drive through a dead zone still
 * leaves a complete trail for dispute resolution.
 */
export const syncLocations = async (
  breadcrumbs: Breadcrumb[],
): Promise<{success: boolean}> => {
  const response = await apiClient.post<ApiResponse<{success: boolean}>>(
    API_ENDPOINTS.SYNC_LOCATION,
    {breadcrumbs},
  );
  return response.data.data;
};
