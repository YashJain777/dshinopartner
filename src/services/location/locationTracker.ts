/**
 * Live location tracking
 *
 * Streams the partner's position to the backend while they are travelling to a
 * customer, which is what feeds the customer's live-tracking map (the backend
 * broadcasts `partner_location_update` into the booking room).
 *
 * On Android a foreground service holds the process for as long as the watcher
 * is attached, so tracking continues with the screen off. On iOS there is no
 * such service and tracking runs while the app is in the foreground.
 *
 * One watcher at a time, process-wide. Starting twice is a no-op.
 */

import Geolocation, {
  GeoError,
  GeoPosition,
  PositionError,
} from 'react-native-geolocation-service';
import {updateLocation, syncLocations} from '../api/availability.api';
import {API_CONFIG} from '../../constants/api.constants';
import {checkLocationPermission, requestLocationPermission} from '../../utils/permissions';
import {startForegroundService, stopForegroundService} from './foregroundService';
import {logger} from '../../utils/logger';
import {Breadcrumb, LocationUpdate} from '../../types/api.types';

/** Fixes worse than this are the network provider guessing; they would drag
 *  the customer's map around the neighbourhood. */
const MAX_ACCURACY_METERS = 100;

/** Roughly 45 minutes of fixes. Beyond that the oldest are dropped: a stale
 *  trail is worth less than a bounded amount of memory. */
const MAX_BUFFER = 60;

/** Metres of movement before Android reports a new fix. */
const DISTANCE_FILTER_METERS = 40;

export type TrackingStopReason = 'PERMISSION_DENIED' | 'UNAVAILABLE';

interface StartOptions {
  /** Called when tracking stops for a reason the partner needs to resolve. */
  onStop?: (reason: TrackingStopReason) => void;
}

let watchId: number | null = null;
let lastSentAt = 0;
let pending: Breadcrumb[] = [];

/** Only the fields the backend validates; `heading` and `speed` arrive null
 *  when the device is stationary, and the schema takes numbers or nothing. */
const toPayload = (position: GeoPosition): LocationUpdate => {
  const {latitude, longitude, accuracy, heading, speed} = position.coords;
  const payload: LocationUpdate = {lat: latitude, lng: longitude, accuracy};
  if (typeof heading === 'number') {
    payload.bearing = heading;
  }
  if (typeof speed === 'number') {
    payload.speed = speed;
  }
  return payload;
};

/** Drains whatever earlier sends failed to deliver. */
const flushPending = async (): Promise<void> => {
  if (pending.length === 0) {
    return;
  }
  const batch = pending;
  pending = [];
  try {
    await syncLocations(batch);
  } catch (error) {
    // Put them back, newest-last, so the next success tries again.
    pending = [...batch, ...pending].slice(-MAX_BUFFER);
    logger.warn('[Location] Breadcrumb sync failed', error);
  }
};

const send = async (position: GeoPosition): Promise<void> => {
  const payload = toPayload(position);
  try {
    await updateLocation(payload);
    lastSentAt = position.timestamp;
    await flushPending();
  } catch (error) {
    // Offline or a server error. Keep the fix so the trail survives a tunnel.
    pending = [...pending, {...payload, timestamp: new Date(position.timestamp).toISOString()}].slice(
      -MAX_BUFFER,
    );
    logger.warn('[Location] Live update failed, buffered', error);
  }
};

const onPosition = (position: GeoPosition): void => {
  if (position.coords.accuracy > MAX_ACCURACY_METERS) {
    return;
  }
  // distanceFilter already suppresses a stationary partner; this caps how
  // often a moving one costs a request.
  if (position.timestamp - lastSentAt < API_CONFIG.LOCATION_UPDATE_INTERVAL) {
    return;
  }
  send(position);
};

export const isTracking = (): boolean => watchId !== null;

/**
 * Starts streaming position. Resolves once the watcher is attached, or
 * immediately if it could not be: `onStop` says why.
 */
export const startLocationTracking = async (options: StartOptions = {}): Promise<void> => {
  if (watchId !== null) {
    return;
  }

  const granted = await checkLocationPermission();
  if (!granted) {
    const result = await requestLocationPermission();
    if (result !== 'granted') {
      options.onStop?.('PERMISSION_DENIED');
      return;
    }
  }

  const onError = (error: GeoError): void => {
    // A denied permission or a disabled GPS will repeat on every fix, so stop
    // and tell the caller. Timeouts and single bad fixes are transient.
    if (
      error.code === PositionError.PERMISSION_DENIED ||
      error.code === PositionError.SETTINGS_NOT_SATISFIED ||
      error.code === PositionError.PLAY_SERVICE_NOT_AVAILABLE
    ) {
      stopLocationTracking();
      options.onStop?.(
        error.code === PositionError.PERMISSION_DENIED ? 'PERMISSION_DENIED' : 'UNAVAILABLE',
      );
      return;
    }
    logger.warn('[Location] Watch error', {code: error.code, message: error.message});
  };

  await startForegroundService();

  watchId = Geolocation.watchPosition(onPosition, onError, {
    enableHighAccuracy: true,
    accuracy: {android: 'high', ios: 'bestForNavigation'},
    distanceFilter: DISTANCE_FILTER_METERS,
    interval: API_CONFIG.LOCATION_UPDATE_INTERVAL,
    fastestInterval: API_CONFIG.LOCATION_UPDATE_INTERVAL,
    showsBackgroundLocationIndicator: false,
  });
};

export const stopLocationTracking = (): void => {
  if (watchId === null) {
    return;
  }
  Geolocation.clearWatch(watchId);
  watchId = null;
  lastSentAt = 0;
  stopForegroundService();
  // Hand over whatever is left; the partner has stopped travelling.
  flushPending();
};
