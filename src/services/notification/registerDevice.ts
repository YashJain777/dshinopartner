/**
 * Registers this device's push token with the backend.
 *
 * One place, called on login, on registration, on app launch with stored
 * credentials, and whenever FCM rotates the token — so the refresh path cannot
 * send a different shape from the login path.
 */

import {Platform} from 'react-native';
import {registerFcmToken} from '../api/settings.api';
import {getFcmToken} from '../../utils/fcm';
import {getOrCreateDeviceId} from '../../utils/device';
import {logger} from '../../utils/logger';

/** Mirrors android/app/build.gradle versionName. */
const APP_VERSION = '1.0.0';

export const registerDeviceForPush = async (): Promise<void> => {
  const deviceId = await getOrCreateDeviceId();
  const fcmToken = await getFcmToken(deviceId);

  await registerFcmToken({
    deviceId,
    fcmToken,
    platform: Platform.OS as 'android' | 'ios',
    appVersion: APP_VERSION,
  });

  logger.info('[Push] Device token registered');
};
