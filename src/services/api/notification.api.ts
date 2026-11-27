/**
 * Notification API Service
 * Handles all notification-related API calls
 */

import apiClient, {ApiResponse, replaceUrlParams} from './client';
import {API_ENDPOINTS} from '../../constants/api.constants';
import {Notification, UnreadCountResponse} from '../../types/api.types';
import {logger} from '../../utils/logger';

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
}

/**
 * Get notifications with pagination (safely extracts array across different response wrapper shapes)
 */
export const getNotifications = async (
  params: GetNotificationsParams = {},
): Promise<Notification[]> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS, {params});
    const resData = response?.data;
    const data = resData?.data;

    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.notifications)) {
      return data.notifications;
    }
    if (Array.isArray(data?.data)) {
      return data.data;
    }
    if (Array.isArray(data?.items)) {
      return data.items;
    }
    if (Array.isArray(resData?.notifications)) {
      return resData.notifications;
    }
    if (Array.isArray(resData)) {
      return resData;
    }
    return [];
  } catch (error) {
    logger.error('[Notification API] Fetch failed', error);
    return [];
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (): Promise<number> => {
  try {
    const response = await apiClient.get<ApiResponse<UnreadCountResponse | number>>(
      API_ENDPOINTS.UNREAD_COUNT,
    );
    const data = response?.data?.data;
    if (typeof data === 'number') {
      return data;
    }
    if (typeof (data as any)?.unreadCount === 'number') {
      return (data as any).unreadCount;
    }
    return 0;
  } catch (error) {
    logger.error('[Notification API] Unread count failed', error);
    return 0;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (
  notificationId: string,
): Promise<void> => {
  const url = replaceUrlParams(API_ENDPOINTS.MARK_READ, {id: notificationId});
  await apiClient.patch(url);
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<void> => {
  await apiClient.post(API_ENDPOINTS.MARK_ALL_READ);
};
