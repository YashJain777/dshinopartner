/**
 * Keyboard handling, in one place.
 *
 * Four screens had written the same line:
 *
 *     behavior={Platform.OS === 'ios' ? 'padding' : undefined}
 *
 * which is the advice for an Android app that can rely on
 * `windowSoftInputMode="adjustResize"` resizing the window. This app sets
 * that flag, but it also targets SDK 36 — and from Android 15 the system
 * puts every app edge-to-edge whether it asks to or not, which stops the
 * window resizing for the IME. (`edgeToEdgeEnabled=false` in
 * gradle.properties opts out of React Native's own helper; it does not opt
 * out of the platform.) So on a current device Android got `undefined`,
 * KeyboardAvoidingView did nothing, and the keyboard sat on top of the
 * field being typed into — worst on the support screens, where the whole
 * point is a long description and a reply box at the bottom.
 *
 * `padding` is correct on both platforms: KeyboardAvoidingView reads the
 * keyboard height from the IME events rather than from a resized window.
 *
 * Anything that must stay reachable while typing — a Submit bar, a send
 * button — belongs INSIDE this, not as a sibling after it. A sticky bar
 * outside is lifted by nothing.
 */

import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';

export interface KeyboardAvoiderProps {
  children: React.ReactNode;
  /**
   * Extra space above the keyboard — normally only needed when a header sits
   * above this view and is not part of it.
   */
  offset?: number;
  style?: StyleProp<ViewStyle>;
}

export const KeyboardAvoider: React.FC<KeyboardAvoiderProps> = ({
  children,
  offset = 0,
  style,
}) => (
  <KeyboardAvoidingView
    style={[styles.flex, style]}
    behavior="padding"
    keyboardVerticalOffset={offset}
    // Android reports the IME inset including the navigation bar; without
    // this the content lifts by the nav bar height more than it should.
    {...(Platform.OS === 'android' ? {enabled: true} : {})}>
    {children}
  </KeyboardAvoidingView>
);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
