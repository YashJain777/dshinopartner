/**
 * Edit profile.
 *
 * Phone is read-only: it is the login identity and the number the customer
 * and agency call. Changing it is an agency action, not a self-service
 * one, so the field says so instead of silently failing on save.
 */

import React, {useEffect, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from '../../../../../components/atoms/Text';
import {Icon} from '../../../../../components/atoms/Icon';
import {TextField} from '../../../../../components/atoms/TextField';
import {ModalSheet} from '../../../../../components/molecules/ModalSheet';
import {useTheme} from '../../../../../hooks/useTheme';
import {radii} from '../../../../../theme/tokens';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  onSave: (name: string, email: string, phone: string) => Promise<void>;
  saving: boolean;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  initialName,
  initialEmail,
  initialPhone,
  onSave,
  saving,
}) => {
  const {t} = useTheme();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);

  // Reopening should show what is actually saved, not the last abandoned edit.
  useEffect(() => {
    if (visible) {
      setName(initialName);
      setEmail(initialEmail);
    }
  }, [visible, initialName, initialEmail]);

  const emailError = useMemo(() => {
    if (!email.trim()) {
      return undefined;
    }
    return EMAIL_RE.test(email.trim()) ? undefined : 'That does not look like an email';
  }, [email]);

  const canSave = name.trim().length > 1 && !emailError;

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Edit your details"
      icon="user"
      iconTone="brand"
      primaryAction={{
        label: 'Save changes',
        onPress: () => onSave(name.trim(), email.trim(), initialPhone),
        loading: saving,
        disabled: !canSave,
      }}
      secondaryAction={{label: 'Cancel', onPress: onClose}}>
      <TextField
        label="Full name"
        value={name}
        onChangeText={setName}
        placeholder="As it appears on your ID"
        autoCapitalize="words"
        leftIcon="user"
      />

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        leftIcon="mail"
        error={emailError}
      />

      <TextField
        label="Mobile number"
        value={initialPhone}
        editable={false}
        tabular
        leftIcon="phone"
      />

      <View style={[styles.note, {backgroundColor: t.neutralContainer}]}>
        <Icon name="info" size={16} color={t.neutralInk} strokeWidth={1.9} />
        <Text style={[styles.noteText, {color: t.textSecondary}]}>
          Your number is how you sign in and how customers reach you. Ask your
          agency to change it.
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
