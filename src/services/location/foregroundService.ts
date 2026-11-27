/**
 * The Android foreground service that keeps the process alive while location is
 * streaming, so tracking survives the partner pocketing the phone.
 *
 * Android only. On iOS the module is absent and these are no-ops, which leaves
 * iOS tracking while the app is in the foreground — continuing there needs a
 * background mode and "always" authorisation, which this app does not request.
 *
 * A failure to start is logged, not thrown: the partner should keep being
 * tracked in the foreground even if Android refuses the service.
 */

import {NativeModules, Platform} from 'react-native';
import {logger} from '../../utils/logger';

interface LocationTrackingNative {
  start(): Promise<void>;
  stop(): Promise<void>;
}

const native: LocationTrackingNative | undefined =
  Platform.OS === 'android' ? NativeModules.LocationTracking : undefined;

export const startForegroundService = async (): Promise<void> => {
  if (!native) {
    return;
  }
  try {
    await native.start();
  } catch (error) {
    logger.warn('[Location] Foreground service refused to start', error);
  }
};

export const stopForegroundService = async (): Promise<void> => {
  if (!native) {
    return;
  }
  try {
    await native.stop();
  } catch (error) {
    logger.warn('[Location] Foreground service refused to stop', error);
  }
};
