/**
 * SwipeToConfirm — the only way an irreversible job action is taken.
 *
 * Start service, complete a job, check out: all of them cost something if
 * fired by accident, so none of them is a bare tap. When a backend gate is
 * unmet the track says which one, instead of failing after the fact.
 *
 * Accessibility: screen readers get a real button, because a drag gesture is
 * not operable with TalkBack.
 */

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {Text} from '../../atoms/Text';
import {Icon, IconName} from '../../atoms/Icon';
import {useTheme} from '../../../hooks/useTheme';
import {radii} from '../../../theme/tokens';

export type SwipeState = 'ready' | 'locked' | 'loading';

export interface SwipeToConfirmProps {
  label: string;
  /** Shown when `state` is locked — name the gate, not the failure. */
  lockedLabel?: string;
  loadingLabel?: string;
  state?: SwipeState;
  tone?: 'brand' | 'success';
  icon?: IconName;
  onConfirm: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TRACK_HEIGHT = 52;
const KNOB = 42;
const PADDING = 5;
/** Fraction of the track that counts as a confirmed swipe. */
const THRESHOLD = 0.75;

export const SwipeToConfirm: React.FC<SwipeToConfirmProps> = ({
  label,
  lockedLabel,
  loadingLabel,
  state = 'ready',
  tone = 'brand',
  icon = 'arrowRight',
  onConfirm,
  style,
  testID,
}) => {
  const {t} = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const maxTravel = Math.max(trackWidth - KNOB - PADDING * 2, 0);

  const interactive = state === 'ready';

  const reset = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [translateX]);

  const complete = useCallback(() => {
    Animated.timing(translateX, {
      toValue: maxTravel,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      onConfirm();
      translateX.setValue(0);
    });
  }, [maxTravel, onConfirm, translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => interactive,
        onMoveShouldSetPanResponder: (_, g) => interactive && Math.abs(g.dx) > 4,
        onPanResponderMove: (_, g) => {
          if (!interactive) {
            return;
          }
          const next = Math.min(Math.max(g.dx, 0), maxTravel);
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, g) => {
          if (!interactive) {
            return;
          }
          if (maxTravel > 0 && g.dx >= maxTravel * THRESHOLD) {
            complete();
          } else {
            reset();
          }
        },
        onPanResponderTerminate: reset,
      }),
    [complete, interactive, maxTravel, reset, translateX],
  );

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  const trackBg =
    state === 'locked'
      ? t.neutralContainer
      : tone === 'success'
      ? t.success
      : t.brandAction;

  const trackText =
    state === 'locked'
      ? t.textTertiary
      : tone === 'success'
      ? t.successOnSolid
      : t.brandActionText;

  const knobBg = state === 'locked' ? t.surface : t.surface;
  const knobIconColour =
    state === 'locked' ? t.textDisabled : tone === 'success' ? t.success : t.brandAction;

  const text =
    state === 'locked'
      ? lockedLabel ?? label
      : state === 'loading'
      ? loadingLabel ?? label
      : label;

  return (
    <View
      testID={testID}
      onLayout={onLayout}
      accessible
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityHint={interactive ? 'Swipe right, or double tap to confirm' : undefined}
      accessibilityState={{disabled: !interactive, busy: state === 'loading'}}
      onAccessibilityTap={interactive ? onConfirm : undefined}
      style={[
        styles.track,
        {
          backgroundColor: trackBg,
          borderColor: state === 'locked' ? t.outline : trackBg,
        },
        style,
      ]}>
      {state === 'loading' ? (
        <View style={styles.loadingRow}>
          <View style={[styles.spinner, {borderColor: trackText}]} />
          <Text style={[styles.label, {color: trackText}]}>{text}</Text>
        </View>
      ) : (
        <>
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.knob,
              {
                backgroundColor: knobBg,
                borderColor: state === 'locked' ? t.outline : 'transparent',
                borderWidth: state === 'locked' ? 1 : 0,
                transform: [{translateX}],
              },
            ]}>
            <Icon
              name={state === 'locked' ? 'lock' : icon}
              size={state === 'locked' ? 17 : 19}
              color={knobIconColour}
              strokeWidth={2.4}
            />
          </Animated.View>
          <Text
            style={[styles.label, styles.labelCentred, {color: trackText}]}
            numberOfLines={1}>
            {text}
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radii.full,
    borderWidth: 1,
    padding: PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  labelCentred: {
    position: 'absolute',
    left: KNOB + PADDING,
    right: KNOB + PADDING,
    textAlign: 'center',
  },
  loadingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  spinner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    opacity: 0.6,
  },
});
