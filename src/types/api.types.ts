/**
 * API Response & Request Types
 * TypeScript interfaces for Dshino Partner App API
 * 
 * Generated from API Documentation - June 8, 2026
 */

// ========================================
// COMMON TYPES
// ========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface DateRangeParams {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export interface Location {
  lat: number;
  lng: number;
}

// ========================================
// AUTH TYPES
// ========================================

export interface SendOTPRequest {
  phone: string;
  otpType: 'login' | 'signup' | 'booking_completion';
}

export interface SendOTPResponse {
  expiresIn: number;
}

export interface LoginRequest {
  phone: string;
  otpCode: string;
}

export interface LoginResponse {
  user: Partner;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  access: {
    token: string;
    expires: string;
  };
  refresh: {
    token: string;
    expires: string;
  };
}

export interface LogoutRequest {
  deviceId?: string;
}

// ========================================
// USER/PARTNER TYPES
// ========================================

export type KYCStatus = 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'APPROVED';

export interface Partner {
  id: string;
  name: string;
  phone: string;
  email: string;
  profileImage?: string;
  isOnline: boolean;
  rating: number;
  totalJobs: number;
  kycStatus: KYCStatus;

  // KYC & Bank details
  bankAccountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  drivingLicenseNumber?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface DeactivateAccountRequest {
  password: string;
  reason?: string;
}

// ========================================
// HOME SCREEN TYPES
// ========================================

export interface HomeResponse {
  partner: {
    id: string;
    name: string;
    avatar?: string;
    rating: number;
  };
  activeBooking: Booking | null;
  todayStats: {
    jobsCompleted: number;
    earnings: number;
  };
  attendance: {
    checkedIn: boolean;
    checkInTime?: string;
  };
  unreadNotifications: number;
}

// ========================================
// BOOKING TYPES
// ========================================

// Single source of truth: BOOKING_STATUS mirrors the backend enum, so the
// union is derived from it rather than maintained separately here.
import type {BookingStatus} from '../constants/api.constants';

export type {BookingStatus};

/**
 * Where a booking sits against the admin's lateness policy. Decided by the
 * backend so the app never computes lateness itself.
 */
export type SlaState = 'ON_TIME' | 'RUNNING_LATE' | 'BREACHED';

export type BookingIssueType =
  | 'CUSTOMER_ABSENT'
  | 'VEHICLE_NOT_ACCESSIBLE'
  | 'SAFETY_CONCERN'
  | 'EQUIPMENT_FAILURE'
  | 'WRONG_ADDRESS'
  | 'CUSTOMER_HOSTILE'
  | 'OTHER';

export interface Booking {
  id: string;
  bookingId?: string; // some screens use bookingId
  bookingNumber?: string;
  status: BookingStatus;
  customer?: {
    name: string;
    phone: string;
    rating?: number;
  };
  customerName?: string; // compatibility
  customerPhone?: string; // compatibility
  vehicle?: {
    category?: string;
    subCategory?: string;
    variant?: string;
    registrationNumber?: string;
    make?: string;
    model?: string;
    color?: string;
  };
  vehicleDetails?: {
    make: string;
    model: string;
    number: string;
  };
  service?: {
    name: string;
    duration?: number;
  };
  services?: string[];
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
    lat?: number;
    lng?: number;
    area?: string;
    fullAddress?: string;
  } & any; // compatibility
  location?: Location;
  pricing?: {
    basePrice: number;
    tax: number;
    total: number;
    partnerEarning: number;
  };
  Customer?: {
    id: string;
    name: string;
    phone: string;
    profileImage?: string;
  };
  Address?: {
    id: string;
    addressLine1?: string;
    addressLine2?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
    lat?: string | number;
    lng?: string | number;
  };
  Service?: {
    id: string;
    name: string;
    description?: string;
    duration?: number;
    basePrice?: string | number;
    imageUrl?: string;
  };
  Vehicle?: {
    category?: string;
    subCategory?: string;
    variant?: string;
    registrationNumber?: string;
    make?: string;
    model?: string;
    color?: string;
    /** Associations returned by the partner booking-details endpoint. */
    Category?: {id: string; name: string};
    SubCategory?: {id: string; name: string};
  };
  Payments?: {
    id: string;
    amount: string | number;
    method?: string;
    status?: string;
    razorpayPaymentId?: string | null;
  }[];
  scheduledTimeSlot?: string;
  scheduledAt?: string;
  completedAt?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  beforePhotos?: string[];
  afterPhotos?: string[];
  evidence?: {
    url: string;
    type: string;
    uploadedAt?: string;
  }[];
  otp?: string;
  totalAmount?: string | number;
  discountAmount?: string | number;
  gstAmount?: string | number;
  netAmount?: string | number;
  /** Set when the partner tapped Arrived. */
  arrivedAt?: string | null;
  /** Status timestamps the booking row carries; used by the job timeline. */
  enRouteAt?: string | null;
  inProgressAt?: string | null;
  /**
   * Lateness verdict from the booking-details and active-booking endpoints.
   * Absent on the list endpoints, which do not evaluate the policy.
   */
  slaState?: SlaState;
  minutesLate?: number;
  /** Set once the customer has been told the booking is running behind. */
  lateNotifiedAt?: string | null;
  notes?: string | null;
  source?: string | null;
  /**
   * Resolved by the partner booking-details endpoint: the saved Address when
   * there is one, otherwise the booking's own GPS pin.
   */
  effectiveLocation?: {
    lat?: string | number | null;
    lng?: string | number | null;
    addressLine1?: string | null;
  };
  /** Set when status is CANCELLED. */
  cancellationReason?: string | null;
  cancellationReasonCode?: string | null;
  cancellationFee?: string | number | null;
  refundAmount?: string | number | null;
  rescheduleCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBookingStatusRequest {
  status: BookingStatus;
  otp?: string; // Required only when status = 'COMPLETED'
  lat?: number; // Geofence verification latitude
  lng?: number; // Geofence verification longitude
}

export interface RaiseBookingIssueRequest {
  issueType: BookingIssueType;
  description: string;
}

export interface CompleteBookingRequest {
  otp: string; // 4-digit numeric OTP
}

export interface UploadPhotosRequest {
  photos: File[];
  photoType?: 'before' | 'after';
}

// ========================================
// ATTENDANCE TYPES
// ========================================

export interface CheckInRequest {
  lat: number;
  lng: number;
}

export interface CheckOutRequest {
  lat: number;
  lng: number;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  totalHours?: number;
  checkInLocation: Location;
  checkOutLocation?: Location;
}

export interface AttendanceTodayResponse {
  checkedIn: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  totalHours?: number;
}

export interface AttendanceSummaryResponse {
  totalDaysWorked: number;
  totalHours: number;
  averageHoursPerDay: number;
  records: AttendanceRecord[];
}

// ========================================
// AVAILABILITY & LOCATION TYPES
// ========================================

export interface UpdateAvailabilityRequest {
  isOnline: boolean;
}

export interface UpdateLocationRequest {
  lat: number;
  lng: number;
  /** Metres of uncertainty reported by the device. */
  accuracy?: number;
  /** Degrees from true north. Omitted when the device is stationary. */
  bearing?: number;
  /** Metres per second. Omitted when the device is stationary. */
  speed?: number;
}

/**
 * A fix that could not be delivered live, replayed through
 * POST /partner/location/sync once the connection is back.
 */
export interface Breadcrumb extends UpdateLocationRequest {
  timestamp: string;
}

// ========================================
// WALLET & EARNINGS TYPES
// ========================================

export interface WalletBalanceResponse {
  balance: number;
  currency: string;
}

export type TransactionType = 'CREDIT' | 'DEBIT';

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  balance: number;
}

export interface WithdrawalRequest {
  amount: number;
  notes?: string;
}

export interface WithdrawalRecord {
  id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  requestDate: string;
  completedDate?: string;
  notes?: string;
}

export interface ServiceBreakdownItem {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  totalEarnings: number;
}

export interface EarningsSummaryResponse {
  /** Gross booking value completed in each window, not the partner's share. */
  today: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
  /** Completed bookings per window, so averages match the period on screen. */
  todayBookings: number;
  weekBookings: number;
  monthBookings: number;
  yearBookings: number;
  /** Lifetime completed bookings. */
  totalBookings: number;
  currency: string;
  serviceBreakdown?: ServiceBreakdownItem[];
}

// ========================================
// KYC TYPES
// ========================================

export type DocumentType =
  | 'AADHAAR_FRONT'
  | 'AADHAAR_BACK'
  | 'PAN'
  | 'SELFIE'
  | 'BANK_PASSBOOK'
  | 'ADDRESS_PROOF'
  | 'DRIVING_LICENSE';

export type DocumentStatus = 'pending' | 'completed' | 'rejected';

export interface ChecklistItem {
  documentType: DocumentType;
  label: string;
  instructions: string;
  required: boolean;
  status: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  documentUrl: string | null;
  updatedAt: string | null;
}

export interface KYCStatusResponse {
  overallKycStatus: KYCStatus;
  allDocumentsApproved: boolean;
  textDetails: {
    aadhaarNumber: string | null;
    panNumber: string | null;
    bankAccountNumber: string | null;
    ifscCode: string | null;
    accountHolderName: string | null;
    drivingLicenseNumber: string | null;
  };
  requiredDocuments: DocumentType[];
  documentLabels: Record<DocumentType, string>;
  checklist: ChecklistItem[];
}

export interface SubmitKYCDetailsRequest {
  aadhaarNumber: string;
  panNumber: string;
  bankAccountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  drivingLicenseNumber: string;
}

export interface UploadKYCDocumentRequest {
  document: File;
  documentType: DocumentType;
}

// ========================================
// SCHEDULE & LEAVES TYPES
// ========================================

export interface ScheduleSlot {
  timeSlot: string;
  bookings: Booking[];
}

export interface TodayScheduleResponse {
  date: string;
  slots: ScheduleSlot[];
}

export interface LeaveRequest {
  date: string; // YYYY-MM-DD
  reason: string;
}

export interface Leave {
  id: string;
  date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

// ========================================
// NOTIFICATION TYPES
// ========================================

export type NotificationType =
  | 'BOOKING_ASSIGNED'
  | 'BOOKING_CANCELLED'
  | 'PAYMENT_RECEIVED'
  | 'KYC_UPDATE'
  | 'SYSTEM_UPDATE'
  | 'PROMOTION';

export interface Notification {
  id: string;
  type?: string;
  title: string;
  body?: string;
  message?: string;
  isRead: boolean;
  readAt?: string | null;
  priority?: string;
  imageUrl?: string | null;
  createdAt: string;
  data?: {
    type?: string;
    bookingId?: string;
    bookingNumber?: string;
    /** Set on partner job notifications so cards can lead with the service. */
    serviceName?: string;
    scheduledDate?: string;
    scheduledTimeSlot?: string;
    sentAt?: string;
    [key: string]: any;
  };
}

export interface UnreadCountResponse {
  unreadCount: number;
}

// ========================================
// REVIEW & REFERRAL TYPES
// ========================================

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  bookingId: string;
  createdAt: string;
}

export interface ReviewSummaryResponse {
  avgRating: string | number;
  totalReviews: number;
  ratingDistribution: {
    [key: number]: number;
  };
  ratingPercentages: {
    [key: number]: number;
  };
  qualityScore: number;
}

export interface Referral {
  id: string;
  referredName: string;
  referredPhone: string;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  joinedAt?: string;
  earnings: number;
}

export interface ReferralStatsResponse {
  totalReferred: number;
  activeReferrals: number;
  totalEarnings: number;
}

// ========================================
// ANALYTICS TYPES
// ========================================

/**
 * Dashboard view model, built from GET /partner/home.
 * Only fields the home snapshot actually returns — anything else would have to
 * be invented, and invented numbers read as real ones on screen.
 */
export interface DashboardStatsShape {
  totalBookings: number;
  completedBookings: number;
  totalEarnings: number;
  averageRating: number;
}

export interface EarningsChartData {
  date: string;
  earnings: number;
}

export interface PerformanceTrendData {
  period: string;
  bookingsCompleted: number;
  earnings: number;
  rating: number;
}

// ========================================
// SETTINGS & FCM TYPES
// ========================================

export interface NotificationPreferences {
  bookingAlerts: boolean;
  paymentAlerts: boolean;
  promotions: boolean;
  systemUpdates: boolean;
}

export interface Settings {
  notificationPreferences: NotificationPreferences;
  languagePreference: 'en' | 'hi' | 'es' | 'fr';
}

export interface UpdateSettingsRequest {
  notificationPreferences?: Partial<NotificationPreferences>;
  languagePreference?: 'en' | 'hi' | 'es' | 'fr';
}

export interface RegisterFCMRequest {
  deviceId: string;
  fcmToken: string;
  platform?: 'ios' | 'android' | 'web';
  appVersion?: string;
}

export interface RemoveFCMRequest {
  deviceId: string;
}

// ========================================
// SUPPORT TICKET TYPES
// ========================================

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface CreateTicketRequest {
  subject: string;
  description: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  replies: TicketReply[];
}

export interface TicketReply {
  id: string;
  message: string;
  sender: 'PARTNER' | 'SUPPORT';
  createdAt: string;
}

export interface ReplyToTicketRequest {
  message: string;
}

// ========================================
// INVENTORY TYPES
// ========================================

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
  lastRestocked?: string;
}

// ========================================
// COMPATIBILITY ALIASES
// ========================================

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  bookings?: T[];
  transactions?: T[];
  notifications?: T[];
}

export type DashboardStats = DashboardStatsShape & {
  todayJobs?: number;
  todayEarnings?: number;
  onlineTime?: string;
};
export type EarningsSummary = EarningsSummaryResponse;
export type AvailabilityStatus = UpdateAvailabilityRequest;
export type LocationUpdate = UpdateLocationRequest;
export type PartnerProfile = Partner & {
  badge?: string;
  avgRating?: string | number;
  totalRatings?: number;
  qualityScore?: string | number;
  User?: {
    id: string;
    name: string;
    phone: string;
    email: string;
    profileImage?: string;
    userType?: string;
    isVerified?: boolean;
    status?: string;
  };
  Agency?: {
    id: string;
    businessName: string;
    isPlatformOwned: boolean;
  };
};
export type WalletBalance = WalletBalanceResponse;
export type Transaction = WalletTransaction;
export type Withdrawal = WithdrawalRecord;

export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}
