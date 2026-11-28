/**
 * Raise a ticket.
 *
 * The category values here are the backend's Joi enum exactly — a mismatch
 * used to reject three of the four categories outright. Length rules are
 * shown as live counters rather than enforced by an alert after Submit.
 */

import React, {useMemo, useState} from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import {Text} from '../../../../components/atoms/Text';
import {Icon} from '../../../../components/atoms/Icon';
import {ScreenContainer} from '../../../../components/layout/ScreenContainer';
import {KeyboardAvoider} from '../../../../components/layout/KeyboardAvoider';
import {ScreenHeader} from '../../../../components/molecules/ScreenHeader';
import {useTheme} from '../../../../hooks/useTheme';
import {useScreenInsets} from '../../../../hooks/useScreenInsets';
import {useSupportTickets} from '../../hooks/useSupportTickets';
import {SupportCategory, SupportPriority} from '../../types';
import {
  SUPPORT_CATEGORIES as CATEGORIES,
  SUPPORT_PRIORITIES as PRIORITIES,
} from '../../constants/ticketOptions';
import {radii} from '../../../../theme/tokens';
import {numeric} from '../../../../theme/textStyles';

const SUBJECT_MIN = 5;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 1000;

interface CreateTicketScreenProps {
  navigation: any;
}

export const CreateTicketScreen: React.FC<CreateTicketScreenProps> = ({navigation}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();
  const {createTicket, submitting} = useSupportTickets();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SupportCategory>('general');
  const [priority, setPriority] = useState<SupportPriority>('medium');

  const subjectOk = subject.trim().length >= SUBJECT_MIN;
  const descriptionOk = description.trim().length >= DESCRIPTION_MIN;
  const isFormValid = subjectOk && descriptionOk;

  const safety = category === 'safety';

  const priorityTone = useMemo(
    () => ({
      high: {bg: t.dangerContainer, fg: t.dangerInk},
      medium: {bg: t.warningContainer, fg: t.warningInk},
      low: {bg: t.neutralContainer, fg: t.neutralInk},
    }),
    [t],
  );

  const handleSubmit = async () => {
    if (!isFormValid) {
      return;
    }
    try {
      await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        type: category,
        priority,
      });
      Alert.alert('Ticket raised', 'Support will reply in the thread.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (err: any) {
      Alert.alert('Could not submit', err?.message || 'Please try again.');
    }
  };

  return (
    <ScreenContainer backgroundColor={t.surfaceContainer}>
      <ScreenHeader
        title="Raise a ticket"
        subtitle="Support usually replies within a few hours"
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoider>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {paddingBottom: 88 + screenInsets.stickyBarPadding},
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Category */}
          <View style={styles.block}>
            <Text style={[styles.label, {color: t.textTertiary}]}>WHAT IS THIS ABOUT</Text>
            <View style={styles.chipWrap}>
              {CATEGORIES.map(option => {
                const selected = option.value === category;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setCategory(option.value)}
                    accessibilityRole="radio"
                    accessibilityState={{selected}}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? t.brandContainer : t.surface,
                        borderColor: selected ? t.brandAction : t.outline,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: selected ? t.brandInk : t.textSecondary,
                          fontWeight: selected ? '700' : '600',
                        },
                      ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {safety ? (
              <View
                style={[
                  styles.note,
                  {backgroundColor: t.dangerContainer, borderColor: t.dangerBorder},
                ]}>
                <Icon name="alert" size={16} color={t.dangerInk} strokeWidth={2} />
                <Text style={[styles.noteText, {color: t.dangerInk}]}>
                  A safety ticket goes to the safety desk, not your agency. If you
                  are in immediate danger, use SOS on the live job instead.
                </Text>
              </View>
            ) : null}
          </View>

          {/* Priority */}
          <View style={styles.block}>
            <Text style={[styles.label, {color: t.textTertiary}]}>HOW URGENT</Text>
            <View style={styles.chipWrap}>
              {PRIORITIES.map(option => {
                const selected = option.value === priority;
                const tone = priorityTone[option.value];
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setPriority(option.value)}
                    accessibilityRole="radio"
                    accessibilityState={{selected}}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? tone.bg : t.surface,
                        borderColor: selected ? tone.fg : t.outline,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: selected ? tone.fg : t.textSecondary,
                          fontWeight: selected ? '700' : '600',
                        },
                      ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Subject */}
          <View style={styles.block}>
            <Text style={[styles.label, {color: t.textTertiary}]}>SUBJECT</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="One line — what is wrong?"
              placeholderTextColor={t.textDisabled}
              accessibilityLabel="Ticket subject"
              style={[
                styles.input,
                {
                  backgroundColor: t.surface,
                  borderColor: subject.length && !subjectOk ? t.warning : t.outlineStrong,
                  color: t.textPrimary,
                },
              ]}
            />
            <Text
              style={[
                numeric,
                styles.counter,
                {color: subject.length && !subjectOk ? t.warningInk : t.textTertiary},
              ]}>
              {subject.trim().length < SUBJECT_MIN
                ? `At least ${SUBJECT_MIN} characters`
                : 'Looks good'}
            </Text>
          </View>

          {/* Description */}
          <View style={styles.block}>
            <Text style={[styles.label, {color: t.textTertiary}]}>WHAT HAPPENED</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Dates, booking numbers, amounts — anything that helps support find it."
              placeholderTextColor={t.textDisabled}
              multiline
              maxLength={DESCRIPTION_MAX}
              textAlignVertical="top"
              accessibilityLabel="What happened"
              style={[
                styles.input,
                styles.textarea,
                {
                  backgroundColor: t.surface,
                  borderColor:
                    description.length && !descriptionOk ? t.warning : t.outlineStrong,
                  color: t.textPrimary,
                },
              ]}
            />
            <View style={styles.counterRow}>
              <Text
                style={[
                  styles.counter,
                  {
                    color:
                      description.length && !descriptionOk ? t.warningInk : t.textTertiary,
                  },
                ]}>
                At least {DESCRIPTION_MIN} characters
              </Text>
              <Text style={[numeric, styles.counter, {color: t.textTertiary}]}>
                {description.length} / {DESCRIPTION_MAX}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Inside the avoider: a Submit button under the keyboard is a
            dead end when the description field is the one being typed in. */}
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
            onPress={handleSubmit}
            disabled={!isFormValid || submitting}
            accessibilityRole="button"
            accessibilityState={{disabled: !isFormValid || submitting}}
            style={[
              styles.primaryBtn,
              {backgroundColor: isFormValid ? t.brandAction : t.neutralContainer},
            ]}>
            <Text
              style={[
                styles.primaryBtnText,
                {color: isFormValid ? t.brandActionText : t.textDisabled},
              ]}>
              {submitting ? 'Sending…' : 'Submit ticket'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoider>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 18,
  },
  block: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.66,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  note: {
    flexDirection: 'row',
    gap: 9,
    padding: 11,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 48,
  },
  textarea: {
    minHeight: 128,
    paddingTop: 12,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  counter: {
    fontSize: 11,
    fontWeight: '600',
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
