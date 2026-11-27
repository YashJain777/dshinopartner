/**
 * Logout confirmation.
 *
 * Signing out drops the FCM token, so a partner who does it mid-shift stops
 * receiving job assignments. Worth one tap of friction and one honest line.
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from '../../../../../components/atoms/Text';
import {Icon} from '../../../../../components/atoms/Icon';
import {ModalSheet} from '../../../../../components/molecules/ModalSheet';
import {useTheme} from '../../../../../hooks/useTheme';
import {radii} from '../../../../../theme/tokens';

export interface LogoutConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const {t} = useTheme();

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Log out?"
      subtitle="You will need your number and an OTP to get back in."
      icon="userOff"
      iconTone="danger"
      primaryAction={{label: 'Log out', onPress: onConfirm, tone: 'danger'}}
      secondaryAction={{label: 'Stay signed in', onPress: onClose}}>
      <View style={[styles.note, {backgroundColor: t.warningContainer}]}>
        <Icon name="bell" size={16} color={t.warningInk} strokeWidth={1.9} />
        <Text style={[styles.noteText, {color: t.warningInk}]}>
          Job notifications stop while you are signed out. If you are mid-shift, go
          offline instead.
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
