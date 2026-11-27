/**
 * GateChecklistItem — one backend rule, shown before the partner acts.
 *
 * Geofence distance, photo counters and payment settlement are all enforced
 * server-side. Showing them as a rejection toast afterwards wastes a trip, so
 * each one is a row here with its live value.
 */

import React from 'react';
import {View, Pressable, StyleSheet, StyleProp, ViewStyle} from 'react-native';
import {Text} from '../../atoms/Text';
import {Icon, IconName} from '../../atoms/Icon';
import {useTheme} from '../../../hooks/useTheme';
import {radii} from '../../../theme/tokens';
import {numeric} from '../../../theme/textStyles';

export type GateState = 'met' | 'pending' | 'blocked';

export interface GateChecklistItemProps {
  label: string;
  state: GateState;
  /** Live value: "18 m", "2 / 4", "₹1,499". */
  value?: string;
  /** Overrides the state's default icon. */
  icon?: IconName;
  /** A second line, or a photo strip under the row. */
  children?: React.ReactNode;
  hint?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const GateChecklistItem: React.FC<GateChecklistItemProps> = ({
  label,
  state,
  value,
  icon,
  children,
  hint,
  onPress,
  style,
}) => {
  const {t} = useTheme();

  const palette =
    state === 'met'
      ? {bg: t.successContainer, fg: t.successInk, border: 'transparent', accent: t.success}
      : state === 'pending'
      ? {bg: t.warningContainer, fg: t.warningInk, border: t.warningBorder, accent: t.warning}
      : {bg: t.dangerContainer, fg: t.dangerInk, border: t.dangerBorder, accent: t.danger};

  const Container: React.ComponentType<any> = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${label}${value ? `, ${value}` : ''}` : undefined}
      style={[
        styles.wrap,
        {backgroundColor: palette.bg, borderColor: palette.border},
        style,
      ]}>
      <View style={styles.row}>
        {state === 'met' ? (
          <Icon name={icon ?? 'check'} size={17} color={palette.fg} strokeWidth={2.6} />
        ) : state === 'pending' ? (
          <View style={[styles.ring, {borderColor: palette.accent}]}>
            <View style={[styles.dot, {backgroundColor: palette.accent}]} />
          </View>
        ) : (
          <Icon name={icon ?? 'close'} size={17} color={palette.fg} strokeWidth={2.4} />
        )}

        <Text
          style={[
            styles.label,
            {color: palette.fg, fontWeight: state === 'met' ? '600' : '700'},
          ]}
          numberOfLines={2}>
          {label}
        </Text>

        {value ? (
          <Text style={[numeric, styles.value, {color: palette.fg}]}>{value}</Text>
        ) : null}
      </View>

      {children ? <View style={styles.children}>{children}</View> : null}

      {hint ? (
        <Text style={[styles.hint, {color: palette.fg}]}>{hint}</Text>
      ) : null}
    </Container>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 11,
    gap: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  ring: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  label: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 0,
  },
  children: {
    gap: 6,
  },
  hint: {
    fontSize: 11,
    fontWeight: '600',
  },
});
