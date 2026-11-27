/**
 * Performance — the score that decides whether work keeps arriving.
 *
 * Quality score leads because it is the one number with consequences: below
 * 70 the agency stops assigning. Everything else explains how it got
 * there, so the partner can act on it rather than just watch it.
 */

import React, {useMemo} from 'react';
import {View, ScrollView, StyleSheet, RefreshControl} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {SegmentedTabs} from '../../../../components/atoms/SegmentedTabs';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {ScreenHeader} from '../../../../components/molecules/ScreenHeader';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {usePerformance} from '../../../../hooks/usePerformance';
import {useDashboard} from '../../../../hooks/useDashboard';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {formatMoney} from '../../../../utils/format';
import {PerformancePeriod} from './PerformanceScreen.types';
import {useFocusRefresh} from '../../../../hooks/useFocusRefresh';

const PERIODS: {key: PerformancePeriod; label: string}[] = [
  {key: 'today', label: 'Today'},
  {key: 'week', label: 'Week'},
  {key: 'month', label: 'Month'},
  {key: 'year', label: 'Year'},
];

/** Below this the backend pauses new assignments. */
const QUALITY_FLOOR = 70;

interface PerformanceScreenProps {
  navigation: any;
}

export const PerformanceScreen: React.FC<PerformanceScreenProps> = () => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();
  const {
    activePeriod,
    setActivePeriod,
    loading,
    refreshing,
    error,
    kpiMetrics,
    chartData,
    ratingBreakdown,
    totalRatings,
    averageRating,
    topServices,
    refresh,
  } = usePerformance();

  // Refetch whenever the partner comes back to this screen.
  useFocusRefresh(refresh);

  // The quality score lives on the partner profile, not the analytics feed.
  const {data} = useDashboard();
  const quality =
    data.profile?.qualityScore != null ? Number(data.profile.qualityScore) : null;

  const peak = useMemo(
    () => chartData.reduce((max, d) => Math.max(max, d.value || 0), 0),
    [chartData],
  );

  const qualityTone =
    quality == null
      ? {fg: t.textTertiary, bg: t.neutralContainer, ink: t.neutralInk, label: 'Not scored yet'}
      : quality >= 85
      ? {fg: t.success, bg: t.successContainer, ink: t.successInk, label: 'Good standing'}
      : quality >= QUALITY_FLOOR
      ? {fg: t.warning, bg: t.warningContainer, ink: t.warningInk, label: 'Watch your score'}
      : {fg: t.danger, bg: t.dangerContainer, ink: t.dangerInk, label: 'Assignments paused'};

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader title="Your score">
        <SegmentedTabs<PerformancePeriod>
          options={PERIODS}
          value={activePeriod}
          onChange={setActivePeriod}
        />
      </ScreenHeader>

      <ScrollView
        contentContainerStyle={[
          styles.body,
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

        {/* Quality score */}
        <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <View style={styles.qualityRow}>
            <View
              style={[
                styles.qualityDial,
                {borderColor: qualityTone.fg, backgroundColor: qualityTone.bg},
              ]}>
              <Text style={[numeric, styles.qualityValue, {color: t.textHeading}]}>
                {quality == null ? '—' : Math.round(quality)}
              </Text>
              <Text style={[styles.qualityOf, {color: t.textTertiary}]}>of 100</Text>
            </View>
            <View style={styles.qualityText}>
              <Text style={[styles.cardTitle, {color: t.textHeading}]}>
                Quality score
              </Text>
              <View style={[styles.pill, {backgroundColor: qualityTone.bg}]}>
                <Icon
                  name={quality != null && quality >= QUALITY_FLOOR ? 'check' : 'alert'}
                  size={12}
                  color={qualityTone.ink}
                  strokeWidth={2.4}
                />
                <Text style={[styles.pillText, {color: qualityTone.ink}]}>
                  {qualityTone.label}
                </Text>
              </View>
              <Text style={[styles.qualityHint, {color: t.textSecondary}]}>
                Built from punctuality, ratings and evidence quality. Below{' '}
                {QUALITY_FLOOR} pauses new assignments.
              </Text>
            </View>
          </View>
        </View>

        {/* KPI tiles straight from the analytics feed */}
        {kpiMetrics.length ? (
          <View style={styles.kpiGrid}>
            {kpiMetrics.map(metric => (
              <View
                key={metric.id}
                style={[
                  styles.kpi,
                  {backgroundColor: t.surface, borderColor: t.outline},
                ]}>
                <Text style={[styles.eyebrow, {color: t.textTertiary}]}>
                  {metric.label.toUpperCase()}
                </Text>
                <Text style={[numeric, styles.kpiValue, {color: t.textHeading}]}>
                  {metric.value}
                </Text>
                {metric.change ? (
                  <Text
                    style={[
                      numeric,
                      styles.kpiChange,
                      {color: metric.isPositive ? t.success : t.warning},
                    ]}>
                    {metric.change}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Trend */}
        {chartData.length ? (
          <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
            <Text style={[styles.cardTitle, {color: t.textHeading}]}>Trend</Text>
            <View style={styles.chart}>
              <View style={[styles.axis, {backgroundColor: t.outline}]} />
              {chartData.map((point, i) => {
                const ratio = peak > 0 ? point.value / peak : 0;
                const height = point.value > 0 ? Math.max(ratio * 90, 6) : 2;
                return (
                  <View key={`${point.label}-${i}`} style={styles.barColumn}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height,
                          backgroundColor:
                            point.value > 0 ? t.brandAction : t.outlineStrong,
                        },
                      ]}
                    />
                    <Text
                      style={[styles.barLabel, {color: t.textTertiary}]}
                      numberOfLines={1}>
                      {point.label}
                    </Text>
                  </View>
                );
              })}
            </View>
            {peak === 0 ? (
              <Text style={[styles.chartNote, {color: t.textTertiary}]}>
                No completed jobs in this period
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Ratings */}
        <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <View style={styles.ratingHead}>
            <Text style={[styles.cardTitle, {color: t.textHeading}]}>
              Customer ratings
            </Text>
            <View style={styles.ratingScore}>
              <Text style={[numeric, styles.ratingValue, {color: t.textHeading}]}>
                {averageRating ? averageRating.toFixed(1) : '—'}
              </Text>
              <Icon name="star" size={15} color={t.warning} filled />
              <Text style={[numeric, styles.ratingCount, {color: t.textTertiary}]}>
                {totalRatings}
              </Text>
            </View>
          </View>

          {totalRatings > 0 ? (
            ratingBreakdown.map(row => (
              <View key={row.stars} style={styles.ratingRow}>
                <Text style={[numeric, styles.ratingStars, {color: t.textSecondary}]}>
                  {row.stars}★
                </Text>
                <View style={[styles.ratingTrack, {backgroundColor: t.neutralContainer}]}>
                  <View
                    style={[
                      styles.ratingFill,
                      {
                        width: `${Math.max(row.percentage, 0)}%`,
                        backgroundColor: row.stars >= 4 ? t.success : t.warning,
                      },
                    ]}
                  />
                </View>
                <Text style={[numeric, styles.ratingRowCount, {color: t.textTertiary}]}>
                  {row.count}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.chartNote, {color: t.textTertiary}]}>
              {loading ? 'Loading reviews…' : 'No customer has rated you yet'}
            </Text>
          )}
        </View>

        {/* Services */}
        {topServices.length ? (
          <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
            <Text style={[styles.cardTitle, {color: t.textHeading}]}>
              Where the work comes from
            </Text>
            {topServices.map((service, i) => (
              <View key={service.id}>
                {i > 0 ? (
                  <View style={[styles.divider, {backgroundColor: t.outline}]} />
                ) : null}
                <View style={styles.serviceRow}>
                  <View style={styles.serviceText}>
                    <Text
                      style={[styles.serviceName, {color: t.textPrimary}]}
                      numberOfLines={1}>
                      {service.name}
                    </Text>
                    <Text style={[numeric, styles.serviceJobs, {color: t.textTertiary}]}>
                      {service.jobsCount} {service.jobsCount === 1 ? 'job' : 'jobs'}
                    </Text>
                  </View>
                  <Text style={[numeric, styles.serviceRevenue, {color: t.textHeading}]}>
                    {formatMoney(service.revenue)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 14,
    gap: 11,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  bannerBody: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  qualityDial: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.52,
  },
  qualityOf: {
    fontSize: 10,
    fontWeight: '600',
  },
  qualityText: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  qualityHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpi: {
    flexGrow: 1,
    flexBasis: '47%',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 3,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  kpiChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
    height: 122,
    paddingTop: 14,
  },
  axis: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    height: 1,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    height: '100%',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  chartNote: {
    fontSize: 12,
    textAlign: 'center',
  },
  ratingHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  ratingScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  ratingCount: {
    fontSize: 12,
    marginLeft: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  ratingStars: {
    width: 26,
    fontSize: 12,
    fontWeight: '600',
  },
  ratingTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingFill: {
    height: '100%',
    borderRadius: 4,
  },
  ratingRowCount: {
    width: 28,
    fontSize: 12,
    textAlign: 'right',
  },
  divider: {
    height: 1,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 9,
  },
  serviceText: {
    flex: 1,
    minWidth: 0,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
  },
  serviceJobs: {
    fontSize: 11,
    marginTop: 1,
  },
  serviceRevenue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
