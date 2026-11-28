/**
 * Notification navigation.
 *
 * One place that decides where a notification takes the partner, used by the
 * push handler, the in-app modal, the dashboard list and the notification
 * list. Routing by `data.type` is what stops a cancellation from opening the
 * Jobs tab, which reads the *active* booking and would show "No Active Job".
 */

import {navigate} from '../../navigation/navigationRef';
import {getNotificationPresentation} from './inAppNotificationManager';

export interface NotificationTarget {
  type?: string;
  bookingId?: string;
  /** Support notifications carry the thread to open. */
  ticketId?: string;
  subject?: string;
}

/**
 * Whether this notification has somewhere to go. Callers use it to decide if a
 * card should look tappable at all.
 *
 * @param target.type - `data.type` from the notification payload
 * @param target.bookingId - `data.bookingId`, when the notification has one
 */
export const isNotificationActionable = ({type, bookingId}: NotificationTarget): boolean => {
  const {action} = getNotificationPresentation(type);
  if (action === 'NONE') return false;
  // Booking screens need an id; without one there is nothing to open.
  if (action === 'BOOKING_DETAILS') return Boolean(bookingId);
  return true;
};

/**
 * Navigates to the screen that can show this notification.
 *
 * @returns true when navigation happened, false when there is no destination
 *   and the caller should show the notification body instead.
 */
export const navigateForNotification = ({
  type,
  bookingId,
  ticketId,
  subject,
}: NotificationTarget): boolean => {
  const {action} = getNotificationPresentation(type);

  switch (action) {
    case 'ACTIVE_JOB':
      navigate('MainTabs' as any, {
        screen: 'Jobs',
        params: bookingId ? {bookingId} : undefined,
      } as any);
      return true;

    case 'BOOKING_DETAILS':
      // A cancelled booking is no longer the active job, so it opens from
      // history rather than the Jobs tab.
      if (!bookingId) return false;
      navigate('BookingDetails' as any, {bookingId} as any);
      return true;

    case 'EARNINGS':
      navigate('MainTabs' as any, {screen: 'Earnings'} as any);
      return true;

    case 'SUPPORT_TICKET':
      // Without an id there is no thread to open, so fall back to the list.
      if (ticketId) {
        navigate('TicketDetails' as any, {ticketId, subject: subject || 'Support ticket'} as any);
      } else {
        navigate('SupportTickets' as any);
      }
      return true;

    case 'NONE':
      return false;
  }
};
