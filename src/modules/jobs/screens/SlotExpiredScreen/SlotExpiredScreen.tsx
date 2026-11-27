/**
 * Slot expired — a dead end, stated plainly.
 *
 * The backend refuses any status change more than 120 minutes past a slot's
 * end. Nothing on this screen can revive the job, so it does not pretend
 * otherwise: it shows what the record says, what it costs, and the only two
 * things the partner can still do.
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, ScrollView, Pressable, StyleSheet, RefreshControl} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {ScreenHeader} from '../../../../components/molecules/ScreenHeader';
import {JobTimeline} from '../../../../components/molecules/JobTimeline';
import {TimelineEvent} from '../../../../components/molecules/JobTimeline/JobTimeline.types';
import {LoadingScreen} from '../../../../components/molecules/LoadingScreen';
import {ErrorScreen} from '../../../../components/molecules/ErrorScreen';
import {getBookingDetails} from '../../../../services/api/booking.api';
import {Booking} from '../../../../types/api.types';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {logger} from '../../../../utils/logger';
import {radii} from '../../../../theme/tokens';

import {formatClock, formatMoney, formatSlotRange} from '../../../../utils/format';
import {istClock, slotExpiresAt} from '../../../../utils/slotTime';

interface SlotExpiredScreenProps {
  navigation: any;
  route: {params?: {bookingId?: string}};
}

export const SlotExpiredScreen: React.FC<SlotExpiredScreenProps> = ({
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
        setBooking(await getBookingDetails(bookingId));
        setError(null);
      } catch (err: any) {
        logger.error('[SlotExpired] Fetch failed', err);
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

  /**
   * When the grace window closed, derived the same way the backend does.
   *
   * Previously parsed with `formatSlotTime` + `Service.duration`, which read
   * "04:20 PM" as 04:20 and so reported this screen's own headline time as
   * 07:20 for a job that does not close until 19:20. See src/utils/slotTime.ts.
   */
  const expiry = useMemo(() => {
    const close = slotExpiresAt(booking?.scheduledDate, booking?.scheduledTimeSlot);
    return close ? istClock(close) : null;
  }, [booking]);

  const events = useMemo<TimelineEvent[]>(() => {
    if (!booking) {
      return [];
    }
    const out: TimelineEvent[] = [
      {
        key: 'assigned',
        title: 'Assigned to you',
        time: formatClock(booking.createdAt),
        state: 'done',
      },
    ];
    if (booking.enRouteAt) {
      out.push({
        key: 'enroute',
        title: 'You set off',
        time: formatClock(booking.enRouteAt),
        state: 'done',
      });
    }
    if (booking.lateNotifiedAt) {
      out.push({
        key: 'late',
        title: 'Running late — customer told',
        detail:
          booking.minutesLate != null ? `${booking.minutesLate} min over the slot` : undefined,
        time: formatClock(booking.lateNotifiedAt),
        state: 'blocked',
      });
    }
    out.push({
      key: 'closed',
      title: 'Slot closed by the system',
      detail: booking.arrivedAt
        ? 'Arrived, but the service was never started'
        : 'Never started — no service was performed',
      time: expiry ?? undefined,
      state: 'failed',
    });
    return out;
  }, [booking, expiry]);

  if (loading && !booking) {
    return <LoadingScreen message="Loading the booking..." />;
  }

  if (error && !booking) {
    return <ErrorScreen message={error} onRetry={() => fetchBooking()} />;
  }

  if (!booking) {
    return null;
  }

  const slot = formatSlotRange(booking.scheduledTimeSlot, booking.Service?.duration);

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title={booking.Service?.name || 'Service'}
        subtitle={[
          booking.bookingNumber ? `#${booking.bookingNumber}` : null,
          booking.scheduledDate,
        ]
          .filter(Boolean)
          .join(' · ')}
        subtitleNumeric
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.body,
          {paddingBottom: 96 + screenInsets.stickyBarPadding},
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
        {/* Headline */}
        <View
          style={[
            styles.hero,
            {backgroundColor: t.surface, borderColor: t.dangerBorder},
          ]}>
          <View style={[styles.heroIcon, {backgroundColor: t.dangerContainer}]}>
            <Icon name="clockAlarm" size={26} color={t.dangerInk} strokeWidth={1.9} />
          </View>
          <Text style={[styles.heroTitle, {color: t.textHeading}]}>
            This slot has expired
          </Text>
          <Text style={[styles.heroBody, {color: t.textSecondary}]}>
            {slot
              ? `The ${slot} window closed at ${expiry ?? 'its grace limit'}, two hours past its end.`
              : 'The booking window closed two hours past its end.'}{' '}
            The job can no longer be started or completed from the app.
          </Text>
        </View>

        {/* Record */}
        <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <Text style={[styles.cardTitle, {color: t.textHeading}]}>
            What the record shows
          </Text>
          <JobTimeline variant="full" events={events} />
        </View>

        {/* Consequences */}
        <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <Text style={[styles.cardTitle, {color: t.textHeading}]}>What this means</Text>

          <View style={styles.factRow}>
            <Icon name="close" size={16} color={t.dangerInk} strokeWidth={2.4} />
            <Text style={[styles.factText, {color: t.textSecondary}]}>
              Nothing was credited for this job
              {booking.netAmount ? ` — ${formatMoney(booking.netAmount)} not earned.` : '.'}
            </Text>
          </View>

          <View style={styles.factRow}>
            <Icon name="alert" size={16} color={t.warning} strokeWidth={2} />
            <Text style={[styles.factText, {color: t.textSecondary}]}>
              It counts against your on-time rate. Raise a reason if the delay was not
              yours — your agency can note it.
            </Text>
          </View>

          <View style={styles.factRow}>
            <Icon name="check" size={16} color={t.success} strokeWidth={2.4} />
            <Text style={[styles.factText, {color: t.textSecondary}]}>
              Only your agency can reschedule it. The customer keeps their booking.
            </Text>
          </View>
        </View>
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
        <Pressable
          onPress={() => navigation.navigate('CreateTicket')}
          accessibilityRole="button"
          style={[styles.primaryBtn, {backgroundColor: t.brandAction}]}>
          <Text style={[styles.primaryBtnText, {color: t.brandActionText}]}>
            Tell the agency why
          </Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('MainTabs', {screen: 'Jobs'})}
          accessibilityRole="button"
          style={[styles.secondaryBtn, {borderColor: t.outlineStrong}]}>
          <Text style={[styles.secondaryBtnText, {color: t.textPrimary}]}>
            Go to the next stop
          </Text>
        </Pressable>
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
  hero: {
    borderRadius: radii.lg,
    borderWidth: 1.5,
    padding: 18,
    alignItems: 'center',
    gap: 11,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.28,
    textAlign: 'center',
  },
  heroBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 14,
    gap: 11,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  factText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
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
    height: 48,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 44,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
