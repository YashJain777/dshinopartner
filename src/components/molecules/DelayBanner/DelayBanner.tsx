/**
 * Delay Banner
 *
 * Shown on a job the partner has not reached yet once the slot has started.
 * The backend decides the state against the admin's lateness policy
 * (sla.thresholdMinutes / sla.punctualityBufferMinutes) and sends it as
 * `slaState`, so the app never computes lateness itself and cannot disagree
 * with what the cron escalates on.
 *
 * Nothing renders while the job is on time, or once the partner is on site —
 * `slaState` is ON_TIME for ARRIVED and IN_PROGRESS.
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from '../../atoms/Text';
import {Icon, IconName} from '../../atoms/Icon';
import {useTheme} from '../../../hooks/useTheme';
import {Tokens, radii} from '../../../theme/tokens';
import {numeric} from '../../../theme/textStyles';
import {DelayBannerProps} from './DelayBanner.types';

const tone = (state: 'RUNNING_LATE' | 'BREACHED', t: Tokens) =>
  state === 'RUNNING_LATE'
    ? {
        icon: 'clock' as IconName,
        background: t.warningContainer,
        border: t.warning,
        text: t.warningInk,
        title: 'Running late',
      }
    : {
        icon: 'alert' as IconName,
        background: t.dangerContainer,
        border: t.danger,
        text: t.dangerInk,
        title: 'Slot missed',
      };

export const DelayBanner: React.FC<DelayBannerProps> = ({
  slaState,
  minutesLate,
  customerNotified,
  style,
}) => {
  const {t} = useTheme();

  if (slaState !== 'RUNNING_LATE' && slaState !== 'BREACHED') {
    return null;
  }

  const palette = tone(slaState, t);

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: palette.background, borderLeftColor: palette.border},
        style,
      ]}>
      <Icon name={palette.icon} size={20} color={palette.text} strokeWidth={2} />
      <View style={styles.body}>
        <Text style={[numeric, styles.title, {color: palette.text}]}>
          {palette.title} · {minutesLate} min
        </Text>
        <Text style={[styles.detail, {color: palette.text}]}>
          {slaState === 'BREACHED'
            ? 'This slot is past its window. The customer can rebook at no charge, so call them before you set off.'
            : 'Mark Arrived as soon as you reach the vehicle — that stops the clock.'}
        </Text>
        {customerNotified ? (
          <Text style={[styles.detail, {color: palette.text}]}>
            The customer has been told automatically.
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 11,
    padding: 12,
    borderRadius: radii.md,
    borderLeftWidth: 4,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  detail: {
    fontSize: 12,
    lineHeight: 17,
  },
});
