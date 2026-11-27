/**
 * Notification settings.
 *
 * Job alerts are listed first and described honestly: turning them off means
 * a partner will not know a stop was added to their route. The other three
 * are genuinely optional.
 */

import React, {useEffect, useState} from 'react';
import {View, Switch, StyleSheet} from 'react-native';
import {Text} from '../../../../../components/atoms/Text';
import {Icon, IconName} from '../../../../../components/atoms/Icon';
import {ModalSheet} from '../../../../../components/molecules/ModalSheet';
import {useTheme} from '../../../../../hooks/useTheme';
import {NotificationPreferences} from '../../../../../types/api.types';
import {radii} from '../../../../../theme/tokens';

export interface NotificationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  initialPreferences: NotificationPreferences;
  onSave: (preferences: NotificationPreferences) => Promise<void>;
  saving: boolean;
}

type PrefKey = keyof NotificationPreferences;

const ROWS: {
  key: PrefKey;
  icon: IconName;
  label: string;
  description: string;
  critical?: boolean;
}[] = [
  {
    key: 'bookingAlerts',
    icon: 'briefcase',
    label: 'Job alerts',
    description: 'New assignments, schedule changes and SLA warnings',
    critical: true,
  },
  {
    key: 'paymentAlerts',
    icon: 'wallet',
    label: 'Money',
    description: 'Wallet credits and payout updates',
  },
  {
    key: 'systemUpdates',
    icon: 'info',
    label: 'Account & KYC',
    description: 'Document reviews and account notices',
  },
  {
    key: 'promotions',
    icon: 'star',
    label: 'Offers',
    description: 'Incentives and referral campaigns',
  },
];

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  visible,
  onClose,
  initialPreferences,
  onSave,
  saving,
}) => {
  const {t} = useTheme();
  const [prefs, setPrefs] = useState<NotificationPreferences>(initialPreferences);

  useEffect(() => {
    if (visible) {
      setPrefs(initialPreferences);
    }
  }, [visible, initialPreferences]);

  const toggle = (key: PrefKey) => setPrefs(p => ({...p, [key]: !p[key]}));

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Notifications"
      icon="bell"
      primaryAction={{
        label: 'Save',
        onPress: () => onSave(prefs),
        loading: saving,
      }}
      secondaryAction={{label: 'Cancel', onPress: onClose}}>
      {ROWS.map(row => (
        <View key={row.key} style={styles.row}>
          <View
            style={[
              styles.icon,
              {backgroundColor: row.critical ? t.brandContainer : t.neutralContainer},
            ]}>
            <Icon
              name={row.icon}
              size={17}
              color={row.critical ? t.brandInk : t.neutralInk}
              strokeWidth={1.9}
            />
          </View>
          <View style={styles.text}>
            <Text style={[styles.label, {color: t.textHeading}]}>{row.label}</Text>
            <Text style={[styles.description, {color: t.textTertiary}]}>
              {row.description}
            </Text>
          </View>
          <Switch
            value={Boolean(prefs[row.key])}
            onValueChange={() => toggle(row.key)}
            accessibilityLabel={row.label}
            trackColor={{false: t.outlineStrong, true: t.success}}
            thumbColor={t.surface}
          />
        </View>
      ))}

      {!prefs.bookingAlerts ? (
        <View style={[styles.warn, {backgroundColor: t.warningContainer}]}>
          <Icon name="alert" size={16} color={t.warningInk} strokeWidth={2} />
          <Text style={[styles.warnText, {color: t.warningInk}]}>
            With job alerts off you will not know when a stop is added to your route.
            You will have to open the app to check.
          </Text>
        </View>
      ) : null}
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
  },
  warn: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
  },
  warnText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
