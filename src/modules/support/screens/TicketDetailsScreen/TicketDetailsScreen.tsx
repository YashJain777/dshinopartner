/**
 * Ticket thread.
 *
 * The partner's own messages are brand-tinted and right-aligned, support's
 * are a plain card on the left — the same convention as any messaging app, so
 * nobody has to decode who said what.
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {ScreenHeader} from '../../../../components/molecules/ScreenHeader';
import {LoadingScreen} from '../../../../components/molecules/LoadingScreen';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {useTicketDetails} from '../../hooks/useTicketDetails';
import {SupportTicketMessage, SupportTicketStatus} from '../../types';
import {radii, Tokens} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';
import {formatClock, initialsOf} from '../../../../utils/format';
import {useFocusRefresh} from '../../../../hooks/useFocusRefresh';

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  OPEN: 'Waiting for support',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'Being looked at',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const statusTone = (status: SupportTicketStatus | undefined, t: Tokens) => {
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

interface TicketDetailsScreenProps {
  route: any;
  navigation: any;
}

export const TicketDetailsScreen: React.FC<TicketDetailsScreenProps> = ({
  route,
  navigation,
}) => {
  const {ticketId, subject} = route.params || {};
  const {t} = useTheme();
  const screenInsets = useScreenInsets();

  const {ticket, messages, loading, refreshing, sending, refresh, sendReply} =
    useTicketDetails(ticketId);

  // Refetch whenever the partner comes back to this screen.
  useFocusRefresh(refresh);

  const [inputText, setInputText] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(
        () => listRef.current?.scrollToEnd({animated: true}),
        200,
      );
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || sending) {
      return;
    }
    const text = inputText;
    setInputText('');
    try {
      await sendReply(text);
    } catch (err: any) {
      setInputText(text); // Put it back rather than losing what they typed.
      Alert.alert('Not sent', err?.message || 'Failed to send the message.');
    }
  };

  if (loading && !messages.length) {
    return <LoadingScreen message="Loading the conversation..." />;
  }

  const tone = statusTone(ticket?.status, t);
  const closed = ticket?.status === 'RESOLVED' || ticket?.status === 'CLOSED';

  const renderMessage = ({item}: {item: SupportTicketMessage}) => {
    const mine = item.senderType === 'partner';

    if (mine) {
      return (
        <View style={styles.mineWrap}>
          <View style={[styles.bubble, styles.mineBubble, {backgroundColor: t.brandAction}]}>
            <Text style={[styles.bubbleText, {color: t.brandActionText}]}>
              {item.message}
            </Text>
          </View>
          <Text style={[numeric, styles.meta, {color: t.textTertiary}]}>
            {formatClock(item.createdAt)}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.theirsWrap}>
        <View style={[styles.avatar, {backgroundColor: t.infoContainer}]}>
          <Text style={[styles.avatarText, {color: t.infoInk}]}>
            {initialsOf(item.senderName || 'Dshino Support')}
          </Text>
        </View>
        <View style={styles.theirsBody}>
          <View
            style={[
              styles.bubble,
              styles.theirsBubble,
              {backgroundColor: t.surface, borderColor: t.outline},
            ]}>
            <Text style={[styles.bubbleText, {color: t.textPrimary}]}>{item.message}</Text>
          </View>
          <Text style={[numeric, styles.meta, {color: t.textTertiary}]}>
            {item.senderName || 'Dshino Support'} · {formatClock(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title={ticket?.subject || subject || 'Ticket'}
        subtitle={ticket ? `#${ticket.id.slice(0, 8)}` : undefined}
        subtitleNumeric
        onBack={() => navigation.goBack()}>
        <View style={styles.pillRow}>
          <View style={[styles.pill, {backgroundColor: tone.bg}]}>
            <View style={[styles.dot, {backgroundColor: tone.dot}]} />
            <Text style={[styles.pillText, {color: tone.fg}]}>
              {ticket ? STATUS_LABEL[ticket.status] : '—'}
            </Text>
          </View>
        </View>
      </ScreenHeader>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.content}
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
            <View style={[styles.state, {borderColor: t.outlineStrong}]}>
              <Icon name="chat" size={24} color={t.textDisabled} />
              <Text style={[styles.stateBody, {color: t.textSecondary}]}>
                No replies yet. Support will answer in this thread.
              </Text>
            </View>
          }
        />

        <View
          style={[
            styles.composer,
            {
              backgroundColor: t.surface,
              borderTopColor: t.outline,
              paddingBottom: screenInsets.stickyBarPadding,
            },
          ]}>
          {closed ? (
            <Text style={[styles.closedNote, {color: t.textTertiary}]}>
              This ticket is {ticket?.status === 'RESOLVED' ? 'resolved' : 'closed'}.
              Raise a new one if the problem comes back.
            </Text>
          ) : (
            <>
              <View style={styles.composerRow}>
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Write a reply…"
                  placeholderTextColor={t.textDisabled}
                  multiline
                  accessibilityLabel="Your reply"
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
                  onPress={handleSend}
                  disabled={!inputText.trim() || sending}
                  accessibilityRole="button"
                  accessibilityLabel="Send reply"
                  accessibilityState={{disabled: !inputText.trim() || sending}}
                  style={[
                    styles.sendBtn,
                    {
                      backgroundColor: inputText.trim()
                        ? t.brandAction
                        : t.neutralContainer,
                    },
                  ]}>
                  <Icon
                    name="send"
                    size={19}
                    color={inputText.trim() ? t.brandActionText : t.textDisabled}
                    strokeWidth={2.2}
                  />
                </Pressable>
              </View>
              <Text style={[styles.safetyNote, {color: t.textTertiary}]}>
                Never share your OTP or bank password here — support will not ask.
              </Text>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 7,
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
  },
  mineWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  theirsWrap: {
    flexDirection: 'row',
    gap: 9,
  },
  theirsBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '86%',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  mineBubble: {
    borderRadius: radii.lg,
    borderBottomRightRadius: 4,
  },
  theirsBubble: {
    alignSelf: 'flex-start',
    borderRadius: radii.lg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 19,
  },
  meta: {
    fontSize: 10,
  },
  state: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 8,
  },
  stateBody: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  composer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyNote: {
    fontSize: 11,
    textAlign: 'center',
  },
  closedNote: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingVertical: 6,
  },
});
