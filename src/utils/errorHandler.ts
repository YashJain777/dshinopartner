import {ApiError} from '../types/api.types';
import {logger} from './logger';

export const handleApiError = (error: any): string => {
  logger.error('API Error:', error);

  if (error.response) {
    const apiError = error.response.data as ApiError;
    return apiError.message || 'Something went wrong';
  }

  if (error.request) {
    return 'Network error. Please check your connection';
  }

  return error.message || 'An unexpected error occurred';
};

export const showErrorToast = (message: string) => {
  // Integrate with your toast library (react-native-toast-message, etc.)
  logger.error('Toast:', message);
};
