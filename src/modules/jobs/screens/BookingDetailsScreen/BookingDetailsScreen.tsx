/**
 * Booking Details Screen
 *
 * Renders a booking at any status. This is the only screen that can show a
 * CANCELLED or SLA_BREACHED booking — the Jobs tab reads today's open route,
 * which excludes both.
 *
 * Every section is omitted when its data is missing, so a sparse booking does
 * not render a page of empty rows. State transitions are deliberately NOT
 * here: this screen hands off to the live job, which owns the whole FSM and
 * its gates, so the two can never disagree about what is allowed next.
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Image,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Linking,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {StatusChip} from '../../../../components/atoms/StatusChip';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {ScreenHeader} from '../../../../components/molecules/ScreenHeader';
import {JobTimeline} from '../../../../components/molecules/JobTimeline';
import {TimelineMilestone} from '../../../../components/molecules/JobTimeline/JobTimeline.types';
import {LoadingScreen} from '../../../../components/molecules/LoadingScreen';
import {ErrorScreen} from '../../../../components/molecules/ErrorScreen';
import {getBookingDetails} from '../../../../services/api/booking.api';
import {BookingStatus} from '../../../../constants/api.constants';
import {Booking} from '../../../../types/api.types';
import {logger} from '../../../../utils/logger';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {useFocusRefresh} from '../../../../hooks/useFocusRefresh';
import {
  formatMoney,
  formatClock,
  formatDuration,
  formatSlotRange,
  initialsOf,
} from '../../../../utils/format';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const joinParts = (...parts: (string | null | undefined)[]): string | null => {
  const filled = parts.filter((p): p is string => Boolean(p && String(p).trim()));
  return filled.length ? filled.join(' · ') : null;
};

const buildAddress = (booking: Booking): string | null => {
  const addr: any = booking.Address || booking.address;
  if (!addr) {
    return booking.effectiveLocation?.addressLine1 ?? null;
  }
  const parts = [
    addr.addressLine1,
    addr.addressLine2,
    addr.area,
    addr.city,
    addr.pincode,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : addr.fullAddress ?? null;
};

/** Statuses this partner can still act on; anything else is read-only. */
const ACTIONABLE: BookingStatus[] = [
  'PARTNER_ASSIGNED',
  'EN_ROUTE',
  'ON_THE_WAY',
  'ARRIVED',
  'IN_PROGRESS',
];

const reachedBy = (status: BookingStatus, step: BookingStatus): boolean => {
  const order: BookingStatus[] = [
    'PARTNER_ASSIGNED',
    'EN_ROUTE',
    'ARRIVED',
    'IN_PROGRESS',
    'COMPLETED',
  ];
  const normalised = status === 'ON_THE_WAY' ? 'EN_ROUTE' : status;
  const a = order.indexOf(normalised);
  const b = order.indexOf(step);
  return a >= 0 && b >= 0 && a >= b;
};

// ─── Building blocks ─────────────────────────────────────────────────────────

const Card: React.FC<{children: React.ReactNode; style?: any}> = ({children, style}) => {
  const {t} = useTheme();
  return (
    <View
      style={[
        styles.card,
        {backgroundColor: t.surface, borderColor: t.outline},
        style,
      ]}>
      {children}
    </View>
  );
};

const MoneyRow: React.FC<{label: string; value: string; emphasis?: boolean}> = ({
  label,
  value,
  emphasis,
}) => {
  const {t} = useTheme();
  return (
    <View style={styles.moneyRow}>
      <Text
        style={[
          styles.moneyLabel,
          {color: emphasis ? t.textHeading : t.textSecondary, fontWeight: emphasis ? '700' : '500'},
        ]}>
        {label}
      </Text>
      <Text
        style={[
          numeric,
          styles.moneyValue,
          {color: emphasis ? t.textHeading : t.textPrimary, fontSize: emphasis ? 16 : 14},
        ]}>
        {value}
      </Text>
    </View>
  );
};

const PhotoGroup: React.FC<{label: string; urls: string[]}> = ({label, urls}) => {
  const {t} = useTheme();
  if (!urls.length) {
    return null;
  }
  return (
    <View style={styles.photoGroup}>
      <Text style={[styles.photoLabel, {color: t.textTertiary}]}>
        {label} · {urls.length}
      </Text>
      <View style={styles.photoRow}>
        {urls.map(uri => (
          <Image
            key={uri}
            source={{uri}}
            style={[styles.photo, {backgroundColor: t.placeholder}]}
            resizeMode="cover"
          />
        ))}
      </View>
    </View>
  );
};

// ─── Screen ──────────────────────────────────────────────────────────────────

interface BookingDetailsScreenProps {
  navigation: any;
  route: {params?: {bookingId?: string}};
}

export const BookingDetailsScreen: React.FC<BookingDetailsScreenProps> = ({
  navigation,
  route,
}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();
  const bookingId = route.params?.bookingId;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = useCallback(
    async (isRefresh = false) => {
      if (!bookingId) {
        setError('No booking was selected.');
        setLoading(false);
        return;
      }
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const data = await getBookingDetails(bookingId);
        setBooking(data);
        setError(null);
      } catch (err: any) {
        logger.error('[BookingDetails] Fetch failed', err);
        setError(err?.response?.data?.message || 'Could not load this booking.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [bookingId],
  );

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  /** Stable refresh for useFocusRefresh — always the 'refresh' variant. */
  const refreshBooking = useCallback(() => {
    fetchBooking(true);
  }, [fetchBooking]);

  // Your agency can cancel or reschedule this booking while it is open.
  useFocusRefresh(refreshBooking);

  const customerPhone = booking?.Customer?.phone || booking?.customerPhone;

  const handleCall = useCallback(() => {
    if (!customerPhone) {
      return;
    }
    const url = Platform.select({
      ios: `telprompt:${customerPhone}`,
      android: `tel:${customerPhone}`,
    });
    if (url) {
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to make the call'));
    }
  }, [customerPhone]);

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

  const photos = useMemo(() => {
    const evidence = Array.isArray(booking?.evidence) ? booking!.evidence : [];
    const pick = (kind: string) =>
      evidence.filter(e => e?.url && e.type?.toLowerCase() === kind).map(e => e.url);
    return {
      before: pick('before').length ? pick('before') : booking?.beforePhotos || [],
      after: pick('after').length ? pick('after') : booking?.afterPhotos || [],
    };
  }, [booking]);

  const milestones = useMemo<TimelineMilestone[]>(() => {
    if (!booking) {
      return [];
    }
    const status = booking.status as BookingStatus;

    if (status === 'CANCELLED' || status === 'SLA_BREACHED') {
      return [
        {key: 'assigned', label: 'Assigned', state: 'done'},
        {
          key: 'ended',
          label: status === 'CANCELLED' ? 'Cancelled' : 'Slot closed',
          state: 'failed',
        },
      ];
    }

    const step = (
      key: string,
      label: string,
      at: BookingStatus,
      time?: string | null,
    ): TimelineMilestone => {
      const done = reachedBy(status, at) && status !== at;
      return {
        key,
        label,
        state: done ? 'done' : status === at ? 'current' : 'pending',
        meta: formatClock(time) || undefined,
      };
    };

    return [
      {
        key: 'assigned',
        label: 'Assigned',
        state: 'done',
        meta: formatClock(booking.createdAt) || undefined,
      },
      step('enroute', 'On the way', 'EN_ROUTE', booking.enRouteAt),
      step('arrived', 'Arrived', 'ARRIVED', booking.arrivedAt),
      {
        key: 'done',
        label: 'Done',
        state:
          status === 'COMPLETED' || status === 'REVIEWED'
            ? 'done'
            : status === 'IN_PROGRESS'
            ? 'current'
            : 'pending',
        meta: formatClock(booking.completedAt) || undefined,
      },
    ];
  }, [booking]);

  if (loading && !booking) {
    return <LoadingScreen message="Loading booking..." />;
  }

  if (error && !booking) {
    return <ErrorScreen message={error} onRetry={() => fetchBooking()} />;
  }

  if (!booking) {
    return null;
  }

  const status = booking.status as BookingStatus;
  const isCancelled = status === 'CANCELLED';
  const isBreached = status === 'SLA_BREACHED';
  const canOpen = ACTIONABLE.includes(status);

  const serviceName = booking.Service?.name || booking.service?.name || 'Service';
  const plate = booking.Vehicle?.registrationNumber;
  const vehicleName = joinParts(booking.Vehicle?.make, booking.Vehicle?.model);
  const vehicleClass = joinParts(
    booking.Vehicle?.color,
    booking.Vehicle?.Category?.name || booking.Vehicle?.category,
  );
  const customerName = booking.Customer?.name || booking.customerName || 'Customer';
  const address = buildAddress(booking);
  const landmark = (booking.Address as any)?.landmark;
  const payment = booking.Payments?.[0];
  const paid = payment?.status === 'COMPLETED';

  const slot = formatSlotRange(booking.scheduledTimeSlot, booking.Service?.duration);
  const duration = formatDuration(booking.Service?.duration);

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title={serviceName}
        subtitle={
          joinParts(
            booking.bookingNumber ? `#${booking.bookingNumber}` : null,
            booking.scheduledDate,
          ) ?? undefined
        }
        subtitleNumeric
        onBack={() => navigation?.goBack()}
        right={<StatusChip status={status} />}
      />

      <ScrollView
        contentContainerStyle={[
          styles.body,
          {
            paddingBottom: canOpen
              ? 80 + screenInsets.stickyBarPadding
              : screenInsets.stackContentPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchBooking(true)}
            tintColor={t.brand}
            colors={[t.brandAction]}
          />
        }>
        {/* Ended states lead, because nothing below them is actionable. */}
        {isCancelled || isBreached ? (
          <View
            style={[
              styles.banner,
              {backgroundColor: t.dangerContainer, borderColor: t.dangerBorder},
            ]}>
            <Icon name="alert" size={18} color={t.dangerInk} strokeWidth={2} />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, {color: t.dangerInk}]}>
                {isCancelled ? 'This booking was cancelled' : 'The slot closed unserved'}
              </Text>
              <Text style={[styles.bannerBody, {color: t.dangerInk}]}>
                {isCancelled
                  ? booking.cancellationReason ||
                    'No reason was recorded. Nothing was credited for this job.'
                  : 'It can no longer be started. Only your agency can reschedule it.'}
              </Text>
            </View>
          </View>
        ) : null}

        {booking.minutesLate && booking.minutesLate > 0 && !isCancelled ? (
          <View
            style={[
              styles.banner,
              {backgroundColor: t.warningContainer, borderColor: t.warningBorder},
            ]}>
            <Icon name="clock" size={18} color={t.warningInk} strokeWidth={2} />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, {color: t.warningInk}]}>
                Running {booking.minutesLate} minutes late
              </Text>
              {booking.lateNotifiedAt ? (
                <Text style={[styles.bannerBody, {color: t.warningInk}]}>
                  The customer has been told.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Vehicle — the hero, because a partner finds the car by its plate. */}
        {plate || vehicleName ? (
          <View style={[styles.vehicleCard, {backgroundColor: t.surfaceInverse}]}>
            <View style={styles.vehicleText}>
              <Text style={[styles.vehicleEyebrow, {color: t.textTertiary}]}>
                LOOK FOR THIS VEHICLE
              </Text>
              {plate ? (
                <Text style={[numeric, styles.plate, {color: t.textOnInverse}]}>
                  {plate}
                </Text>
              ) : null}
              <Text style={[styles.vehicleSub, {color: t.textTertiary}]}>
                {joinParts(vehicleName, vehicleClass) || 'Vehicle details not provided'}
              </Text>
            </View>
            <View style={[styles.vehicleIcon, {backgroundColor: t.surfaceElevated}]}>
              <Icon name="car" size={24} color={t.brandInk} strokeWidth={1.8} />
            </View>
          </View>
        ) : null}

        {/* Service + slot */}
        <Card>
          <View style={styles.serviceHead}>
            <View style={styles.serviceText}>
              <Text style={[styles.serviceName, {color: t.textHeading}]}>
                {serviceName}
              </Text>
              {booking.Service?.description ? (
                <Text style={[styles.serviceDesc, {color: t.textTertiary}]} numberOfLines={2}>
                  {booking.Service.description}
                </Text>
              ) : null}
            </View>
            <Text style={[numeric, styles.serviceAmount, {color: t.textHeading}]}>
              {formatMoney(booking.netAmount)}
            </Text>
          </View>
          <View style={styles.pillRow}>
            {slot ? (
              <View style={[styles.pill, {backgroundColor: t.infoContainer}]}>
                <Text style={[numeric, styles.pillText, {color: t.infoInk}]}>{slot}</Text>
              </View>
            ) : null}
            {duration ? (
              <View style={[styles.pill, {backgroundColor: t.neutralContainer}]}>
                <Text style={[numeric, styles.pillText, {color: t.neutralInk}]}>
                  {duration} job
                </Text>
              </View>
            ) : null}
            {payment ? (
              <View
                style={[
                  styles.pill,
                  {backgroundColor: paid ? t.successContainer : t.warningContainer},
                ]}>
                <Text
                  style={[
                    styles.pillText,
                    {color: paid ? t.successInk : t.warningInk},
                  ]}>
                  {paid ? 'Paid online' : 'Payment pending'}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>

        {/* Customer + address */}
        <Card>
          <View style={styles.customerRow}>
            <View style={[styles.avatar, {backgroundColor: t.infoContainer}]}>
              <Text style={[styles.avatarText, {color: t.infoInk}]}>
                {initialsOf(customerName)}
              </Text>
            </View>
            <View style={styles.customerText}>
              <Text style={[styles.customerName, {color: t.textHeading}]} numberOfLines={1}>
                {customerName}
              </Text>
              <Text style={[numeric, styles.customerMeta, {color: t.textTertiary}]}>
                {customerPhone || 'Number unlocks on arrival'}
              </Text>
            </View>
            {customerPhone ? (
              <Pressable
                onPress={handleCall}
                accessibilityRole="button"
                accessibilityLabel={`Call ${customerName}`}
                style={[styles.roundBtn, {borderColor: t.outline}]}>
                <Icon name="phone" size={18} color={t.neutralInk} strokeWidth={1.9} />
              </Pressable>
            ) : null}
          </View>

          {address ? (
            <Pressable
              onPress={handleNavigate}
              accessibilityRole="button"
              accessibilityLabel="Navigate to the address"
              style={[styles.addressRow, {borderTopColor: t.outline}]}>
              <Icon name="pin" size={18} color={t.brandAction} strokeWidth={2} />
              <View style={styles.addressText}>
                <Text style={[styles.address, {color: t.textPrimary}]}>{address}</Text>
                {landmark ? (
                  <Text style={[styles.landmark, {color: t.textTertiary}]}>
                    Landmark: {landmark}
                  </Text>
                ) : null}
              </View>
              <Icon name="navigation" size={18} color={t.neutralInk} strokeWidth={1.9} />
            </Pressable>
          ) : null}
        </Card>

        {/* Customer note */}
        {booking.notes ? (
          <View
            style={[
              styles.note,
              {backgroundColor: t.warningContainer, borderColor: t.warningBorder},
            ]}>
            <Icon name="document" size={16} color={t.warningInk} strokeWidth={2} />
            <Text style={[styles.noteText, {color: t.warningInk}]}>
              <Text style={styles.noteLabel}>Customer note: </Text>
              {booking.notes}
            </Text>
          </View>
        ) : null}

        {/* Progress */}
        {milestones.length ? (
          <Card>
            <View style={styles.progressHead}>
              <Text style={[styles.cardTitle, {color: t.textHeading}]}>Progress</Text>
              <Pressable
                onPress={() =>
                  navigation.navigate('JobTimeline', {bookingId: booking.id})
                }
                accessibilityRole="button"
                hitSlop={8}>
                <Text style={[styles.progressLink, {color: t.brandAction}]}>
                  Full timeline
                </Text>
              </Pressable>
            </View>
            <JobTimeline variant="compact" milestones={milestones} style={styles.timeline} />
          </Card>
        ) : null}

        {/* Money */}
        <Card>
          <Text style={[styles.cardTitle, {color: t.textHeading}]}>Booking value</Text>
          {booking.totalAmount != null ? (
            <MoneyRow label="Service total" value={formatMoney(booking.totalAmount)} />
          ) : null}
          {Number(booking.discountAmount) > 0 ? (
            <MoneyRow label="Discount" value={`−${formatMoney(booking.discountAmount)}`} />
          ) : null}
          {Number(booking.gstAmount) > 0 ? (
            <MoneyRow label="GST" value={formatMoney(booking.gstAmount)} />
          ) : null}
          {Number(booking.cancellationFee) > 0 ? (
            <MoneyRow label="Cancellation fee" value={formatMoney(booking.cancellationFee)} />
          ) : null}
          {Number(booking.refundAmount) > 0 ? (
            <MoneyRow label="Refunded" value={formatMoney(booking.refundAmount)} />
          ) : null}
          <View style={[styles.moneyDivider, {backgroundColor: t.outline}]} />
          <MoneyRow
            label={isCancelled || isBreached ? 'Credited to you' : 'You earn'}
            value={isCancelled || isBreached ? formatMoney(0) : formatMoney(booking.netAmount)}
            emphasis
          />
        </Card>

        {/* Evidence */}
        {photos.before.length || photos.after.length ? (
          <Card>
            <Text style={[styles.cardTitle, {color: t.textHeading}]}>Evidence</Text>
            <PhotoGroup label="Before" urls={photos.before} />
            <PhotoGroup label="After" urls={photos.after} />
          </Card>
        ) : null}
      </ScrollView>

      {/* The detail screen never changes status itself — it opens the live job,
          which owns the FSM and every gate. */}
      {canOpen ? (
        <View
          style={[
            styles.actionBar,
            {
              backgroundColor: t.surface,
              borderTopColor: t.outline,
              paddingBottom: screenInsets.stickyBarPadding,
            },
          ]}>
          <Pressable
            onPress={() => navigation.navigate('ActiveJob', {bookingId: booking.id})}
            accessibilityRole="button"
            style={[styles.primaryBtn, {backgroundColor: t.brandAction}]}>
            <Text style={[styles.primaryBtnText, {color: t.brandActionText}]}>
              Open this job
            </Text>
            <Icon name="arrowRight" size={18} color={t.brandActionText} strokeWidth={2.4} />
          </Pressable>
        </View>
      ) : null}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 11,
  },
  bodyWithBar: {
    paddingBottom: 96,
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
  banner: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  bannerBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: radii.lg,
    padding: 14,
  },
  vehicleText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  vehicleEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  plate: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  vehicleSub: {
    fontSize: 13,
  },
  vehicleIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  serviceText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  serviceName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.17,
  },
  serviceDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  serviceAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  customerText: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  customerMeta: {
    fontSize: 12,
    marginTop: 1,
  },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 11,
  },
  addressText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  address: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  landmark: {
    fontSize: 12,
  },
  note: {
    flexDirection: 'row',
    gap: 9,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  noteLabel: {
    fontWeight: '700',
  },
  timeline: {
    marginTop: 2,
  },
  progressHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  progressLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moneyLabel: {
    fontSize: 13,
  },
  moneyValue: {
    fontWeight: '700',
  },
  moneyDivider: {
    height: 1,
    marginVertical: 2,
  },
  photoGroup: {
    gap: 7,
  },
  photoLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  photo: {
    width: 68,
    height: 68,
    borderRadius: radii.sm,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  primaryBtn: {
    height: 50,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
