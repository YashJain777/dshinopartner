/**
 * Job completed — the receipt.
 *
 * Completion used to be an Alert saying "credited to your wallet", which told
 * the partner nothing they could check later: not the amount, not how long
 * they were on site, not how many photos were filed against the job. A
 * agency asking "what time did you finish at C-152?" needs an answer the
 * partner can read off their own screen.
 *
 * Every tile here is derived from the booking the server returned. The design
 * also showed today's totals and the next stop; those come from a different
 * endpoint and are left to the route screen rather than guessed at here.
 */

import React, {useCallback, useEffect, useState} from 'react';
import {View, ScrollView, StyleSheet, Pressable} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {LoadingScreen} from '../../../../components/molecules/LoadingScreen';
import {ErrorScreen} from '../../../../components/molecules/ErrorScreen';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {getBookingDetails} from '../../../../services/api/booking.api';
import {getWalletBalance} from '../../../../services/api/wallet.api';
import {Booking} from '../../../../types/api.types';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {formatClock, formatMoney, formatDuration} from '../../../../utils/format';

interface JobSuccessScreenProps {
  navigation: any;
  route: {params?: {bookingId?: string}};
}

/** Minutes between two ISO timestamps, or null when either is missing. */
const minutesBetween = (from?: string | null, to?: string | null): number | null => {
  if (!from || !to) {
    return null;
  }
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }
  return Math.round((end - start) / 60000);
};

export const JobSuccessScreen: React.FC<JobSuccessScreenProps> = ({navigation, route}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();
  const bookingId = route.params?.bookingId;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!bookingId) {
      setError('This job could not be identified.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const details = await getBookingDetails(bookingId);
      setBooking(details);
      // A stale balance is worse than no balance, so a failure here hides the
      // tile rather than showing the figure from before the credit landed.
      try {
        const wallet = await getWalletBalance();
        setBalance(Number(wallet?.balance ?? 0));
      } catch {
        setBalance(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Could not load this job.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const backToRoute = useCallback(() => {
    navigation.navigate('MainTabs', {screen: 'Jobs'});
  }, [navigation]);

  if (loading) {
    return <LoadingScreen message="Filing this job…" />;
  }

  if (error || !booking) {
    return (
      <ErrorScreen
        message={error || 'Could not load this job.'}
        onRetry={load}
      />
    );
  }

  const payout = Number(booking.netAmount ?? booking.totalAmount ?? 0);
  const customerName = booking.Customer?.name || booking.customerName || 'Customer';
  const serviceName = booking.Service?.name || booking.service?.name || 'Service';
  const startedAt = booking.inProgressAt || booking.arrivedAt;
  const onSite = minutesBetween(startedAt, booking.completedAt);
  const photoCount = (booking.evidence ?? []).length ||
    (booking.beforePhotos ?? []).length + (booking.afterPhotos ?? []).length;

  const rows: {label: string; value: string}[] = [
    {label: 'Job', value: booking.bookingNumber ? `#${booking.bookingNumber}` : '—'},
  ];

  if (startedAt && booking.completedAt) {
    rows.push({
      label: 'Started · finished',
      value: `${formatClock(startedAt)} – ${formatClock(booking.completedAt)}`,
    });
  }
  if (onSite !== null) {
    rows.push({label: 'Time on site', value: formatDuration(onSite)});
  }
  if (photoCount > 0) {
    rows.push({
      label: 'Evidence',
      value: `${photoCount} photo${photoCount === 1 ? '' : 's'} saved`,
    });
  }
  if (balance !== null) {
    rows.push({label: 'New wallet balance', value: formatMoney(balance)});
  }

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: screenInsets.stackContentPadding}]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.badge, {backgroundColor: t.successContainer}]}>
          <Icon name="check" size={34} color={t.successInk} strokeWidth={2.6} />
        </View>

        <Text style={[styles.title, {color: t.textHeading}]}>Job completed</Text>
        <Text style={[styles.subtitle, {color: t.textSecondary}]}>
          {serviceName} · {customerName}
        </Text>

        <View style={[styles.amountCard, {backgroundColor: t.successContainer}]}>
          <Text style={[numeric, styles.amount, {color: t.successInk}]}>
            {formatMoney(payout, {sign: true})}
          </Text>
          <Text style={[styles.amountLabel, {color: t.successInk}]}>credited</Text>
        </View>

        <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
          {rows.map((row, i) => (
            <View key={row.label}>
              {i > 0 ? <View style={[styles.divider, {backgroundColor: t.outline}]} /> : null}
              <View style={styles.row}>
                <Text style={[styles.rowLabel, {color: t.textTertiary}]}>{row.label}</Text>
                <Text style={[numeric, styles.rowValue, {color: t.textHeading}]}>
                  {row.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() =>
            navigation.navigate('JobTimeline', {bookingId: booking.bookingId || booking.id})
          }
          accessibilityRole="button"
          style={[styles.secondary, {borderColor: t.outlineStrong}]}>
          <Icon name="clock" size={17} color={t.textSecondary} strokeWidth={1.9} />
          <Text style={[styles.secondaryText, {color: t.textPrimary}]}>
            See the full timeline
          </Text>
          <Icon name="chevronRight" size={17} color={t.textDisabled} strokeWidth={2.2} />
        </Pressable>
      </ScrollView>

      <View
        style={[
          styles.stickyBar,
          {
            backgroundColor: t.surface,
            borderTopColor: t.outline,
            paddingBottom: screenInsets.stickyBarPadding,
          },
        ]}>
        <Pressable
          onPress={backToRoute}
          accessibilityRole="button"
          style={[styles.primary, {backgroundColor: t.brandAction}]}>
          <Text style={[styles.primaryText, {color: t.brandActionText}]}>
            Back to my route
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    alignItems: 'stretch',
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: -6,
  },
  amountCard: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: radii.lg,
    gap: 2,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  secondaryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  stickyBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  primary: {
    height: 52,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
