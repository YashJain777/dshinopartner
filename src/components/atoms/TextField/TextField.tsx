/**
 * TextField — the one text input in the redesign.
 *
 * Errors sit under the field and also recolour its border, so the problem is
 * findable without reading: a partner scanning a form sees which box is wrong
 * before they see why.
 */

import React, {forwardRef, useState} from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {Text} from '../Text';
import {Icon, IconName} from '../Icon';
import {useTheme} from '../../../hooks/useTheme';
import {radii} from '../../../theme/tokens';
import {numeric} from '../../../theme/textStyles';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  /** Shown under the field and turns the border red. */
  error?: string;
  /** Shown under the field when there is no error. */
  hint?: string;
  leftIcon?: IconName;
  /** A trailing control — a clear button, a visibility toggle. */
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  rightIconLabel?: string;
  /** Fixed text before the input, e.g. a +91 dial code. */
  prefix?: string;
  /** Digits line up: money, phone numbers, OTP, IFSC. */
  tabular?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconPress,
      rightIconLabel,
      prefix,
      tabular = false,
      containerStyle,
      editable = true,
      ...inputProps
    },
    ref,
  ) => {
    const {t} = useTheme();
    const [focused, setFocused] = useState(false);

    const borderColor = error
      ? t.danger
      : focused
      ? t.brandAction
      : t.outlineStrong;

    return (
      <View style={[styles.wrap, containerStyle]}>
        {label ? (
          <Text style={[styles.label, {color: t.textTertiary}]}>
            {label.toUpperCase()}
          </Text>
        ) : null}

        <View
          style={[
            styles.field,
            {
              backgroundColor: editable ? t.surface : t.surfaceContainer,
              borderColor,
              borderWidth: focused || error ? 1.5 : 1,
            },
          ]}>
          {leftIcon ? (
            <Icon
              name={leftIcon}
              size={18}
              color={error ? t.dangerInk : t.textTertiary}
              strokeWidth={1.9}
            />
          ) : null}

          {prefix ? (
            <Text style={[numeric, styles.prefix, {color: t.textSecondary}]}>
              {prefix}
            </Text>
          ) : null}

          <TextInput
            ref={ref}
            editable={editable}
            placeholderTextColor={t.textDisabled}
            onFocus={e => {
              setFocused(true);
              inputProps.onFocus?.(e);
            }}
            onBlur={e => {
              setFocused(false);
              inputProps.onBlur?.(e);
            }}
            style={[
              styles.input,
              tabular ? numeric : null,
              {color: editable ? t.textPrimary : t.textTertiary},
            ]}
            {...inputProps}
          />

          {rightIcon ? (
            <Pressable
              onPress={onRightIconPress}
              accessibilityRole="button"
              accessibilityLabel={rightIconLabel}
              hitSlop={10}>
              <Icon
                name={rightIcon}
                size={18}
                color={t.textTertiary}
                strokeWidth={1.9}
              />
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <Text style={[styles.message, {color: t.dangerInk}]}>{error}</Text>
        ) : hint ? (
          <Text style={[styles.message, {color: t.textTertiary}]}>{hint}</Text>
        ) : null}
      </View>
    );
  },
);

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  wrap: {
    gap: 7,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.66,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: radii.md,
    paddingHorizontal: 14,
  },
  prefix: {
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  message: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
});
