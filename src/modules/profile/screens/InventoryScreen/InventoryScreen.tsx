/**
 * Kit & consumables.
 *
 * The endpoint returns dispatches — one row per consignment the depot sent —
 * so this screen folds them into a per-item balance. A partner thinks "how
 * many bottles do I have", not "which consignment did they come from".
 *
 * Received quantity wins over dispatched where the partner has acknowledged
 * a consignment, because that is what actually reached the van.
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, ScrollView, RefreshControl, StyleSheet, Pressable, Alert} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon, IconName} from '../../../../components/atoms/Icon';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {ScreenHeader} from '../../../../components/molecules/ScreenHeader';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {getInventory, KitDispatch} from '../../../../services/api/inventory.api';
import {logger} from '../../../../utils/logger';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {useFocusRefresh} from '../../../../hooks/useFocusRefresh';

/** At or under this, the item leads the page in a warning card. */
const LOW_STOCK = 2;

/** Rough icon per kit category, falling back to a generic box. */
const iconFor = (category: string | null | undefined, name: string): IconName => {
  const key = `${category ?? ''} ${name}`.toLowerCase();
  if (key.includes('shampoo') || key.includes('liquid') || key.includes('polish')) {
    return 'bottle';
  }
  if (key.includes('cloth') || key.includes('towel') || key.includes('microfibre')) {
    return 'cloth';
  }
  if (key.includes('brush')) {
    return 'brush';
  }
  if (key.includes('tyre') || key.includes('tire')) {
    return 'tyre';
  }
  return 'box';
};

interface ItemBalance {
  kitItemId: string;
  name: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  lastDispatchedAt: string | null;
}

interface InventoryScreenProps {
  navigation: any;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({navigation}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();

  const [dispatches, setDispatches] = useState<KitDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      setDispatches(await getInventory());
      setError(null);
    } catch (err: any) {
      logger.error('[Inventory] Fetch failed', err);
      setError(err?.response?.data?.message || 'Could not load your kit.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /** Stable refresh for useFocusRefresh — always the 'refresh' variant. */
  const refreshInventory = useCallback(() => {
    load(true);
  }, [load]);

  // Stock moves when a job consumes it, so re-read it on the way back in.
  useFocusRefresh(refreshInventory);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo<ItemBalance[]>(() => {
    const map = new Map<string, ItemBalance>();

    dispatches.forEach(d => {
      const item = d.KitItem;
      const id = d.kitItemId || item?.id;
      if (!id) {
        return;
      }
      // What reached the partner, where they confirmed it.
      const qty = Number(d.receivedQty ?? d.quantity ?? 0);
      const existing = map.get(id);
      const dispatchedAt = d.dispatchedAt ?? d.createdAt ?? null;

      if (existing) {
        existing.quantity += qty;
        if (
          dispatchedAt &&
          (!existing.lastDispatchedAt || dispatchedAt > existing.lastDispatchedAt)
        ) {
          existing.lastDispatchedAt = dispatchedAt;
        }
      } else {
        map.set(id, {
          kitItemId: id,
          name: item?.name ?? 'Kit item',
          sku: item?.sku ?? null,
          category: item?.category ?? null,
          quantity: qty,
          lastDispatchedAt: dispatchedAt,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.quantity - b.quantity);
  }, [dispatches]);

  const low = items.filter(i => i.quantity <= LOW_STOCK);
  const rest = items.filter(i => i.quantity > LOW_STOCK);
  const lastDispatch = items.reduce<string | null>(
    (latest, i) =>
      i.lastDispatchedAt && (!latest || i.lastDispatchedAt > latest)
        ? i.lastDispatchedAt
        : latest,
    null,
  );

  const requestTopUp = useCallback(() => {
    Alert.alert(
      'Request a top-up',
      'Kit requests go through support so the depot has a record. Raise a ticket with what you need?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Raise a ticket',
          onPress: () => navigation.navigate('CreateTicket'),
        },
      ],
    );
  }, [navigation]);

  const renderItem = (item: ItemBalance, isLow: boolean) => (
    <View key={item.kitItemId} style={styles.itemRow}>
      <View
        style={[
          styles.itemIcon,
          {backgroundColor: isLow ? t.dangerContainer : t.neutralContainer},
        ]}>
        <Icon
          name={iconFor(item.category, item.name)}
          size={19}
          color={isLow ? t.dangerInk : t.neutralInk}
          strokeWidth={1.9}
        />
      </View>
      <View style={styles.itemText}>
        <Text style={[styles.itemName, {color: t.textHeading}]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[numeric, styles.itemMeta, {color: t.textTertiary}]} numberOfLines={1}>
          {[item.sku ? `SKU ${item.sku}` : null, item.category]
            .filter(Boolean)
            .join(' · ') || 'No SKU recorded'}
        </Text>
      </View>
      <View style={styles.itemQty}>
        <Text
          style={[
            numeric,
            styles.qtyValue,
            {color: isLow ? t.dangerInk : t.textHeading},
          ]}>
          {item.quantity}
        </Text>
        {isLow ? (
          <Text style={[styles.qtyLabel, {color: t.dangerInk}]}>left</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title="Kit & consumables"
        subtitle={
          lastDispatch
            ? `Last dispatch ${new Date(lastDispatch).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}`
            : undefined
        }
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.body,
          {paddingBottom: 88 + screenInsets.stickyBarPadding},
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
              {backgroundColor: t.dangerContainer, borderColor: t.dangerBorder},
            ]}>
            <Icon name="alert" size={18} color={t.dangerInk} strokeWidth={2} />
            <Text style={[styles.bannerText, {color: t.dangerInk}]}>{error}</Text>
          </View>
        ) : null}

        {low.length ? (
          <View
            style={[
              styles.card,
              {backgroundColor: t.surface, borderColor: t.dangerBorder, borderWidth: 1.5},
            ]}>
            <View style={styles.lowHead}>
              <Icon name="alert" size={18} color={t.dangerInk} strokeWidth={2} />
              <Text style={[styles.lowTitle, {color: t.dangerInk}]}>
                {low.length === 1
                  ? '1 item is running out'
                  : `${low.length} items are running out`}
              </Text>
            </View>
            {low.map(item => renderItem(item, true))}
            <Text style={[styles.lowNote, {color: t.textSecondary}]}>
              Request a top-up before tomorrow's route — a missing consumable blocks the
              job, not just the finish.
            </Text>
          </View>
        ) : null}

        {rest.length ? (
          <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
            <Text style={[styles.cardTitle, {color: t.textHeading}]}>In your van</Text>
            {rest.map(item => renderItem(item, false))}
          </View>
        ) : null}

        {!loading && !items.length && !error ? (
          <View style={[styles.empty, {borderColor: t.outlineStrong}]}>
            <Icon name="box" size={26} color={t.textDisabled} />
            <Text style={[styles.emptyTitle, {color: t.textHeading}]}>
              No kit assigned yet
            </Text>
            <Text style={[styles.emptyBody, {color: t.textSecondary}]}>
              Your depot dispatches consumables with your route. Anything they send
              appears here.
            </Text>
          </View>
        ) : null}

        {loading && !items.length ? (
          <View style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
            <View style={[styles.skelLine, {backgroundColor: t.outline, width: '55%'}]} />
            <View
              style={[styles.skelLine, {backgroundColor: t.surfaceContainer, width: '80%'}]}
            />
          </View>
        ) : null}

        <View style={[styles.note, {backgroundColor: t.neutralContainer}]}>
          <Icon name="truck" size={16} color={t.neutralInk} strokeWidth={1.9} />
          <Text style={[styles.noteText, {color: t.textSecondary}]}>
            Counts come from what the depot dispatched and what you confirmed receiving.
            They do not decrease as you use items.
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: t.surface,
            borderTopColor: t.outline,
            paddingBottom: screenInsets.stickyBarPadding,
          },
        ]}>
        <Pressable
          onPress={requestTopUp}
          accessibilityRole="button"
          style={[styles.primaryBtn, {backgroundColor: t.brandAction}]}>
          <Text style={[styles.primaryBtnText, {color: t.brandActionText}]}>
            Request a top-up
          </Text>
        </Pressable>
      </View>
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
    gap: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    paddingBottom: 4,
  },
  banner: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  lowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingBottom: 4,
  },
  lowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  lowNote: {
    fontSize: 12,
    lineHeight: 17,
    paddingTop: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 9,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  itemQty: {
    alignItems: 'flex-end',
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  qtyLabel: {
    fontSize: 10,
    fontWeight: '700',
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
  empty: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  skelLine: {
    height: 12,
    borderRadius: 6,
    marginVertical: 4,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  primaryBtn: {
    height: 50,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
