/**
 * Text Component Styles
 * Component-scoped styles following the theme system
 */

import {StyleSheet, TextStyle} from 'react-native';
import {typography, TypographyVariant} from '../../../theme/typography';

/**
 * Create dynamic styles based on variant and props
 */
export const createTextStyles = (
  variant: TypographyVariant,
  color?: string,
  weight?: '400' | '500' | '600' | '700',
  align?: 'left' | 'center' | 'right' | 'justify',
) => {
  const textStyle: TextStyle = {
    ...typography[variant],
    color,
    ...(weight && {fontWeight: weight}),
    ...(align && {textAlign: align}),
  };

  return StyleSheet.create({
    text: textStyle,
  });
};
