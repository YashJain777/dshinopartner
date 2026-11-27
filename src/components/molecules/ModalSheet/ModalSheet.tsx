/**
 * ModalSheet — the bottom sheet every Profile modal sits in.
 *
 * Eight separate sheets had drifted into eight slightly different headers and
 * button rows. One shell keeps them identical, and — importantly — makes the
 * system-navigation inset something they all get right rather than something
 * each one has to remember.
 */

import React from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {Text} from '../../atoms/Text';
import {Icon, IconName} from '../../atoms/Icon';
import {useTheme} from '../../../hooks/useTheme';
import {useScreenInsets} from '../../../hooks/useScreenInsets';
import {radii} from '../../../theme/tokens';

export interface ModalSheetAction {
  label: string;
  onPress: () => void;
  /** `danger` for anything that destroys or signs out. */
  tone?: 'brand' | 'danger' | 'neutral';
  loading?: boolean;
  disabled?: boolean;
}

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Small icon beside the title. */
  icon?: IconName;
  iconTone?: 'brand' | 'danger' | 'neutral';
  children?: React.ReactNode;
  /** Primary sits on top, secondary under it — thumb reaches primary first. */
  primaryAction?: ModalSheetAction;
  secondaryAction?: ModalSheetAction;
  /** Lets long bodies (terms, document lists) scroll. */
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export const ModalSheet: React.FC<ModalSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  iconTone = 'neutral',
  children,
  primaryAction,
  secondaryAction,
  scrollable = false,
  contentStyle,
}) => {
  const {t} = useTheme();
  const screenInsets = useScreenInsets();

  const iconPalette =
    iconTone === 'danger'
      ? {bg: t.dangerContainer, fg: t.dangerInk}
      : iconTone === 'brand'
      ? {bg: t.brandContainer, fg: t.brandInk}
      : {bg: t.neutralContainer, fg: t.neutralInk};

  const actionStyle = (action: ModalSheetAction, primary: boolean) => {
    if (action.disabled) {
      return {bg: t.neutralContainer, fg: t.textDisabled, border: 'transparent'};
    }
    if (action.tone === 'danger') {
      return primary
        ? {bg: t.danger, fg: t.dangerOnSolid, border: 'transparent'}
        : {bg: t.surface, fg: t.dangerInk, border: t.dangerBorder};
    }
    if (!primary || action.tone === 'neutral') {
      return {bg: t.surface, fg: t.textPrimary, border: t.outlineStrong};
    }
    return {bg: t.brandAction, fg: t.brandActionText, border: 'transparent'};
  };

  const Body = scrollable ? ScrollView : View;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={[styles.scrim, {backgroundColor: t.scrim}]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: t.surface,
              paddingBottom: screenInsets.stickyBarPadding + 8,
            },
          ]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, {backgroundColor: t.outlineStrong}]} />
          </View>

          <View style={styles.header}>
            {icon ? (
              <View style={[styles.icon, {backgroundColor: iconPalette.bg}]}>
                <Icon name={icon} size={19} color={iconPalette.fg} strokeWidth={1.9} />
              </View>
            ) : null}
            <View style={styles.headerText}>
              <Text style={[styles.title, {color: t.textHeading}]}>{title}</Text>
              {subtitle ? (
                <Text style={[styles.subtitle, {color: t.textTertiary}]}>{subtitle}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              style={[styles.close, {backgroundColor: t.neutralContainer}]}>
              <Icon name="close" size={16} color={t.neutralInk} strokeWidth={2.4} />
            </Pressable>
          </View>

          {children ? (
            <Body
              style={scrollable ? styles.scrollBody : undefined}
              contentContainerStyle={[
                scrollable ? styles.scrollContent : styles.body,
                contentStyle,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {children}
            </Body>
          ) : null}

          {primaryAction || secondaryAction ? (
            <View style={styles.actions}>
              {primaryAction ? (
                <Pressable
                  onPress={primaryAction.onPress}
                  disabled={primaryAction.disabled || primaryAction.loading}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: primaryAction.disabled || primaryAction.loading,
                  }}
                  style={[
                    styles.button,
                    {
                      backgroundColor: actionStyle(primaryAction, true).bg,
                      borderColor: actionStyle(primaryAction, true).border,
                      borderWidth:
                        actionStyle(primaryAction, true).border === 'transparent' ? 0 : 1,
                    },
                  ]}>
                  {primaryAction.loading ? (
                    <ActivityIndicator
                      size="small"
                      color={actionStyle(primaryAction, true).fg}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.buttonText,
                        {color: actionStyle(primaryAction, true).fg},
                      ]}>
                      {primaryAction.label}
                    </Text>
                  )}
                </Pressable>
              ) : null}

              {secondaryAction ? (
                <Pressable
                  onPress={secondaryAction.onPress}
                  disabled={secondaryAction.disabled}
                  accessibilityRole="button"
                  style={[
                    styles.buttonSecondary,
                    {
                      backgroundColor: actionStyle(secondaryAction, false).bg,
                      borderColor: actionStyle(secondaryAction, false).border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.buttonText,
                      {color: actionStyle(secondaryAction, false).fg},
                    ]}>
                    {secondaryAction.label}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    marginTop: 'auto',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '90%',
  },
  handleRow: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingBottom: 14,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.18,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 14,
  },
  scrollBody: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 4,
  },
  actions: {
    gap: 9,
    paddingTop: 16,
  },
  button: {
    height: 50,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    height: 46,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
