/**
 * Schedule API Service
 * Today's assigned jobs, in the optimizer's route order.
 */

import apiClient, {ApiResponse} from './client';
import {API_ENDPOINTS} from '../../constants/api.constants';
import {BookingStatus} from '../../constants/api.constants';

export interface ScheduledJob {
  id: string;
  bookingNumber: string;
  scheduledDate: string;
  scheduledTimeSlot: string;
  status: BookingStatus;
  netAmount: string;
  /** Position in the optimizer's route; null until the cluster runs. */
  clusterSequence: number | null;
  lat: string | null;
  lng: string | null;
  /** Set on pinned-location bookings, which have no Address row. */
  addressLine1?: string | null;
  Service: {id: string; name: string; duration: number} | null;
  /** The partner finds the car by its plate, so the list carries it. */
  Vehicle?: {
    id: string;
    make?: string | null;
    model?: string | null;
    registrationNumber?: string | null;
    color?: string | null;
  } | null;
  /** Street and landmark only — contact details stay on the active booking. */
  Address?: {
    id: string;
    addressLine1?: string | null;
    landmark?: string | null;
    city?: string | null;
    pincode?: string | null;
    lat?: string | null;
    lng?: string | null;
  } | null;
  Cluster: {
    id: string;
    bookingCount: number;
    /** Minutes of travel the optimizer estimated for the whole cluster. */
    estimatedTravelTime: number | null;
  } | null;
}

export interface TodaySchedule {
  date: string;
  totalBookings: number;
  bookings: ScheduledJob[];
}

/**
 * GET /partner/schedule/today — every job assigned for today, ordered by
 * clusterSequence then time slot. Cancelled and breached jobs are excluded
 * server-side.
 */
export const getTodaySchedule = async (): Promise<TodaySchedule> => {
  const response = await apiClient.get<ApiResponse<TodaySchedule>>(
    API_ENDPOINTS.TODAY_SCHEDULE,
  );
  return response.data.data;
};

// ─── Full schedule ───────────────────────────────────────────────────────────

/** `GET /schedule` returns bookings grouped by date, not a flat list. */
export interface ScheduleCalendar {
  startDate: string;
  endDate: string;
  totalBookings: number;
  calendar: Record<string, ScheduledJob[]>;
}

export const getSchedule = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<ScheduleCalendar> => {
  const response = await apiClient.get<ApiResponse<ScheduleCalendar>>(
    API_ENDPOINTS.FULL_SCHEDULE,
    {params},
  );
  return response.data.data;
};

// ─── Leaves ──────────────────────────────────────────────────────────────────

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PartnerLeave {
  id: string;
  leaveDate: string;
  reason: string | null;
  status: LeaveStatus;
  approvedAt?: string | null;
  createdAt: string;
}

export interface LeaveCalendar {
  startDate: string;
  endDate: string;
  summary: {pending: number; approved: number; rejected: number};
  leaves: PartnerLeave[];
}

export const getLeaveCalendar = async (params?: {
  startDate?: string;
  endDate?: string;
  status?: LeaveStatus;
}): Promise<LeaveCalendar> => {
  const response = await apiClient.get<ApiResponse<LeaveCalendar>>(
    API_ENDPOINTS.LEAVE_CALENDAR,
    {params},
  );
  return response.data.data;
};

/**
 * One leave per date — the server rejects a second request for a date that
 * already has one, so the UI must not offer dates that are already taken.
 */
export const applyLeave = async (data: {
  leaveDate: string;
  reason?: string;
}): Promise<PartnerLeave> => {
  const response = await apiClient.post<ApiResponse<PartnerLeave>>(
    API_ENDPOINTS.APPLY_LEAVE,
    data,
  );
  return response.data.data;
};

export const cancelLeave = async (leaveId: string): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.CANCEL_LEAVE.replace(':id', leaveId));
};
