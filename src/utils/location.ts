/**
 * Location Utilities
 * High-accuracy location retrieval using react-native-geolocation-service
 * Designed for geofenced service start verification
 */

import { NativeModules, Platform } from 'react-native';
import * as GeolocationModule from 'react-native-geolocation-service';
import { checkLocationPermission, requestLocationPermission } from './permissions';

const Geolocation: any = (GeolocationModule as any).default || GeolocationModule;

export interface LocationCoords {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface LocationResult {
  success: boolean;
  coords?: LocationCoords;
  error?: string;
  isPermissionDenied?: boolean;
}

/**
 * Fetch current device coordinates safely with permission checks.
 * Uses high accuracy GPS provider with fallback timeout.
 */
export const getCurrentLocation = async (
  options: {
    timeout?: number;
    maximumAge?: number;
    enableHighAccuracy?: boolean;
  } = {},
): Promise<LocationCoords> => {
  const {
    timeout = 15000,
    maximumAge = 10000,
    enableHighAccuracy = true,
  } = options;

  // 1. Check if native Android module is linked (requires rebuild if newly installed)
  if (Platform.OS === 'android' && !NativeModules.RNFusedLocation) {
    console.warn(
      '[Location] RNFusedLocation native module is not linked. A native rebuild (npm run android) is required.',
    );
    throw new Error(
      'Location tracking library needs a native build. Please rebuild the app with "npm run android".',
    );
  }

  // 2. Ensure permission is granted
  const isGranted = await checkLocationPermission();
  if (!isGranted) {
    const result = await requestLocationPermission();
    if (result === 'never_ask_again') {
      const err: any = new Error(
        'Location permission is permanently denied. Please enable Location in App Settings to verify your distance.',
      );
      err.isPermissionBlocked = true;
      throw err;
    }
    if (result !== 'granted') {
      const err: any = new Error(
        'Location permission is required to verify distance to the customer.',
      );
      err.isPermissionDenied = true;
      throw err;
    }
  }

  // 3. Fetch high-accuracy GPS coordinates via native Geolocation
  return new Promise<LocationCoords>((resolve, reject) => {
    if (typeof Geolocation?.getCurrentPosition !== 'function') {
      reject(new Error('Geolocation.getCurrentPosition is not available. Please rebuild the app.'));
      return;
    }

    Geolocation.getCurrentPosition(
      (position: any) => {
        if (position && position.coords) {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        } else {
          reject(new Error('Failed to retrieve location coordinates.'));
        }
      },
      (error: any) => {
        console.warn('[Location] Geolocation error:', error?.code, error?.message);
        const code = error?.code;
        if (code === 1) {
          // PERMISSION_DENIED
          const err: any = new Error('Location permission denied.');
          err.isPermissionDenied = true;
          reject(err);
        } else if (code === 2) {
          // POSITION_UNAVAILABLE (GPS turned off)
          reject(new Error('Device location is turned off. Please enable GPS in device settings.'));
        } else if (code === 3) {
          // TIMEOUT - try one more time with low accuracy fallback
          Geolocation.getCurrentPosition(
            (fallbackPos: any) => {
              resolve({
                lat: fallbackPos.coords.latitude,
                lng: fallbackPos.coords.longitude,
                accuracy: fallbackPos.coords.accuracy,
              });
            },
            (_fallbackErr: any) => {
              reject(new Error('Location request timed out. Please ensure you have GPS signal.'));
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 },
          );
        } else {
          reject(new Error(error?.message || 'Unable to retrieve location.'));
        }
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
        forceRequestLocation: true,
        showLocationDialog: true,
      },
    );
  });
};

/**
 * Straight-line distance between two coordinates, in metres.
 *
 * The backend's geofence check is a plain radius around the booking pin, so a
 * great-circle distance matches what it will decide. It is an estimate for
 * display only — the server still has the final say on whether a status change
 * is allowed.
 */
export const distanceInMeters = (
  from: {lat: number; lng: number},
  to: {lat: number; lng: number},
): number => {
  const R = 6371000; // Earth's mean radius
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;

  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(a))));
};
