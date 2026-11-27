/**
 * AuthLayout — the shell every signed-out screen sits in.
 *
 * Auth is the one place the app goes dark in both themes: it is a full-bleed
 * brand moment with no tab bar and no job data, and a single surface keeps
 * the five screens from drifting apart. It also claims the bottom inset,
 * because nothing floats above the system navigation here.
 */

import React from 'react';
import {
  View,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '../../atoms/Text';
import {Icon} from '../../atoms/Icon';
import {tokens} from '../../../theme/tokens';

const LOGO = require('../../../assets/images/DShino_logo.png');

export interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  /** Shows the Dshino mark above the title. The entry screen wants it. */
  showBrand?: boolean;
  onBack?: () => void;
  /** Progress through a multi-step flow, e.g. 2 of 4. */
  step?: {current: number; total: number};
  children: React.ReactNode;
  /** Pinned to the bottom above the system navigation. */
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  showBrand = false,
  onBack,
  step,
  children,
  footer,
  contentStyle,
}) => {
  // Auth is dark in both themes, so read from the dark token set directly.
  const t = tokens.dark;

  return (
    <SafeAreaView
      style={[styles.safe, {backgroundColor: t.surface}]}
      edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={10}
              style={[styles.back, {backgroundColor: t.surfaceElevated}]}>
              <Icon name="chevronLeft" size={18} color={t.textPrimary} strokeWidth={2.2} />
            </Pressable>
          ) : null}

          {showBrand ? (
            <View style={styles.brand}>
              {/* The real mark, not a car glyph in an orange square. */}
              <Image source={LOGO} style={styles.mark} resizeMode="contain" />
              <Text style={[styles.brandName, {color: t.textHeading}]}>
                Dshino Partner
              </Text>
            </View>
          ) : null}

          {step ? (
            <View style={styles.steps}>
              {Array.from({length: step.total}).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.stepBar,
                    {
                      backgroundColor:
                        i < step.current ? t.brandAction : t.surfaceElevated,
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.heading}>
            <Text style={[styles.title, {color: t.textHeading}]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, {color: t.textTertiary}]}>{subtitle}</Text>
            ) : null}
          </View>

          <View style={styles.body}>{children}</View>
        </ScrollView>

        {footer ? (
          <View style={[styles.footer, {borderTopColor: t.outline}]}>{footer}</View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/**
 * Auth screens paint on the dark surface regardless of system theme, so they
 * read tokens from here rather than useTheme.
 */
export const authTokens = tokens.dark;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 20,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 40,
    height: 40,
  },
  brandName: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.19,
  },
  steps: {
    flexDirection: 'row',
    gap: 6,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  heading: {
    gap: 7,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    gap: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 10,
    borderTopWidth: 1,
    gap: 10,
  },
});
