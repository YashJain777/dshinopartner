/**
 * Earnings — what the shift was worth, and what can leave the wallet.
 *
 * Two different numbers that are easy to confuse, so they are kept visually
 * apart: period earnings (what the work produced) and wallet balance (what is
 * actually withdrawable). A payout can be blocked by KYC while earnings keep
 * rising, and the screen has to make that legible rather than surprising.
 */

import React, {useCallback, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {SegmentedTabs} from '../../../../components/atoms/SegmentedTabs';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {
  ScreenHeader,
  HeaderIconButton,
} from '../../../../components/molecules/ScreenHeader';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {useEarnings} from '../../../../hooks/useEarnings';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {formatMoney} from '../../../../utils/format';
import {useFocusRefresh} from '../../../../hooks/useFocusRefresh';

type Period = 'day' | 'week' | 'month' | 'year';

const PERIODS: {key: Period; label: string}[] = [
  {key: 'day', label: 'Today'},
  {key: 'week', label: 'Week'},
  {key: 'month', label: 'Month'},
  {key: 'year', label: 'Year'},
];

interface EarningsScreenProps {
  navigation: any;
}

export const EarningsScreen: React.FC<EarningsScreenProps> = ({navigation}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();
  const {
    balance,
    stats,
    period,
    setPeriod,
    periodLabel,
    chartData,
    transactions,
    loading,
    refreshing,
    isWithdrawing,
    refresh,
    withdraw,
    kycInfo,
    error,
  } = useEarnings();

  // Refetch whenever the partner comes back to this screen.
  useFocusRefresh(refresh);

  const payoutBlocked = Boolean(kycInfo && kycInfo.overallKycStatus !== 'APPROVED');

  /** Bars are drawn against the period's own peak, never a global maximum. */
  const peak = useMemo(
    () => chartData.reduce((max, d) => Math.max(max, d.value || 0), 0),
    [chartData],
  );

  const onWithdraw = useCallback(() => {
    if (payoutBlocked) {
      Alert.alert(
        'Payouts are on hold',
        'Your KYC is not approved yet. Earnings keep accruing in the wallet and release automatically once it clears.',
        [
          {text: 'Later', style: 'cancel'},
          {
            text: 'Finish KYC',
            onPress: () => navigation.navigate('MainTabs', {screen: 'Profile'}),
          },
        ],
      );
      return;
    }
    if (balance <= 0) {
      Alert.alert('Nothing to withdraw', 'Your wallet balance is zero.');
      return;
    }
    Alert.alert(
      'Request a payout?',
      `${formatMoney(balance)} will be sent to your registered bank account.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Request',
          onPress: async () => {
            try {
              await withdraw(balance);
              Alert.alert('Payout requested', 'It usually lands within 24 hours.');
            } catch (err: any) {
              Alert.alert('Could not request payout', err?.message || 'Please try again.');
            }
          },
        },
      ],
    );
  }, [balance, navigation, payoutBlocked, withdraw]);

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title="Earnings"
        right={
          <HeaderIconButton
            icon="arrowDown"
            label="Transaction history"
            onPress={() => navigation.navigate('Transactions')}
          />
        }>
        <SegmentedTabs<Period>
          options={PERIODS}
          value={period}
          onChange={setPeriod}
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

        {/* Period hero + chart */}
        <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
          <View style={styles.heroRow}>
            <View style={styles.heroText}>
              <Text style={[styles.eyebrow, {color: t.textTertiary}]}>
                {periodLabel.toUpperCase()}
              </Text>
              <Text style={[numeric, styles.hero, {color: t.textHeading}]}>
                {formatMoney(stats.periodEarnings)}
              </Text>
            </View>
            <View style={styles.heroMeta}>
              <Text style={[numeric, styles.heroMetaValue, {color: t.textSecondary}]}>
                {stats.periodJobs} {stats.periodJobs === 1 ? 'job' : 'jobs'}
              </Text>
              {stats.avgPerJob != null ? (
                <Text style={[numeric, styles.heroMetaSub, {color: t.textTertiary}]}>
                  {formatMoney(stats.avgPerJob)} avg
                </Text>
              ) : null}
            </View>
          </View>

          {chartData.length ? (
            <>
              <View style={styles.chart}>
                <View style={[styles.axis, {backgroundColor: t.outline}]} />
                {chartData.map(point => {
                  // A zero-height bar is invisible; a 2px stub says "nothing
                  // here" while keeping the day on the axis.
                  const ratio = peak > 0 ? point.value / peak : 0;
                  const height = point.value > 0 ? Math.max(ratio * 96, 6) : 2;
                  const isPeak = peak > 0 && point.value === peak;
                  return (
                    <View key={point.label} style={styles.barColumn}>
                      {isPeak ? (
                        <Text style={[numeric, styles.barValue, {color: t.textHeading}]}>
                          {point.amount}
                        </Text>
                      ) : null}
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
                        style={[
                          styles.barLabel,
                          {color: isPeak ? t.textHeading : t.textTertiary},
                        ]}
                        numberOfLines={1}>
                        {point.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {peak === 0 ? (
                <Text style={[styles.chartNote, {color: t.textTertiary}]}>
                  Nothing earned in this period yet
                </Text>
              ) : null}
            </>
          ) : null}
        </View>

        {/* Wallet */}
        <View style={[styles.wallet, {backgroundColor: t.surfaceInverse}]}>
          <View style={styles.walletTop}>
            <View>
              <Text style={[styles.eyebrow, {color: t.textTertiary}]}>
                WALLET BALANCE
              </Text>
              <Text style={[numeric, styles.walletBalance, {color: t.textOnInverse}]}>
                {formatMoney(balance)}
              </Text>
            </View>
            <View style={styles.walletMeta}>
              <Text style={[styles.walletMetaLabel, {color: t.textTertiary}]}>
                Jobs all time
              </Text>
              <Text style={[numeric, styles.walletMetaValue, {color: t.brandInk}]}>
                {stats.totalJobs}
              </Text>
            </View>
          </View>

          {payoutBlocked ? (
            <View style={[styles.walletNote, {backgroundColor: t.surfaceElevated}]}>
              <Icon name="lock" size={15} color={t.warning} strokeWidth={2} />
              <Text style={[styles.walletNoteText, {color: t.textPrimary}]}>
                Payouts are on hold until your KYC is approved
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={onWithdraw}
            disabled={isWithdrawing}
            accessibilityRole="button"
            accessibilityState={{disabled: isWithdrawing}}
            style={[
              styles.payoutBtn,
              {backgroundColor: payoutBlocked ? t.surfaceElevated : t.brandAction},
            ]}>
            <Text
              style={[
                styles.payoutText,
                {color: payoutBlocked ? t.textTertiary : t.brandActionText},
              ]}>
              {isWithdrawing
                ? 'Requesting…'
                : payoutBlocked
                ? 'Payout unavailable'
                : 'Request payout'}
            </Text>
          </Pressable>
        </View>

        {/* Recent money */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, {color: t.textHeading}]}>
            Recent transactions
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Transactions')}
            accessibilityRole="button">
            <Text style={[styles.sectionLink, {color: t.brandAction}]}>See all</Text>
          </Pressable>
        </View>

        {loading && !transactions.length ? (
          <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
            <View style={[styles.skelLine, {backgroundColor: t.outline, width: '58%'}]} />
            <View
              style={[styles.skelLine, {backgroundColor: t.surfaceContainer, width: '80%'}]}
            />
          </View>
        ) : transactions.length ? (
          <View style={[styles.list, {backgroundColor: t.surface, borderColor: t.outline}]}>
            {transactions.slice(0, 5).map((tx, i) => {
              const credit = tx.type === 'CREDIT';
              return (
                <View key={tx.id}>
                  {i > 0 ? (
                    <View style={[styles.divider, {backgroundColor: t.outline}]} />
                  ) : null}
                  <View style={styles.txRow}>
                    <View
                      style={[
                        styles.txIcon,
                        {
                          backgroundColor: credit
                            ? t.successContainer
                            : t.neutralContainer,
                        },
                      ]}>
                      <Icon
                        name={credit ? 'arrowDown' : 'arrowUp'}
                        size={16}
                        color={credit ? t.successInk : t.neutralInk}
                        strokeWidth={2.2}
                      />
                    </View>
                    <View style={styles.txText}>
                      <Text
                        style={[styles.txTitle, {color: t.textPrimary}]}
                        numberOfLines={1}>
                        {tx.description || (credit ? 'Job credited' : 'Payout')}
                      </Text>
                      <Text style={[numeric, styles.txDate, {color: t.textTertiary}]}>
                        {tx.date}
                      </Text>
                    </View>
                    <Text
                      style={[
                        numeric,
                        styles.txAmount,
                        {color: credit ? t.success : t.textPrimary},
                      ]}>
                      {credit ? '+' : '−'}
                      {formatMoney(tx.amount)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.empty, {borderColor: t.outlineStrong}]}>
            <Icon name="wallet" size={24} color={t.textDisabled} />
            <Text style={[styles.emptyTitle, {color: t.textHeading}]}>
              No money has moved yet
            </Text>
            <Text style={[styles.emptyBody, {color: t.textSecondary}]}>
              Completed jobs credit your wallet automatically.
            </Text>
          </View>
        )}
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
  bannerBody: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroText: {
    gap: 3,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.66,
  },
  hero: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  heroMeta: {
    alignItems: 'flex-end',
    gap: 3,
  },
  heroMetaValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroMetaSub: {
    fontSize: 12,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 130,
    paddingTop: 18,
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
  barValue: {
    fontSize: 10,
    fontWeight: '700',
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  chartNote: {
    fontSize: 11,
    textAlign: 'center',
  },
  wallet: {
    borderRadius: radii.lg,
    padding: 14,
    gap: 13,
  },
  walletTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  walletBalance: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.52,
    marginTop: 3,
  },
  walletMeta: {
    alignItems: 'flex-end',
    gap: 3,
  },
  walletMetaLabel: {
    fontSize: 11,
  },
  walletMetaValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  walletNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: radii.sm,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  walletNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  payoutBtn: {
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutText: {
    fontSize: 14,
    fontWeight: '700',
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
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    marginHorizontal: 13,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  txIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txText: {
    flex: 1,
    minWidth: 0,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  txDate: {
    fontSize: 11,
    marginTop: 1,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
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
