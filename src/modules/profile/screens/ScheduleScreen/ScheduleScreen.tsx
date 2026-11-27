/**
 * Schedule & leaves — the month ahead, and the days off in it.
 *
 * The calendar shows job counts per day, so a partner can pick a leave date
 * that costs the least. Dates that already carry a leave are not offered
 * again: the backend allows one leave per date and rejects a second.
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {ScreenHeader} from '../../../../components/molecules/ScreenHeader';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {
  getSchedule,
  getLeaveCalendar,
  applyLeave,
  cancelLeave,
  ScheduledJob,
  PartnerLeave,
} from '../../../../services/api/schedule.api';
import {logger} from '../../../../utils/logger';
import {radii, Tokens} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {formatMoney, formatSlotRange} from '../../../../utils/format';
import {useFocusRefresh} from '../../../../hooks/useFocusRefresh';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const toKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Monday-first offset for the 1st of the month. */
const leadingBlanks = (first: Date): number => (first.getDay() + 6) % 7;

const leaveTone = (status: PartnerLeave['status'], t: Tokens) => {
  switch (status) {
    case 'APPROVED':
      return {bg: t.successContainer, fg: t.successInk, label: 'Approved'};
    case 'REJECTED':
      return {bg: t.dangerContainer, fg: t.dangerInk, label: 'Rejected'};
    default:
      return {bg: t.warningContainer, fg: t.warningInk, label: 'Awaiting approval'};
  }
};

interface ScheduleScreenProps {
  navigation: any;
}

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({navigation}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [calendar, setCalendar] = useState<Record<string, ScheduledJob[]>>({});
  const [leaves, setLeaves] = useState<PartnerLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [applyVisible, setApplyVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const monthStart = useMemo(
    () => new Date(month.getFullYear(), month.getMonth(), 1),
    [month],
  );
  const monthEnd = useMemo(
    () => new Date(month.getFullYear(), month.getMonth() + 1, 0),
    [month],
  );

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const range = {startDate: toKey(monthStart), endDate: toKey(monthEnd)};
      const [scheduleResult, leaveResult] = await Promise.allSettled([
        getSchedule(range),
        getLeaveCalendar(range),
      ]);

      if (scheduleResult.status === 'fulfilled') {
        setCalendar(scheduleResult.value.calendar || {});
      } else {
        logger.error('[Schedule] Fetch failed', scheduleResult.reason);
      }
      if (leaveResult.status === 'fulfilled') {
        setLeaves(leaveResult.value.leaves || []);
      } else {
        logger.error('[Leaves] Fetch failed', leaveResult.reason);
      }

      setError(
        scheduleResult.status === 'rejected' && leaveResult.status === 'rejected'
          ? 'Could not load your schedule. Pull to refresh.'
          : null,
      );
      setLoading(false);
      setRefreshing(false);
    },
    [monthEnd, monthStart],
  );

  useEffect(() => {
    load();
  }, [load]);

  /** Stable refresh for useFocusRefresh — always the 'refresh' variant. */
  const refreshSchedule = useCallback(() => {
    load(true);
  }, [load]);

  // Leave approvals and new bookings land from the agency's side.
  useFocusRefresh(refreshSchedule);

  const leaveByDate = useMemo(() => {
    const map: Record<string, PartnerLeave> = {};
    leaves.forEach(l => {
      map[l.leaveDate?.slice(0, 10)] = l;
    });
    return map;
  }, [leaves]);

  const days = useMemo(() => {
    const out: (Date | null)[] = [];
    for (let i = 0; i < leadingBlanks(monthStart); i++) {
      out.push(null);
    }
    for (let d = 1; d <= monthEnd.getDate(); d++) {
      out.push(new Date(month.getFullYear(), month.getMonth(), d));
    }
    return out;
  }, [month, monthEnd, monthStart]);

  const selectedKey = toKey(selected);
  const selectedJobs = calendar[selectedKey] ?? [];
  const selectedLeave = leaveByDate[selectedKey];
  const today = new Date();
  const selectedIsPast = selected < new Date(today.setHours(0, 0, 0, 0));

  const submitLeave = useCallback(async () => {
    try {
      setSubmitting(true);
      await applyLeave({leaveDate: selectedKey, reason: reason.trim() || undefined});
      setApplyVisible(false);
      setReason('');
      await load(true);
    } catch (err: any) {
      Alert.alert(
        'Could not apply',
        err?.response?.data?.message || err?.message || 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [load, reason, selectedKey]);

  const removeLeave = useCallback(
    (leave: PartnerLeave) => {
      Alert.alert('Cancel this leave?', `Your request for ${leave.leaveDate}.`, [
        {text: 'Keep it', style: 'cancel'},
        {
          text: 'Cancel leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelLeave(leave.id);
              await load(true);
            } catch (err: any) {
              Alert.alert('Could not cancel', err?.message || 'Please try again.');
            }
          },
        },
      ]);
    },
    [load],
  );

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title="Schedule & leaves"
        subtitle={month.toLocaleDateString('en-IN', {month: 'long', year: 'numeric'})}
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
            onRefresh={() => load(true)}
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
            <Text style={[styles.bannerText, {color: t.warningInk}]}>{error}</Text>
          </View>
        ) : null}

        {/* Calendar */}
        <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <View style={styles.monthRow}>
            <Pressable
              onPress={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              style={[styles.monthBtn, {borderColor: t.outline}]}>
              <Icon name="chevronLeft" size={15} color={t.neutralInk} strokeWidth={2.4} />
            </Pressable>
            <Text style={[styles.monthLabel, {color: t.textHeading}]}>
              {month.toLocaleDateString('en-IN', {month: 'long', year: 'numeric'})}
            </Text>
            <Pressable
              onPress={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
              accessibilityRole="button"
              accessibilityLabel="Next month"
              style={[styles.monthBtn, {borderColor: t.outline}]}>
              <Icon name="chevronRight" size={15} color={t.neutralInk} strokeWidth={2.4} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <Text
                key={`${d}-${i}`}
                style={[styles.weekday, {color: t.textDisabled}]}>
                {d}
              </Text>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator style={styles.loader} color={t.brandAction} />
          ) : (
            <View style={styles.grid}>
              {days.map((day, i) => {
                if (!day) {
                  return <View key={`blank-${i}`} style={styles.cell} />;
                }
                const key = toKey(day);
                const jobCount = calendar[key]?.length ?? 0;
                const leave = leaveByDate[key];
                const isSelected = isSameDay(day, selected);
                const isToday = isSameDay(day, new Date());

                const bg = isSelected
                  ? t.brandAction
                  : leave
                  ? t.warningContainer
                  : jobCount
                  ? t.surfaceContainer
                  : 'transparent';
                const fg = isSelected
                  ? t.brandActionText
                  : leave
                  ? t.warningInk
                  : t.textPrimary;

                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelected(day)}
                    accessibilityRole="button"
                    accessibilityState={{selected: isSelected}}
                    accessibilityLabel={`${day.getDate()}, ${
                      leave ? 'leave' : `${jobCount} jobs`
                    }`}
                    style={[
                      styles.cell,
                      styles.cellFilled,
                      {
                        backgroundColor: bg,
                        borderColor: isToday && !isSelected ? t.brand : 'transparent',
                      },
                    ]}>
                    <Text style={[numeric, styles.cellDay, {color: fg}]}>
                      {day.getDate()}
                    </Text>
                    {leave ? (
                      <Text style={[styles.cellTag, {color: fg}]}>OFF</Text>
                    ) : jobCount ? (
                      <Text style={[numeric, styles.cellTag, {color: fg}]}>
                        {jobCount}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={[styles.legend, {borderTopColor: t.outline}]}>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, {backgroundColor: t.brandAction}]} />
              <Text style={[styles.legendText, {color: t.textTertiary}]}>Selected</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, {backgroundColor: t.warningContainer}]} />
              <Text style={[styles.legendText, {color: t.textTertiary}]}>Leave</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.swatch, {backgroundColor: t.surfaceContainer}]} />
              <Text style={[styles.legendText, {color: t.textTertiary}]}>Jobs booked</Text>
            </View>
          </View>
        </View>

        {/* Selected day */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, {color: t.textHeading}]}>
            {selected.toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </Text>
          <Text style={[numeric, styles.sectionMeta, {color: t.textTertiary}]}>
            {selectedJobs.length
              ? `${selectedJobs.length} ${selectedJobs.length === 1 ? 'job' : 'jobs'}`
              : 'No jobs'}
          </Text>
        </View>

        {selectedLeave ? (
          <View
            style={[
              styles.leaveCard,
              {
                backgroundColor: leaveTone(selectedLeave.status, t).bg,
                borderColor: t.outline,
              },
            ]}>
            <View style={styles.leaveText}>
              <Text
                style={[
                  styles.leaveTitle,
                  {color: leaveTone(selectedLeave.status, t).fg},
                ]}>
                {leaveTone(selectedLeave.status, t).label}
              </Text>
              {selectedLeave.reason ? (
                <Text
                  style={[styles.leaveReason, {color: leaveTone(selectedLeave.status, t).fg}]}>
                  {selectedLeave.reason}
                </Text>
              ) : null}
            </View>
            {selectedLeave.status === 'PENDING' ? (
              <Pressable
                onPress={() => removeLeave(selectedLeave)}
                accessibilityRole="button"
                hitSlop={8}>
                <Text style={[styles.leaveCancel, {color: t.dangerInk}]}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {selectedJobs.length ? (
          <View style={[styles.list, {backgroundColor: t.surface, borderColor: t.outline}]}>
            {selectedJobs.map((job, i) => (
              <View key={job.id}>
                {i > 0 ? (
                  <View style={[styles.divider, {backgroundColor: t.outline}]} />
                ) : null}
                <Pressable
                  onPress={() =>
                    navigation.navigate('BookingDetails', {bookingId: job.id})
                  }
                  accessibilityRole="button"
                  style={styles.jobRow}>
                  <Text style={[numeric, styles.jobTime, {color: t.textSecondary}]}>
                    {formatSlotRange(job.scheduledTimeSlot, job.Service?.duration).split(
                      ' – ',
                    )[0] || '--:--'}
                  </Text>
                  <View style={styles.jobText}>
                    <Text
                      style={[styles.jobName, {color: t.textPrimary}]}
                      numberOfLines={1}>
                      {job.Service?.name ?? 'Service'}
                    </Text>
                    {job.Vehicle?.registrationNumber ? (
                      <Text
                        style={[numeric, styles.jobVehicle, {color: t.textTertiary}]}
                        numberOfLines={1}>
                        {job.Vehicle.registrationNumber}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[numeric, styles.jobAmount, {color: t.textHeading}]}>
                    {formatMoney(job.netAmount)}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : !selectedLeave ? (
          <View style={[styles.empty, {borderColor: t.outlineStrong}]}>
            <Text style={[styles.emptyText, {color: t.textSecondary}]}>
              Nothing scheduled on this day.
            </Text>
          </View>
        ) : null}

        {!selectedLeave && !selectedIsPast ? (
          <Pressable
            onPress={() => setApplyVisible(true)}
            accessibilityRole="button"
            style={[
              styles.applyBtn,
              {borderColor: t.outlineStrong, backgroundColor: t.surface},
            ]}>
            <Icon name="calendar" size={17} color={t.textPrimary} strokeWidth={1.9} />
            <Text style={[styles.applyText, {color: t.textPrimary}]}>
              Apply for leave on this day
            </Text>
          </Pressable>
        ) : null}

        {/* All leaves this month */}
        {leaves.length ? (
          <>
            <Text style={[styles.sectionTitle, {color: t.textHeading}]}>
              Leave requests
            </Text>
            <View style={[styles.list, {backgroundColor: t.surface, borderColor: t.outline}]}>
              {leaves.map((leave, i) => {
                const tone = leaveTone(leave.status, t);
                return (
                  <View key={leave.id}>
                    {i > 0 ? (
                      <View style={[styles.divider, {backgroundColor: t.outline}]} />
                    ) : null}
                    <View style={styles.jobRow}>
                      <View style={styles.jobText}>
                        <Text style={[numeric, styles.jobName, {color: t.textPrimary}]}>
                          {new Date(leave.leaveDate).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                        {leave.reason ? (
                          <Text
                            style={[styles.jobVehicle, {color: t.textTertiary}]}
                            numberOfLines={1}>
                            {leave.reason}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.pill, {backgroundColor: tone.bg}]}>
                        <Text style={[styles.pillText, {color: tone.fg}]}>
                          {tone.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Apply sheet */}
      <Modal
        visible={applyVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setApplyVisible(false)}>
        <Pressable
          style={[styles.scrim, {backgroundColor: t.scrim}]}
          onPress={() => setApplyVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Close">
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: t.surface,
                paddingBottom: screenInsets.stickyBarPadding + 12,
              },
            ]}
            onPress={() => {}}>
            <View style={styles.sheetHandleRow}>
              <View style={[styles.sheetHandle, {backgroundColor: t.outlineStrong}]} />
            </View>
            <Text style={[styles.sheetTitle, {color: t.textHeading}]}>
              Leave on{' '}
              {selected.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            {selectedJobs.length ? (
              <View
                style={[
                  styles.banner,
                  {backgroundColor: t.warningContainer, borderColor: t.warningBorder},
                ]}>
                <Icon name="alert" size={16} color={t.warningInk} strokeWidth={2} />
                <Text style={[styles.bannerText, {color: t.warningInk}]}>
                  {selectedJobs.length} {selectedJobs.length === 1 ? 'job is' : 'jobs are'}{' '}
                  already booked that day. Your agency will have to reassign them.
                </Text>
              </View>
            ) : null}
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason (optional)"
              placeholderTextColor={t.textDisabled}
              multiline
              accessibilityLabel="Reason for leave"
              style={[
                styles.input,
                {
                  backgroundColor: t.surfaceContainer,
                  borderColor: t.outlineStrong,
                  color: t.textPrimary,
                },
              ]}
            />
            <Pressable
              onPress={submitLeave}
              disabled={submitting}
              accessibilityRole="button"
              style={[styles.sheetBtn, {backgroundColor: t.brandAction}]}>
              <Text style={[styles.sheetBtnText, {color: t.brandActionText}]}>
                {submitting ? 'Sending…' : 'Request leave'}
              </Text>
            </Pressable>
            <Text style={[styles.sheetNote, {color: t.textTertiary}]}>
              Your agency approves or rejects it. Until then the day stays bookable.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 13,
    gap: 12,
  },
  banner: {
    flexDirection: 'row',
    gap: 10,
    padding: 11,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    borderRadius: radii.sm,
    borderWidth: 1.5,
  },
  cellDay: {
    fontSize: 13,
    fontWeight: '600',
  },
  cellTag: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  loader: {
    paddingVertical: 40,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  swatch: {
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  sectionMeta: {
    fontSize: 12,
  },
  leaveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  leaveText: {
    flex: 1,
    gap: 2,
  },
  leaveTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  leaveReason: {
    fontSize: 12,
  },
  leaveCancel: {
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingVertical: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 13,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  jobTime: {
    width: 44,
    fontSize: 12,
    fontWeight: '700',
  },
  jobText: {
    flex: 1,
    minWidth: 0,
  },
  jobName: {
    fontSize: 14,
    fontWeight: '600',
  },
  jobVehicle: {
    fontSize: 11,
    marginTop: 1,
  },
  jobAmount: {
    fontSize: 14,
    fontWeight: '700',
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
  empty: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  applyText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  sheetHandleRow: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.18,
  },
  input: {
    minHeight: 86,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  sheetBtn: {
    height: 50,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  sheetNote: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
