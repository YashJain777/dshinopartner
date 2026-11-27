/**
 * App gate — the two states that stop the app entirely.
 *
 * A forced update and a maintenance window are both dead ends, so each gets
 * exactly one action: the store, or a retry. No navigation, because there is
 * nowhere useful to go.
 */

import React from 'react';
import {View, Pressable, Linking, Alert, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '../../atoms/Text';
import {Icon} from '../../atoms/Icon';
import {useTheme} from '../../../hooks/useTheme';
import {radii} from '../../../theme/tokens';
import {AppConfig} from '../../../services/api/appConfig.api';

export interface AppGateScreenProps {
  mode: 'UPDATE_REQUIRED' | 'MAINTENANCE';
  config: AppConfig | null;
  onRetry: () => void;
}

export const AppGateScreen: React.FC<AppGateScreenProps> = ({
  mode,
  config,
  onRetry,
}) => {
  const {t} = useTheme();
  const isUpdate = mode === 'UPDATE_REQUIRED';

  const handleUpdate = () => {
    const url = config?.storeUrl;
    if (!url) {
      Alert.alert(
        'Update required',
        'Please update the Dshino Partner app from your app store.',
      );
      return;
    }
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open the app store.'),
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, {backgroundColor: t.surfaceContainer}]}
      edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={[styles.iconCircle, {backgroundColor: t.brandContainer}]}>
          <Icon
            name={isUpdate ? 'arrowDown' : 'wrench'}
            size={34}
            color={t.brandInk}
            strokeWidth={1.9}
          />
        </View>

        <Text style={[styles.title, {color: t.textHeading}]}>
          {isUpdate ? 'Update required' : 'Under maintenance'}
        </Text>

        <Text style={[styles.body, {color: t.textSecondary}]}>
          {isUpdate
            ? `This version is no longer supported. Update to keep taking jobs.${
                config?.minVersion ? `\n\nMinimum version: ${config.minVersion}` : ''
              }`
            : config?.maintenanceMessage ||
              'Dshino is briefly unavailable while we carry out maintenance. Please check back shortly.'}
        </Text>

        <Pressable
          onPress={isUpdate ? handleUpdate : onRetry}
          accessibilityRole="button"
          style={[styles.button, {backgroundColor: t.brandAction}]}>
          <Icon
            name={isUpdate ? 'arrowDown' : 'clock'}
            size={18}
            color={t.brandActionText}
            strokeWidth={2.2}
          />
          <Text style={[styles.buttonText, {color: t.brandActionText}]}>
            {isUpdate ? 'Update now' : 'Try again'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 50,
    paddingHorizontal: 28,
    borderRadius: radii.full,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
