/**
 * Too far to start.
 *
 * The backend only lets a service begin within 200 m of the customer's pin,
 * so the evidence matches the address. This screen measures the gap live and
 * says how much further to go, instead of repeating a rejection.
 *
 * It also carries the escape hatch that matters in practice: basements and
 * malls break GPS, and a partner standing at the car needs a way through that
 * is not "keep tapping".
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, ScrollView, Pressable, StyleSheet, Alert, Linking, Platform} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {ScreenHeader} from '../../../../components/molecules/ScreenHeader';
import {JobTimeline} from '../../../../components/molecules/JobTimeline';
import {TimelineMilestone} from '../../../../components/molecules/JobTimeline/JobTimeline.types';
import {LoadingScreen} from '../../../../components/molecules/LoadingScreen';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {useActiveJob} from '../../../../hooks/useActiveJob';
import {getCurrentLocation, distanceInMeters} from '../../../../utils/location';
import {BookingStatus} from '../../../../constants/api.constants';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {formatClock, formatDistance} from '../../../../utils/format';

/** Mirrors operations.geofenceRadiusMeters on the backend. */
const DEFAULT_RADIUS = 200;

interface GeofenceBlockedScreenProps {
  navigation: any;
  route: {
    params?: {radiusMeters?: number; distanceMeters?: number; bookingId?: string};
  };
}

export const GeofenceBlockedScreen: React.FC<GeofenceBlockedScreenProps> = ({
  navigation,
  route,
}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();
  const {booking, loading, raiseIssue} = useActiveJob(route.params?.bookingId);

  const radius = route.params?.radiusMeters ?? DEFAULT_RADIUS;
  const [distance, setDistance] = useState<number | null>(
    route.params?.distanceMeters ?? null,
  );
  const [measuring, setMeasuring] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const pin = useMemo(() => {
    const addr: any = booking?.Address || booking?.address;
    const fallback = booking?.effectiveLocation;
    const lat = Number(addr?.lat ?? fallback?.lat);
    const lng = Number(addr?.lng ?? fallback?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? {lat, lng} : null;
  }, [booking]);

  const measure = useCallback(async () => {
    if (!pin) {
      setGpsError('This booking has no map pin, so the distance cannot be checked.');
      return;
    }
    setMeasuring(true);
    try {
      const here = await getCurrentLocation({enableHighAccuracy: true});
      setDistance(distanceInMeters({lat: here.lat, lng: here.lng}, pin));
      setGpsError(null);
    } catch (err: any) {
      setGpsError(err?.message || 'Could not get a GPS fix right now.');
    } finally {
      setMeasuring(false);
    }
  }, [pin]);

  useEffect(() => {
    if (booking?.id) {
      measure();
    }
  }, [booking?.id, measure]);

  const inside = distance != null && distance <= radius;
  const toGo = distance != null ? Math.max(distance - radius, 0) : null;

  const openMaps = useCallback(() => {
    if (!pin) {
      Alert.alert('No location', 'This booking has no map pin yet.');
      return;
    }
    const addr: any = booking?.Address || booking?.address;
    const label = addr?.addressLine1 || 'Customer';
    const scheme = Platform.OS === 'ios' ? 'maps:' : 'geo:';
    Linking.openURL(
      `${scheme}${pin.lat},${pin.lng}?q=${encodeURIComponent(String(label))}`,
    ).catch(() => Alert.alert('Error', 'Unable to open maps'));
  }, [booking, pin]);

  const reportGps = useCallback(() => {
    Alert.alert(
      "You're at the car but it says you're far?",
      'This raises a GPS issue with your agency so they can unblock the job. Your location is attached.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Raise it',
          onPress: async () => {
            try {
              await raiseIssue({
                issueType: 'OTHER',
                description: `GPS reports ${
                  distance != null ? formatDistance(distance) : 'an unknown distance'
                } from the pin, but I am at the vehicle. Likely a basement or covered parking.`,
              });
              Alert.alert(
                'Sent to your agency',
                'Keep the job open until they respond.',
              );
            } catch (err: any) {
              Alert.alert('Could not send', err?.message || 'Please try again.');
            }
          },
        },
      ],
    );
  }, [distance, raiseIssue]);

  const milestones = useMemo<TimelineMilestone[]>(() => {
    const status = booking?.status as BookingStatus | undefined;
    const enRouteDone =
      status === 'EN_ROUTE' ||
      status === 'ON_THE_WAY' ||
      status === 'ARRIVED' ||
      status === 'IN_PROGRESS';
    return [
      {
        key: 'assigned',
        label: 'Assigned',
        state: 'done',
        meta: formatClock(booking?.createdAt) || undefined,
      },
      {
        key: 'enroute',
        label: 'On the way',
        state: enRouteDone ? 'done' : 'pending',
        meta: formatClock(booking?.enRouteAt) || undefined,
      },
      {key: 'arrive', label: 'Arrive', state: 'blocked', meta: 'blocked'},
      {key: 'done', label: 'Done', state: 'pending'},
    ];
  }, [booking]);

  if (loading && !booking) {
    return <LoadingScreen message="Loading the job..." />;
  }

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title={booking?.Service?.name || 'Too far to start'}
        subtitle={booking?.Vehicle?.registrationNumber ?? undefined}
        subtitleNumeric
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.body,
          {paddingBottom: 96 + screenInsets.stickyBarPadding},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroText}>
          <Text style={[styles.heroTitle, {color: t.textHeading}]}>
            {inside ? 'You are inside the zone' : 'Get closer to start'}
          </Text>
          <Text style={[styles.heroBody, {color: t.textSecondary}]}>
            Dshino only lets a service begin within{' '}
            <Text style={styles.strong}>{formatDistance(radius)}</Text> of the customer,
            so the evidence matches the address.
            {toGo != null && toGo > 0
              ? ` You need about ${formatDistance(toGo)} more.`
              : inside
              ? ' You can go back and start the job.'
              : ''}
          </Text>
        </View>

        {/* Distance meter */}
        <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <View style={styles.meterHead}>
            <Text style={[styles.cardTitle, {color: t.textHeading}]}>
              Distance to the pin
            </Text>
            <Text
              style={[
                numeric,
                styles.meterValue,
                {color: inside ? t.successInk : t.warningInk},
              ]}>
              {distance != null ? formatDistance(distance) : measuring ? '…' : '—'}
            </Text>
          </View>

          <View style={[styles.track, {backgroundColor: t.neutralContainer}]}>
            <View
              style={[
                styles.trackZone,
                {
                  backgroundColor: t.success,
                  width: distance != null ? `${Math.min((radius / Math.max(distance, radius)) * 100, 100)}%` : '14%',
                },
              ]}
            />
          </View>

          <View style={styles.trackLabels}>
            <Text style={[numeric, styles.trackLabel, {color: t.successInk}]}>
              0 – {formatDistance(radius)} · can start
            </Text>
            <Text style={[styles.trackLabel, {color: t.textTertiary}]}>
              {inside ? 'you are here' : 'you are outside'}
            </Text>
          </View>

          {gpsError ? (
            <Text style={[styles.gpsError, {color: t.warningInk}]}>{gpsError}</Text>
          ) : null}

          <Pressable
            onPress={measure}
            disabled={measuring}
            accessibilityRole="button"
            style={[styles.recheck, {borderColor: t.outlineStrong}]}>
            <Icon name="pin" size={15} color={t.textPrimary} strokeWidth={2} />
            <Text style={[styles.recheckText, {color: t.textPrimary}]}>
              {measuring ? 'Checking…' : 'Check again'}
            </Text>
          </Pressable>
        </View>

        {/* Progress */}
        <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <Text style={[styles.cardTitle, {color: t.textHeading}]}>Progress</Text>
          <JobTimeline variant="compact" milestones={milestones} />
        </View>

        {/* Escape hatch */}
        <Pressable
          onPress={reportGps}
          accessibilityRole="button"
          style={[styles.hatch, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <View style={[styles.hatchIcon, {backgroundColor: t.neutralContainer}]}>
            <Icon name="pinOff" size={17} color={t.neutralInk} strokeWidth={1.9} />
          </View>
          <View style={styles.hatchText}>
            <Text style={[styles.hatchTitle, {color: t.textHeading}]}>
              You're at the car but it says you're far?
            </Text>
            <Text style={[styles.hatchBody, {color: t.textTertiary}]}>
              Basements and malls break GPS — raise it and keep working
            </Text>
          </View>
          <Icon name="chevronRight" size={17} color={t.textDisabled} strokeWidth={2.2} />
        </Pressable>
      </ScrollView>

      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: t.surface,
            borderTopColor: t.outline,
            paddingBottom: screenInsets.stickyBarPadding,
          },
        ]}>
        {inside ? (
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            style={[styles.primaryBtn, {backgroundColor: t.success}]}>
            <Text style={[styles.primaryBtnText, {color: t.successOnSolid}]}>
              Back to the job
            </Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={openMaps}
              accessibilityRole="button"
              style={[styles.primaryBtn, {backgroundColor: t.brandAction}]}>
              <Icon
                name="navigation"
                size={18}
                color={t.brandActionText}
                strokeWidth={2.2}
              />
              <Text style={[styles.primaryBtnText, {color: t.brandActionText}]}>
                Navigate there
              </Text>
            </Pressable>
            <View
              style={[
                styles.lockedBar,
                {backgroundColor: t.neutralContainer, borderColor: t.outline},
              ]}>
              <Icon name="lock" size={15} color={t.textDisabled} strokeWidth={2} />
              <Text style={[numeric, styles.lockedText, {color: t.textTertiary}]}>
                Unlocks within {formatDistance(radius)}
              </Text>
            </View>
          </>
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },
  heroText: {
    gap: 5,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.28,
  },
  heroBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  strong: {
    fontWeight: '700',
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  meterHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  meterValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  track: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  trackZone: {
    height: '100%',
    borderRadius: 6,
  },
  trackLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trackLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  gpsError: {
    fontSize: 12,
    lineHeight: 17,
  },
  recheck: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  recheckText: {
    fontSize: 13,
    fontWeight: '700',
  },
  hatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  hatchIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hatchText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  hatchTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  hatchBody: {
    fontSize: 11,
    lineHeight: 15,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 9,
  },
  primaryBtn: {
    height: 50,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  lockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  lockedText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
