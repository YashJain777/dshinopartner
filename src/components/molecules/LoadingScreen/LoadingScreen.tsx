/**
 * LoadingScreen — a full-screen wait.
 *
 * Says what it is loading. "Loading..." on its own tells a partner on a bad
 * connection nothing about whether to wait or retry.
 */

import React from 'react';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {Text} from '../../atoms/Text';
import {useTheme} from '../../../hooks/useTheme';

export interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading…',
}) => {
  const {t} = useTheme();
  return (
    <View
      style={[styles.root, {backgroundColor: t.surfaceContainer}]}
      accessibilityRole="progressbar"
      accessibilityLabel={message}>
      <ActivityIndicator size="large" color={t.brandAction} />
      <Text style={[styles.message, {color: t.textSecondary}]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
  },
});
