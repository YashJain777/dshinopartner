/**
 * API Constants
 * Centralized API configuration for Dshino Partner App
 *
 * All PRIVATE endpoints require: Authorization: Bearer <jwt_token>
 */

import {NativeModules} from 'react-native';

const REMOTE_BASE_URL = 'https://dshinoback.idea2reality.tech/v1';

/** Port the backend listens on locally (dshino_back_node/.env PORT). */
const LOCAL_BACKEND_PORT = 5000;

/**
 * Point debug builds at a backend running on the development machine.
 * Flip to false to test a debug build against the deployed backend.
 * Release builds always use REMOTE_BASE_URL, so this cannot reach production.
 */
const USE_LOCAL_BACKEND_IN_DEV = true;

/**
 * Development machine's host, for when it cannot be detected automatically.
 *
 * Leave null for a Metro-served build — the IP is then read off the bundle URL
 * and keeps working when Wi-Fi hands out a different address. Set it when the
 * build was not served by Metro (a bundled debug APK, i.e. `npm run
 * debugbuild`), for example '192.168.1.37', or to 'localhost' when the port is
 * forwarded with `adb reverse tcp:5000 tcp:5000`.
 */
const LOCAL_BACKEND_HOST: string | null = null;

/**
 * URL of the running JS bundle, e.g. http://192.168.1.37:8081/index.bundle
 * when served by Metro, or a file:// path in a bundled build.
 *
 * @returns The bundle URL, or undefined outside the React Native runtime.
 */
const getScriptURL = (): string | undefined =>
  NativeModules.SourceCode?.scriptURL;

/**
 * Host serving the JS bundle, i.e. the development machine.
 *
 * Read from Metro's bundle URL so the IP never has to be hardcoded — it keeps
 * working when the Wi-Fi network hands out a different address. Note that a
 * literal 127.0.0.1 would mean the phone itself, not the dev machine, which is
 * why the host cannot simply be assumed.
 *
 * @returns Hostname or IP, or null when the bundle was not served over HTTP.
 */
const getDevServerHost = (scriptURL?: string): string | null => {
  const match = scriptURL?.match(/^https?:\/\/([^/:]+)/);
  return match ? match[1] : null;
};

const resolveBaseUrl = (): string => {
  if (!__DEV__ || !USE_LOCAL_BACKEND_IN_DEV) {
    return REMOTE_BASE_URL;
  }

  const scriptURL = getScriptURL();
  const host = LOCAL_BACKEND_HOST || getDevServerHost(scriptURL);
  if (host) {
    return `http://${host}:${LOCAL_BACKEND_PORT}/v1`;
  }

  // Dropping back to the deployed backend without a word is how a run meant to
  // be local ends up writing to live data, so this has to be impossible to
  // miss. No bundle URL at all means no app is running — Jest imports this
  // module too — and there is nothing to warn anybody about.
  if (scriptURL) {
    console.error(
      '[API] Local backend selected but the development machine could not be ' +
        'detected, so this build is using the LIVE backend. Set ' +
        'LOCAL_BACKEND_HOST in src/constants/api.constants.ts.',
    );
  }
  return REMOTE_BASE_URL;
};

const BASE_URL = resolveBaseUrl();

if (__DEV__) {
  // Which backend this build is talking to. Stripped from release builds.
  const target = BASE_URL === REMOTE_BASE_URL ? 'LIVE' : 'LOCAL';
  console.log(`[API] ${target} backend — BASE_URL = ${BASE_URL}`);
}

export const API_CONFIG = {
  BASE_URL,
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  LOCATION_UPDATE_INTERVAL: 45000, // 45 seconds
  ACTIVE_BOOKING_POLL_INTERVAL: 30000, // 30 seconds
} as const;

export const API_ENDPOINTS = {
  // ========== PUBLIC - App Init ==========
  APP_CONFIG: '/public/app-config',
  MAINTENANCE_STATUS: '/public/app-config/maintenance',
  CMS_PAGE: '/public/cms/:slug',
  
  // ========== PUBLIC - Auth ==========
  SEND_OTP: '/public/auth/send-otp',
  VERIFY_OTP: '/public/auth/verify-otp',
  REGISTER_PARTNER: '/public/auth/register/partner',
  LOGIN: '/public/auth/login',
  LOGOUT: '/private/partner/auth/logout',
  REFRESH_TOKEN: '/public/auth/refresh-token',
  FORGOT_PASSWORD: '/public/auth/forgot-password',
  RESET_PASSWORD: '/public/auth/reset-password',
  VERIFY_MFA: '/public/auth/verify-mfa',
  
  // ========== PRIVATE - Home (Launch Screen) ==========
  HOME: '/private/partner/home',
  
  // ========== PRIVATE - Profile ==========
  PROFILE: '/private/partner/profile',
  UPDATE_PROFILE: '/private/partner/profile',
  UPLOAD_AVATAR: '/private/partner/profile/avatar',
  CHANGE_PASSWORD: '/private/partner/profile/change-password',
  PROFILE_PERFORMANCE: '/private/partner/profile/performance',
  DEACTIVATE_ACCOUNT: '/private/partner/profile/account',
  
  // ========== PRIVATE - Bookings ==========
  BOOKINGS: '/private/partner/bookings',
  ACTIVE_BOOKING: '/private/partner/bookings/active',
  BOOKING_DETAILS: '/private/partner/bookings/:id',
  ACKNOWLEDGE_BOOKING: '/private/partner/bookings/:bookingId/acknowledge',
  UPDATE_BOOKING_STATUS: '/private/partner/bookings/:bookingId/status',
  ARRIVE_BOOKING: '/private/partner/bookings/:id/arrive',
  RAISE_BOOKING_ISSUE: '/private/partner/bookings/:id/raise-issue',
  UPLOAD_BOOKING_PHOTOS: '/private/partner/bookings/:id/photos',
  COMPLETE_BOOKING: '/private/partner/bookings/:bookingId/complete',
  SOS_EMERGENCY: '/private/partner/bookings/sos',
  
  // ========== PRIVATE - Attendance ==========
  CHECK_IN: '/private/partner/attendance/check-in',
  CHECK_OUT: '/private/partner/attendance/check-out',
  ATTENDANCE_RECORDS: '/private/partner/attendance',
  ATTENDANCE_SUMMARY: '/private/partner/attendance/summary',
  ATTENDANCE_TODAY: '/private/partner/attendance/today',
  ATTENDANCE_BREAK: '/private/partner/attendance/break',
  
  // ========== PRIVATE - Availability ==========
  TOGGLE_AVAILABILITY: '/private/partner/availability',
  UPDATE_LOCATION: '/private/partner/location',
  SYNC_LOCATION: '/private/partner/location/sync',
  
  // ========== PRIVATE - Leaves & Schedule ==========
  APPLY_LEAVE: '/private/partner/leaves',
  GET_LEAVES: '/private/partner/leaves',
  FULL_SCHEDULE: '/private/partner/schedule',
  TODAY_SCHEDULE: '/private/partner/schedule/today',
  LEAVE_CALENDAR: '/private/partner/schedule/leaves/calendar',
  CANCEL_LEAVE: '/private/partner/schedule/leaves/:id',
  
  // ========== PRIVATE - Wallet ==========
  WALLET_BALANCE: '/private/partner/wallet/balance',
  WALLET_TRANSACTIONS: '/private/partner/wallet/transactions',
  REQUEST_WITHDRAWAL: '/private/partner/wallet/withdraw',
  REQUEST_PAYOUT: '/private/partner/wallet/payout-request',
  WITHDRAWAL_HISTORY: '/private/partner/wallet/withdrawals',
  
  // ========== PRIVATE - Earnings ==========
  EARNINGS_SUMMARY: '/private/partner/earnings/summary',
  
  // ========== PRIVATE - Analytics ==========
  ANALYTICS_DASHBOARD: '/private/partner/analytics/dashboard',
  EARNINGS_CHART: '/private/partner/analytics/earnings-chart',
  PERFORMANCE_TRENDS: '/private/partner/analytics/performance-trends',
  
  // ========== PRIVATE - KYC ==========
  KYC_STATUS: '/private/partner/kyc/status',
  SUBMIT_KYC_DETAILS: '/private/partner/kyc/details',
  UPLOAD_KYC_DOCUMENT: '/private/partner/kyc/documents',
  
  // ========== PRIVATE - Reviews ==========
  REVIEWS: '/private/partner/reviews',
  REVIEW_SUMMARY: '/private/partner/reviews/summary',
  
  // ========== PRIVATE - Notifications ==========
  NOTIFICATIONS: '/private/partner/notifications',
  UNREAD_COUNT: '/private/partner/notifications/unread-count',
  MARK_READ: '/private/partner/notifications/:id/read',
  MARK_ALL_READ: '/private/partner/notifications/mark-all-read',
  
  // ========== PRIVATE - Referrals ==========
  REFERRALS: '/private/partner/referrals',
  REFERRAL_STATS: '/private/partner/referrals/stats',
  
  // ========== PRIVATE - Support ==========
  CREATE_TICKET: '/private/partner/support',
  GET_TICKETS: '/private/partner/support',
  GET_TICKET: '/private/partner/support/:id',
  REPLY_TICKET: '/private/partner/support/:id/reply',
  
  // ========== PRIVATE - Settings ==========
  SETTINGS: '/private/partner/settings',
  UPDATE_SETTINGS: '/private/partner/settings',
  REGISTER_FCM: '/private/partner/settings/fcm-token',
  REMOVE_FCM: '/private/partner/settings/fcm-token',
  
  // ========== PRIVATE - Inventory ==========
  INVENTORY: '/private/partner/inventory',
  
  // ========== PRIVATE - Slots ==========
  TODAY_SLOTS: '/private/partner/slots/today',
  
  // ========== PUBLIC - Vehicle & Services ==========
  VEHICLE_HIERARCHY: '/public/vehicle-hierarchy',
  SERVICE_CATALOGUE: '/public/services',
  SERVICES_BY_VARIANT: '/public/services/by-variant',
} as const;

/**
 * OTP Types
 */
export const OTP_TYPES = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  BOOKING_COMPLETION: 'booking_completion',
} as const;

/**
 * Booking Status — mirrors the Bookings.status enum on the backend exactly.
 *
 * Partner-visible transitions:
 *   PARTNER_ASSIGNED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED
 * The backend also permits forward skips up to IN_PROGRESS, which is what this
 * app uses today when the partner taps Start Service directly.
 */
export const BOOKING_STATUS = {
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PLACED: 'PLACED',
  CONFIRMED: 'CONFIRMED',
  AWAITING_ASSIGNMENT: 'AWAITING_ASSIGNMENT',
  PARTNER_ASSIGNED: 'PARTNER_ASSIGNED', // Assigned to this partner, not started
  EN_ROUTE: 'EN_ROUTE', // Partner is on the way
  ON_THE_WAY: 'ON_THE_WAY', // Legacy alias the backend normalises to EN_ROUTE
  ARRIVED: 'ARRIVED', // Partner has arrived at location
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  REVIEWED: 'REVIEWED',
  CANCELLED: 'CANCELLED',
  SLA_BREACHED: 'SLA_BREACHED', // Slot passed unserved — shown as "Running behind"
} as const;

export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];

/**
 * Partner-facing label per status. Without this the raw database string
 * (e.g. "PARTNER_ASSIGNED") ends up on screen.
 */
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PAYMENT_PENDING: 'Awaiting Payment',
  PLACED: 'Booking Placed',
  CONFIRMED: 'Confirmed',
  AWAITING_ASSIGNMENT: 'Awaiting Assignment',
  PARTNER_ASSIGNED: 'Assigned',
  EN_ROUTE: 'On the Way',
  ON_THE_WAY: 'On the Way',
  ARRIVED: 'Arrived',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  REVIEWED: 'Completed',
  CANCELLED: 'Cancelled',
  SLA_BREACHED: 'Running Behind',
};

/**
 * Statuses the active-job workflow treats as "assigned but not yet started".
 */
export const PRE_SERVICE_STATUSES: BookingStatus[] = [
  'PARTNER_ASSIGNED',
  'EN_ROUTE',
  'ON_THE_WAY',
  'ARRIVED',
];

/** Statuses with no further partner action. */
export const TERMINAL_STATUSES: BookingStatus[] = [
  'COMPLETED',
  'REVIEWED',
  'CANCELLED',
];

/**
 * Badge tone per status, so a cancellation never reads as a normal outcome.
 * Matches the tone names in theme/jobStatus.
 */
export const BOOKING_STATUS_TONES: Record<
  BookingStatus,
  'neutral' | 'success' | 'danger' | 'warning'
> = {
  PAYMENT_PENDING: 'warning',
  PLACED: 'neutral',
  CONFIRMED: 'neutral',
  AWAITING_ASSIGNMENT: 'warning',
  PARTNER_ASSIGNED: 'neutral',
  EN_ROUTE: 'neutral',
  ON_THE_WAY: 'neutral',
  ARRIVED: 'neutral',
  IN_PROGRESS: 'neutral',
  COMPLETED: 'success',
  REVIEWED: 'success',
  CANCELLED: 'danger',
  SLA_BREACHED: 'danger',
};

/**
 * Booking Issue Types
 */
export const BOOKING_ISSUE_TYPES = {
  CUSTOMER_ABSENT: 'CUSTOMER_ABSENT',
  VEHICLE_NOT_ACCESSIBLE: 'VEHICLE_NOT_ACCESSIBLE',
  SAFETY_CONCERN: 'SAFETY_CONCERN',
  EQUIPMENT_FAILURE: 'EQUIPMENT_FAILURE',
  WRONG_ADDRESS: 'WRONG_ADDRESS',
  CUSTOMER_HOSTILE: 'CUSTOMER_HOSTILE',
  OTHER: 'OTHER',
} as const;

export type BookingIssueTypeKey = keyof typeof BOOKING_ISSUE_TYPES;

/** What the partner taps, and the icon for each. */
export const BOOKING_ISSUE_OPTIONS: {
  type: BookingIssueTypeKey;
  label: string;
  icon: string;
}[] = [
  {type: 'CUSTOMER_ABSENT', label: 'Customer not available', icon: 'account-off-outline'},
  {type: 'VEHICLE_NOT_ACCESSIBLE', label: 'Vehicle not accessible', icon: 'car-off'},
  {type: 'WRONG_ADDRESS', label: 'Address is wrong', icon: 'map-marker-alert-outline'},
  {type: 'EQUIPMENT_FAILURE', label: 'Equipment problem', icon: 'tools'},
  {type: 'SAFETY_CONCERN', label: 'Unsafe location', icon: 'shield-alert-outline'},
  {type: 'CUSTOMER_HOSTILE', label: 'Customer behaviour', icon: 'account-alert-outline'},
  {type: 'OTHER', label: 'Something else', icon: 'dots-horizontal-circle-outline'},
];

/** Server rejects a shorter note. */
export const ISSUE_DESCRIPTION_MIN_LENGTH = 10;

/**
 * KYC Status
 */
export const KYC_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;

/**
 * Document Types for KYC
 * Note: Backend only accepts IMAGES (JPG/PNG), max 10MB. PDFs are rejected.
 */
export const DOCUMENT_TYPES = {
  AADHAAR_FRONT: 'AADHAAR_FRONT',
  AADHAAR_BACK: 'AADHAAR_BACK',
  PAN: 'PAN',
  SELFIE: 'SELFIE',
  BANK_PASSBOOK: 'BANK_PASSBOOK',
  ADDRESS_PROOF: 'ADDRESS_PROOF',
  DRIVING_LICENSE: 'DRIVING_LICENSE',
} as const;

/**
 * Photo Types for Booking
 */
export const PHOTO_TYPES = {
  BEFORE: 'before',
  AFTER: 'after',
} as const;

/**
 * Platform Types for FCM
 */
export const PLATFORM_TYPES = {
  IOS: 'ios',
  ANDROID: 'android',
  WEB: 'web',
} as const;

/**
 * Language Preferences
 */
export const LANGUAGE_CODES = {
  ENGLISH: 'en',
  HINDI: 'hi',
  SPANISH: 'es',
  FRENCH: 'fr',
} as const;

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Helper to replace URL params
 * Example: replaceUrlParams('/bookings/:id/status', { id: '123' })
 * Returns: '/bookings/123/status'
 */
export const replaceUrlParams = (
  endpoint: string,
  params: Record<string, string | number>
): string => {
  let result = endpoint;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`:${key}`, String(value));
  });
  return result;
};
