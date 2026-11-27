/**
 * App Config API
 * Startup gate: minimum supported version and maintenance mode.
 * Public endpoint — no auth, safe to call before login.
 */

import {Platform} from 'react-native';
import apiClient, {ApiResponse} from './client';
import {API_ENDPOINTS} from '../../constants/api.constants';
import {APP_VERSION} from '../../constants/app.constants';

export interface AppConfig {
  minVersion: string | null;
  /** Admin force-update switch, OR'd with updateRequired by the backend. */
  forceUpdate: boolean;
  /** True when this build is below minVersion. */
  updateRequired: boolean;
  storeUrl: string | null;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
}

/**
 * Fetches the startup config for this platform and build.
 * The backend does the version comparison, so the app only reports what it is.
 */
export const getAppConfig = async (): Promise<AppConfig> => {
  const response = await apiClient.get<ApiResponse<AppConfig>>(
    API_ENDPOINTS.APP_CONFIG,
    {params: {platform: Platform.OS, version: APP_VERSION}},
  );
  return response.data.data;
};
