/**
 * RouteStopCard — one stop on today's optimised route.
 *
 * Ordered by `clusterSequence`, which the scheduler already computes, so the
 * stop number is real routing information rather than a list index. The
 * vehicle plate is the hero: a partner finds the car by its number, not by the
 * booking id, which is demoted to a caption elsewhere.
 */

import React from 'react';
import {View, Pressable, StyleSheet, StyleProp, ViewStyle} from 'react-native';
import {Text} from '../../atoms/Text';
import {Icon} from '../../atoms/Icon';
import {StatusChip} from '../../atoms/StatusChip';
import {useTheme} from '../../../hooks/useTheme';
import {radii} from '../../../theme/tokens';
import {numeric} from '../../../theme/textStyles';
import {BookingStatus} from '../../../constants/api.constants';

export type RouteStopState = 'active' | 'upcoming' | 'late' | 'done';

export interface RouteStopCardProps {
  stopNumber: number;
  state: RouteStopState;
  serviceName: string;
  /** Already formatted, e.g. "₹1,499". */
  amount: string;
  registrationNumber?: string;
  vehicleLine?: string;
  /** "3.2 km · 11 min drive" — the leg before this stop. */
  travelLine?: string;
  slot?: string;
  customerName?: string;
  status?: BookingStatus;
  /** Replaces the status chip, for a late or expired warning. */
  warning?: string;
  /** Right-hand call to action text, shown on the active card. */
  actionLabel?: string;
  isLast?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const RouteStopCard: React.FC<RouteStopCardProps> = ({
  stopNumber,
  state,
  serviceName,
  amount,
  registrationNumber,
  vehicleLine,
  travelLine,
  slot,
  customerName,
  status,
  warning,
  actionLabel,
  isLast = false,
  onPress,
  style,
}) => {
  const {t} = useTheme();

  const node =
    state === 'active'
      ? {bg: t.brand, fg: t.brandActionText, border: t.brand}
      : state === 'late'
      ? {bg: t.surfaceContainer, fg: t.dangerInk, border: t.danger}
      : state === 'done'
      ? {bg: t.successContainer, fg: t.successInk, border: t.successContainer}
      : {bg: t.surface, fg: t.neutralInk, border: t.outlineStrong};

  const card =
    state === 'active'
      ? {bg: t.surfaceElevated, border: t.brandBorder, width: 1.5}
      : state === 'late'
      ? {bg: t.surface, border: t.dangerBorder, width: 1}
      : {bg: t.surface, border: t.outline, width: 1};

  const Container: React.ComponentType<any> = onPress ? Pressable : View;

  return (
    <View style={[styles.row, style]}>
      <View style={styles.rail}>
        <View
          style={[
            styles.node,
            {backgroundColor: node.bg, borderColor: node.border},
          ]}>
          {state === 'done' ? (
            <Icon name="check" size={14} color={node.fg} strokeWidth={2.8} />
          ) : (
            <Text style={[numeric, styles.nodeText, {color: node.fg}]}>
              {stopNumber}
            </Text>
          )}
        </View>
        {!isLast ? (
          <View style={[styles.segment, {backgroundColor: t.outline}]} />
        ) : null}
      </View>

      <View style={styles.body}>
        {travelLine ? (
          <Text style={[numeric, styles.travel, {color: t.textTertiary}]}>
            {travelLine}
          </Text>
        ) : null}

        <Container
          onPress={onPress}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={
            onPress ? `Stop ${stopNumber}, ${serviceName}, ${amount}` : undefined
          }
          style={[
            styles.card,
            {
              backgroundColor: card.bg,
              borderColor: card.border,
              borderWidth: card.width,
              opacity: state === 'done' ? 0.72 : 1,
            },
          ]}>
          <View style={styles.titleRow}>
            <Text style={[styles.service, {color: t.textHeading}]} numberOfLines={1}>
              {serviceName}
            </Text>
            <Text style={[numeric, styles.amount, {color: t.textHeading}]}>
              {amount}
            </Text>
          </View>

          {registrationNumber || vehicleLine ? (
            <View style={styles.vehicleRow}>
              {registrationNumber ? (
                <Text
                  style={[
                    numeric,
                    styles.plate,
                    {color: t.textPrimary, borderColor: t.textSecondary},
                  ]}>
                  {registrationNumber}
                </Text>
              ) : null}
              {vehicleLine ? (
                <Text
                  style={[styles.vehicle, {color: t.textSecondary}]}
                  numberOfLines={1}>
                  {vehicleLine}
                </Text>
              ) : null}
            </View>
          ) : null}

          {warning ? (
            <View
              style={[styles.warning, {backgroundColor: t.dangerContainer}]}>
              <Icon name="clock" size={13} color={t.dangerInk} strokeWidth={2.2} />
              <Text style={[numeric, styles.warningText, {color: t.dangerInk}]}>
                {warning}
              </Text>
            </View>
          ) : (
            <View style={styles.metaRow}>
              {status ? <StatusChip status={status} size="sm" /> : null}
              {slot ? (
                <View style={[styles.pill, {backgroundColor: t.infoContainer}]}>
                  <Text style={[numeric, styles.pillText, {color: t.infoInk}]}>
                    {slot}
                  </Text>
                </View>
              ) : null}
              {customerName ? (
                <View style={[styles.pill, {backgroundColor: t.neutralContainer}]}>
                  <Text style={[styles.pillText, {color: t.neutralInk}]}>
                    {customerName}
                  </Text>
                </View>
              ) : null}
              {actionLabel ? (
                <Text style={[styles.action, {color: t.brandAction}]}>
                  {actionLabel}
                </Text>
              ) : null}
            </View>
          )}
        </Container>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 11,
  },
  rail: {
    width: 26,
    alignItems: 'center',
  },
  node: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segment: {
    width: 2,
    flex: 1,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 10,
  },
  travel: {
    fontSize: 11,
    fontWeight: '600',
    paddingLeft: 2,
    paddingBottom: 6,
  },
  card: {
    borderRadius: radii.md,
    padding: 12,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  service: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  plate: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  vehicle: {
    flex: 1,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  pill: {
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  action: {
    marginLeft: 'auto',
    fontSize: 13,
    fontWeight: '700',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },
});
