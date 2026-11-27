/**
 * Live Job Screen — the spine of the app.
 *
 * Every gate the backend enforces is shown BEFORE the partner acts: the 200 m
 * geofence, the four before-photos, the customer's OTP. The old screen only
 * surfaced them as error alerts after a failed tap, which costs a trip.
 *
 * The workflow logic here is carried over unchanged from ActiveJobScreen —
 * geofence violations open the map modal, blocked permissions offer Settings,
 * service cannot start without four photos. Completion and SOS have moved to
 * screens of their own — the code entry has gates and a retry limit of its
 * own, and SOS must not be one tap inside an Alert.
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Image,
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {StatusChip} from '../../../../components/atoms/StatusChip';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {ScreenHeader} from '../../../../components/molecules/ScreenHeader';
import {JobTimeline} from '../../../../components/molecules/JobTimeline';
import {TimelineEvent} from '../../../../components/molecules/JobTimeline/JobTimeline.types';
import {GateChecklistItem} from '../../../../components/molecules/GateChecklistItem';
import {SwipeToConfirm} from '../../../../components/molecules/SwipeToConfirm';
import {LoadingScreen} from '../../../../components/molecules/LoadingScreen';
import {ErrorScreen} from '../../../../components/molecules/ErrorScreen';
import {RaiseIssueModal} from '../../../../components/molecules/RaiseIssueModal';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {useActiveJob} from '../../../../hooks/useActiveJob';
import {useLocationTracking} from '../../../../hooks/useLocationTracking';
import {showImagePickerOptions} from '../../../../utils/camera.utils';
import {enqueuePhoto} from '../../../../services/upload/photoQueue';
import {getCurrentLocation, distanceInMeters} from '../../../../utils/location';
import {BookingStatus, BookingIssueTypeKey} from '../../../../constants/api.constants';
import {Booking} from '../../../../types/api.types';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {formatClock, formatDistance, initialsOf} from '../../../../utils/format';

/** Photos the backend demands per side before it lets the status move on. */
const REQUIRED_PHOTOS = 4;

/** Mirrors operations.geofenceRadiusMeters, which the backend defaults to 200. */
const DEFAULT_GEOFENCE_RADIUS = 200;

/**
 * The uploaded photo URLs for one side. The strip renders these — showing a
 * flat placeholder block instead made captured photos look like black squares
 * against the dark theme.
 */
const evidenceUrls = (booking: Booking | null, type: 'before' | 'after'): string[] => {
  if (!booking) {
    return [];
  }
  const fromEvidence = (booking.evidence ?? [])
    .filter(e => e?.url && e.type?.toLowerCase() === type)
    .map(e => e.url);
  if (fromEvidence.length) {
    return fromEvidence;
  }
  const legacy = type === 'before' ? booking.beforePhotos : booking.afterPhotos;
  return legacy ?? [];
};

interface LiveJobScreenProps {
  navigation: any;
  route?: {params?: {bookingId?: string; jobId?: string}};
}

export const LiveJobScreen: React.FC<LiveJobScreenProps> = ({navigation, route}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();

  /**
   * The Jobs tab already passed the tapped booking's id — this screen simply
   * ignored it and asked the server for "the" active job, so with two jobs in
   * hand it could open a different one than the partner tapped. With no id
   * (opened from the dashboard banner) the server still picks.
   */
  const routeBookingId = route?.params?.bookingId ?? route?.params?.jobId;

  const {
    booking,
    loading,
    error,
    refreshing,
    refresh,
    startEnRoute,
    markArrived,
    raiseIssue,
    startService,
    uploadingPhoto,
    updatingStatus,
  } = useActiveJob(routeBookingId);

  // Streams position while travelling — the customer's live map reads this.
  useLocationTracking(booking?.status);

  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [geofenceDistance, setGeofenceDistance] = useState<number | undefined>();
  const [geofenceRadius, setGeofenceRadius] = useState<number | undefined>();
  /** Locally measured distance to the pin, so the gate reads live. */
  const [liveDistance, setLiveDistance] = useState<number | null>(null);

  /**
   * The job on screen. Prefer the loaded booking over the route param so that
   * a dashboard-opened job (no param) also passes a real id onward.
   */
  const jobId = booking?.bookingId || booking?.id || routeBookingId;

  const status = booking?.status as BookingStatus | undefined;
  const beforePhotos = evidenceUrls(booking, 'before');
  const afterPhotos = evidenceUrls(booking, 'after');
  const beforeCount = beforePhotos.length;
  const afterCount = afterPhotos.length;

  // ─── Error handling, carried over verbatim ─────────────────────────────────

  const handleActionError = useCallback((err: any, title: string) => {
    // A geofence rejection is a hard block with several ways out — walk
    // closer, re-measure, navigate, or report broken GPS in a basement. That
    // belongs on the "Too far to start" screen, which carries all four. It
    // used to raise a dismissible sheet instead, so the partner tapped it
    // away and was back to a swipe that silently refused to work.
    if (err?.isGeofenceViolation) {
      setGeofenceDistance(err.distanceMeters);
      setGeofenceRadius(err.allowedRadiusMeters);
      navigation.navigate('GeofenceBlocked', {
        radiusMeters: err.allowedRadiusMeters ?? DEFAULT_GEOFENCE_RADIUS,
        distanceMeters: err.distanceMeters,
        bookingId: booking?.bookingId || booking?.id || routeBookingId,
      });
      return;
    }
    if (err?.isPermissionBlocked || err?.isPermissionDenied) {
      Alert.alert(
        'Location permission required',
        err.message || 'Please grant location permission to continue.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Open settings', onPress: () => Linking.openSettings()},
        ],
      );
      return;
    }
    Alert.alert(title, err?.message || 'Something went wrong. Please try again.');
  }, [booking, navigation, routeBookingId]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleEnRoute = useCallback(async () => {
    try {
      await startEnRoute();
    } catch (err) {
      handleActionError(err, 'Unable to update status');
    }
  }, [handleActionError, startEnRoute]);

  const handleMarkArrived = useCallback(async () => {
    try {
      await markArrived();
      Alert.alert('Arrival confirmed', 'The customer has been notified.');
    } catch (err) {
      handleActionError(err, 'Unable to confirm arrival');
    }
  }, [handleActionError, markArrived]);

  const handleStartService = useCallback(async () => {
    if (!booking) {
      return;
    }
    if (beforeCount < REQUIRED_PHOTOS) {
      Alert.alert(
        'Photos missing',
        `Take all ${REQUIRED_PHOTOS} before-photos first. You have ${beforeCount}.`,
      );
      return;
    }
    try {
      await startService();
    } catch (err) {
      handleActionError(err, 'Unable to start service');
    }
  }, [beforeCount, booking, handleActionError, startService]);

  const handleRaiseIssue = useCallback(
    async (issueType: BookingIssueTypeKey, description: string) => {
      try {
        setSubmittingIssue(true);
        await raiseIssue({issueType, description});
        setIssueModalVisible(false);
        Alert.alert(
          'Sent to your agency',
          'The job stays open until they respond.',
        );
      } catch (err: any) {
        Alert.alert('Unable to report issue', err?.message);
      } finally {
        setSubmittingIssue(false);
      }
    },
    [raiseIssue],
  );

  // SOS lives on its own screen: a tap inside an Alert is the wrong gesture
  // for the one action that dispatches a human.
  const handleSOS = useCallback(() => {
    navigation.navigate('SosConfirm', {
      bookingId: booking?.bookingId || booking?.id,
      addressLine:
        booking?.effectiveLocation?.addressLine1 || booking?.Address?.addressLine1 || undefined,
    });
  }, [booking, navigation]);

  // Both capture paths go through the upload queue, so a photo taken here
  // survives a dead spot exactly as one taken on the evidence screen does.
  const handlePhoto = useCallback(
    async (type: 'BEFORE' | 'AFTER') => {
      if (!jobId) {
        return;
      }
      try {
        const uri = await showImagePickerOptions('evidence');
        if (uri) {
          await enqueuePhoto(jobId, uri, type);
        }
      } catch (err: any) {
        Alert.alert('Could not add that photo', err?.message || 'Please try again.');
      }
    },
    [jobId],
  );

  const handleCall = useCallback(() => {
    const phone = booking?.Customer?.phone || booking?.customer?.phone;
    if (!phone) {
      return;
    }
    const url = Platform.select({
      ios: `telprompt:${phone}`,
      android: `tel:${phone}`,
    });
    if (url) {
      Linking.openURL(url).catch(() =>
        Alert.alert('Error', 'Unable to make the call'),
      );
    }
  }, [booking]);

  const handleNavigate = useCallback(() => {
    const addr: any = booking?.Address || booking?.address;
    const pin = booking?.effectiveLocation;
    const lat = addr?.lat ?? pin?.lat;
    const lng = addr?.lng ?? pin?.lng;
    if (lat == null || lng == null) {
      Alert.alert('No location', 'This booking has no map pin yet.');
      return;
    }
    const label = addr?.addressLine1 || pin?.addressLine1 || 'Customer';
    const scheme = Platform.OS === 'ios' ? 'maps:' : 'geo:';
    Linking.openURL(
      `${scheme}${lat},${lng}?q=${encodeURIComponent(String(label))}`,
    ).catch(() => Alert.alert('Error', 'Unable to open maps'));
  }, [booking]);

  /**
   * Measures the partner's distance to the booking pin. Failures are swallowed
   * on purpose: a missing GPS fix should leave the gate unknown, not throw an
   * alert at someone who has not tapped anything.
   */
  const measureDistance = useCallback(async () => {
    const addr: any = booking?.Address || booking?.address;
    const pin = booking?.effectiveLocation;
    const lat = Number(addr?.lat ?? pin?.lat);
    const lng = Number(addr?.lng ?? pin?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setLiveDistance(null);
      return;
    }
    try {
      const here = await getCurrentLocation({enableHighAccuracy: true});
      setLiveDistance(distanceInMeters({lat: here.lat, lng: here.lng}, {lat, lng}));
    } catch {
      setLiveDistance(null);
    }
  }, [booking]);

  // Re-measure when the job loads and after every status change, which is when
  // the answer can actually have changed.
  useEffect(() => {
    if (booking?.id) {
      measureDistance();
    }
  }, [booking?.id, booking?.status, measureDistance]);

  // ─── Timeline ──────────────────────────────────────────────────────────────

  const reached = useCallback(
    (step: BookingStatus): boolean => {
      const order: BookingStatus[] = [
        'PARTNER_ASSIGNED',
        'EN_ROUTE',
        'ARRIVED',
        'IN_PROGRESS',
        'COMPLETED',
      ];
      const normalised = status === 'ON_THE_WAY' ? 'EN_ROUTE' : status;
      return order.indexOf(normalised as BookingStatus) >= order.indexOf(step);
    },
    [status],
  );

  const radius = geofenceRadius ?? DEFAULT_GEOFENCE_RADIUS;

  /**
   * Prefer the server's number: it is the one the FSM actually judged. Fall
   * back to the locally measured distance so the gate reads live before any
   * attempt, and stay silent when neither is known rather than guess.
   */
  const geofenceGate = useMemo(() => {
    const measured = geofenceDistance ?? liveDistance;

    if (measured == null) {
      return {
        state: 'pending' as const,
        label: `Be within ${formatDistance(radius)} of the customer`,
        value: undefined,
      };
    }
    if (measured > radius) {
      return {
        state: 'blocked' as const,
        label: `Too far — move within ${formatDistance(radius)}`,
        value: formatDistance(measured),
      };
    }
    return {
      state: 'met' as const,
      label: `Inside the ${formatDistance(radius)} zone`,
      value: formatDistance(measured),
    };
  }, [geofenceDistance, liveDistance, radius]);

  const events: TimelineEvent[] = useMemo(() => {
    if (!booking) {
      return [];
    }

    const enRouteDone = reached('EN_ROUTE');
    const arrivedDone = reached('ARRIVED');
    const servicing = reached('IN_PROGRESS');

    const photoStrip = (type: 'BEFORE' | 'AFTER', urls: string[]) => {
      // Always REQUIRED_PHOTOS cells so the partner can see how many are left,
      // with the real thumbnail in the ones already taken.
      const cells = Math.max(REQUIRED_PHOTOS, urls.length);
      return (
        <Pressable
          onPress={() => handlePhoto(type)}
          accessibilityRole="button"
          accessibilityLabel={`Add ${type.toLowerCase()} photo, ${urls.length} of ${REQUIRED_PHOTOS} taken`}
          style={styles.photoRow}>
          {Array.from({length: cells}).map((_, i) => {
            const uri = urls[i];
            if (uri) {
              return (
                <Image
                  key={uri}
                  source={{uri}}
                  style={[styles.photoCell, {backgroundColor: t.placeholder}]}
                  resizeMode="cover"
                />
              );
            }
            return (
              <View
                key={`empty-${i}`}
                style={[
                  styles.photoCell,
                  styles.photoCellEmpty,
                  {backgroundColor: t.surface, borderColor: t.outlineStrong},
                ]}>
                <Icon name="plus" size={16} color={t.textTertiary} strokeWidth={2} />
              </View>
            );
          })}
        </Pressable>
      );
    };

    const list: TimelineEvent[] = [
      {
        key: 'enroute',
        title: 'On the way',
        state: enRouteDone ? 'done' : 'current',
        time: formatClock(booking.enRouteAt),
        children: enRouteDone ? undefined : (
          <Text style={[styles.hint, {color: t.textSecondary}]}>
            Tell the customer you have left. Their live map starts here.
          </Text>
        ),
      },
      {
        key: 'arrived',
        title: 'Arrived on site',
        state: arrivedDone ? 'done' : enRouteDone ? 'current' : 'pending',
        time: formatClock(booking.arrivedAt),
        children:
          !arrivedDone && enRouteDone ? (
            <GateChecklistItem
              label={geofenceGate.label}
              state={geofenceGate.state}
              value={geofenceGate.value}
              onPress={
                geofenceGate.state === 'met'
                  ? undefined
                  : () =>
                      navigation.navigate('GeofenceBlocked', {
                        radiusMeters: radius,
                        distanceMeters: geofenceDistance ?? liveDistance ?? undefined,
                        bookingId: jobId,
                      })
              }
            />
          ) : undefined,
      },
      {
        key: 'start',
        title: servicing ? 'Servicing' : 'Start the service',
        state: servicing ? 'done' : arrivedDone ? 'current' : 'pending',
        time: formatClock(booking.inProgressAt),
        badge:
          !servicing && booking.minutesLate && booking.minutesLate > 0 ? (
            <View style={[styles.badge, {backgroundColor: t.dangerContainer}]}>
              <Text style={[numeric, styles.badgeText, {color: t.dangerInk}]}>
                {booking.minutesLate} min late
              </Text>
            </View>
          ) : undefined,
        children:
          !servicing && arrivedDone ? (
            <GateChecklistItem
              label="Before photos"
              state={beforeCount >= REQUIRED_PHOTOS ? 'met' : 'pending'}
              value={`${beforeCount} / ${REQUIRED_PHOTOS}`}
              hint={
                beforeCount >= REQUIRED_PHOTOS
                  ? undefined
                  : 'Tap to shoot the remaining panels'
              }
              onPress={() => navigation.navigate('PhotoEvidence', {type: 'BEFORE', bookingId: jobId})}>
              {photoStrip('BEFORE', beforePhotos)}
            </GateChecklistItem>
          ) : undefined,
      },
      {
        key: 'finish',
        title: 'Finish & collect OTP',
        state: servicing ? 'current' : 'pending',
        children: servicing ? (
          <>
            <GateChecklistItem
              label="After photos"
              state={afterCount >= REQUIRED_PHOTOS ? 'met' : 'pending'}
              value={`${afterCount} / ${REQUIRED_PHOTOS}`}
              onPress={() => navigation.navigate('PhotoEvidence', {type: 'AFTER', bookingId: jobId})}>
              {photoStrip('AFTER', afterPhotos)}
            </GateChecklistItem>
            <Text style={[styles.hint, {color: t.textSecondary}]}>
              Then ask the customer for the 4-digit code in their app. You cannot
              see it, and support cannot read it out to you.
            </Text>
          </>
        ) : undefined,
      },
    ];

    return list;
  }, [
    afterPhotos,
    beforePhotos,
    jobId,
    afterCount,
    beforeCount,
    booking,
    navigation,
    geofenceGate,
    geofenceDistance,
    liveDistance,
    radius,
    handlePhoto,
    reached,
    t,
  ]);

  // ─── Primary action ────────────────────────────────────────────────────────

  const action = useMemo(() => {
    if (!status) {
      return null;
    }
    if (status === 'PARTNER_ASSIGNED') {
      return {label: "Swipe — I'm on the way", onConfirm: handleEnRoute, state: 'ready' as const};
    }
    if (status === 'EN_ROUTE' || status === 'ON_THE_WAY') {
      return {label: "Swipe — I've arrived", onConfirm: handleMarkArrived, state: 'ready' as const};
    }
    if (status === 'ARRIVED') {
      const missing = REQUIRED_PHOTOS - beforeCount;
      return missing > 0
        ? {
            label: 'Swipe to start service',
            lockedLabel: `${missing} more photo${missing === 1 ? '' : 's'} to unlock`,
            onConfirm: handleStartService,
            state: 'locked' as const,
          }
        : {
            label: 'Swipe to start service',
            onConfirm: handleStartService,
            state: 'ready' as const,
          };
    }
    if (status === 'IN_PROGRESS') {
      const missing = REQUIRED_PHOTOS - afterCount;
      return missing > 0
        ? {
            label: 'Swipe to complete job',
            lockedLabel: `${missing} more photo${missing === 1 ? '' : 's'} to unlock`,
            onConfirm: () => navigation.navigate('CompleteJob', {bookingId: jobId}),
            state: 'locked' as const,
            tone: 'success' as const,
          }
        : {
            label: 'Swipe to complete job',
            onConfirm: () => navigation.navigate('CompleteJob', {bookingId: jobId}),
            state: 'ready' as const,
            tone: 'success' as const,
          };
    }
    return null;
  }, [
    afterCount,
    beforeCount,
    handleEnRoute,
    handleMarkArrived,
    handleStartService,
    jobId,
    navigation,
    status,
  ]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading && !booking) {
    return <LoadingScreen />;
  }

  if (error && !booking) {
    return <ErrorScreen message={error} onRetry={refresh} />;
  }

  if (!booking) {
    return (
      <ScreenContainer backgroundColor={t.surfaceContainer}>
        <ScreenHeader title="No live job" onBack={() => navigation?.goBack()} />
        <View style={styles.emptyWrap}>
          <Icon name="briefcase" size={26} color={t.textDisabled} />
          <Text style={[styles.emptyTitle, {color: t.textHeading}]}>
            Nothing in progress
          </Text>
          <Text style={[styles.emptyBody, {color: t.textSecondary}]}>
            Open a stop from your route to begin it.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const customerName = booking.Customer?.name || booking.customerName || 'Customer';
  const addressLine =
    booking.Address?.addressLine1 ||
    booking.effectiveLocation?.addressLine1 ||
    booking.address?.fullAddress ||
    '';
  const plate = booking.Vehicle?.registrationNumber;

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer} edges={['top']}>
      <ScreenHeader
        variant="inverse"
        title={booking.Service?.name || booking.service?.name || 'Service'}
        subtitle={[plate, booking.bookingNumber && `#${booking.bookingNumber}`]
          .filter(Boolean)
          .join(' · ')}
        subtitleNumeric
        onBack={() => navigation?.goBack()}
        right={status ? <StatusChip status={status} /> : undefined}
      />

      {/* Customer strip */}
      <View
        style={[
          styles.customer,
          {backgroundColor: t.surface, borderBottomColor: t.outline},
        ]}>
        <View style={[styles.avatar, {backgroundColor: t.infoContainer}]}>
          <Text style={[styles.avatarText, {color: t.infoInk}]}>
            {initialsOf(customerName)}
          </Text>
        </View>
        <View style={styles.customerText}>
          <Text style={[styles.customerName, {color: t.textHeading}]} numberOfLines={1}>
            {customerName}
          </Text>
          {addressLine ? (
            <Text style={[styles.customerAddr, {color: t.textTertiary}]} numberOfLines={1}>
              {addressLine}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={handleCall}
          accessibilityRole="button"
          accessibilityLabel={`Call ${customerName}`}
          style={[styles.roundBtn, {borderColor: t.outline, backgroundColor: t.surface}]}>
          <Icon name="phone" size={17} color={t.neutralInk} strokeWidth={1.9} />
        </Pressable>
        <Pressable
          onPress={handleNavigate}
          accessibilityRole="button"
          accessibilityLabel="Navigate to the address"
          style={[styles.roundBtn, {borderColor: t.outline, backgroundColor: t.surface}]}>
          <Icon name="navigation" size={17} color={t.neutralInk} strokeWidth={1.9} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              refresh();
              measureDistance();
            }}
            tintColor={t.brand}
            colors={[t.brandAction]}
          />
        }>
        <JobTimeline variant="stepper" events={events} />

        <Pressable
          onPress={() => navigation.navigate('JobTimeline', {bookingId: booking.id})}
          accessibilityRole="button"
          style={[
            styles.timelineLink,
            {borderColor: t.outline, backgroundColor: t.surface},
          ]}>
          <Icon name="clock" size={16} color={t.neutralInk} strokeWidth={1.9} />
          <Text style={[styles.timelineLinkText, {color: t.textPrimary}]}>
            See the full timeline
          </Text>
          <Icon name="chevronRight" size={16} color={t.textDisabled} strokeWidth={2.2} />
        </Pressable>
      </ScrollView>

      {/* Sticky action bar */}
      <View
        style={[
          styles.actions,
          {
            backgroundColor: t.surface,
            borderTopColor: t.outline,
            paddingBottom: screenInsets.stickyBarPadding,
          },
        ]}>
        {action ? (
          <SwipeToConfirm
            label={action.label}
            lockedLabel={action.lockedLabel}
            loadingLabel="Working…"
            tone={action.tone}
            state={updatingStatus || uploadingPhoto ? 'loading' : action.state}
            onConfirm={action.onConfirm}
          />
        ) : null}
        <View style={styles.secondaryRow}>
          <Pressable
            onPress={() => setIssueModalVisible(true)}
            accessibilityRole="button"
            style={[
              styles.secondaryBtn,
              {borderColor: t.outline, backgroundColor: t.surface},
            ]}>
            <Text style={[styles.secondaryText, {color: t.neutralInk}]}>
              Report an issue
            </Text>
          </Pressable>
          <Pressable
            onPress={handleSOS}
            accessibilityRole="button"
            accessibilityLabel="Emergency SOS"
            style={[
              styles.sosBtn,
              {borderColor: t.dangerBorder, backgroundColor: t.dangerContainer},
            ]}>
            <Text style={[styles.secondaryText, {color: t.dangerInk}]}>
              SOS
            </Text>
          </Pressable>
        </View>
      </View>

      <RaiseIssueModal
        visible={issueModalVisible}
        submitting={submittingIssue}
        onClose={() => setIssueModalVisible(false)}
        onSubmit={handleRaiseIssue}
      />

    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  customer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
  },
  customerText: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
  },
  customerAddr: {
    fontSize: 11,
    marginTop: 1,
  },
  roundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
  },
  timelineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  timelineLinkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 6,
  },
  photoCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCellEmpty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    gap: 9,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 9,
  },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosBtn: {
    width: 92,
    height: 44,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
