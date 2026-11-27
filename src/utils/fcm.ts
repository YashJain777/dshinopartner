/**
 * FCM Push Notification Utilities
 * Fetches real Firebase FCM device token with permission request
 * Compatible with @react-native-firebase/messaging v26+ (getMessaging)
 */

import {Platform, PermissionsAndroid} from 'react-native';
import {getMessaging, AuthorizationStatus} from '@react-native-firebase/messaging';

/**
 * Request Notification Permission for Android 13+ (API 33+)
 */
const requestAndroidNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('[FCM Utility] Android 13+ Notification Permission error:', err);
      return false;
    }
  }
  return true;
};

/**
 * Fetches the FCM device token.
 * Requests notification permissions on iOS & Android 13+.
 * Returns real token from Firebase Messaging.
 */
export const getFcmToken = async (_deviceId: string): Promise<string> => {
  try {
    await requestAndroidNotificationPermission();

    const messagingInstance = getMessaging();

    // Register device for remote messages on iOS
    if (Platform.OS === 'ios') {
      await messagingInstance.registerDeviceForRemoteMessages();
    }

    const authStatus = await messagingInstance.requestPermission();
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    console.log('[FCM Utility] Notification permission status:', authStatus, 'Enabled:', enabled);

    if (enabled) {
      // Fetch real Firebase FCM token
      const token = await messagingInstance.getToken();
      if (token) {
        console.log('[FCM Utility] ✅ Real FCM Token obtained successfully:', token);
        return token;
      }
    }
  } catch (error: any) {
    console.error('[FCM Utility] ❌ Real FCM token fetch error:', error?.message || error);
    throw new Error(`Failed to fetch real FCM token: ${error?.message || 'Firebase initialization issue'}`);
  }

  throw new Error('Notification permission not granted for FCM token generation.');
};
