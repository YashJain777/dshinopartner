/**
 * Runs live location tracking for as long as the partner is travelling to a
 * customer, and only then. Tracking a partner who is already on site, or has
 * no job, costs battery and tells the customer nothing new.
 *
 * Backgrounding is deliberately not handled here: on Android the tracker holds
 * a foreground service that keeps streaming with the screen off, which is the
 * whole point of it. Releasing the watcher on background would undo that.
 */

import {useEffect, useState} from 'react';
import {
  startLocationTracking,
  stopLocationTracking,
  TrackingStopReason,
} from '../services/location/locationTracker';

/** The statuses during which the customer is watching a map. */
const TRAVELLING = ['EN_ROUTE', 'ON_THE_WAY'];

export const useLocationTracking = (status: string | undefined) => {
  const [blockedBy, setBlockedBy] = useState<TrackingStopReason | null>(null);
  const shouldTrack = status !== undefined && TRAVELLING.includes(status);

  useEffect(() => {
    if (!shouldTrack) {
      stopLocationTracking();
      setBlockedBy(null);
      return;
    }

    // The permission check reaches the platform and can reject; a failure
    // there means tracking is not running, which the partner has to be told.
    startLocationTracking({onStop: setBlockedBy}).catch(() => {
      setBlockedBy('UNAVAILABLE');
    });

    return stopLocationTracking;
  }, [shouldTrack]);

  return {
    /** Set when tracking cannot run; the partner has to fix it. */
    blockedBy,
  };
};
