/**
 * OtpBoxes — the digit boxes every code entry in this app uses.
 *
 * Three places ask for a code and the code is not the same length in each:
 * login and signup take the 6-digit SMS code, finishing a job takes the
 * customer's 4-digit completion code. They were drifting apart — one was a
 * plain text field with a "------" placeholder, another drew its own boxes —
 * so `length` is a prop and the drawing is shared.
 *
 * One real TextInput sits behind the boxes. A field per box breaks paste,
 * SMS autofill and backspace, all of which a partner standing at a gate with
 * one hand free actually uses.
 */

import React, {useRef} from 'react';
import {View, TextInput, Pressable, StyleSheet, StyleProp, ViewStyle} from 'react-native';
import {Text} from '../Text';
import {useTheme} from '../../../hooks/useTheme';
import {radii, Tokens} from '../../../theme/tokens';
import {numeric} from '../../../theme/textStyles';

export interface OtpBoxesProps {
  value: string;
  onChangeText: (next: string) => void;
  /** 6 for the SMS code, 4 for a job's completion code. */
  length: number;
  autoFocus?: boolean;
  /** Paints the boxes as rejected — a wrong code, not an empty one. */
  error?: boolean;
  /** Greys the boxes out while a code is being checked or is locked out. */
  disabled?: boolean;
  /** Spoken label for the whole group; the digit count is appended. */
  accessibilityLabel?: string;
  /**
   * Overrides the device theme. The auth screens are dark in both themes, so
   * without this the boxes would render light tokens on a dark surface.
   */
  palette?: Tokens;
  onSubmitEditing?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const OtpBoxes: React.FC<OtpBoxesProps> = ({
  value,
  onChangeText,
  length,
  autoFocus = false,
  error = false,
  disabled = false,
  accessibilityLabel = 'Verification code',
  palette,
  onSubmitEditing,
  style,
  testID,
}) => {
  const {t: themed} = useTheme();
  const t = palette ?? themed;
  const inputRef = useRef<TextInput>(null);

  // Six boxes at 56pt overflow a 360pt screen once the gutters are counted,
  // so the wider codes get narrower boxes rather than a horizontal scroll.
  const wide = length <= 4;
  const boxWidth = wide ? 56 : 46;
  const boxHeight = wide ? 66 : 58;
  const digitSize = wide ? 28 : 24;

  return (
    <View style={style}>
      <Pressable
        onPress={() => !disabled && inputRef.current?.focus()}
        accessibilityRole="button"
        accessibilityState={{disabled}}
        accessibilityLabel={`${accessibilityLabel}, ${value.length} of ${length} digits entered`}
        style={styles.row}
        testID={testID}>
        {Array.from({length}).map((_, i) => {
          const filled = i < value.length;
          const active = !disabled && i === value.length;

          const borderColor = error
            ? t.dangerBorder
            : active
            ? t.brandAction
            : filled
            ? t.outlineStrong
            : t.outline;

          return (
            <View
              key={i}
              style={[
                styles.box,
                {
                  width: boxWidth,
                  height: boxHeight,
                  backgroundColor: error
                    ? t.dangerContainer
                    : active
                    ? t.brandContainer
                    : filled
                    ? t.surface
                    : t.surfaceContainer,
                  borderColor,
                  borderWidth: active || error ? 2 : 1.5,
                  opacity: disabled ? 0.6 : 1,
                },
              ]}>
              {filled ? (
                <Text
                  style={[
                    numeric,
                    styles.digit,
                    {fontSize: digitSize, color: error ? t.dangerInk : t.textHeading},
                  ]}>
                  {value[i]}
                </Text>
              ) : active ? (
                // A caret, so it is obvious which box the next digit lands in.
                <View style={[styles.caret, {backgroundColor: t.brandAction}]} />
              ) : null}
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={next => onChangeText(next.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled}
        onSubmitEditing={onSubmitEditing}
        // Lets Android fill the code straight from the SMS.
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        style={styles.hiddenInput}
        caretHidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  box: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontWeight: '700',
  },
  caret: {
    width: 2,
    height: 28,
    borderRadius: 1,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
});
