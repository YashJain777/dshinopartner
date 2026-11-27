/**
 * The in-app viewfinder for evidence photos.
 *
 * The screen used to hand off to the OS camera app. That works, but it costs
 * the two things the design is actually for: a framing guide, so the partner
 * centres the whole panel instead of half a door, and a named prompt telling
 * them which angle this shot is. Neither is possible once the OS camera owns
 * the screen.
 *
 * This renders the live preview with the dashed guide over it and hands back
 * a file path. It deliberately knows nothing about uploading or slots — the
 * screen owns that.
 *
 * It must degrade rather than fail. If the camera permission is refused, the
 * device has no back camera, or the session errors, `onUnavailable` fires and
 * the screen falls back to the OS picker. A partner standing at a car cannot
 * be blocked by a camera stack problem.
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Pressable, StyleSheet, ActivityIndicator} from 'react-native';
import {
  useCamera,
  useCameraDevice,
  useCameraPermission,
  usePreviewOutput,
  usePhotoOutput,
  NativePreviewView,
  CommonResolutions,
  type FlashMode,
} from 'react-native-vision-camera';
import {Text} from '../../atoms/Text';
import {Icon} from '../../atoms/Icon';
import {tokens, radii} from '../../../theme/tokens';

/** A camera surface is dark in both themes. */
const t = tokens.dark;

/** Cycled by the flash button, in the order a partner expects. */
const FLASH_ORDER: FlashMode[] = ['off', 'auto', 'on'];

const FLASH_LABEL: Record<FlashMode, string> = {
  off: 'Flash off',
  auto: 'Flash auto',
  on: 'Flash on',
};

export interface CameraViewfinderProps {
  /** "Angle 3 of 4 — left side". */
  prompt: string;
  /** The framing instruction under the prompt. */
  hint?: string;
  /** Receives a `file://` URI for the captured photo. */
  onCapture: (uri: string) => void;
  /** Opens the gallery instead — the design keeps this escape hatch. */
  onPickFromGallery: () => void;
  /**
   * The camera cannot be used (no permission, no device, session error).
   * The screen should fall back to the OS picker.
   */
  onUnavailable: (reason: string) => void;
  /** Pause the session while a sheet is open or the screen is not focused. */
  isActive?: boolean;
  /** Blocks the shutter while the screen is busy. */
  disabled?: boolean;
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({
  prompt,
  hint,
  onCapture,
  onPickFromGallery,
  onUnavailable,
  isActive = true,
  disabled = false,
}) => {
  const {hasPermission, requestPermission, canRequestPermission} = useCameraPermission();
  const device = useCameraDevice('back');

  const previewOutput = usePreviewOutput();
  const photoOutput = usePhotoOutput({
    // 4:3 matches the slot thumbnails and every phone's native sensor ratio,
    // so nothing is cropped away between the guide and the saved file.
    targetResolution: CommonResolutions.FHD_4_3,
    qualityPrioritization: 'balanced',
  });

  const [flash, setFlash] = useState<FlashMode>('off');
  const [capturing, setCapturing] = useState(false);
  const [failed, setFailed] = useState(false);

  const outputs = useMemo(
    () => [previewOutput, photoOutput],
    [previewOutput, photoOutput],
  );

  const handleError = useCallback(
    (error: Error) => {
      setFailed(true);
      onUnavailable(error?.message || 'The camera could not be started.');
    },
    [onUnavailable],
  );

  useCamera({
    isActive: isActive && hasPermission && !!device && !failed,
    device: device ?? 'back',
    outputs,
    onError: handleError,
  });

  // Ask once. If the partner refuses, fall back rather than nagging.
  useEffect(() => {
    if (hasPermission) {
      return;
    }
    if (canRequestPermission) {
      requestPermission().then(granted => {
        if (!granted) {
          onUnavailable('Camera permission was not granted.');
        }
      });
    } else {
      onUnavailable('Camera permission is blocked in Settings.');
    }
  }, [hasPermission, canRequestPermission, requestPermission, onUnavailable]);

  useEffect(() => {
    if (hasPermission && device === undefined) {
      onUnavailable('No back camera was found on this device.');
    }
  }, [hasPermission, device, onUnavailable]);

  const shoot = useCallback(async () => {
    if (capturing || disabled) {
      return;
    }
    try {
      setCapturing(true);
      const photo = await photoOutput.capturePhotoToFile({flashMode: flash}, {});
      // `filePath` is a filesystem path; FormData and <Image> both need the
      // file:// scheme on Android.
      const uri = photo.filePath.startsWith('file://')
        ? photo.filePath
        : `file://${photo.filePath}`;
      onCapture(uri);
    } catch (err: any) {
      onUnavailable(err?.message || 'The photo could not be taken.');
    } finally {
      setCapturing(false);
    }
  }, [capturing, disabled, flash, onCapture, onUnavailable, photoOutput]);

  const cycleFlash = () =>
    setFlash(current => FLASH_ORDER[(FLASH_ORDER.indexOf(current) + 1) % FLASH_ORDER.length]);

  const ready = hasPermission && !!device && !failed;

  return (
    <View style={styles.root}>
      <View style={[styles.frame, {backgroundColor: t.surfaceElevated}]}>
        {ready ? (
          <NativePreviewView style={StyleSheet.absoluteFill} previewOutput={previewOutput} />
        ) : (
          <View style={styles.placeholder}>
            <ActivityIndicator size="small" color={t.textTertiary} />
            <Text style={[styles.placeholderText, {color: t.textTertiary}]}>
              Starting the camera…
            </Text>
          </View>
        )}

        {/* Framing guide. The partner lines the whole panel up inside it. */}
        <View style={styles.guide} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        <View style={styles.prompts} pointerEvents="none">
          <View style={styles.pill}>
            <Text style={styles.pillText}>{prompt}</Text>
          </View>
          {hint ? (
            <View style={styles.pillSmall}>
              <Text style={styles.pillSmallText}>{hint}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={onPickFromGallery}
          accessibilityRole="button"
          accessibilityLabel="Choose a photo from the gallery"
          style={[styles.sideBtn, {backgroundColor: t.surfaceContainer, borderColor: t.outline}]}>
          <Icon name="image" size={19} color={t.textPrimary} strokeWidth={1.9} />
        </Pressable>

        <Pressable
          onPress={shoot}
          disabled={!ready || capturing || disabled}
          accessibilityRole="button"
          accessibilityLabel="Take the photo"
          accessibilityState={{disabled: !ready || capturing || disabled}}
          style={[
            styles.shutter,
            {backgroundColor: ready && !disabled ? t.brand : t.outlineStrong},
          ]}>
          {capturing ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
        </Pressable>

        <Pressable
          onPress={cycleFlash}
          accessibilityRole="button"
          accessibilityLabel={FLASH_LABEL[flash]}
          style={[
            styles.sideBtn,
            {
              backgroundColor: flash === 'off' ? t.surfaceContainer : t.brandContainer,
              borderColor: flash === 'off' ? t.outline : t.brandAction,
            },
          ]}>
          <Icon
            name="flash"
            size={19}
            color={flash === 'off' ? t.textTertiary : t.brandInk}
            strokeWidth={1.9}
          />
          {flash === 'auto' ? (
            <Text style={[styles.flashTag, {color: t.brandInk}]}>A</Text>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    gap: 14,
  },
  frame: {
    height: 360,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 12,
  },
  guide: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 72,
    bottom: 72,
    borderRadius: radii.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 138, 51, 0.55)',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#FF8A33',
  },
  cornerTL: {
    left: -2,
    top: -2,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderTopLeftRadius: radii.md,
  },
  cornerTR: {
    right: -2,
    top: -2,
    borderRightWidth: 3,
    borderTopWidth: 3,
    borderTopRightRadius: radii.md,
  },
  cornerBL: {
    left: -2,
    bottom: -2,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderBottomLeftRadius: radii.md,
  },
  cornerBR: {
    right: -2,
    bottom: -2,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderBottomRightRadius: radii.md,
  },
  prompts: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
    gap: 7,
  },
  pill: {
    backgroundColor: 'rgba(11, 18, 32, 0.82)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pillSmall: {
    backgroundColor: 'rgba(11, 18, 32, 0.82)',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  pillSmallText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C6D2E4',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashTag: {
    position: 'absolute',
    right: 6,
    bottom: 5,
    fontSize: 9,
    fontWeight: '800',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
