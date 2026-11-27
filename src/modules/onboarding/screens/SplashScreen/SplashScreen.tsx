/**
 * Splash — back to the original layout.
 *
 * The redesign had replaced this with a flat dark panel and an icon. This
 * restores the shape the app shipped with: a light top half carrying the
 * Dshino mark, and the curved orange section filling the bottom.
 *
 * Two things are different from the original, deliberately:
 *
 *   - the mark is `assets/images/DShino_logo.png`, the real artwork. The old
 *     screen drew a car out of ~20 absolutely-positioned Views, which was an
 *     approximation of the logo rather than the logo;
 *   - the wait has a determinate progress bar. The original showed page dots
 *     for slides that were never wired up, so they never moved.
 *
 * The curve is a very large border radius on an over-wide box, which is how
 * the original did it too — no SVG, nothing to go wrong at odd screen ratios.
 */

import React, {useEffect, useRef} from 'react';
import {
  View,
  Image,
  Animated,
  Easing,
  Dimensions,
  StyleSheet,
} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {tokens, radii} from '../../../../theme/tokens';
import {SplashScreenProps} from './SplashScreen.types';

/** The splash is the brand moment: light surface in both themes. */
const t = tokens.light;

const {width, height} = Dimensions.get('window');

const LOGO = require('../../../../assets/images/DShino_logo.png');

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  duration = 3000,
}) => {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const curve = useRef(new Animated.Value(60)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 440,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(rise, {
        toValue: 0,
        tension: 48,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 56,
        friction: 8,
        useNativeDriver: true,
      }),
      // The orange section slides up into place behind the mark.
      Animated.timing(curve, {
        toValue: 0,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Width cannot use the native driver, so this one runs on the JS thread.
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => onComplete?.(), duration);
    return () => clearTimeout(timer);
  }, [curve, duration, fade, onComplete, progress, rise, scale]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.root, {backgroundColor: t.surface}]}>
      {/* Curved orange base. */}
      <Animated.View
        style={[
          styles.curvedSection,
          {backgroundColor: t.brand, transform: [{translateY: curve}]},
        ]}>
        <View style={[styles.curvedTop, {backgroundColor: t.brand}]} />

        <View style={styles.curvedBody}>
          <Icon name="car" size={88} color="rgba(255, 255, 255, 0.92)" strokeWidth={1.5} />
          <Text style={styles.curvedText}>Drive clean. Deliver excellence.</Text>
        </View>
      </Animated.View>

      {/* Mark and wordmark. */}
      <Animated.View
        style={[
          styles.top,
          {opacity: fade, transform: [{translateY: rise}, {scale}]},
        ]}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.name, {color: t.textHeading}]}>Dshino Partner</Text>
        <Text style={[styles.tagline, {color: t.textTertiary}]}>
          Doorstep vehicle care
        </Text>
      </Animated.View>

      {/* The wait, with a visible end. */}
      <Animated.View style={[styles.bottom, {opacity: fade}]}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, {width: barWidth}]} />
        </View>
        <Text style={styles.loading}>Getting your day ready…</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  top: {
    alignItems: 'center',
    gap: 10,
    paddingTop: height * 0.12,
    paddingHorizontal: 32,
  },
  logo: {
    width: 148,
    height: 148,
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    marginTop: -6,
  },
  curvedSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.46,
  },
  // An over-wide box with a huge radius: the visible slice reads as one broad
  // arc instead of two tight corners.
  curvedTop: {
    position: 'absolute',
    top: -70,
    left: -width * 0.5,
    right: -width * 0.5,
    height: 150,
    borderTopLeftRadius: width * 2,
    borderTopRightRadius: width * 2,
  },
  curvedBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
    paddingBottom: 72,
  },
  curvedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  bottom: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 48,
    alignItems: 'center',
    gap: 10,
  },
  track: {
    width: '100%',
    height: 4,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: '#FFFFFF',
  },
  loading: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.92)',
  },
});
