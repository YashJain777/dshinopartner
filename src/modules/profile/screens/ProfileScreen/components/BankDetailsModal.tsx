/**
 * Bank details.
 *
 * This is where payouts land, so the IFSC pattern is checked as it is typed
 * rather than after a save the server would reject. A name that does not
 * match the passbook is the most common reason a payout is held, so the form
 * says that where it matters.
 */

import React, {useEffect, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from '../../../../../components/atoms/Text';
import {Icon} from '../../../../../components/atoms/Icon';
import {TextField} from '../../../../../components/atoms/TextField';
import {ModalSheet} from '../../../../../components/molecules/ModalSheet';
import {useTheme} from '../../../../../hooks/useTheme';
import {radii} from '../../../../../theme/tokens';

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export interface BankDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  initialHolderName: string;
  initialAccountNumber: string;
  initialIfscCode: string;
  onSave: (holderName: string, accountNumber: string, ifsc: string) => Promise<void>;
  saving: boolean;
}

export const BankDetailsModal: React.FC<BankDetailsModalProps> = ({
  visible,
  onClose,
  initialHolderName,
  initialAccountNumber,
  initialIfscCode,
  onSave,
  saving,
}) => {
  const {t} = useTheme();
  const [holderName, setHolderName] = useState(initialHolderName);
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber);
  const [ifscCode, setIfscCode] = useState(initialIfscCode);

  useEffect(() => {
    if (visible) {
      setHolderName(initialHolderName);
      setAccountNumber(initialAccountNumber);
      setIfscCode(initialIfscCode);
    }
  }, [visible, initialHolderName, initialAccountNumber, initialIfscCode]);

  const ifscError = useMemo(() => {
    if (!ifscCode) {
      return undefined;
    }
    return IFSC_RE.test(ifscCode) ? undefined : 'Format: SBIN0001234';
  }, [ifscCode]);

  const accountError =
    accountNumber && accountNumber.length < 8
      ? 'That looks too short for an account number'
      : undefined;

  const canSave =
    holderName.trim().length > 1 &&
    accountNumber.trim().length >= 8 &&
    IFSC_RE.test(ifscCode);

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Bank details"
      subtitle="Payouts are sent to this account"
      icon="bank"
      iconTone="brand"
      primaryAction={{
        label: 'Save details',
        onPress: () => onSave(holderName.trim(), accountNumber.trim(), ifscCode),
        loading: saving,
        disabled: !canSave,
      }}
      secondaryAction={{label: 'Cancel', onPress: onClose}}>
      <TextField
        label="Account holder name"
        value={holderName}
        onChangeText={setHolderName}
        placeholder="Exactly as on your passbook"
        autoCapitalize="words"
        leftIcon="user"
      />

      <TextField
        label="Account number"
        value={accountNumber}
        onChangeText={v => setAccountNumber(v.replace(/\D/g, '').slice(0, 20))}
        placeholder="Your account number"
        keyboardType="number-pad"
        maxLength={20}
        tabular
        leftIcon="bank"
        error={accountError}
      />

      <TextField
        label="IFSC code"
        value={ifscCode}
        onChangeText={v =>
          setIfscCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))
        }
        placeholder="SBIN0001234"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={11}
        tabular
        leftIcon="bank"
        error={ifscError}
      />

      <View style={[styles.note, {backgroundColor: t.warningContainer}]}>
        <Icon name="alert" size={16} color={t.warningInk} strokeWidth={1.9} />
        <Text style={[styles.noteText, {color: t.warningInk}]}>
          Changing these sends your bank proof back for review, and payouts pause
          until it clears.
        </Text>
      </View>
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
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
});
