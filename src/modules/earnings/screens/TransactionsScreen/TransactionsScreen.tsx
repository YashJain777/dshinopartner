/**
 * Transactions — every rupee in and out of the wallet.
 *
 * Credits and debits are told apart by icon direction and sign as well as
 * colour, because this is the screen a partner opens when a number does not
 * match their expectation.
 */

import React, {useCallback} from 'react';
import {View, FlatList, StyleSheet, RefreshControl, ActivityIndicator} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {SegmentedTabs} from '../../../../components/atoms/SegmentedTabs';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {ScreenHeader} from '../../../../components/molecules/ScreenHeader';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {useTransactions, TransactionFilter} from '../../../../hooks/useTransactions';
import {Transaction} from '../../../../types/api.types';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {formatMoney} from '../../../../utils/format';
import {useFocusRefresh} from '../../../../hooks/useFocusRefresh';

const FILTERS: {key: TransactionFilter; label: string}[] = [
  {key: 'ALL', label: 'All'},
  {key: 'CREDIT', label: 'Earned'},
  {key: 'DEBIT', label: 'Paid out'},
];

interface TransactionsScreenProps {
  navigation: any;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({navigation}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();
  const {
    transactions,
    filter,
    setFilter,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  } = useTransactions();

  // Refetch whenever the partner comes back to this screen.
  useFocusRefresh(refresh);

  const renderItem = useCallback(
    ({item, index}: {item: Transaction; index: number}) => {
      const credit = item.type === 'CREDIT';
      return (
        <View
          style={[
            styles.row,
            {
              backgroundColor: t.surface,
              borderColor: t.outline,
              borderTopWidth: index === 0 ? 1 : 0,
            },
          ]}>
          <View
            style={[
              styles.icon,
              {backgroundColor: credit ? t.successContainer : t.neutralContainer},
            ]}>
            <Icon
              name={credit ? 'arrowDown' : 'arrowUp'}
              size={17}
              color={credit ? t.successInk : t.neutralInk}
              strokeWidth={2.2}
            />
          </View>

          <View style={styles.text}>
            <Text style={[styles.title, {color: t.textPrimary}]} numberOfLines={1}>
              {item.description || (credit ? 'Job credited' : 'Payout')}
            </Text>
            <Text style={[numeric, styles.date, {color: t.textTertiary}]}>
              {item.date}
            </Text>
          </View>

          <View style={styles.amountBlock}>
            <Text
              style={[
                numeric,
                styles.amount,
                {color: credit ? t.success : t.textPrimary},
              ]}>
              {credit ? '+' : '−'}
              {formatMoney(item.amount)}
            </Text>
            {item.balance != null ? (
              <Text style={[numeric, styles.balance, {color: t.textTertiary}]}>
                bal {formatMoney(item.balance)}
              </Text>
            ) : null}
          </View>
        </View>
      );
    },
    [t],
  );

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title="Transactions"
        subtitle={transactions.length ? `${transactions.length} loaded` : undefined}
        subtitleNumeric
        onBack={() => navigation.goBack()}>
        <SegmentedTabs<TransactionFilter>
          options={FILTERS}
          value={filter}
          onChange={setFilter}
        />
      </ScreenHeader>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.content,
          {paddingBottom: screenInsets.stackContentPadding},
          transactions.length === 0 && styles.contentEmpty,
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
            <View style={[styles.state, {borderColor: t.outline}]}>
              <ActivityIndicator size="small" color={t.brandAction} />
            </View>
          ) : error ? (
            <View
              style={[
                styles.state,
                {backgroundColor: t.dangerContainer, borderColor: t.dangerBorder},
              ]}>
              <Text style={[styles.stateTitle, {color: t.dangerInk}]}>
                Could not load transactions
              </Text>
              <Text style={[styles.stateBody, {color: t.dangerInk}]}>{error}</Text>
            </View>
          ) : (
            <View style={[styles.state, {borderColor: t.outlineStrong, borderStyle: 'dashed'}]}>
              <Icon name="wallet" size={26} color={t.textDisabled} />
              <Text style={[styles.stateTitle, {color: t.textHeading}]}>
                No money has moved yet
              </Text>
              <Text style={[styles.stateBody, {color: t.textSecondary}]}>
                Completed jobs credit your wallet automatically, and payouts show here
                when you request one.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footer} size="small" color={t.brandAction} />
          ) : transactions.length > 0 && !hasMore ? (
            <Text style={[styles.endNote, {color: t.textTertiary}]}>
              No older transactions
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'transparent',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  date: {
    fontSize: 11,
    marginTop: 1,
  },
  amountBlock: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
  },
  balance: {
    fontSize: 10,
    marginTop: 1,
  },
  state: {
    borderRadius: radii.md,
    borderWidth: 1,
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
