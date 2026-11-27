/**
 * Support tickets — every conversation with the desk.
 *
 * Open tickets lead, because a partner coming here usually wants the one that
 * is still unresolved, not an archive.
 */

import React, {useMemo, useState} from 'react';
import {View, FlatList, Pressable, RefreshControl, StyleSheet} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {SegmentedTabs} from '../../../../components/atoms/SegmentedTabs';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {ScreenHeader} from '../../../../components/molecules/ScreenHeader';
import {LoadingScreen} from '../../../../components/molecules/LoadingScreen';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {useSupportTickets} from '../../hooks/useSupportTickets';
import {SupportTicket, SupportTicketStatus} from '../../types';
import {radii, Tokens} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {useFocusRefresh} from '../../../../hooks/useFocusRefresh';

type Segment = 'open' | 'closed';

/** Resolved and closed are both "done" to a partner; the rest are live. */
const isOpen = (status: SupportTicketStatus): boolean =>
  status !== 'RESOLVED' && status !== 'CLOSED';

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  OPEN: 'Waiting for support',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'Being looked at',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const CATEGORY_LABEL: Record<string, string> = {
  payment_issue: 'Payment',
  booking_issue: 'Booking',
  app_bug: 'App bug',
  partner_complaint: 'Complaint',
  quality_issue: 'Quality',
  safety: 'Safety',
  general: 'General',
};

const statusTone = (status: SupportTicketStatus, t: Tokens) => {
  switch (status) {
    case 'RESOLVED':
    case 'CLOSED':
      return {bg: t.successContainer, fg: t.successInk, dot: t.success};
    case 'IN_PROGRESS':
    case 'ASSIGNED':
      return {bg: t.warningContainer, fg: t.warningInk, dot: t.warning};
    default:
      return {bg: t.infoContainer, fg: t.infoInk, dot: t.info};
  }
};

interface TicketListScreenProps {
  navigation: any;
}

export const TicketListScreen: React.FC<TicketListScreenProps> = ({navigation}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();
  const [segment, setSegment] = useState<Segment>('open');
  const {tickets, loading, refreshing, error, refresh} = useSupportTickets();

  // Refetch whenever the partner comes back to this screen.
  useFocusRefresh(refresh);

  const open = useMemo(() => tickets.filter(x => isOpen(x.status)), [tickets]);
  const closed = useMemo(() => tickets.filter(x => !isOpen(x.status)), [tickets]);
  const list = segment === 'open' ? open : closed;

  if (loading && !tickets.length) {
    return <LoadingScreen message="Loading your tickets..." />;
  }

  const renderItem = ({item}: {item: SupportTicket}) => {
    const tone = statusTone(item.status, t);
    const lastMessage = item.Messages?.[item.Messages.length - 1];

    return (
      <Pressable
        onPress={() =>
          navigation.navigate('TicketDetails', {
            ticketId: item.id,
            subject: item.subject,
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`${item.subject}, ${STATUS_LABEL[item.status]}`}
        style={[styles.card, {backgroundColor: t.surface, borderColor: t.outline}]}>
        <View style={styles.cardHead}>
          <Text style={[styles.subject, {color: t.textHeading}]} numberOfLines={1}>
            {item.subject}
          </Text>
          <Icon name="chevronRight" size={17} color={t.textDisabled} strokeWidth={2.2} />
        </View>

        {lastMessage?.message ? (
          <Text style={[styles.preview, {color: t.textSecondary}]} numberOfLines={2}>
            {lastMessage.message}
          </Text>
        ) : item.description ? (
          <Text style={[styles.preview, {color: t.textSecondary}]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.pillRow}>
          <View style={[styles.pill, {backgroundColor: tone.bg}]}>
            <View style={[styles.dot, {backgroundColor: tone.dot}]} />
            <Text style={[styles.pillText, {color: tone.fg}]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
          <View style={[styles.pill, {backgroundColor: t.neutralContainer}]}>
            <Text style={[styles.pillText, {color: t.neutralInk}]}>
              {CATEGORY_LABEL[item.type] ?? item.type}
            </Text>
          </View>
          <Text style={[numeric, styles.date, {color: t.textTertiary}]}>
            {new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title="Support"
        subtitle={open.length ? `${open.length} open` : 'Nothing open'}
        subtitleNumeric={open.length > 0}
        onBack={() => navigation.goBack()}>
        <SegmentedTabs<Segment>
          options={[
            {key: 'open', label: `Open${open.length ? ` ${open.length}` : ''}`},
            {key: 'closed', label: `Closed${closed.length ? ` ${closed.length}` : ''}`},
          ]}
          value={segment}
          onChange={setSegment}
        />
      </ScreenHeader>

      <FlatList
        data={list}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.content,
          {paddingBottom: 80 + screenInsets.stickyBarPadding},
          list.length === 0 && styles.contentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={t.brand}
            colors={[t.brandAction]}
          />
        }
        ListEmptyComponent={
          error ? (
            <View
              style={[
                styles.state,
                {backgroundColor: t.dangerContainer, borderColor: t.dangerBorder},
              ]}>
              <Text style={[styles.stateTitle, {color: t.dangerInk}]}>
                Could not load your tickets
              </Text>
              <Text style={[styles.stateBody, {color: t.dangerInk}]}>{error}</Text>
            </View>
          ) : (
            <View style={[styles.state, {borderColor: t.outlineStrong, borderStyle: 'dashed'}]}>
              <Icon name="chat" size={26} color={t.textDisabled} />
              <Text style={[styles.stateTitle, {color: t.textHeading}]}>
                {segment === 'open' ? 'No open tickets' : 'Nothing closed yet'}
              </Text>
              <Text style={[styles.stateBody, {color: t.textSecondary}]}>
                {segment === 'open'
                  ? 'Raise one if something is blocking a job or a payout.'
                  : 'Resolved conversations are kept here for your record.'}
              </Text>
            </View>
          )
        }
      />

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
          onPress={() => navigation.navigate('CreateTicket')}
          accessibilityRole="button"
          style={[styles.primaryBtn, {backgroundColor: t.brandAction}]}>
          <Icon name="plus" size={18} color={t.brandActionText} strokeWidth={2.4} />
          <Text style={[styles.primaryBtnText, {color: t.brandActionText}]}>
            Raise a ticket
          </Text>
        </Pressable>
      </View>
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
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 13,
    gap: 7,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subject: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  preview: {
    fontSize: 12,
    lineHeight: 17,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  date: {
    marginLeft: 'auto',
    fontSize: 11,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
