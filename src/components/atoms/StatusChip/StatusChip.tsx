/**
 * StatusChip — a booking's state as icon + word + colour.
 *
 * Never renders colour alone, and never the raw enum. Pass either a
 * `BookingStatus` or an explicit label/icon/tone for states that are not a
 * booking status (for example "Blocked" or "Expired").
 */

import React from 'react';
import {View, StyleSheet, StyleProp, ViewStyle} from 'react-native';
import {Text} from '../Text';
import {Icon, IconName} from '../Icon';
import {useTheme} from '../../../hooks/useTheme';
import {getStatusPresentation, resolveTone, StatusTone} from '../../../theme/jobStatus';
import {BookingStatus} from '../../../constants/api.constants';
import {radii} from '../../../theme/tokens';

export interface StatusChipProps {
  /** A booking status resolves label, icon and tone from one place. */
  status?: BookingStatus;
  /** Overrides, for non-booking states. */
  label?: string;
  icon?: IconName;
  tone?: StatusTone;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  label,
  icon,
  tone,
  size = 'md',
  style,
}) => {
  const {t} = useTheme();
  const base = status ? getStatusPresentation(status) : undefined;

  const resolvedLabel = label ?? base?.label ?? '';
  const resolvedIcon = icon ?? base?.icon ?? 'clipboard';
  const palette = resolveTone(tone ?? base?.tone ?? 'neutral', t);

  const small = size === 'sm';

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: palette.background,
          paddingVertical: small ? 3 : 5,
          paddingLeft: small ? 7 : 8,
          paddingRight: small ? 9 : 10,
        },
        style,
      ]}>
      <Icon
        name={resolvedIcon}
        size={small ? 12 : 14}
        color={palette.foreground}
        strokeWidth={2}
      />
      <Text
        style={[
          styles.label,
          {color: palette.foreground, fontSize: small ? 11 : 12},
        ]}
        numberOfLines={1}>
        {resolvedLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: radii.full,
  },
  label: {
    fontWeight: '700',
  },
});
