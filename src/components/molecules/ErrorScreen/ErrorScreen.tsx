/**
 * ErrorScreen — a full-screen failure with a way out.
 *
 * Never a dead end: if the caller can retry, the button is here; if not, the
 * message has to carry the whole explanation.
 */

import React from 'react';
import {View, Pressable, StyleSheet} from 'react-native';
import {Text} from '../../atoms/Text';
import {Icon} from '../../atoms/Icon';
import {useTheme} from '../../../hooks/useTheme';
import {radii} from '../../../theme/tokens';

export interface ErrorScreenProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  message = 'Something went wrong.',
  onRetry,
}) => {
  const {t} = useTheme();
  return (
    <View style={[styles.root, {backgroundColor: t.surfaceContainer}]}>
      <View style={[styles.icon, {backgroundColor: t.dangerContainer}]}>
        <Icon name="alert" size={26} color={t.dangerInk} strokeWidth={1.9} />
      </View>
      <Text style={[styles.title, {color: t.textHeading}]}>Could not load that</Text>
      <Text style={[styles.message, {color: t.textSecondary}]}>{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={[styles.retry, {backgroundColor: t.brandAction}]}>
          <Text style={[styles.retryText, {color: t.brandActionText}]}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  retry: {
    marginTop: 8,
    height: 46,
    paddingHorizontal: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
