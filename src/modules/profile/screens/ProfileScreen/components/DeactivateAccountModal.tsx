/**
 * Deactivate account.
 *
 * Irreversible from inside the app — only the agency can restore an account —
 * so this asks for the password and makes the partner type the word rather
 * than tap through. The consequences are listed before the field, not after.
 */

import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from '../../../../../components/atoms/Text';
import {Icon} from '../../../../../components/atoms/Icon';
import {TextField} from '../../../../../components/atoms/TextField';
import {ModalSheet} from '../../../../../components/molecules/ModalSheet';
import {useTheme} from '../../../../../hooks/useTheme';
import {DeactivateAccountRequest} from '../../../../../types/api.types';
import {radii} from '../../../../../theme/tokens';

const CONFIRM_WORD = 'DEACTIVATE';

export interface DeactivateAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: DeactivateAccountRequest) => Promise<void>;
}

export const DeactivateAccountModal: React.FC<DeactivateAccountModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const {t} = useTheme();
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [confirmWord, setConfirmWord] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setReason('');
      setConfirmWord('');
      setErrorMessage(null);
    }
  }, [visible]);

  const canSubmit =
    password.length > 0 && confirmWord.trim().toUpperCase() === CONFIRM_WORD;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setErrorMessage(null);
    setLoading(true);
    try {
      await onSubmit({password, reason: reason.trim() || undefined});
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not deactivate the account.');
    } finally {
      setLoading(false);
    }
  };

  const consequences = [
    'You stop receiving job assignments immediately.',
    'Any wallet balance must be withdrawn before you deactivate.',
    'Only your agency can restore the account — the app cannot.',
  ];

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Deactivate your account"
      subtitle="This cannot be undone from the app"
      icon="userOff"
      iconTone="danger"
      scrollable
      primaryAction={{
        label: 'Deactivate account',
        onPress: handleSubmit,
        tone: 'danger',
        loading,
        disabled: !canSubmit,
      }}
      secondaryAction={{label: 'Keep my account', onPress: onClose}}>
      <View style={[styles.warn, {backgroundColor: t.dangerContainer}]}>
        {consequences.map(line => (
          <View key={line} style={styles.warnRow}>
            <Icon name="alert" size={15} color={t.dangerInk} strokeWidth={2} />
            <Text style={[styles.warnText, {color: t.dangerInk}]}>{line}</Text>
          </View>
        ))}
      </View>

      <TextField
        label="Your password"
        value={password}
        onChangeText={setPassword}
        placeholder="Confirm it is you"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        leftIcon="lock"
        rightIcon={showPassword ? 'close' : 'shield'}
        rightIconLabel={showPassword ? 'Hide password' : 'Show password'}
        onRightIconPress={() => setShowPassword(v => !v)}
      />

      <TextField
        label="Reason (optional)"
        value={reason}
        onChangeText={setReason}
        placeholder="Helps your agency understand why"
        multiline
      />

      <TextField
        label={`Type ${CONFIRM_WORD} to confirm`}
        value={confirmWord}
        onChangeText={setConfirmWord}
        placeholder={CONFIRM_WORD}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      {errorMessage ? (
        <View style={[styles.warn, {backgroundColor: t.dangerContainer}]}>
          <Text style={[styles.warnText, {color: t.dangerInk}]}>{errorMessage}</Text>
        </View>
      ) : null}
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  warn: {
    borderRadius: radii.md,
    padding: 12,
    gap: 9,
  },
  warnRow: {
    flexDirection: 'row',
    gap: 9,
  },
  warnText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
