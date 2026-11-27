/**
 * Attendance API Service
 *
 * Check-in and check-out both require GPS — the backend's Joi schema rejects
 * the call without `lat`/`lng`, so the caller must resolve a position first.
 * Breaks do not: the server only needs to know who, and when.
 */

import apiClient, {ApiResponse} from './client';
import {API_ENDPOINTS} from '../../constants/api.constants';

/** One check-in/check-out pair. A day can hold several. */
export interface ShiftSession {
  checkInAt: string;
  checkOutAt?: string;
  checkInLat?: number | string;
  checkInLng?: number | string;
  checkOutLat?: number | string;
  checkOutLng?: number | string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  /** First session's start. */
  checkInAt: string | null;
  /** Last session's end; null while a session is open. */
  checkOutAt: string | null;
  /** Sum of completed sessions. */
  workHours: number | string | null;
  sessions?: ShiftSession[];
  isOnBreak: boolean;
  breakStartAt: string | null;
  breakHistory?: {start: string; end: string; durationMinutes: number}[] | null;
}

/** GET /attendance/today — the flattened snapshot the app renders. */
export interface TodayAttendance {
  date: string;
  hasCheckedIn: boolean;
  /** The last session ended. The partner may still start another today. */
  hasCheckedOut: boolean;
  /** A session is open right now — this, not hasCheckedOut, means "working". */
  onShift: boolean;
  sessions: ShiftSession[];
  sessionCount: number;
  checkInAt: string | null;
  checkOutAt: string | null;
  workHours: number | string | null;
  isOnBreak: boolean;
  breakStartAt: string | null;
  record?: AttendanceRecord | null;
}

export const getTodayAttendance = async (): Promise<TodayAttendance> => {
  const response = await apiClient.get<ApiResponse<TodayAttendance>>(
    API_ENDPOINTS.ATTENDANCE_TODAY,
  );
  return response.data.data;
};

export const checkIn = async (coords: {
  lat: number;
  lng: number;
}): Promise<AttendanceRecord> => {
  const response = await apiClient.post<ApiResponse<AttendanceRecord>>(
    API_ENDPOINTS.CHECK_IN,
    coords,
  );
  return response.data.data;
};

export const checkOut = async (coords: {
  lat: number;
  lng: number;
}): Promise<AttendanceRecord> => {
  const response = await apiClient.post<ApiResponse<AttendanceRecord>>(
    API_ENDPOINTS.CHECK_OUT,
    coords,
  );
  return response.data.data;
};

/**
 * POST /attendance/break — one endpoint for both directions. The server
 * refuses it before check-in and after check-out, so the UI must not offer it
 * outside an open shift.
 */
export const toggleBreak = async (): Promise<AttendanceRecord> => {
  const response = await apiClient.post<ApiResponse<AttendanceRecord>>(
    API_ENDPOINTS.ATTENDANCE_BREAK,
    {},
  );
  return response.data.data;
};
