/**
 * CMS API Service
 * Handles fetching CMS static pages like terms & conditions, privacy policies, etc.
 */

import apiClient, {ApiResponse} from './client';
import {API_ENDPOINTS, replaceUrlParams} from '../../constants/api.constants';

export interface CmsPageResponse {
  id: string;
  title: string;
  slug: string;
  content: string;
  isActive: boolean;
}

/**
 * Get CMS page content by slug
 */
export const getCmsPage = async (slug: string): Promise<CmsPageResponse> => {
  const url = replaceUrlParams(API_ENDPOINTS.CMS_PAGE, {slug});
  const response = await apiClient.get<ApiResponse<CmsPageResponse>>(url);
  return response.data.data;
};
