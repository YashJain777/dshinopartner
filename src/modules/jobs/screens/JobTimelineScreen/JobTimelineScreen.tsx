/**
 * Full job timeline — every recorded moment of one booking.
 *
 * This is what support reads when a job is disputed, so it is never
 * collapsed behind a "show more": a partner arguing about a penalty needs
 * every row. The events are reconstructed from the booking's own timestamps,
 * which the server writes on each transition.
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, ScrollView, StyleSheet, RefreshControl, Image} from 'react-native';
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
import {BookingStatus} from '../../../../constants/api.constants';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {logger} from '../../../../utils/logger';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {formatClock, formatDistance} from '../../../../utils/format';

interface JobTimelineScreenProps {
  navigation: any;
  route: {params?: {bookingId?: string}};
}

export const JobTimelineScreen: React.FC<JobTimelineScreenProps> = ({
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
        logger.error('[JobTimeline] Fetch failed', err);
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

  const photoStrip = useCallback(
    (urls: string[]) => (
      <View style={styles.photoRow}>
        {urls.slice(0, 4).map(uri => (
          <Image
            key={uri}
            source={{uri}}
            style={[styles.photo, {backgroundColor: t.placeholder}]}
            resizeMode="cover"
          />
        ))}
        {urls.length > 4 ? (
          <View style={[styles.photoMore, {backgroundColor: t.neutralContainer}]}>
            <Text style={[numeric, styles.photoMoreText, {color: t.neutralInk}]}>
              +{urls.length - 4}
            </Text>
          </View>
        ) : null}
      </View>
    ),
    [t],
  );

  const events = useMemo<TimelineEvent[]>(() => {
    if (!booking) {
      return [];
    }

    const status = booking.status as BookingStatus;
    const ended = status === 'CANCELLED' || status === 'SLA_BREACHED';
    const out: TimelineEvent[] = [];

    const evidence = booking.evidence ?? [];
    const before = evidence
      .filter(e => e.type?.toLowerCase() === 'before' && e.url)
      .map(e => e.url);
    const after = evidence
      .filter(e => e.type?.toLowerCase() === 'after' && e.url)
      .map(e => e.url);

    out.push({
      key: 'assigned',
      title: 'Assigned by your agency',
      detail: booking.bookingNumber ? `Booking #${booking.bookingNumber}` : undefined,
      time: formatClock(booking.createdAt),
      state: 'done',
    });

    if (booking.enRouteAt) {
      out.push({
        key: 'enroute',
        title: 'Left for the customer',
        time: formatClock(booking.enRouteAt),
        state: 'done',
      });
    }

    if (booking.lateNotifiedAt) {
      out.push({
        key: 'late',
        title: 'Running late — customer told',
        detail:
          booking.minutesLate != null
            ? `Automatic notice, ${booking.minutesLate} min over`
            : 'Automatic SLA notice',
        time: formatClock(booking.lateNotifiedAt),
        state: 'blocked',
      });
    }

    if (booking.arrivedAt) {
      out.push({
        key: 'arrived',
        title: 'Arrived on site',
        time: formatClock(booking.arrivedAt),
        state: 'done',
      });
    }

    if (before.length) {
      out.push({
        key: 'before',
        title: `Before photos — ${before.length}`,
        state: 'done',
        children: photoStrip(before),
      });
    }

    if (booking.inProgressAt) {
      out.push({
        key: 'started',
        title: 'Service started',
        time: formatClock(booking.inProgressAt),
        state: 'done',
      });
    }

    if (after.length) {
      out.push({
        key: 'after',
        title: `After photos — ${after.length}`,
        state: 'done',
        children: photoStrip(after),
      });
    }

    if (booking.completedAt) {
      out.push({
        key: 'completed',
        title: 'Completed with the customer’s code',
        detail: 'Wallet credited',
        time: formatClock(booking.completedAt),
        state: 'done',
      });
    }

    if (ended) {
      out.push({
        key: 'ended',
        title: status === 'CANCELLED' ? 'Cancelled' : 'Slot closed unserved',
        detail:
          status === 'CANCELLED'
            ? booking.cancellationReason ?? 'No reason was recorded'
            : 'Never started — nothing was credited',
        state: 'failed',
      });
    } else if (!booking.completedAt) {
      // The live edge, so the log never just stops mid-air.
      out.push({
        key: 'current',
        title:
          status === 'IN_PROGRESS'
            ? 'Service in progress'
            : status === 'ARRIVED'
            ? 'Waiting to start'
            : status === 'EN_ROUTE' || status === 'ON_THE_WAY'
            ? 'On the way'
            : 'Waiting to set off',
        state: 'current',
      });
    }

    return out;
  }, [booking, photoStrip]);

  if (loading && !booking) {
    return <LoadingScreen message="Loading the timeline..." />;
  }

  if (error && !booking) {
    return <ErrorScreen message={error} onRetry={() => fetchBooking()} />;
  }

  if (!booking) {
    return null;
  }

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title="Job timeline"
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
          {paddingBottom: screenInsets.stackContentPadding},
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
        <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <JobTimeline variant="full" events={events} />
        </View>

        {booking.arrivedAt && booking.Address?.lat ? (
          <View style={[styles.factRow, {backgroundColor: t.surface, borderColor: t.outline}]}>
            <Icon name="pinCheck" size={17} color={t.successInk} strokeWidth={2} />
            <Text style={[styles.factText, {color: t.textSecondary}]}>
              Arrival was checked against the customer's pin
              {booking.minutesLate != null && booking.minutesLate > 0
                ? `, ${formatDistance(200)} geofence`
                : ''}
              .
            </Text>
          </View>
        ) : null}

        <View style={[styles.note, {backgroundColor: t.neutralContainer}]}>
          <Icon name="info" size={16} color={t.neutralInk} strokeWidth={2} />
          <Text style={[styles.noteText, {color: t.textSecondary}]}>
            This log is written by the server. Neither you nor the customer can edit it,
            which is why support uses it to settle disputes.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 16,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 7,
  },
  photo: {
    width: 62,
    height: 62,
    borderRadius: radii.sm,
  },
  photoMore: {
    width: 62,
    height: 62,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoMoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  factRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  factText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  note: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
