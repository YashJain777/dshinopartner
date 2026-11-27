/**
 * Change password.
 *
 * The complexity rule is the backend's, shown as a live checklist so the
 * partner can see which requirement is still missing while typing instead of
 * being told after a rejected submit.
 */

import React, {useEffect, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from '../../../../../components/atoms/Text';
import {Icon} from '../../../../../components/atoms/Icon';
import {TextField} from '../../../../../components/atoms/TextField';
import {ModalSheet} from '../../../../../components/molecules/ModalSheet';
import {useTheme} from '../../../../../hooks/useTheme';
import {ChangePasswordRequest} from '../../../../../types/api.types';
import {radii} from '../../../../../theme/tokens';

const RULES: {key: string; label: string; test: (v: string) => boolean}[] = [
  {key: 'len', label: 'At least 8 characters', test: v => v.length >= 8},
  {key: 'lower', label: 'A lowercase letter', test: v => /[a-z]/.test(v)},
  {key: 'upper', label: 'An uppercase letter', test: v => /[A-Z]/.test(v)},
  {key: 'digit', label: 'A number', test: v => /\d/.test(v)},
  {
    key: 'special',
    label: 'A special character',
    test: v => /[@$!%*?&#^()_+=\-{}[\]:;"'<>,.?/\|`~]/.test(v),
  },
];

export interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ChangePasswordRequest) => Promise<void>;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const {t} = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage(null);
    }
  }, [visible]);

  const ruleState = useMemo(
    () => RULES.map(r => ({...r, passed: r.test(newPassword)})),
    [newPassword],
  );
  const strongEnough = ruleState.every(r => r.passed);
  const matches = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = currentPassword.length > 0 && strongEnough && matches;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setErrorMessage(null);
    setLoading(true);
    try {
      await onSubmit({currentPassword, newPassword, confirmPassword});
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not change your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Change password"
      icon="lock"
      scrollable
      primaryAction={{
        label: 'Change password',
        onPress: handleSubmit,
        loading,
        disabled: !canSubmit,
      }}
      secondaryAction={{label: 'Cancel', onPress: onClose}}>
      {errorMessage ? (
        <View style={[styles.error, {backgroundColor: t.dangerContainer}]}>
          <Icon name="alert" size={16} color={t.dangerInk} strokeWidth={2} />
          <Text style={[styles.errorText, {color: t.dangerInk}]}>{errorMessage}</Text>
        </View>
      ) : null}

      <TextField
        label="Current password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="Your password today"
        secureTextEntry={!showCurrent}
        autoCapitalize="none"
        leftIcon="lock"
        rightIcon={showCurrent ? 'close' : 'shield'}
        rightIconLabel={showCurrent ? 'Hide password' : 'Show password'}
        onRightIconPress={() => setShowCurrent(v => !v)}
      />

      <TextField
        label="New password"
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Your new password"
        secureTextEntry={!showNew}
        autoCapitalize="none"
        leftIcon="lock"
        rightIcon={showNew ? 'close' : 'shield'}
        rightIconLabel={showNew ? 'Hide password' : 'Show password'}
        onRightIconPress={() => setShowNew(v => !v)}
      />

      <View style={[styles.rules, {backgroundColor: t.neutralContainer}]}>
        {ruleState.map(rule => (
          <View key={rule.key} style={styles.ruleRow}>
            <Icon
              name={rule.passed ? 'check' : 'close'}
              size={14}
              color={rule.passed ? t.success : t.textDisabled}
              strokeWidth={2.6}
            />
            <Text
              style={[
                styles.ruleText,
                {color: rule.passed ? t.textSecondary : t.textTertiary},
              ]}>
              {rule.label}
            </Text>
          </View>
        ))}
      </View>

      <TextField
        label="Confirm new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Type it again"
        secureTextEntry
        autoCapitalize="none"
        leftIcon="lock"
        error={
          confirmPassword.length > 0 && !matches ? 'The two do not match' : undefined
        }
      />
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  error: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  rules: {
    borderRadius: radii.md,
    padding: 12,
    gap: 7,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  ruleText: {
    fontSize: 12,
  },
});
