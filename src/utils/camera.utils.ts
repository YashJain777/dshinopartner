/**
 * Camera Utilities
 * Helper functions for camera and image picker
 */

import {Alert} from 'react-native';
import {requestCameraPermission, promptOpenAppSettings} from './permissions';
import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';

/**
 * Capture presets.
 *
 * One size fitted everything before: 1920 px at quality 0.8, whether the
 * picture was an avatar shown at 40 pt or an Aadhaar card a human has to read
 * numbers off. A partner files eight evidence photos per job on mobile data,
 * so the upload itself is the cost worth cutting — shrinking on the phone
 * means fewer bytes leave it, which the server re-encode cannot help with.
 *
 * These mirror `utils/compressImage.js` on the server, which re-encodes
 * whatever arrives. The client values are the same so a well-behaved app
 * uploads something the server barely has to touch; the server still enforces
 * them, because an old build or a patched client will not.
 */
export type CapturePreset = 'evidence' | 'avatar' | 'document';

const PRESETS: Record<CapturePreset, {maxEdge: number; quality: number}> = {
  /** Before/after proof of a vehicle's condition, read on a phone. */
  evidence: {maxEdge: 1600, quality: 0.7},
  /** Never rendered bigger than a few hundred points. */
  avatar: {maxEdge: 512, quality: 0.75},
  /** A reviewer reads an Aadhaar or PAN number off these — compress gently. */
  document: {maxEdge: 2200, quality: 0.85},
};

const optionsFor = (
  preset: CapturePreset = 'evidence',
): CameraOptions & ImageLibraryOptions => {
  const {maxEdge, quality} = PRESETS[preset];
  return {
    mediaType: 'photo',
    quality: quality as CameraOptions['quality'],
    maxWidth: maxEdge,
    maxHeight: maxEdge,
    includeBase64: false,
  };
};

/**
 * Open camera to capture photo
 */
export const openCamera = async (
  preset: CapturePreset = 'evidence',
): Promise<string | null> => {
  try {
    // The manifest declares CAMERA for the in-app viewfinder. Android then
    // refuses ACTION_IMAGE_CAPTURE unless the permission is actually granted,
    // and react-native-image-picker fails with "This library does not require
    // Manifest.permission.CAMERA…". Asking here keeps both paths working.
    const permission = await requestCameraPermission();
    if (permission !== 'granted') {
      if (permission === 'never_ask_again') {
        promptOpenAppSettings(
          'Camera access is blocked. Dshino needs it to photograph the vehicle — enable it in App Settings.',
        );
      }
      return null;
    }

    const response: ImagePickerResponse = await launchCamera(optionsFor(preset));

    if (response.didCancel) {
      return null;
    }

    if (response.errorCode) {
      if (response.errorCode === 'camera_unavailable') {
        Alert.alert('Error', 'Camera is not available on this device');
      } else if (response.errorCode === 'permission') {
        Alert.alert(
          'Permission Required',
          'Please enable camera permission in settings',
        );
      } else {
        Alert.alert('Error', response.errorMessage || 'Failed to capture photo');
      }
      return null;
    }

    if (response.assets && response.assets.length > 0) {
      return response.assets[0].uri || null;
    }

    return null;
  } catch (error) {
    console.error('Camera error:', error);
    Alert.alert('Error', 'Failed to open camera');
    return null;
  }
};

/**
 * Open gallery to select photo
 */
export const openGallery = async (
  preset: CapturePreset = 'evidence',
): Promise<string | null> => {
  try {
    const response: ImagePickerResponse = await launchImageLibrary(
      optionsFor(preset),
    );

    if (response.didCancel) {
      return null;
    }

    if (response.errorCode) {
      Alert.alert('Error', response.errorMessage || 'Failed to select photo');
      return null;
    }

    if (response.assets && response.assets.length > 0) {
      return response.assets[0].uri || null;
    }

    return null;
  } catch (error) {
    console.error('Gallery error:', error);
    Alert.alert('Error', 'Failed to open gallery');
    return null;
  }
};

/**
 * Show action sheet to choose camera or gallery
 */
export const showImagePickerOptions = (
  preset: CapturePreset = 'evidence',
): Promise<string | null> => {
  return new Promise(resolve => {
    Alert.alert(
      'Select Photo',
      'Choose an option to upload photo',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const uri = await openCamera(preset);
            resolve(uri);
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const uri = await openGallery(preset);
            resolve(uri);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      {cancelable: true},
    );
  });
};
