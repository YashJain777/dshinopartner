/**
 * Type scale — Dshino Partner redesign
 *
 * Seven steps, nothing in between. `numeric` is mixed into any style that
 * renders money, time slots, distances, OTP digits or registration plates, so
 * columns of numbers stop jittering between renders.
 */

import {TextStyle} from 'react-native';

export const numeric: TextStyle = {
  fontVariant: ['tabular-nums'],
};

export const textStyles = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.64,
  } as TextStyle,

  titleLg: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.22,
  } as TextStyle,

  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.18,
  } as TextStyle,

  bodyLg: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  } as TextStyle,

  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  } as TextStyle,

  label: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  } as TextStyle,

  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.66,
    textTransform: 'uppercase',
  } as TextStyle,

  /** Caption weight without the uppercase treatment, for timestamps. */
  meta: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  } as TextStyle,
} as const;

export type TextStyleKey = keyof typeof textStyles;

/** Minimum touch target, enforced on every pressable. */
export const MIN_TOUCH_TARGET = 48;
