/**
 * Notifications — what changed while the partner was not looking.
 *
 * Unread rows are marked by a tinted surface AND a dot, never by colour
 * alone. Tapping routes by `data.type` rather than "has a bookingId", because
 * a cancelled booking carries one too and used to land the partner on an
 * empty Jobs tab.
 */

import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Text} from '../../../../components/atoms/Text';
import {Icon, IconName} from '../../../../components/atoms/Icon';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {ScreenHeader} from '../../../../components/molecules/ScreenHeader';
import {navigateForNotification} from '../../../../services/notification/notificationNavigation';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../../../services/api/notification.api';
import {Notification} from '../../../../types/api.types';
import {NotificationsScreenProps} from './NotificationsScreen.types';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {radii, Tokens} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {formatClock} from '../../../../utils/format';

/** Icon and tint per notification family, so the list is scannable. */
const presentation = (
  type: string | undefined,
  t: Tokens,
): {icon: IconName; bg: string; fg: string} => {
  const key = (type || '').toUpperCase();
  if (key.includes('KYC') || key.includes('DOCUMENT')) {
    return {icon: 'idCard', bg: t.dangerContainer, fg: t.dangerInk};
  }
  if (key.includes('PAYOUT') || key.includes('PAYMENT') || key.includes('WALLET')) {
    return {icon: 'wallet', bg: t.successContainer, fg: t.successInk};
  }
  if (key.includes('LATE') || key.includes('SLA') || key.includes('DELAY')) {
    return {icon: 'clock', bg: t.warningContainer, fg: t.warningInk};
  }
  if (key.includes('REVIEW') || key.includes('RATING')) {
    return {icon: 'star', bg: t.warningContainer, fg: t.warningInk};
  }
  if (key.includes('LEAVE') || key.includes('SCHEDULE')) {
    return {icon: 'calendar', bg: t.infoContainer, fg: t.infoInk};
  }
  if (key.includes('BOOKING') || key.includes('JOB') || key.includes('ASSIGN')) {
    return {icon: 'briefcase', bg: t.brandContainer, fg: t.brandInk};
  }
  return {icon: 'bell', bg: t.neutralContainer, fg: t.neutralInk};
};

/** "Today", "Yesterday", then the date — matches how a partner thinks. */
const dayBucket = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return 'Earlier';
  }
  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) {
    return 'Today';
  }
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, yesterday)) {
    return 'Yesterday';
  }
  return d.toLocaleDateString('en-IN', {day: 'numeric', month: 'short'});
};

type Row =
  | {kind: 'header'; key: string; label: string}
  | {kind: 'item'; key: string; item: Notification};

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  navigation,
}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Notification | null>(null);

  const fetchNotifications = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const list = await getNotifications({page: 1, limit: 50});
      setNotifications(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      Alert.alert('Error', err?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications]),
  );

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? {...n, isRead: true} : n)));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = useCallback(async () => {
    if (!unreadCount) {
      return;
    }
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({...n, isRead: true})));
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to mark all as read');
    }
  }, [unreadCount]);

  const handlePress = useCallback(
    (item: Notification) => {
      if (!item.isRead) {
        handleMarkAsRead(item.id);
      }
      const navigated = navigateForNotification({
        type: item.data?.type || item.type,
        bookingId: item.data?.bookingId,
      });
      if (!navigated) {
        setSelected(item);
      }
    },
    [handleMarkAsRead],
  );

  /** Flat list of day headers and rows, so sections need no extra library. */
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let currentBucket = '';
    notifications.forEach(item => {
      const bucket = dayBucket(item.createdAt);
      if (bucket !== currentBucket) {
        currentBucket = bucket;
        out.push({kind: 'header', key: `h-${bucket}`, label: bucket});
      }
      out.push({kind: 'item', key: item.id, item});
    });
    return out;
  }, [notifications]);

  const renderRow = useCallback(
    ({item: row}: {item: Row}) => {
      if (row.kind === 'header') {
        return (
          <Text style={[styles.sectionLabel, {color: t.textTertiary}]}>
            {row.label.toUpperCase()}
          </Text>
        );
      }

      const n = row.item;
      const look = presentation(n.data?.type || n.type, t);

      return (
        <Pressable
          onPress={() => handlePress(n)}
          accessibilityRole="button"
          accessibilityLabel={`${n.isRead ? '' : 'Unread. '}${n.title}`}
          style={[
            styles.row,
            {
              backgroundColor: n.isRead ? t.surface : t.surfaceElevated,
              borderColor: n.isRead ? t.outline : t.brandBorder,
            },
          ]}>
          <View style={[styles.icon, {backgroundColor: look.bg}]}>
            <Icon name={look.icon} size={18} color={look.fg} strokeWidth={1.9} />
          </View>

          <View style={styles.text}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.title,
                  {color: t.textHeading, fontWeight: n.isRead ? '600' : '700'},
                ]}
                numberOfLines={2}>
                {n.title}
              </Text>
              {!n.isRead ? (
                <View style={[styles.dot, {backgroundColor: t.brand}]} />
              ) : null}
            </View>
            {n.body || n.message ? (
              <Text style={[styles.body, {color: t.textSecondary}]} numberOfLines={2}>
                {n.body || n.message}
              </Text>
            ) : null}
            <Text style={[numeric, styles.time, {color: t.textTertiary}]}>
              {formatClock(n.createdAt)}
            </Text>
          </View>
        </Pressable>
      );
    },
    [handlePress, t],
  );

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount ? `${unreadCount} unread` : 'All caught up'}
        subtitleNumeric={unreadCount > 0}
        onBack={() => navigation.goBack()}
        right={
          unreadCount ? (
            <Pressable
              onPress={handleMarkAllRead}
              accessibilityRole="button"
              hitSlop={8}
              style={[styles.markAll, {borderColor: t.outline}]}>
              <Text style={[styles.markAllText, {color: t.neutralInk}]}>
                Mark all read
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      <FlatList
        data={rows}
        keyExtractor={row => row.key}
        renderItem={renderRow}
        contentContainerStyle={[
          styles.content,
          {paddingBottom: screenInsets.stackContentPadding},
          rows.length === 0 && styles.contentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchNotifications(true)}
            tintColor={t.brand}
            colors={[t.brandAction]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={[styles.state, {borderColor: t.outline}]}>
              <ActivityIndicator size="small" color={t.brandAction} />
            </View>
          ) : (
            <View style={[styles.state, {borderColor: t.outlineStrong, borderStyle: 'dashed'}]}>
              <Icon name="bell" size={26} color={t.textDisabled} />
              <Text style={[styles.stateTitle, {color: t.textHeading}]}>
                Nothing to catch up on
              </Text>
              <Text style={[styles.stateBody, {color: t.textSecondary}]}>
                Assignments, payouts and KYC updates all arrive here.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          notifications.length ? (
            <Text style={[styles.endNote, {color: t.textTertiary}]}>
              Notifications older than 30 days are removed automatically
            </Text>
          ) : null
        }
      />

      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}>
        <Pressable
          style={[styles.scrim, {backgroundColor: t.scrim}]}
          onPress={() => setSelected(null)}
          accessibilityRole="button"
          accessibilityLabel="Close">
          <Pressable
            style={[styles.sheet, {backgroundColor: t.surface}]}
            onPress={() => {}}>
            {selected ? (
              <>
                <View style={styles.sheetHandleRow}>
                  <View style={[styles.sheetHandle, {backgroundColor: t.outlineStrong}]} />
                </View>
                <Text style={[styles.sheetTitle, {color: t.textHeading}]}>
                  {selected.title}
                </Text>
                <Text style={[styles.sheetBody, {color: t.textSecondary}]}>
                  {selected.body || selected.message}
                </Text>
                {selected.data?.bookingNumber ? (
                  <Text style={[numeric, styles.sheetMeta, {color: t.textTertiary}]}>
                    Booking #{selected.data.bookingNumber}
                  </Text>
                ) : null}
                <Text style={[numeric, styles.sheetMeta, {color: t.textTertiary}]}>
                  {new Date(selected.createdAt).toLocaleString('en-IN')}
                </Text>
                <Pressable
                  onPress={() => setSelected(null)}
                  accessibilityRole="button"
                  style={[
                    styles.sheetBtn,
                    {
                      backgroundColor: t.brandAction,
                      marginBottom: screenInsets.stickyBarPadding,
                    },
                  ]}>
                  <Text style={[styles.sheetBtnText, {color: t.brandActionText}]}>
                    Close
                  </Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  contentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.66,
    paddingLeft: 2,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 11,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  body: {
    fontSize: 12,
    lineHeight: 17,
  },
  time: {
    fontSize: 11,
  },
  markAll: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
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
  endNote: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingVertical: 18,
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
    gap: 10,
  },
  sheetHandleRow: {
    alignItems: 'center',
    paddingBottom: 6,
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
  sheetBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  sheetMeta: {
    fontSize: 12,
  },
  sheetBtn: {
    height: 48,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  sheetBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
