/**
 * Permissions Utility
 * Cross-platform Android & iOS permission helper
 */

import { PermissionsAndroid, Platform, Linking, Alert } from 'react-native';

export type LocationPermissionResult = 'granted' | 'denied' | 'never_ask_again';

/**
 * Check if location permission is currently granted
 */
export const checkLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const fineLocation = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    const coarseLocation = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    );
    return fineLocation || coarseLocation;
  }
  // For iOS, the geolocation library handles authorization status internally
  return true;
};

/**
 * Request location permission with descriptive rationale
 */
export const requestLocationPermission = async (): Promise<LocationPermissionResult> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission Required',
          message:
            'Dshino Partner needs access to your location to verify your presence at the customer address before starting the service.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return 'granted';
      } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        return 'never_ask_again';
      } else {
        return 'denied';
      }
    } catch (err) {
      console.warn('[Permissions] Error requesting location permission:', err);
      return 'denied';
    }
  }

  return 'granted';
};

/**
 * Prompt user to open system settings if permission was blocked
 */
export const promptOpenAppSettings = (
  message = 'Location permission is required to verify distance to the customer. Please enable it in App Settings.',
) => {
  Alert.alert(
    'Permission Required',
    message,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ],
    { cancelable: true },
  );
};
