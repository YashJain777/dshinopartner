/**
 * Attendance hook — the partner's shift.
 *
 * Three rules the backend enforces, mirrored here so the UI never offers a
 * control the server will refuse:
 *   - check-in and check-out need GPS coordinates
 *   - a break can only be toggled while a session is open
 *   - a day holds several sessions, so ending a shift is not the end of the
 *     day: check-in is offered again afterwards
 */

import {useCallback, useEffect, useState} from 'react';
import {
  getTodayAttendance,
  checkIn as apiCheckIn,
  checkOut as apiCheckOut,
  toggleBreak as apiToggleBreak,
  TodayAttendance,
  AttendanceRecord,
  ShiftSession,
} from '../services/api/attendance.api';
import {getCurrentLocation} from '../utils/location';
import {logger} from '../utils/logger';

export type AttendanceAction = 'checkIn' | 'checkOut' | 'break' | null;

export interface UseAttendanceReturn {
  today: TodayAttendance | null;
  /** True while a session is open. */
  onShift: boolean;
  /** Worked earlier today but is off shift now; check-in starts another. */
  canResume: boolean;
  /** Break can only be toggled while on shift. */
  canToggleBreak: boolean;
  isOnBreak: boolean;
  loading: boolean;
  /** Which action is in flight, so only that control shows a spinner. */
  pending: AttendanceAction;
  error: string | null;
  refresh: () => Promise<void>;
  checkIn: () => Promise<void>;
  checkOut: () => Promise<void>;
  toggleBreak: () => Promise<void>;
}

/** Folds a mutation's record response back into the flattened snapshot. */
const sessionsOf = (record: AttendanceRecord): ShiftSession[] =>
  Array.isArray(record.sessions) ? record.sessions : [];

/** A session with no check-out is the one still running. */
const hasOpenSession = (sessions: ShiftSession[]): boolean => {
  const last = sessions[sessions.length - 1];
  return !!last && !last.checkOutAt;
};

const mergeRecord = (
  previous: TodayAttendance | null,
  record: AttendanceRecord,
): TodayAttendance => {
  const sessions = sessionsOf(record);
  return {
    date: record.date ?? previous?.date ?? new Date().toISOString().slice(0, 10),
    hasCheckedIn: !!record.checkInAt,
    hasCheckedOut: !!record.checkOutAt,
    onShift: hasOpenSession(sessions),
    sessions,
    sessionCount: sessions.length,
    checkInAt: record.checkInAt ?? null,
    checkOutAt: record.checkOutAt ?? null,
    workHours: record.workHours ?? null,
    isOnBreak: !!record.isOnBreak,
    breakStartAt: record.breakStartAt ?? null,
    record,
  };
};

export const useAttendance = (
  options: {autoLoad?: boolean} = {},
): UseAttendanceReturn => {
  const {autoLoad = true} = options;

  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(autoLoad);
  const [pending, setPending] = useState<AttendanceAction>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getTodayAttendance();
      setToday(data);
      setError(null);
    } catch (err: any) {
      logger.error('[Attendance] Fetch failed', err);
      setError(err?.response?.data?.message || 'Could not load your shift.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [autoLoad, refresh]);

  /**
   * Resolves GPS, then calls the endpoint. Location failures are rethrown
   * untouched — they carry `isPermissionDenied` / `isPermissionBlocked`, which
   * the screen turns into an "Open settings" prompt.
   */
  const withLocation = useCallback(
    async (
      action: Exclude<AttendanceAction, null>,
      call: (coords: {lat: number; lng: number}) => Promise<AttendanceRecord>,
    ) => {
      setPending(action);
      try {
        const coords = await getCurrentLocation();
        const record = await call({lat: coords.lat, lng: coords.lng});
        setToday(prev => mergeRecord(prev, record));
        setError(null);
      } finally {
        setPending(null);
      }
    },
    [],
  );

  const checkIn = useCallback(
    () => withLocation('checkIn', apiCheckIn),
    [withLocation],
  );

  const checkOut = useCallback(
    () => withLocation('checkOut', apiCheckOut),
    [withLocation],
  );

  const toggleBreak = useCallback(async () => {
    setPending('break');
    try {
      const record = await apiToggleBreak();
      setToday(prev => mergeRecord(prev, record));
      setError(null);
    } finally {
      setPending(null);
    }
  }, []);

  // The server decides this; it knows whether a session is open.
  const onShift = !!today?.onShift;

  return {
    today,
    onShift,
    canResume: !!today?.hasCheckedIn && !onShift,
    canToggleBreak: onShift,
    isOnBreak: !!today?.isOnBreak,
    loading,
    pending,
    error,
    refresh,
    checkIn,
    checkOut,
    toggleBreak,
  };
};
