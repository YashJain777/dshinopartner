/**
 * Reviews API Service
 * Handles all reviews and ratings-related API calls
 */

import apiClient, {ApiResponse} from './client';
import {API_ENDPOINTS} from '../../constants/api.constants';
import {ReviewSummaryResponse} from '../../types/api.types';

/**
 * Get review summary and statistics
 */
export const getReviewSummary = async (): Promise<ReviewSummaryResponse> => {
  const response = await apiClient.get<ApiResponse<ReviewSummaryResponse>>(
    API_ENDPOINTS.REVIEW_SUMMARY,
  );
  return response.data.data;
};
