/**
 * In-App Notification Manager
 * Global event listener for showing custom designed in-app push notifications
 */

export interface InAppNotificationConfig {
  title: string;
  body: string;
  bookingId?: string;
  type?: string;
}

/** Where the notification's primary button takes the partner. */
export type InAppAction = 'ACTIVE_JOB' | 'BOOKING_DETAILS' | 'EARNINGS' | 'NONE';

export interface NotificationPresentation {
  emoji: string;
  /** MaterialCommunityIcons name, for the notification list cards. */
  icon: string;
  tag: string;
  /** Accent bar / tag colour. */
  accent: string;
  action: InAppAction;
  actionLabel: string;
  fallbackTitle: string;
  fallbackBody: string;
}

const ASSIGNMENT: NotificationPresentation = {
  emoji: '🛠️',
  icon: 'car-wrench',
  tag: 'NEW ASSIGNMENT',
  accent: '#FF6B00',
  action: 'ACTIVE_JOB',
  actionLabel: 'View Job Details',
  fallbackTitle: 'New Job Assigned',
  fallbackBody: 'You have been assigned a new job. Tap below to review it.',
};

/**
 * Presentation per push type. Without this every notification rendered as a new
 * assignment — so a cancellation arrived tagged "NEW ASSIGNMENT" with a button
 * that opened an empty Jobs tab.
 *
 * Types come from the backend's notification service.
 */
const PRESENTATION: Record<string, NotificationPresentation> = {
  FSM_JOB_ASSIGNED: ASSIGNMENT,
  NEW_JOB_ASSIGNMENT: ASSIGNMENT,

  JOB_CANCELLED: {
    emoji: '❌',
    icon: 'calendar-remove',
    tag: 'BOOKING CANCELLED',
    accent: '#DC2626',
    action: 'BOOKING_DETAILS',
    actionLabel: 'View Details',
    fallbackTitle: 'Booking Cancelled',
    fallbackBody: 'This booking was cancelled. Do not travel to the customer.',
  },

  JOB_REASSIGNED: {
    emoji: '🔄',
    icon: 'account-switch',
    tag: 'REASSIGNED',
    accent: '#D97706',
    action: 'NONE',
    actionLabel: '',
    fallbackTitle: 'Booking Reassigned',
    fallbackBody: 'This booking is no longer assigned to you.',
  },

  // The booking moved slot and left this partner's schedule, so there is
  // nothing of theirs left to open.
  JOB_RESCHEDULED: {
    emoji: '📅',
    icon: 'calendar-sync',
    tag: 'RESCHEDULED',
    accent: '#D97706',
    action: 'NONE',
    actionLabel: '',
    fallbackTitle: 'Booking Rescheduled',
    fallbackBody: 'This booking moved to a new slot and is no longer on your schedule.',
  },

  // The slot was missed and the job is closed; the booking details endpoint no
  // longer returns it to this partner.
  JOB_SLA_BREACHED: {
    emoji: '⏰',
    icon: 'clock-alert-outline',
    tag: 'SLOT MISSED',
    accent: '#DC2626',
    action: 'NONE',
    actionLabel: '',
    fallbackTitle: 'Slot Missed',
    fallbackBody: 'This job was not completed in its slot and has been closed.',
  },

  // The slot has not started yet, so the partner opens the job to set off.
  JOB_REMINDER: {
    emoji: '⏳',
    icon: 'bell-ring-outline',
    tag: 'STARTING SOON',
    accent: '#FF6B00',
    action: 'ACTIVE_JOB',
    actionLabel: 'Open Job',
    fallbackTitle: 'Job Starting Soon',
    fallbackBody: 'Your next job starts shortly. Tap to review it.',
  },

  // Still the partner's active job, so it opens where they can act on it.
  JOB_RUNNING_LATE: {
    emoji: '⏱️',
    icon: 'clock-fast',
    tag: 'RUNNING LATE',
    accent: '#D97706',
    action: 'ACTIVE_JOB',
    actionLabel: 'Open Job',
    fallbackTitle: 'Running Late',
    fallbackBody: 'This job is past its slot. Mark Arrived as soon as you reach.',
  },

  WALLET_UPDATE: {
    emoji: '💰',
    icon: 'wallet-outline',
    tag: 'WALLET',
    accent: '#059669',
    action: 'EARNINGS',
    actionLabel: 'View Earnings',
    fallbackTitle: 'Wallet Updated',
    fallbackBody: 'Your wallet balance has changed.',
  },

  SOS_ALERT: {
    emoji: '🚨',
    icon: 'alert-octagon-outline',
    tag: 'EMERGENCY',
    accent: '#DC2626',
    action: 'NONE',
    actionLabel: '',
    fallbackTitle: 'Emergency Alert',
    fallbackBody: 'An emergency alert was raised.',
  },
};

// The backend sends 'WALLET' from notification.helper and 'WALLET_UPDATE'
// from payment.service; both mean the same thing to the partner.
PRESENTATION.WALLET = PRESENTATION.WALLET_UPDATE;

const GENERIC: NotificationPresentation = {
  emoji: '🔔',
  icon: 'bell-outline',
  tag: 'NOTIFICATION',
  accent: '#0F172A',
  action: 'NONE',
  actionLabel: '',
  fallbackTitle: 'Notification',
  fallbackBody: 'You have a new notification.',
};

/**
 * Resolves how a notification should be presented.
 * An unknown type renders as a plain notification rather than guessing.
 *
 * @param type - `data.type` from the FCM payload
 */
export const getNotificationPresentation = (
  type?: string,
): NotificationPresentation => (type && PRESENTATION[type]) || GENERIC;

type NotificationListener = (config: InAppNotificationConfig) => void;

let listeners: NotificationListener[] = [];

/**
 * Trigger custom in-app notification popup
 */
export const showInAppNotification = (config: InAppNotificationConfig) => {
  listeners.forEach(listener => listener(config));
};

/**
 * Subscribe to custom in-app notifications
 */
export const subscribeInAppNotification = (listener: NotificationListener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};
