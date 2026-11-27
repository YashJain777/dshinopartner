/**
 * Active Job Hook
 *
 * Drives the live job screen and the completion screen: loads one booking and
 * exposes every action that can move it through the FSM.
 *
 * `bookingId` is what makes a SPECIFIC job openable. Without it the hook asks
 * the server "what is my active job", which is the right question from the
 * dashboard but the wrong one from the Jobs tab: a partner holding two jobs
 * tapped the one they were working on and the hook loaded the other, so the
 * job in hand was unreachable. Passing the tapped id pins the hook to it.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  getActiveBooking,
  getBookingDetails,
  uploadJobPhotos,
  updateBookingStatus,
  completeBooking,
  arriveBooking,
  raiseBookingIssue,
  RaiseIssueData,
  triggerSOS,
} from '../services/api/booking.api';
import { Booking } from '../types/api.types';
import { API_CONFIG } from '../constants/api.constants';
import { getCurrentLocation } from '../utils/location';
import { logger } from '../utils/logger';
import { handleApiError } from '../utils/errorHandler';

export interface UseActiveJobReturn {
  booking: Booking | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
  uploadPhoto: (photoUri: string, type: 'BEFORE' | 'AFTER') => Promise<void>;
  startEnRoute: () => Promise<void>;
  markArrived: () => Promise<void>;
  raiseIssue: (data: RaiseIssueData) => Promise<void>;
  startService: () => Promise<void>;
  completeService: (otp: string) => Promise<void>;
  uploadingPhoto: boolean;
  updatingStatus: boolean;
  triggerEmergencySOS: () => Promise<void>;
  triggeringSOS: boolean;
}

/**
 * Re-shapes a job-action failure into an error the screen can show directly.
 *
 * Axios puts "Request failed with status code 400" on err.message, so the
 * server's own message has to be lifted out of the response or the partner
 * sees a status line instead of a reason. When that message carries a distance
 * it is flagged as a geofence violation, so the screen opens the map modal
 * instead of a plain alert.
 */
const asActionError = (err: any): any => {
  // Location and permission failures are raised locally and already carry a
  // partner-facing message plus the flags the screen keys off.
  if (err?.isPermissionDenied || err?.isPermissionBlocked) {
    return err;
  }

  const message = handleApiError(err);
  const distance = message.match(/Distance:\s*(\d+)m/i);
  const radius = message.match(/Allowed Radius:\s*(\d+)m/i);

  const actionErr: any = new Error(message);
  if (distance) {
    actionErr.isGeofenceViolation = true;
    actionErr.distanceMeters = parseInt(distance[1], 10);
    actionErr.allowedRadiusMeters = radius ? parseInt(radius[1], 10) : undefined;
  }
  return actionErr;
};

export const useActiveJob = (bookingId?: string): UseActiveJobReturn => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [triggeringSOS, setTriggeringSOS] = useState(false);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /**
   * Fetch active booking
   */
  const fetchActiveBooking = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Pinned to one job: load exactly that one. No fallback to the
      // server's pick — silently showing a different job than the one the
      // partner tapped is the bug this argument exists to kill.
      if (bookingId) {
        setBooking(await getBookingDetails(bookingId));
        return;
      }

      const activeBooking = await getActiveBooking();
      if (activeBooking) {
        try {
          const activeId = activeBooking.id || activeBooking.bookingId || '';
          const fullBooking = await getBookingDetails(activeId);
          setBooking(fullBooking);
        } catch (detailsErr) {
          logger.error('[ActiveJob] Details fetch failed, using summary', detailsErr);
          setBooking(activeBooking);
        }
      } else {
        setBooking(null);
      }
    } catch (err: any) {
      logger.error('[ActiveJob] Fetch failed', err);
      setError(
        err.response?.data?.message || 'Failed to load active booking',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId]);

  /**
   * Refresh active booking
   */
  const refresh = useCallback(async () => {
    await fetchActiveBooking(true);
  }, [fetchActiveBooking]);

  /**
   * Upload job photo
   */
  const uploadPhoto = useCallback(
    async (photoUri: string, type: 'BEFORE' | 'AFTER') => {
      if (!booking) {
        throw new Error('No active booking');
      }

      try {
        setUploadingPhoto(true);
        await uploadJobPhotos(booking.bookingId || booking.id, photoUri, type);
        await fetchActiveBooking(true);
      } catch (err: any) {
        logger.error('[ActiveJob] Photo upload failed', err?.response?.data || err?.message);
        throw new Error(
          err.response?.data?.message || 'Failed to upload photo',
        );
      } finally {
        setUploadingPhoto(false);
      }
    },
    [booking, fetchActiveBooking],
  );

  /**
   * Start service (update status to IN_PROGRESS with live GPS coordinates)
   */
  /**
   * Tell the customer the partner has set off. Optional in the backend FSM but
   * it is what powers travel-time reporting (enRouteAt -> arrivedAt).
   */
  const startEnRoute = useCallback(async () => {
    if (!booking) throw new Error('No active booking');

    try {
      setUpdatingStatus(true);
      await updateBookingStatus(booking.bookingId || booking.id, {status: 'EN_ROUTE'});
      await fetchActiveBooking(true);
    } catch (err: any) {
      logger.error('[ActiveJob] En route failed', err);
      throw asActionError(err);
    } finally {
      setUpdatingStatus(false);
    }
  }, [booking, fetchActiveBooking]);

  /**
   * Confirm arrival at the customer's location. Geofenced server-side, and the
   * arrival time is what punctuality scoring is measured from.
   */
  const markArrived = useCallback(async () => {
    if (!booking) throw new Error('No active booking');

    try {
      setUpdatingStatus(true);
      const coords = await getCurrentLocation();
      await arriveBooking(booking.bookingId || booking.id, coords);
      await fetchActiveBooking(true);
    } catch (err: any) {
      logger.error('[ActiveJob] Mark arrived failed', err);
      throw asActionError(err);
    } finally {
      setUpdatingStatus(false);
    }
  }, [booking, fetchActiveBooking]);

  /**
   * Report a blocker — absent customer, locked gate, unsafe site. Leaves the
   * booking status alone; ops picks it up.
   */
  const raiseIssue = useCallback(
    async (data: RaiseIssueData) => {
      if (!booking) throw new Error('No active booking');

      try {
        setUpdatingStatus(true);
        await raiseBookingIssue(booking.bookingId || booking.id, data);
        await fetchActiveBooking(true);
      } catch (err: any) {
        logger.error('[ActiveJob] Raise issue failed', err);
        throw new Error(
          err.response?.data?.message || 'Failed to report the issue',
        );
      } finally {
        setUpdatingStatus(false);
      }
    },
    [booking, fetchActiveBooking],
  );

  const startService = useCallback(async () => {
    if (!booking) {
      throw new Error('No active booking');
    }

    try {
      setUpdatingStatus(true);

      // Start minimum visual animation duration (2.2 seconds) for smooth modern transition
      const minDuration = new Promise<void>(resolve => {
        setTimeout(() => resolve(), 2200);
      });

      // Fetch live high-accuracy GPS coordinates for geofence verification
      const coords = await getCurrentLocation();

      await updateBookingStatus(booking.bookingId || booking.id, {
        status: 'IN_PROGRESS',
        lat: coords.lat,
        lng: coords.lng,
      });

      // Optimistically preserve existing booking fields so screen never goes blank
      setBooking(prev => (prev ? { ...prev, status: 'IN_PROGRESS' } : prev));

      // Wait for minimum animation to finish cleanly
      await minDuration;

      // Re-fetch latest booking data in background silently
      await fetchActiveBooking(true);
    } catch (err: any) {
      logger.error('[ActiveJob] Start service failed', err);
      throw asActionError(err);
    } finally {
      setUpdatingStatus(false);
    }
  }, [booking, fetchActiveBooking]);

  /**
   * Complete service with OTP
   */
  const completeService = useCallback(
    async (otp: string) => {
      if (!booking) {
        throw new Error('No active booking');
      }

      try {
        setUpdatingStatus(true);
        const completedBooking = await completeBooking(booking.bookingId || booking.id, {
          otp,
        });
        setBooking(completedBooking);
      } catch (err: any) {
        logger.error('[ActiveJob] Complete service failed', err);
        throw new Error(
          err.response?.data?.message || 'Failed to complete service',
        );
      } finally {
        setUpdatingStatus(false);
      }
    },
    [booking],
  );

  /**
   * Trigger SOS Emergency
   */
  const triggerEmergencySOS = useCallback(async () => {
    try {
      setTriggeringSOS(true);
      const coords = await getCurrentLocation();
      const bookingId = booking?.id || booking?.bookingId || undefined;
      await triggerSOS(coords.lat, coords.lng, bookingId);
    } catch (err: any) {
      logger.error('[ActiveJob] SOS trigger failed', err);
      throw new Error(
        err.message || 'Failed to trigger SOS emergency',
      );
    } finally {
      setTriggeringSOS(false);
    }
  }, [booking]);

  /**
   * Handle app state changes (foreground/background)
   * Refreshes active job when app comes to foreground
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground, refresh data
        fetchActiveBooking(true);
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [fetchActiveBooking]);

  /**
   * Initial fetch, then poll while the app is in the foreground.
   *
   * Without the poll a job cancelled or reassigned by ops stays on screen until
   * the partner backgrounds the app or pulls to refresh — long enough for them
   * to drive to a customer who already cancelled. The interval is paused in the
   * background; the AppState listener above covers the return to foreground.
   */
  useEffect(() => {
    fetchActiveBooking();

    const intervalId = setInterval(() => {
      if (appStateRef.current === 'active') {
        fetchActiveBooking(true);
      }
    }, API_CONFIG.ACTIVE_BOOKING_POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchActiveBooking]);

  return {
    booking,
    loading,
    error,
    refreshing,
    refresh,
    uploadPhoto,
    startEnRoute,
    markArrived,
    raiseIssue,
    startService,
    completeService,
    uploadingPhoto,
    updatingStatus,
    triggerEmergencySOS,
    triggeringSOS,
  };
};
