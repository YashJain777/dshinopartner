/**
 * FCM Notification Payload Handler
 * Parses incoming notification payloads and triggers deep linking navigation
 */

import {navigate} from '../../navigation/navigationRef';
import {
  showInAppNotification,
  getNotificationPresentation,
} from './inAppNotificationManager';
import {navigateForNotification} from './notificationNavigation';
import {logger} from '../../utils/logger';

export interface FCMPayloadData {
  bookingId?: string;
  type?: string;
  [key: string]: any;
}

export interface RemoteMessagePayload {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: FCMPayloadData;
}

/**
 * Handle Notification Payload and perform navigation
 * Step 2: Task Assignment Notification Receive & Navigate
 */
export const handleNotificationPayload = (
  remoteMessage: RemoteMessagePayload | null,
  isForeground = false,
) => {
  if (!remoteMessage) return;

  const {notification, data} = remoteMessage;
  const bookingId = data?.bookingId;
  const notificationType = data?.type;
  // Support notifications carry the thread instead of a booking.
  const ticketId = data?.ticketId;
  const subject = data?.subject;

  logger.log('[NotificationHandler] type:', notificationType, 'foreground:', isForeground);

  if (!bookingId && !notification && !notificationType) return;

  const presentation = getNotificationPresentation(notificationType);

  if (isForeground) {
    // The modal reads the same presentation and renders the matching icon,
    // tag and action for this type.
    showInAppNotification({
      title: notification?.title || presentation.fallbackTitle,
      body: notification?.body || presentation.fallbackBody,
      bookingId,
      ticketId,
      subject,
      type: notificationType,
    });
    return;
  }

  // Background or cold-start tap: go straight to the screen that can show it,
  // or to the notification list when there is no specific destination.
  if (!navigateForNotification({type: notificationType, bookingId, ticketId, subject})) {
    navigate('Notifications' as any);
  }
};
