/**
 * Navigation Types
 * Type-safe navigation for the entire app
 */

export type RootStackParamList = {
  MainTabs: undefined;
  ActiveJob: {jobId?: string; bookingId?: string} | undefined;
  JobHistory: undefined;
  BookingDetails: {bookingId: string};
  Transactions: undefined;
  Notifications: undefined;
  SupportTickets: undefined;
  CreateTicket: undefined;
  TicketDetails: {ticketId: string; subject: string};
  Schedule: undefined;
  Inventory: undefined;
  JobTimeline: {bookingId: string};
  PhotoEvidence: {type?: 'BEFORE' | 'AFTER'; bookingId?: string} | undefined;
  SlotExpired: {bookingId: string};
  GeofenceBlocked: {
    radiusMeters?: number;
    distanceMeters?: number;
    bookingId?: string;
  } | undefined;
  CompleteJob: {bookingId?: string} | undefined;
  JobSuccess: {bookingId: string};
  SosConfirm: {bookingId?: string; addressLine?: string} | undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: {email?: string} | undefined;
  ResetPassword: {email: string};
  Signup: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Jobs: undefined;
  Earnings: undefined;
  Performance: undefined;
  Profile: undefined;
};

