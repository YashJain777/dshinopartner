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

export type CameraPermissionResult = 'granted' | 'denied' | 'never_ask_again';

/**
 * Camera permission.
 *
 * This became mandatory the moment the in-app viewfinder was added. Before
 * that the app only ever launched the OS camera through an intent, which
 * needs no permission at all — and react-native-image-picker says so in its
 * own error:
 *
 *   "This library does not require Manifest.permission.CAMERA, if you add
 *    this permission in manifest then you have to obtain the same."
 *
 * Android's rule (issuetracker 37063818): if an app DECLARES CAMERA but has
 * not been granted it, ACTION_IMAGE_CAPTURE throws a SecurityException. So
 * declaring the permission for vision-camera silently broke the picker too.
 * Both paths now go through this.
 */
export const checkCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
};

export const requestCameraPermission = async (): Promise<CameraPermissionResult> => {
  if (Platform.OS !== 'android') {
    return 'granted';
  }

  if (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA)) {
    return 'granted';
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: 'Camera access',
      message:
        'Dshino needs the camera to photograph the vehicle before and after the service. These photos are your proof the job was done.',
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    },
  );

  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return 'granted';
  }
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return 'never_ask_again';
  }
  return 'denied';
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
