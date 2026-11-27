/**
 * Device Utilities
 * Unique persistent identification for the device
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@dshino_device_id';

/**
 * Get or create a persistent unique identifier for the current device.
 * Used for FCM token registration and tracking.
 */
export const getOrCreateDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      // Generate a clean pseudo-UUID v4 format
      deviceId = 'dev_' + [...Array(4)].map(() => Math.random().toString(36).substring(2, 10)).join('-');
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (error) {
    console.error('Error in getOrCreateDeviceId:', error);
    // Fallback to random value to prevent API failure
    return 'dev_fallback_' + Date.now();
  }
};
