/**
 * Job History — every past job, including the ones that went wrong.
 *
 * This is the only screen that can show a cancelled or breached booking, so
 * the filters keep those reachable rather than hiding them behind "completed".
 * A partner disputing a penalty starts here.
 */

import React, {useCallback} from 'react';
import {View, FlatList, StyleSheet, RefreshControl, ActivityIndicator} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {SegmentedTabs} from '../../../../components/atoms/SegmentedTabs';
import {RouteStopCard} from '../../../../components/molecules/RouteStopCard';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {ScreenHeader} from '../../../../components/molecules/ScreenHeader';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {useJobHistory, JobHistoryFilter} from '../../../../hooks/useJobHistory';
import {Booking} from '../../../../types/api.types';
import {BookingStatus} from '../../../../constants/api.constants';
import {radii} from '../../../../theme/tokens';
import {formatMoney, formatSlotRange} from '../../../../utils/format';
import {useFocusRefresh} from '../../../../hooks/useFocusRefresh';

const FILTERS: {key: JobHistoryFilter; label: string}[] = [
  {key: 'ALL', label: 'All'},
  {key: 'COMPLETED', label: 'Completed'},
  {key: 'CANCELLED', label: 'Cancelled'},
];

const EMPTY: Record<JobHistoryFilter, {title: string; body: string}> = {
  ALL: {
    title: 'No jobs yet',
    body: 'Finished and cancelled jobs both land here, oldest at the bottom.',
  },
  COMPLETED: {
    title: 'Nothing completed yet',
    body: 'Jobs you finish will be listed here with what you earned.',
  },
  CANCELLED: {
    title: 'Nothing cancelled',
    body: 'Good news — no cancellations or missed slots on your record.',
  },
};

interface JobHistoryScreenProps {
  navigation: any;
}

export const JobHistoryScreen: React.FC<JobHistoryScreenProps> = ({navigation}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();
  const {
    jobs,
    filter,
    setFilter,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  } = useJobHistory();

  // Refetch whenever the partner comes back to this screen.
  useFocusRefresh(refresh);

  const renderItem = useCallback(
    ({item, index}: {item: Booking; index: number}) => {
      const status = item.status as BookingStatus;
      const failed = status === 'CANCELLED' || status === 'SLA_BREACHED';

      return (
        <RouteStopCard
          stopNumber={index + 1}
          state={failed ? 'late' : 'done'}
          serviceName={item.Service?.name || item.service?.name || 'Service'}
          amount={failed ? formatMoney(0) : formatMoney(item.netAmount)}
          registrationNumber={item.Vehicle?.registrationNumber ?? undefined}
          vehicleLine={[item.Vehicle?.make, item.Vehicle?.model]
            .filter(Boolean)
            .join(' ')}
          slot={
            failed
              ? undefined
              : [item.scheduledDate, formatSlotRange(item.scheduledTimeSlot)]
                  .filter(Boolean)
                  .join(' · ')
          }
          warning={
            failed
              ? `${item.scheduledDate ?? ''} · ${
                  status === 'CANCELLED' ? 'Cancelled' : 'Slot closed unserved'
                }`
              : undefined
          }
          isLast={index === jobs.length - 1}
          onPress={() => navigation.navigate('BookingDetails', {bookingId: item.id})}
        />
      );
    },
    [jobs.length, navigation],
  );

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title="Job history"
        subtitle={jobs.length ? `${jobs.length} loaded` : undefined}
        subtitleNumeric
        onBack={() => navigation.goBack()}>
        <SegmentedTabs<JobHistoryFilter>
          options={FILTERS}
          value={filter}
          onChange={setFilter}
        />
      </ScreenHeader>

      <FlatList
        data={jobs}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.content,
          {paddingBottom: screenInsets.stackContentPadding},
          jobs.length === 0 && styles.contentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasMore && !loadingMore) {
            loadMore();
          }
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={t.brand}
            colors={[t.brandAction]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateBlock}>
              {[0, 1, 2].map(i => (
                <View
                  key={i}
                  style={[
                    styles.skeleton,
                    {backgroundColor: t.surface, borderColor: t.outline},
                  ]}>
                  <View
                    style={[styles.skelLine, {backgroundColor: t.outline, width: '60%'}]}
                  />
                  <View
                    style={[
                      styles.skelLine,
                      {backgroundColor: t.surfaceContainer, width: '85%'},
                    ]}
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
                Could not load your history
              </Text>
              <Text style={[styles.stateBody, {color: t.dangerInk}]}>{error}</Text>
            </View>
          ) : (
            <View style={[styles.state, {borderColor: t.outlineStrong}]}>
              <Icon name="clock" size={26} color={t.textDisabled} />
              <Text style={[styles.stateTitle, {color: t.textHeading}]}>
                {EMPTY[filter].title}
              </Text>
              <Text style={[styles.stateBody, {color: t.textSecondary}]}>
                {EMPTY[filter].body}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              style={styles.footer}
              size="small"
              color={t.brandAction}
            />
          ) : jobs.length > 0 && !hasMore ? (
            <Text style={[styles.endNote, {color: t.textTertiary}]}>
              That's your whole history
            </Text>
          ) : null
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  contentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
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
    borderStyle: 'dashed',
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 6,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateBody: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 18,
  },
  endNote: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 18,
  },
});
