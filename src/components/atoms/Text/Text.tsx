/**
 * Text Component
 * Reusable text component with typography variants
 * Follows Dshino theme and industry best practices
 * 
 * @example
 * <Text variant="h1">Heading</Text>
 * <Text variant="body" color="#FF6B00">Orange text</Text>
 * <Text variant="caption" numberOfLines={2}>Long text...</Text>
 */

import React from 'react';
import {Text as RNText} from 'react-native';
import {useTheme} from '../../../hooks/useTheme';
import {TextProps} from './Text.types';
import {createTextStyles} from './Text.styles';

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color,
  weight,
  align,
  numberOfLines,
  style,
  children,
  testID,
  ...props
}) => {
  const {t} = useTheme();
  const styles = createTextStyles(variant, color || t.textPrimary, weight, align);

  return (
    <RNText
      style={[styles.text, style]}
      numberOfLines={numberOfLines}
      testID={testID}
      {...props}>
      {children}
    </RNText>
  );
};

// Export types for external use
export type {TextProps} from './Text.types';
