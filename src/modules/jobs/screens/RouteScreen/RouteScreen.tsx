/**
 * Route Screen — the Jobs tab.
 *
 * The partner's whole day in the order the optimiser produced, not a single
 * active job. Stop numbers come from `clusterSequence`, so they are real
 * routing information; where the cluster has not run yet they fall back to
 * position in the list, which the backend already sorts by time slot.
 */

import React, {useCallback, useMemo, useState} from 'react';
import {View, ScrollView, RefreshControl, StyleSheet} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {SegmentedTabs} from '../../../../components/atoms/SegmentedTabs';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {
  ScreenHeader,
  HeaderIconButton,
} from '../../../../components/molecules/ScreenHeader';
import {RouteStopCard} from '../../../../components/molecules/RouteStopCard';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {useTodaySchedule} from '../../../../hooks/useTodaySchedule';
import {ScheduledJob} from '../../../../services/api/schedule.api';
import {BookingStatus} from '../../../../constants/api.constants';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {useFocusRefresh} from '../../../../hooks/useFocusRefresh';
import {
  formatMoney,
  formatSlotRange,
  formatDuration,
} from '../../../../utils/format';
import {
  minutesPastSlotEnd,
  slotExpiresAt,
  istClock,
} from '../../../../utils/slotTime';

type Segment = 'today' | 'done';

/** The partner is physically working this job right now. */
const LIVE: BookingStatus[] = ['EN_ROUTE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

interface SlotTiming {
  minutesLate: number;
  expiresAt: string;
  expired: boolean;
}

/**
 * Lateness against the slot. The schedule endpoint does not return the
 * server's SLA verdict, so this mirrors the rule the backend applies when it
 * refuses a status change: the slot's own end plus a two-hour grace.
 *
 * This used to parse the slot itself, with two mistakes: it read "04:20 PM"
 * as 04:20 and it derived the end from `Service.duration` instead of the end
 * the slot states. Together those marked every afternoon job expired — the
 * Jobs tab refused to open a job the server would happily have accepted. The
 * arithmetic now lives in src/utils/slotTime.ts, ported from the backend.
 */
const slotTiming = (job: ScheduledJob, now: Date): SlotTiming | null => {
  const minutesLate = minutesPastSlotEnd(job.scheduledDate, job.scheduledTimeSlot, now);
  const expiry = slotExpiresAt(job.scheduledDate, job.scheduledTimeSlot);
  if (minutesLate === null || !expiry) {
    return null;
  }

  return {
    minutesLate,
    expiresAt: istClock(expiry),
    expired: now.getTime() > expiry.getTime(),
  };
};

interface RouteScreenProps {
  navigation: any;
}

export const RouteScreen: React.FC<RouteScreenProps> = ({navigation}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();
  const [segment, setSegment] = useState<Segment>('today');
  const {currentJob, upcoming, completed, totalJobs, loading, refreshing, error, refresh} =
    useTodaySchedule();

  // Cancellations and status changes made elsewhere land while this
  // screen is open, so it polls as well as refreshing on focus.
  useFocusRefresh(refresh, {intervalMs: 30000});

  const now = useMemo(() => new Date(), []);

  const openJobs = useMemo(
    () => (currentJob ? [currentJob, ...upcoming] : upcoming),
    [currentJob, upcoming],
  );

  const lateCount = useMemo(
    () =>
      openJobs.filter(job => {
        const timing = slotTiming(job, now);
        return timing ? timing.minutesLate > 0 : false;
      }).length,
    [openJobs, now],
  );

  const dayTotal = useMemo(
    () =>
      [...openJobs, ...completed].reduce(
        (sum, job) => sum + Number(job.netAmount || 0),
        0,
      ),
    [openJobs, completed],
  );

  /** The optimiser estimates travel for the whole cluster, not per leg. */
  const clusterTravel = useMemo(() => {
    const withCluster = [...openJobs, ...completed].find(
      job => job.Cluster?.estimatedTravelTime,
    );
    return withCluster?.Cluster?.estimatedTravelTime ?? null;
  }, [openJobs, completed]);

  const openJob = useCallback(
    (job: ScheduledJob) => {
      // Past the grace window there is nothing to do on the job screen, so
      // send the partner straight to the explanation.
      const timing = slotTiming(job, new Date());
      if (timing?.expired && !LIVE.includes(job.status)) {
        navigation.navigate('SlotExpired', {bookingId: job.id});
        return;
      }
      if (LIVE.includes(job.status)) {
        navigation.navigate('ActiveJob', {bookingId: job.id});
      } else {
        navigation.navigate('BookingDetails', {bookingId: job.id});
      }
    },
    [navigation],
  );

  const subtitleParts = [
    now.toLocaleDateString('en-IN', {weekday: 'short', day: 'numeric', month: 'short'}),
    `${totalJobs} ${totalJobs === 1 ? 'stop' : 'stops'}`,
  ];
  if (clusterTravel) {
    subtitleParts.push(`${formatDuration(clusterTravel)} driving`);
  }
  if (dayTotal > 0) {
    subtitleParts.push(formatMoney(dayTotal));
  }

  const list = segment === 'today' ? openJobs : completed;

  const renderStop = (job: ScheduledJob, index: number, isLast: boolean) => {
    const timing = slotTiming(job, now);
    const isDone = segment === 'done';
    const isActive = !isDone && LIVE.includes(job.status);
    const isLate = !isDone && !isActive && !!timing && timing.minutesLate > 0;

    const warning = timing
      ? timing.expired
        ? `Slot ${formatSlotRange(job.scheduledTimeSlot, job.Service?.duration)} · expired at ${timing.expiresAt}`
        : timing.minutesLate > 0
        ? `Slot ${formatSlotRange(job.scheduledTimeSlot, job.Service?.duration)} · ${timing.minutesLate} min late · expires ${timing.expiresAt}`
        : undefined
      : undefined;

    const vehicleLine = [
      [job.Vehicle?.make, job.Vehicle?.model].filter(Boolean).join(' '),
      job.Address?.addressLine1 ?? job.addressLine1 ?? undefined,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <RouteStopCard
        key={job.id}
        stopNumber={job.clusterSequence ?? index + 1}
        state={isDone ? 'done' : isActive ? 'active' : isLate ? 'late' : 'upcoming'}
        serviceName={job.Service?.name ?? 'Service'}
        amount={formatMoney(job.netAmount, {sign: isDone})}
        registrationNumber={job.Vehicle?.registrationNumber ?? undefined}
        vehicleLine={vehicleLine || undefined}
        slot={
          warning
            ? undefined
            : formatSlotRange(job.scheduledTimeSlot, job.Service?.duration)
        }
        status={isActive ? job.status : undefined}
        warning={warning}
        actionLabel={isActive ? 'Resume →' : undefined}
        isLast={isLast}
        onPress={() => openJob(job)}
      />
    );
  };

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title="Today's route"
        subtitle={subtitleParts.join(' · ')}
        subtitleNumeric
        right={
          <HeaderIconButton
            icon="clock"
            label="Job history"
            onPress={() => navigation.navigate('JobHistory')}
          />
        }>
        <SegmentedTabs<Segment>
          options={[
            {key: 'today', label: `To do${openJobs.length ? ` ${openJobs.length}` : ''}`},
            {key: 'done', label: `Done${completed.length ? ` ${completed.length}` : ''}`},
          ]}
          value={segment}
          onChange={setSegment}
        />
        {segment === 'today' && lateCount > 0 ? (
          <View style={styles.chipRow}>
            <View
              style={[
                styles.chip,
                {backgroundColor: t.dangerContainer, borderColor: t.dangerBorder},
              ]}>
              <Icon name="clock" size={13} color={t.dangerInk} strokeWidth={2.2} />
              <Text style={[numeric, styles.chipText, {color: t.dangerInk}]}>
                {lateCount} running late
              </Text>
            </View>
          </View>
        ) : null}
      </ScreenHeader>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: screenInsets.tabContentPadding},
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={t.brand}
            colors={[t.brandAction]}
          />
        }>
        {loading ? (
          <View style={styles.stateBlock}>
            {[0, 1, 2].map(i => (
              <View
                key={i}
                style={[
                  styles.skeleton,
                  {backgroundColor: t.surface, borderColor: t.outline},
                ]}>
                <View style={[styles.skelLine, {backgroundColor: t.outline, width: '62%'}]} />
                <View
                  style={[styles.skelLine, {backgroundColor: t.surfaceContainer, width: '88%'}]}
                />
                <View
                  style={[styles.skelLine, {backgroundColor: t.surfaceContainer, width: '44%'}]}
                />
              </View>
            ))}
          </View>
        ) : error ? (
          <View
            style={[
              styles.state,
              {backgroundColor: t.dangerContainer, borderColor: t.dangerBorder},
            ]}>
            <Text style={[styles.stateTitle, {color: t.dangerInk}]}>
              Could not load today's route
            </Text>
            <Text style={[styles.stateBody, {color: t.dangerInk}]}>{error}</Text>
          </View>
        ) : list.length === 0 ? (
          <View style={[styles.state, {borderColor: t.outlineStrong, borderStyle: 'dashed'}]}>
            <Icon name="calendar" size={26} color={t.textDisabled} />
            <Text style={[styles.stateTitle, {color: t.textHeading}]}>
              {segment === 'today' ? 'Nothing left today' : 'Nothing finished yet'}
            </Text>
            <Text style={[styles.stateBody, {color: t.textSecondary}]}>
              {segment === 'today'
                ? 'Your agency assigns your route each morning. Stay online to receive it.'
                : 'Jobs you complete today will appear here.'}
            </Text>
          </View>
        ) : (
          list.map((job, i) => renderStop(job, i, i === list.length - 1))
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 7,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stateBlock: {
    gap: 10,
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
  state: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  stateTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateBody: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
