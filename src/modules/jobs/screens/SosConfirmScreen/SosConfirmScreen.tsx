/**
 * SOS — hold to send.
 *
 * This replaced an Alert whose "Send SOS" button was a single tap. A single
 * tap is the wrong gesture for the one action in this app that puts a human
 * on a phone and opens a critical ticket: a mis-tap costs the safety desk a
 * false emergency and costs the partner their credibility the next time they
 * press it for real. So: hold for two seconds, and lifting early cancels.
 *
 * The screen also states what will happen BEFORE it happens. A partner in
 * trouble should not have to guess whether anyone is coming.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Linking,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {useAuthStore} from '../../../../store/auth.store';
import {triggerSOS} from '../../../../services/api/booking.api';
import {getCurrentLocation} from '../../../../utils/location';
import {tokens, radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';

/** This screen is its own dark surface in both themes — it is not a page you browse. */
const t = tokens.dark;

const HOLD_MS = 2000;
const POLICE_NUMBER = '112';

interface Coords {
  lat: number;
  lng: number;
}

interface SosConfirmScreenProps {
  navigation: any;
  route: {params?: {bookingId?: string; addressLine?: string}};
}

export const SosConfirmScreen: React.FC<SosConfirmScreenProps> = ({navigation, route}) => {
  const screenInsets = useScreenInsets();
  const {user} = useAuthStore();
  const bookingId = route.params?.bookingId;
  const addressLine = route.params?.addressLine;

  const [holding, setHolding] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationError, setLocationError] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fixed before the hold starts, so a sent alert carries a position even if
  // GPS goes quiet in the seconds after.
  useEffect(() => {
    let cancelled = false;
    getCurrentLocation()
      .then(position => {
        if (!cancelled) {
          setCoords({lat: position.lat, lng: position.lng});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLocationError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback(async () => {
    setSending(true);
    try {
      // A missing fix must not stop the alert — the desk can still call back.
      await triggerSOS(coords?.lat, coords?.lng, bookingId);
      setSent(true);
      if (Platform.OS === 'android') {
        Vibration.vibrate(400);
      }
    } catch (err: any) {
      Alert.alert(
        'The alert did not go through',
        `${err?.response?.data?.message || err?.message || 'Your network may be down.'}\n\nIf you are in danger, call ${POLICE_NUMBER} now.`,
        [
          {text: 'Call ' + POLICE_NUMBER, onPress: () => Linking.openURL(`tel:${POLICE_NUMBER}`)},
          {text: 'Try again', onPress: () => undefined},
        ],
      );
      progress.setValue(0);
    } finally {
      setSending(false);
    }
  }, [bookingId, coords, progress]);

  const startHold = useCallback(() => {
    if (sending || sent) {
      return;
    }
    setHolding(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
    holdTimer.current = setTimeout(() => {
      setHolding(false);
      send();
    }, HOLD_MS);
  }, [progress, send, sending, sent]);

  const cancelHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setHolding(false);
    progress.stopAnimation(() => {
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }).start();
    });
  }, [progress]);

  useEffect(
    () => () => {
      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
      }
    },
    [],
  );

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const consequences = [
    {icon: 'pin' as const, text: 'Your live location goes to the safety desk'},
    {
      icon: 'phone' as const,
      text: user?.phone
        ? `They call you back on ${user.phone}`
        : 'They call you back on your registered number',
    },
    {icon: 'alert' as const, text: 'A critical ticket opens and your agency is told'},
    {icon: 'pause' as const, text: 'The job pauses — no late penalty while this is open'},
  ];

  return (
    <ScreenContainer backgroundColor={t.surface}>
      <View style={[styles.root, {paddingBottom: screenInsets.stickyBarPadding}]}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, {color: t.dangerInk}]}>EMERGENCY</Text>
          <Text style={[styles.title, {color: t.textHeading}]}>
            {sent ? 'Help is on the way' : 'SOS'}
          </Text>
          <Text style={[styles.lead, {color: t.textSecondary}]}>
            {sent
              ? 'The safety desk has your location and will call you. Stay where it is safe to wait.'
              : 'Lift your finger to cancel. A single tap will never send this.'}
          </Text>
        </View>

        {/* What happens — stated before, not after. */}
        <View style={[styles.card, {backgroundColor: t.surfaceElevated}]}>
          <Text style={[styles.cardTitle, {color: t.textTertiary}]}>
            {sent ? 'WHAT IS HAPPENING NOW' : 'THE MOMENT YOU LET GO'}
          </Text>
          {consequences.map(item => (
            <View key={item.text} style={styles.consequenceRow}>
              <Icon name={item.icon} size={16} color={t.textTertiary} strokeWidth={1.9} />
              <Text style={[styles.consequenceText, {color: t.textPrimary}]}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.locationCard, {backgroundColor: t.surfaceElevated}]}>
          <Icon
            name={coords ? 'pinCheck' : 'pinOff'}
            size={17}
            color={coords ? t.successInk : t.warningInk}
            strokeWidth={1.9}
          />
          <View style={styles.locationText}>
            <Text style={[styles.locationTitle, {color: t.textPrimary}]}>
              {coords ? 'Location locked' : locationError ? 'No GPS fix' : 'Finding you…'}
            </Text>
            <Text style={[numeric, styles.locationBody, {color: t.textTertiary}]}>
              {coords
                ? [addressLine, `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`]
                    .filter(Boolean)
                    .join(' · ')
                : 'The alert still sends — the desk will call you.'}
            </Text>
          </View>
        </View>

        <View style={styles.spacer} />

        {sent ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${POLICE_NUMBER}`)}
            accessibilityRole="button"
            style={[styles.police, {backgroundColor: t.danger}]}>
            <Icon name="phone" size={18} color={t.dangerOnSolid} strokeWidth={2.2} />
            <Text style={[styles.policeText, {color: t.dangerOnSolid}]}>
              Call police — {POLICE_NUMBER}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPressIn={startHold}
            onPressOut={cancelHold}
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel="Hold for two seconds to send an emergency alert"
            accessibilityHint="Lift your finger before two seconds to cancel"
            style={[styles.holdTrack, {backgroundColor: t.danger}]}>
            <Animated.View
              style={[styles.holdFill, {width: fillWidth, backgroundColor: t.dangerInk}]}
            />
            <Text style={[styles.holdLabel, {color: t.dangerOnSolid}]}>
              {sending ? 'Sending…' : holding ? 'Keep holding…' : 'Hold for 2 seconds'}
            </Text>
          </Pressable>
        )}

        <View style={styles.footerRow}>
          {!sent ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${POLICE_NUMBER}`)}
              accessibilityRole="button"
              hitSlop={8}>
              <Text style={[styles.footerLink, {color: t.dangerInk}]}>
                Call police — {POLICE_NUMBER}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            hitSlop={8}>
            <Text style={[styles.footerLink, {color: t.textTertiary}]}>
              {sent ? 'Back to the job' : "I'm fine, go back"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  header: {
    gap: 6,
    paddingBottom: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  lead: {
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    borderRadius: radii.lg,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  consequenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  consequenceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: radii.md,
    padding: 12,
  },
  locationText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  locationBody: {
    fontSize: 11,
  },
  spacer: {
    flex: 1,
  },
  holdTrack: {
    height: 64,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  holdFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  holdLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  police: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: radii.full,
  },
  policeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '600',
  },
});
