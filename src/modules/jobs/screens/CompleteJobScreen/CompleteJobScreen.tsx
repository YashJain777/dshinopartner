/**
 * Complete job — the customer's code, on its own screen.
 *
 * This was a bottom sheet over the live job. A sheet was the wrong container:
 * the last step of a job has its own gates (the after-photos), its own failure
 * modes (a wrong code, a customer who has already walked off), its own limit
 * (the server allows five tries per booking per ten minutes) and its own
 * payout. None of that fits under a sheet that a stray tap on the scrim
 * dismisses mid-entry.
 *
 * What this screen will NOT do is offer to resend the code. The old
 * `GET /bookings/:id/otp` endpoint was deleted from the backend on purpose —
 * it handed the partner the plaintext code and silently invalidated the
 * customer's, which defeats the point of the code existing. Until there is an
 * endpoint that notifies the CUSTOMER, this screen says where the code lives
 * and offers the escape hatch instead of a button that cannot work.
 */

import React, {useCallback, useMemo, useState} from 'react';
import {View, ScrollView, StyleSheet, Alert, Pressable} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {OtpBoxes} from '../../../../components/atoms/OtpBoxes';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {ScreenHeader} from '../../../../components/molecules/ScreenHeader';
import {GateChecklistItem} from '../../../../components/molecules/GateChecklistItem';
import {SwipeToConfirm} from '../../../../components/molecules/SwipeToConfirm';
import {LoadingScreen} from '../../../../components/molecules/LoadingScreen';
import {ErrorScreen} from '../../../../components/molecules/ErrorScreen';
import {RaiseIssueModal} from '../../../../components/molecules/RaiseIssueModal';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {useActiveJob} from '../../../../hooks/useActiveJob';
import {usePhotoUploadsSettled} from '../../../../hooks/usePhotoUploadsSettled';
import {BookingIssueTypeKey} from '../../../../constants/api.constants';
import {Booking} from '../../../../types/api.types';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {formatMoney, initialsOf} from '../../../../utils/format';

const OTP_LENGTH = 4;

/** Photos this app asks for per side before it offers the final swipe. */
const REQUIRED_PHOTOS = 4;

/**
 * `completeOtpLimiter` on the backend: 5 tries per booking per 10 minutes.
 * Mirrored here so the partner is told how many are left rather than finding
 * out by being locked out.
 */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

const afterPhotoCount = (booking: Booking | null): number => {
  if (!booking) {
    return 0;
  }
  const fromEvidence = (booking.evidence ?? []).filter(
    e => e?.url && e.type?.toLowerCase() === 'after',
  ).length;
  return fromEvidence || (booking.afterPhotos ?? []).length;
};

/**
 * What the money row should say.
 *
 * The server does not gate completion on payment: for every method except
 * ONLINE it marks a pending payment settled as part of completing. So this is
 * information, not a gate — except for an unsettled ONLINE payment, which is
 * worth a warning because the partner is about to hand the vehicle back.
 */
const paymentRow = (booking: Booking | null) => {
  const payment = (booking?.Payments ?? [])[0];
  const amount = Number(payment?.amount ?? booking?.netAmount ?? 0);
  const settled = payment?.status === 'COMPLETED';
  const online = (payment?.method ?? '').toUpperCase() === 'ONLINE';

  if (settled) {
    return {
      state: 'met' as const,
      label: 'Payment settled by customer',
      value: formatMoney(amount),
      hint: undefined,
    };
  }
  if (online) {
    return {
      state: 'blocked' as const,
      label: 'Online payment not settled',
      value: formatMoney(amount),
      hint: 'Ask the customer to finish paying in their app before you hand the vehicle back.',
    };
  }
  return {
    state: 'pending' as const,
    label: 'Collect on completion',
    value: formatMoney(amount),
    hint: 'Marked settled automatically once this job completes.',
  };
};

interface CompleteJobScreenProps {
  navigation: any;
  route?: {params?: {bookingId?: string}};
}

export const CompleteJobScreen: React.FC<CompleteJobScreenProps> = ({
  navigation,
  route,
}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();
  // Completing the wrong booking is unrecoverable, so this screen is always
  // pinned to the job the live screen handed over.
  const {booking, loading, error, refresh, completeService, raiseIssue} = useActiveJob(
    route?.params?.bookingId,
  );

  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [wrongCode, setWrongCode] = useState(false);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [lockedOut, setLockedOut] = useState(false);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [submittingIssue, setSubmittingIssue] = useState(false);

  // The after-photos are usually still uploading when the partner comes back
  // from the evidence screen; refetch the moment they land.
  usePhotoUploadsSettled(booking?.bookingId || booking?.id, refresh);

  const afterCount = afterPhotoCount(booking);
  const photosMissing = Math.max(0, REQUIRED_PHOTOS - afterCount);
  const payment = useMemo(() => paymentRow(booking), [booking]);

  const customerName = booking?.Customer?.name || booking?.customerName || 'the customer';
  const firstName = customerName.trim().split(/\s+/)[0];
  const payout = Number(booking?.netAmount ?? booking?.totalAmount ?? 0);
  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - attemptsUsed);

  const handleComplete = useCallback(async () => {
    if (!booking || otp.length !== OTP_LENGTH || lockedOut) {
      return;
    }
    try {
      setSubmitting(true);
      setWrongCode(false);
      await completeService(otp);
      // The receipt replaces this screen, so Back from it lands on the route
      // rather than on a finished job's code entry.
      navigation.replace('JobSuccess', {bookingId: booking.bookingId || booking.id});
    } catch (err: any) {
      const message: string = err?.message || 'That code did not match.';
      const rateLimited = /too many/i.test(message);

      if (rateLimited) {
        setLockedOut(true);
        setAttemptsUsed(MAX_ATTEMPTS);
      } else {
        setAttemptsUsed(n => Math.min(MAX_ATTEMPTS, n + 1));
      }

      setWrongCode(true);
      setOtp('');
      Alert.alert(rateLimited ? 'Too many tries' : 'That code did not match', message);
    } finally {
      setSubmitting(false);
    }
  }, [booking, completeService, lockedOut, navigation, otp]);

  const handleRaiseIssue = useCallback(
    async (issueType: BookingIssueTypeKey, description: string) => {
      try {
        setSubmittingIssue(true);
        await raiseIssue({issueType, description});
        setIssueModalVisible(false);
        Alert.alert(
          'Sent to your agency',
          'The job stays open and your photos stay attached as proof.',
          [{text: 'Back to the job', onPress: () => navigation.goBack()}],
        );
      } catch (err: any) {
        Alert.alert('Unable to report this', err?.message || 'Please try again.');
      } finally {
        setSubmittingIssue(false);
      }
    },
    [navigation, raiseIssue],
  );

  if (loading && !booking) {
    return <LoadingScreen message="Loading this job…" />;
  }

  if (error && !booking) {
    return <ErrorScreen message={error} onRetry={refresh} />;
  }

  if (!booking) {
    return (
      <ScreenContainer backgroundColor={t.surfaceContainer}>
        <ScreenHeader title="Nothing to finish" onBack={() => navigation.goBack()} />
        <View style={styles.emptyWrap}>
          <Icon name="check" size={26} color={t.textDisabled} />
          <Text style={[styles.emptyTitle, {color: t.textHeading}]}>
            No job in progress
          </Text>
          <Text style={[styles.emptyBody, {color: t.textSecondary}]}>
            Start a stop from your route before finishing it.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const swipeState = submitting
    ? ('loading' as const)
    : otp.length === OTP_LENGTH && !lockedOut
    ? ('ready' as const)
    : ('locked' as const);

  const lockedLabel = lockedOut
    ? `Locked for ${LOCKOUT_MINUTES} minutes`
    : photosMissing > 0
    ? `${photosMissing} more after-photo${photosMissing === 1 ? '' : 's'}`
    : `Enter all ${OTP_LENGTH} digits`;

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title="Finish the job"
        subtitle={[
          booking.Service?.name || booking.service?.name || 'Service',
          booking.bookingNumber && `#${booking.bookingNumber}`,
        ]
          .filter(Boolean)
          .join(' · ')}
        subtitleNumeric
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* The gates, in the order the server checks them. */}
        <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <GateChecklistItem
            label="After photos"
            state={afterCount >= REQUIRED_PHOTOS ? 'met' : 'pending'}
            value={`${afterCount} / ${REQUIRED_PHOTOS}`}
            hint={photosMissing > 0 ? 'Tap to shoot the remaining panels' : undefined}
            onPress={() => navigation.navigate('PhotoEvidence', {
                type: 'AFTER',
                bookingId: booking?.bookingId || booking?.id,
              })}
          />
          <GateChecklistItem
            label={payment.label}
            state={payment.state}
            value={payment.value}
            icon="wallet"
            hint={payment.hint}
          />
          <GateChecklistItem
            label="Customer's code — last step"
            state={otp.length === OTP_LENGTH ? 'met' : 'pending'}
            icon="lock"
          />
        </View>

        {/* The code itself. */}
        <View style={[styles.card, styles.codeCard, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <View style={[styles.avatar, {backgroundColor: t.brandContainer}]}>
            <Text style={[styles.avatarText, {color: t.brandInk}]}>
              {initialsOf(customerName)}
            </Text>
          </View>

          <Text style={[styles.askTitle, {color: t.textHeading}]}>
            Ask {firstName} for the code
          </Text>
          <Text style={[styles.askBody, {color: t.textSecondary}]}>
            It shows in the customer's Dshino app. You cannot see it, and support
            cannot read it out to you.
          </Text>

          <OtpBoxes
            value={otp}
            onChangeText={next => {
              setOtp(next);
              if (wrongCode) {
                setWrongCode(false);
              }
            }}
            length={OTP_LENGTH}
            autoFocus
            error={wrongCode}
            disabled={lockedOut || submitting}
            accessibilityLabel="Customer's completion code"
            style={styles.boxes}
          />

          <Text
            style={[
              numeric,
              styles.attempts,
              {color: lockedOut ? t.dangerInk : attemptsLeft <= 2 ? t.warningInk : t.textTertiary},
            ]}>
            {lockedOut
              ? `Too many wrong codes · try again in ${LOCKOUT_MINUTES} minutes`
              : `${attemptsLeft} of ${MAX_ATTEMPTS} tries left · then a ${LOCKOUT_MINUTES}-minute wait`}
          </Text>
        </View>

        {/* Where the code lives, and the way out if the customer has gone. */}
        <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, {backgroundColor: t.infoContainer}]}>
              <Icon name="phone" size={17} color={t.infoInk} strokeWidth={1.9} />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoTitle, {color: t.textHeading}]}>
                {firstName} can't find the code?
              </Text>
              <Text style={[styles.infoBody, {color: t.textTertiary}]}>
                It is on this booking in their app, and in the SMS they got when it
                was confirmed.
              </Text>
            </View>
          </View>

          <View style={[styles.divider, {backgroundColor: t.outline}]} />

          <Pressable
            onPress={() => setIssueModalVisible(true)}
            accessibilityRole="button"
            style={styles.infoRow}>
            <View style={[styles.infoIcon, {backgroundColor: t.warningContainer}]}>
              <Icon name="userOff" size={17} color={t.warningInk} strokeWidth={1.9} />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoTitle, {color: t.textHeading}]}>
                Customer left before the code
              </Text>
              <Text style={[styles.infoBody, {color: t.textTertiary}]}>
                Opens a ticket with your agency; your photos stay as proof.
              </Text>
            </View>
            <Icon name="chevronRight" size={17} color={t.textDisabled} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={[styles.payoutRow, {backgroundColor: t.successContainer}]}>
          <Text style={[styles.payoutLabel, {color: t.successInk}]}>
            Credited to your wallet on completion
          </Text>
          <Text style={[numeric, styles.payoutValue, {color: t.successInk}]}>
            {formatMoney(payout, {sign: true})}
          </Text>
        </View>
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
        <SwipeToConfirm
          label="Swipe to complete job"
          lockedLabel={lockedLabel}
          loadingLabel="Checking the code…"
          state={swipeState}
          tone="success"
          icon="check"
          onConfirm={handleComplete}
          testID="complete-job-swipe"
        />
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
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  codeCard: {
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  askTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  askBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 290,
  },
  boxes: {
    paddingTop: 4,
  },
  attempts: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  divider: {
    height: 1,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  payoutLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  payoutValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  stickyBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
