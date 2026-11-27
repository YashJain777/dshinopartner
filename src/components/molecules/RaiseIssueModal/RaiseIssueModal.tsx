/**
 * Raise an issue on a live job.
 *
 * The seven types are the backend's Joi enum exactly. The description has a
 * 10-character minimum the server enforces, shown as a counter rather than an
 * alert, and a safety concern says plainly that it routes elsewhere.
 */

import React, {useEffect, useMemo, useState} from 'react';
import {View, Pressable, TextInput, StyleSheet} from 'react-native';
import {Text} from '../../atoms/Text';
import {Icon, IconName} from '../../atoms/Icon';
import {ModalSheet} from '../ModalSheet';
import {useTheme} from '../../../hooks/useTheme';
import {BookingIssueTypeKey} from '../../../constants/api.constants';
import {radii} from '../../../theme/tokens';
import {numeric} from '../../../theme/textStyles';

const MIN_DESCRIPTION = 10;
const MAX_DESCRIPTION = 1000;

const OPTIONS: {
  type: BookingIssueTypeKey;
  label: string;
  hint?: string;
  icon: IconName;
  danger?: boolean;
}[] = [
  {
    type: 'CUSTOMER_ABSENT',
    label: 'Customer not there',
    hint: 'Nobody answered at the address',
    icon: 'userOff',
  },
  {type: 'VEHICLE_NOT_ACCESSIBLE', label: "Can't reach the vehicle", icon: 'carOff'},
  {type: 'WRONG_ADDRESS', label: 'Wrong address', icon: 'pinOff'},
  {type: 'EQUIPMENT_FAILURE', label: 'Equipment failure', icon: 'wrench'},
  {
    type: 'SAFETY_CONCERN',
    label: 'Safety concern',
    hint: 'Goes to the safety desk, not your agency',
    icon: 'alert',
    danger: true,
  },
  {type: 'CUSTOMER_HOSTILE', label: 'Customer was hostile', icon: 'userOff'},
  {type: 'OTHER', label: 'Something else', icon: 'chat'},
];

export interface RaiseIssueModalProps {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (issueType: BookingIssueTypeKey, description: string) => void;
}

export const RaiseIssueModal: React.FC<RaiseIssueModalProps> = ({
  visible,
  submitting,
  onClose,
  onSubmit,
}) => {
  const {t} = useTheme();
  const [issueType, setIssueType] = useState<BookingIssueTypeKey | null>(null);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (visible) {
      setIssueType(null);
      setDescription('');
    }
  }, [visible]);

  const descriptionOk = description.trim().length >= MIN_DESCRIPTION;
  const canSubmit = Boolean(issueType) && descriptionOk;
  const selectedIsSafety = issueType === 'SAFETY_CONCERN';

  const counterColour = useMemo(
    () => (description.length && !descriptionOk ? t.warningInk : t.textTertiary),
    [description.length, descriptionOk, t],
  );

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="What went wrong?"
      subtitle="Your agency sees this straight away. The job stays open."
      icon="alert"
      iconTone={selectedIsSafety ? 'danger' : 'brand'}
      scrollable
      primaryAction={{
        label: 'Send to your agency',
        onPress: () => issueType && onSubmit(issueType, description.trim()),
        loading: submitting,
        disabled: !canSubmit,
      }}
      secondaryAction={{label: 'Cancel', onPress: onClose}}>
      <View style={styles.options}>
        {OPTIONS.map(option => {
          const selected = option.type === issueType;
          return (
            <Pressable
              key={option.type}
              onPress={() => setIssueType(option.type)}
              accessibilityRole="radio"
              accessibilityState={{selected}}
              style={[
                styles.option,
                {
                  backgroundColor: selected ? t.brandContainer : t.surface,
                  borderColor: selected
                    ? t.brandAction
                    : option.danger
                    ? t.dangerBorder
                    : t.outline,
                  borderWidth: selected ? 1.5 : 1,
                },
              ]}>
              <View
                style={[
                  styles.optionIcon,
                  {
                    backgroundColor: option.danger
                      ? t.dangerContainer
                      : selected
                      ? t.brandContainer
                      : t.neutralContainer,
                  },
                ]}>
                <Icon
                  name={option.icon}
                  size={17}
                  color={option.danger ? t.dangerInk : selected ? t.brandInk : t.neutralInk}
                  strokeWidth={1.9}
                />
              </View>
              <View style={styles.optionText}>
                <Text
                  style={[
                    styles.optionLabel,
                    {color: selected ? t.textHeading : t.textPrimary},
                  ]}>
                  {option.label}
                </Text>
                {option.hint ? (
                  <Text
                    style={[
                      styles.optionHint,
                      {color: option.danger ? t.dangerInk : t.textTertiary},
                    ]}>
                    {option.hint}
                  </Text>
                ) : null}
              </View>
              {selected ? (
                <Icon name="check" size={16} color={t.brandInk} strokeWidth={2.6} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, {color: t.textTertiary}]}>WHAT HAPPENED</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Dates, what you saw, what you tried."
          placeholderTextColor={t.textDisabled}
          multiline
          maxLength={MAX_DESCRIPTION}
          textAlignVertical="top"
          accessibilityLabel="What happened"
          style={[
            styles.input,
            {
              backgroundColor: t.surfaceContainer,
              borderColor: description.length && !descriptionOk ? t.warning : t.outlineStrong,
              color: t.textPrimary,
            },
          ]}
        />
        <View style={styles.counterRow}>
          <Text style={[styles.counter, {color: counterColour}]}>
            At least {MIN_DESCRIPTION} characters
          </Text>
          <Text style={[numeric, styles.counter, {color: t.textTertiary}]}>
            {description.length} / {MAX_DESCRIPTION}
          </Text>
        </View>
      </View>

      <Text style={[styles.footnote, {color: t.textTertiary}]}>
        The job is not cancelled. Your agency decides whether to reschedule it.
      </Text>
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 11,
    borderRadius: radii.md,
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionHint: {
    fontSize: 11,
    lineHeight: 15,
  },
  field: {
    gap: 7,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.66,
  },
  input: {
    minHeight: 96,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  counter: {
    fontSize: 11,
    fontWeight: '600',
  },
  footnote: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
