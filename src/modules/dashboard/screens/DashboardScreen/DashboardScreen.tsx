/**
 * Home — the first screen of the shift.
 *
 * Answers four questions in one view: am I online, what am I in the middle of,
 * what have I earned today, and what is next. Everything else is a tab away.
 *
 * The aggregated /partner/home endpoint backs the top half in a single
 * round-trip; today's route comes from the schedule endpoint, which is already
 * ordered by the optimiser.
 */

import React, {useCallback, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Switch,
  Pressable,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {HeaderIconButton} from '../../../../components/molecules/ScreenHeader';
import {RouteStopCard} from '../../../../components/molecules/RouteStopCard';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {useDashboard} from '../../../../hooks/useDashboard';
import {useTodaySchedule} from '../../../../hooks/useTodaySchedule';
import {useAttendance} from '../../../../hooks/useAttendance';
import {BookingStatus} from '../../../../constants/api.constants';
import {getStatusPresentation, resolveTone} from '../../../../theme/jobStatus';
import {ScheduledJob} from '../../../../services/api/schedule.api';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {useFocusRefresh} from '../../../../hooks/useFocusRefresh';
import {
  formatMoney,
  formatClock,
  formatSlotRange,
  initialsOf,
} from '../../../../utils/format';

const LIVE: BookingStatus[] = ['EN_ROUTE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

/** How many upcoming stops the home screen previews before the Jobs tab. */
const PREVIEW_STOPS = 2;

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({navigation}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();
  const {data, loading, refreshing, error, refresh, toggleOnlineStatus} = useDashboard();

  // Cancellations and status changes made elsewhere land while this
  // screen is open, so it polls as well as refreshing on focus.
  useFocusRefresh(refresh, {intervalMs: 30000});
  const schedule = useTodaySchedule();
  const shift = useAttendance();

  const {profile, stats, attendance, activeJob, unreadCount} = data;

  /** The card's chip and button read off the real status, not a fixed string. */
  const activeStatus = getStatusPresentation(activeJob?.status as BookingStatus);
  const activeStarted = ['EN_ROUTE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(
    String(activeJob?.status),
  );

  /**
   * The home snapshot and the attendance endpoint describe the same record.
   * Whichever was fetched most recently wins, so tapping Break updates the
   * strip without waiting for the dashboard to refetch.
   */
  const shiftState = shift.today ?? attendance ?? null;
  const hasCheckedIn = Boolean(shiftState?.hasCheckedIn);
  const onBreak = Boolean(shift.today?.isOnBreak ?? attendance?.isOnBreak);
  // The server decides this: a day holds several sessions, so "has checked
  // out" is not "off shift for good".
  const onShift = Boolean(shiftState?.onShift);
  // Worked earlier today and is off shift now — check-in starts another session.
  const canResume = hasCheckedIn && !onShift;
  /** Jobs still open today, which stay this partner's after they go off shift. */
  const openJobCount = (schedule.currentJob ? 1 : 0) + schedule.upcoming.length;
  const sessionCount = Number(shiftState?.sessionCount) || 0;

  /**
   * GPS and permission failures carry flags from getCurrentLocation; a blocked
   * permission is only fixable in Settings, so say that instead of retrying.
   */
  const runShiftAction = useCallback(
    async (action: () => Promise<void>, title: string) => {
      try {
        await action();
      } catch (err: any) {
        if (err?.isPermissionBlocked || err?.isPermissionDenied) {
          Alert.alert(
            'Location permission required',
            err.message || 'Attendance is stamped with your location.',
            [
              {text: 'Cancel', style: 'cancel'},
              {text: 'Open settings', onPress: () => Linking.openSettings()},
            ],
          );
          return;
        }
        Alert.alert(title, err?.message || 'Please try again.');
      }
    },
    [],
  );

  const onCheckIn = useCallback(
    () => runShiftAction(shift.checkIn, 'Could not check in'),
    [runShiftAction, shift.checkIn],
  );

  const onCheckOut = useCallback(() => {
    // Ending a shift takes the partner offline but does not release work
    // already assigned to them, so the count is said out loud.
    const jobsNote =
      openJobCount > 0
        ? `

${openJobCount} job${openJobCount === 1 ? '' : 's'} still open today stay assigned to you. Contact support if you cannot do them.`
        : '';

    Alert.alert(
      'End your shift?',
      `You will go offline and stop receiving new jobs. You can check in again later today.${jobsNote}`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'End shift',
          style: 'destructive',
          onPress: () => runShiftAction(shift.checkOut, 'Could not check out'),
        },
      ],
    );
  }, [runShiftAction, shift.checkOut, openJobCount]);

  /**
   * The server refuses going online outside a shift, so its message is what
   * the partner sees rather than a silent switch that springs back.
   */
  const onToggleOnline = useCallback(
    (next: boolean) => {
      toggleOnlineStatus(next).catch((err: any) => {
        Alert.alert(
          next ? 'Cannot go online' : 'Cannot go offline',
          err?.message || 'Please try again.',
        );
      });
    },
    [toggleOnlineStatus],
  );

  const onToggleBreak = useCallback(
    () => runShiftAction(shift.toggleBreak, 'Could not update your break'),
    [runShiftAction, shift.toggleBreak],
  );

  const name = profile?.User?.name || profile?.name || 'Partner';
  const agency = profile?.Agency?.businessName;
  const isOnline = Boolean(profile?.isOnline);
  const kycPending = profile?.kycStatus ? profile.kycStatus !== 'APPROVED' : false;

  const onRefresh = useCallback(async () => {
    await Promise.all([refresh(), schedule.refresh(), shift.refresh()]);
  }, [refresh, schedule, shift]);

  const upcoming = useMemo(() => {
    const open = schedule.currentJob
      ? [schedule.currentJob, ...schedule.upcoming]
      : schedule.upcoming;
    // The active job already has its own banner above.
    return open.filter(job => !LIVE.includes(job.status)).slice(0, PREVIEW_STOPS);
  }, [schedule.currentJob, schedule.upcoming]);

  const openStop = useCallback(
    (job: ScheduledJob) => navigation.navigate('BookingDetails', {bookingId: job.id}),
    [navigation],
  );

  const quality = profile?.qualityScore != null ? Number(profile.qualityScore) : null;

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      {/* Identity + availability */}
      <View style={[styles.header, {backgroundColor: t.surface, borderBottomColor: t.outline}]}>
        <View style={styles.identity}>
          <View style={[styles.avatar, {backgroundColor: t.surfaceInverse}]}>
            <Text style={[styles.avatarText, {color: t.textOnInverse}]}>
              {initialsOf(name)}
            </Text>
          </View>
          <View style={styles.identityText}>
            <Text style={[styles.name, {color: t.textHeading}]} numberOfLines={1}>
              {name}
            </Text>
            {agency ? (
              <Text style={[styles.agency, {color: t.textTertiary}]} numberOfLines={1}>
                {agency}
              </Text>
            ) : null}
          </View>
          <HeaderIconButton
            icon="bell"
            label="Notifications"
            badge={unreadCount}
            onPress={() => navigation.navigate('Notifications')}
          />
        </View>

        <View
          style={[
            styles.availability,
            {
              backgroundColor: isOnline ? t.successContainer : t.neutralContainer,
              borderColor: isOnline ? t.successBorder : t.outline,
            },
          ]}>
          <View
            style={[
              styles.dot,
              {backgroundColor: isOnline ? t.success : t.textDisabled},
            ]}
          />
          <View style={styles.availabilityText}>
            <Text
              style={[
                styles.availabilityTitle,
                {color: isOnline ? t.successInk : t.textPrimary},
              ]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Text
              style={[
                styles.availabilitySub,
                {color: isOnline ? t.successInk : t.textTertiary},
              ]}>
              {isOnline ? 'Taking jobs' : 'Not taking jobs'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={onToggleOnline}
            accessibilityLabel={isOnline ? 'Go offline' : 'Go online'}
            trackColor={{false: t.outlineStrong, true: t.success}}
            thumbColor={t.surface}
          />
        </View>

        {/* Shift. The online toggle is a state within a shift: checking out
            takes the partner offline, and going online needs an open shift. */}
        <View
          style={[
            styles.shift,
            {
              backgroundColor: onBreak ? t.warningContainer : t.surfaceContainer,
              borderColor: onBreak ? t.warningBorder : t.outline,
            },
          ]}>
          <Icon
            name={onBreak ? 'pause' : 'clock'}
            size={17}
            color={onBreak ? t.warningInk : t.textSecondary}
            strokeWidth={2}
          />
          <View style={styles.shiftText}>
            <Text
              style={[
                styles.shiftTitle,
                {color: onBreak ? t.warningInk : t.textPrimary},
              ]}>
              {onBreak
                ? 'On a break'
                : onShift
                ? 'On shift'
                : canResume
                ? 'Off shift'
                : 'Not checked in'}
            </Text>
            <Text
              style={[
                numeric,
                styles.shiftSub,
                {color: onBreak ? t.warningInk : t.textTertiary},
              ]}>
              {canResume
                ? `Off shift · ${shiftState?.workHours || 0}h today${
                    sessionCount > 1 ? ` over ${sessionCount} shifts` : ''
                  }`
                : onShift
                ? `In since ${formatClock(shiftState?.checkInAt)}${
                    shiftState?.workHours ? ` · ${shiftState.workHours}h` : ''
                  }`
                : 'Check in to start your day'}
            </Text>
          </View>

          {shift.loading && !shiftState ? (
            <ActivityIndicator size="small" color={t.textTertiary} />
          ) : !onShift ? (
            <Pressable
              onPress={onCheckIn}
              disabled={shift.pending !== null}
              accessibilityRole="button"
              accessibilityLabel={canResume ? 'Start another shift' : 'Check in for today'}
              style={[styles.shiftBtn, {backgroundColor: t.brandAction}]}>
              {shift.pending === 'checkIn' ? (
                <ActivityIndicator size="small" color={t.brandActionText} />
              ) : (
                <Text style={[styles.shiftBtnText, {color: t.brandActionText}]}>
                  {canResume ? 'Start shift' : 'Check in'}
                </Text>
              )}
            </Pressable>
          ) : (
            <View style={styles.shiftActions}>
              <Pressable
                onPress={onToggleBreak}
                disabled={shift.pending !== null}
                accessibilityRole="button"
                accessibilityLabel={onBreak ? 'End break' : 'Start a break'}
                style={[
                  styles.shiftBtn,
                  {
                    backgroundColor: onBreak ? t.warning : t.surface,
                    borderColor: onBreak ? t.warning : t.outlineStrong,
                    borderWidth: 1,
                  },
                ]}>
                {shift.pending === 'break' ? (
                  <ActivityIndicator
                    size="small"
                    color={onBreak ? t.warningOnSolid : t.textSecondary}
                  />
                ) : (
                  <Text
                    style={[
                      styles.shiftBtnText,
                      {color: onBreak ? t.warningOnSolid : t.textPrimary},
                    ]}>
                    {onBreak ? 'Resume' : 'Break'}
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={onCheckOut}
                disabled={shift.pending !== null}
                accessibilityRole="button"
                accessibilityLabel="End shift and check out"
                hitSlop={8}>
                <Text style={[styles.endShift, {color: t.textTertiary}]}>
                  {shift.pending === 'checkOut' ? '…' : 'End shift'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          {paddingBottom: screenInsets.tabContentPadding},
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || schedule.refreshing}
            onRefresh={onRefresh}
            tintColor={t.brand}
            colors={[t.brandAction]}
          />
        }>
        {error ? (
          <View
            style={[
              styles.banner,
              {backgroundColor: t.warningContainer, borderColor: t.warningBorder},
            ]}>
            <Icon name="info" size={18} color={t.warningInk} strokeWidth={2} />
            <Text style={[styles.bannerBody, {color: t.warningInk}]}>{error}</Text>
          </View>
        ) : null}

        {/*
          Active job — the only thing that matters while it is running.

          The chip used to read "IN PROGRESS" and the button "Resume this job"
          for every status this card can carry, so a job that was only
          ASSIGNED claimed to be underway. With two jobs in hand that is
          exactly the wrong thing to lie about.
        */}
        {activeJob ? (
          <View style={[styles.activeCard, {backgroundColor: t.surfaceInverse}]}>
            <View style={styles.activeTop}>
              <View
                style={[
                  styles.activeChip,
                  {backgroundColor: resolveTone(activeStatus.tone, t).background},
                ]}>
                <Icon
                  name={activeStatus.icon}
                  size={13}
                  color={resolveTone(activeStatus.tone, t).foreground}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.activeChipText,
                    {color: resolveTone(activeStatus.tone, t).foreground},
                  ]}>
                  {activeStatus.label.toUpperCase()}
                </Text>
              </View>
              {activeJob.scheduledTimeSlot ? (
                <Text style={[numeric, styles.activeSlot, {color: t.textTertiary}]}>
                  {formatSlotRange(activeJob.scheduledTimeSlot, activeJob.Service?.duration)}
                </Text>
              ) : null}
            </View>

            <Text style={[styles.activeTitle, {color: t.textOnInverse}]} numberOfLines={1}>
              {activeJob.Service?.name || 'Your next job'}
            </Text>
            {activeJob.addressLine1 ? (
              <Text style={[styles.activeSub, {color: t.textTertiary}]} numberOfLines={1}>
                {activeJob.addressLine1}
              </Text>
            ) : null}

            <Pressable
              onPress={() => navigation.navigate('ActiveJob', {bookingId: activeJob.id})}
              accessibilityRole="button"
              style={[styles.resumeBtn, {backgroundColor: t.brandAction}]}>
              <Text style={[styles.resumeText, {color: t.brandActionText}]}>
                {activeStarted ? 'Resume this job' : 'Open this job'}
              </Text>
              <Icon name="arrowRight" size={18} color={t.brandActionText} strokeWidth={2.4} />
            </Pressable>
          </View>
        ) : null}

        {/* Today */}
        <View style={styles.statRow}>
          <View style={[styles.stat, {backgroundColor: t.surface, borderColor: t.outline}]}>
            <Text style={[styles.statLabel, {color: t.textTertiary}]}>EARNED TODAY</Text>
            <Text style={[numeric, styles.statValue, {color: t.textHeading}]}>
              {formatMoney(stats?.todayEarnings ?? 0)}
            </Text>
          </View>
          <View style={[styles.stat, {backgroundColor: t.surface, borderColor: t.outline}]}>
            <Text style={[styles.statLabel, {color: t.textTertiary}]}>JOBS DONE</Text>
            <Text style={[numeric, styles.statValue, {color: t.textHeading}]}>
              {stats?.completedBookings ?? 0}
              <Text style={[styles.statOf, {color: t.textTertiary}]}>
                {' / '}
                {stats?.totalBookings ?? 0}
              </Text>
            </Text>
          </View>
          <View style={[styles.stat, {backgroundColor: t.surface, borderColor: t.outline}]}>
            <Text style={[styles.statLabel, {color: t.textTertiary}]}>QUALITY</Text>
            <Text
              style={[
                numeric,
                styles.statValue,
                {color: quality == null ? t.textTertiary : quality >= 70 ? t.success : t.warning},
              ]}>
              {quality == null ? '—' : Math.round(quality)}
            </Text>
          </View>
        </View>

        {/* KYC — a real consequence, not a nag. */}
        {kycPending ? (
          <Pressable
            onPress={() => navigation.navigate('MainTabs', {screen: 'Profile'})}
            accessibilityRole="button"
            style={[
              styles.banner,
              {backgroundColor: t.warningContainer, borderColor: t.warningBorder},
            ]}>
            <Icon name="alert" size={18} color={t.warningInk} strokeWidth={2} />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, {color: t.warningInk}]}>
                Your KYC is not approved yet
              </Text>
              <Text style={[styles.bannerBody, {color: t.warningInk}]}>
                You can keep working, but payouts stay on hold.
              </Text>
            </View>
            <Icon name="chevronRight" size={18} color={t.warningInk} strokeWidth={2.2} />
          </Pressable>
        ) : null}

        {/* Next stops */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, {color: t.textHeading}]}>
            Next on your route
          </Text>
          <Pressable
            onPress={() => navigation.navigate('MainTabs', {screen: 'Jobs'})}
            accessibilityRole="button">
            <Text style={[styles.sectionLink, {color: t.brandAction}]}>
              {schedule.totalJobs ? `All ${schedule.totalJobs} stops` : 'Open route'}
            </Text>
          </Pressable>
        </View>

        {schedule.loading && !upcoming.length ? (
          <View style={[styles.skeleton, {backgroundColor: t.surface, borderColor: t.outline}]}>
            <View style={[styles.skelLine, {backgroundColor: t.outline, width: '60%'}]} />
            <View style={[styles.skelLine, {backgroundColor: t.surfaceContainer, width: '85%'}]} />
          </View>
        ) : upcoming.length ? (
          upcoming.map((job, i) => (
            <RouteStopCard
              key={job.id}
              stopNumber={job.clusterSequence ?? i + 1}
              state="upcoming"
              serviceName={job.Service?.name ?? 'Service'}
              amount={formatMoney(job.netAmount)}
              registrationNumber={job.Vehicle?.registrationNumber ?? undefined}
              vehicleLine={
                [
                  [job.Vehicle?.make, job.Vehicle?.model].filter(Boolean).join(' '),
                  job.Address?.addressLine1 ?? job.addressLine1 ?? undefined,
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined
              }
              slot={formatSlotRange(job.scheduledTimeSlot, job.Service?.duration)}
              isLast={i === upcoming.length - 1}
              onPress={() => openStop(job)}
            />
          ))
        ) : (
          <View style={[styles.empty, {borderColor: t.outlineStrong}]}>
            <Icon name="calendar" size={24} color={t.textDisabled} />
            <Text style={[styles.emptyTitle, {color: t.textHeading}]}>
              {loading ? 'Loading your day…' : 'Nothing left today'}
            </Text>
            {!loading ? (
              <Text style={[styles.emptyBody, {color: t.textSecondary}]}>
                Your agency assigns your route each morning. Stay online to receive it.
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.16,
  },
  agency: {
    fontSize: 12,
    marginTop: 1,
  },
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  availabilityText: {
    flex: 1,
    minWidth: 0,
  },
  availabilityTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  availabilitySub: {
    fontSize: 11,
    marginTop: 1,
  },
  shift: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  shiftText: {
    flex: 1,
    minWidth: 0,
  },
  shiftTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  shiftSub: {
    fontSize: 11,
    marginTop: 1,
  },
  shiftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shiftBtn: {
    minWidth: 74,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  endShift: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
    gap: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  bannerBody: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  activeCard: {
    borderRadius: radii.lg,
    padding: 14,
    gap: 10,
  },
  activeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  activeChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  activeSlot: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.19,
  },
  activeSub: {
    fontSize: 13,
    marginTop: -6,
  },
  resumeBtn: {
    height: 46,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resumeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  statOf: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  skeleton: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  skelLine: {
    height: 12,
    borderRadius: 6,
  },
  empty: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
