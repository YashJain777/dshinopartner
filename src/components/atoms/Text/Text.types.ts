/**
 * Text Component Types
 * Type definitions for the Text component
 */

import {TextProps as RNTextProps} from 'react-native';
import {TypographyVariant} from '../../../theme/typography';

export interface TextProps extends RNTextProps {
  /**
   * Typography variant from theme
   * @default 'body'
   */
  variant?: TypographyVariant;

  /**
   * Text color (overrides theme color)
   */
  color?: string;

  /**
   * Font weight
   */
  weight?: '400' | '500' | '600' | '700';

  /**
   * Text alignment
   */
  align?: 'left' | 'center' | 'right' | 'justify';

  /**
   * Number of lines before truncating
   */
  numberOfLines?: number;

  /**
   * Children content
   */
  children: React.ReactNode;

  /**
   * Test ID for testing
   */
  testID?: string;
}
