/**
 * Jest setup — native module mocks.
 *
 * Jest runs outside the RN runtime, so every module backed by native code must
 * be stubbed here or importing it throws.
 */

/* eslint-env jest */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: () => ({
    onMessage: jest.fn(() => jest.fn()),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    getInitialNotification: jest.fn().mockResolvedValue(null),
    setBackgroundMessageHandler: jest.fn(),
    requestPermission: jest.fn().mockResolvedValue(1),
    registerDeviceForRemoteMessages: jest.fn().mockResolvedValue(undefined),
    getToken: jest.fn().mockResolvedValue('test-fcm-token'),
    deleteToken: jest.fn().mockResolvedValue(undefined),
  }),
  AuthorizationStatus: {AUTHORIZED: 1, PROVISIONAL: 2, DENIED: 0},
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// react-native-vision-camera ships untranspiled ESM and is entirely native.
// The viewfinder reports itself unavailable under test, which is the same
// path a device with no camera takes — so the screen renders its fallback.
jest.mock('react-native-vision-camera', () => ({
  useCamera: jest.fn(() => undefined),
  useCameraDevice: jest.fn(() => undefined),
  useCameraPermission: jest.fn(() => ({
    hasPermission: false,
    canRequestPermission: false,
    requestPermission: jest.fn().mockResolvedValue(false),
    status: 'denied',
  })),
  usePreviewOutput: jest.fn(() => ({})),
  usePhotoOutput: jest.fn(() => ({
    capturePhotoToFile: jest.fn().mockResolvedValue({
      filePath: '/tmp/test-photo.jpg',
      width: 1920,
      height: 1440,
    }),
  })),
  NativePreviewView: 'NativePreviewView',
  CommonResolutions: {
    FHD_4_3: {width: 1920, height: 1440},
    FHD_16_9: {width: 1920, height: 1080},
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  requestAuthorization: jest.fn(),
}));
