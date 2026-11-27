/**
 * App Alert Modal Component
 * Ultra-modern replacement for React Native's default Alert.alert.
 * Mounts at root level (App.tsx) and displays customized branded dialogs.
 */

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Text } from '../../atoms/Text';
import {tokens} from '../../../theme/tokens';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import {
  subscribeAppAlert,
  CustomAlertConfig,
  AlertType,
  AlertButtonConfig,
} from '../../../services/alert/alertManager';


const VARIANT_CONFIG: Record<
  AlertType,
  {
    icon: string;
    iconColor: string;
    bgColor: string;
    borderColor: string;
    badgeBg: string;
    primaryBtnBg: string;
    primaryBtnShadow: string;
  }
> = {
  success: {
    icon: 'check-circle-outline',
    iconColor: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    badgeBg: '#D1FAE5',
    primaryBtnBg: '#059669',
    primaryBtnShadow: '#059669',
  },
  error: {
    icon: 'alert-circle-outline',
    iconColor: '#EF4444',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    badgeBg: '#FEE2E2',
    primaryBtnBg: '#0F172A',
    primaryBtnShadow: '#0F172A',
  },
  warning: {
    icon: 'alert-outline',
    iconColor: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    badgeBg: '#FEF3C7',
    primaryBtnBg: '#0F172A',
    primaryBtnShadow: '#0F172A',
  },
  info: {
    icon: 'information-outline',
    iconColor: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    badgeBg: '#DBEAFE',
    primaryBtnBg: '#0F172A',
    primaryBtnShadow: '#0F172A',
  },
};

export const AppAlertModal: React.FC = () => {
  const [config, setConfig] = useState<CustomAlertConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Declared before the effect that depends on it, and memoised on the two
  // stable Animated.Value refs.
  const handleDismiss = useCallback(
    (onPressCallback?: () => void) => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        setConfig(null);
        if (typeof onPressCallback === 'function') {
          onPressCallback();
        }
      });
    },
    [fadeAnim, scaleAnim],
  );

  useEffect(() => {
    const unsubscribe = subscribeAppAlert(newConfig => {
      if (newConfig) {
        setConfig(newConfig);
        setVisible(true);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 80,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        handleDismiss();
      }
    });

    return unsubscribe;
  }, [fadeAnim, scaleAnim, handleDismiss]);

  if (!visible || !config) {
    return null;
  }

  const alertType: AlertType = config.type || 'info';
  const variant = VARIANT_CONFIG[alertType] || VARIANT_CONFIG.info;
  const buttons: AlertButtonConfig[] =
    config.buttons && config.buttons.length > 0
      ? config.buttons
      : [{ text: 'OK', style: 'default' }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => {
        if (config.cancelable !== false) {
          handleDismiss();
        }
      }}>
      <TouchableWithoutFeedback
        onPress={() => {
          if (config.cancelable !== false) {
            handleDismiss();
          }
        }}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.card,
                { transform: [{ scale: scaleAnim }] },
              ]}>
              {/* Badge Icon */}
              <View style={[styles.badgeContainer, { backgroundColor: variant.badgeBg, borderColor: variant.borderColor }]}>
                <Icon name={variant.icon} size={32} color={variant.iconColor} />
              </View>

              {/* Title */}
              <Text style={styles.title}>{config.title}</Text>

              {/* Message */}
              {!!config.message && (
                <Text style={styles.message}>{config.message}</Text>
              )}

              {/* Action Buttons */}
              <View
                style={[
                  styles.buttonContainer,
                  buttons.length === 2 && styles.buttonContainerRow,
                ]}>
                {buttons.map((btn, index) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';
                  const isSingle = buttons.length === 1;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        isSingle && styles.buttonPrimarySingle,
                        buttons.length === 2 && styles.buttonHalf,
                        isCancel && styles.buttonCancel,
                        isDestructive && styles.buttonDestructive,
                        !isCancel && !isDestructive && [
                          styles.buttonPrimary,
                          {
                            backgroundColor: variant.primaryBtnBg,
                            shadowColor: variant.primaryBtnShadow,
                          },
                        ],
                      ]}
                      onPress={() => handleDismiss(btn.onPress)}
                      activeOpacity={0.8}>
                      <Text
                        style={[
                          styles.buttonText,
                          isCancel && styles.buttonTextCancel,
                          isDestructive && styles.buttonTextDestructive,
                          !isCancel && !isDestructive && styles.buttonTextPrimary,
                        ]}>
                        {btn.text || 'OK'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  badgeContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: tokens.light.textHeading,
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: spacing.sm,
  },
  message: {
    fontSize: typography.sizes.sm,
    color: tokens.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  buttonContainerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonHalf: {
    flex: 1,
  },
  buttonPrimarySingle: {
    width: '100%',
  },
  buttonPrimary: {
    backgroundColor: tokens.light.brandAction,
    elevation: 2,
    shadowColor: tokens.light.brandAction,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  buttonCancel: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  buttonDestructive: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  buttonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  buttonTextCancel: {
    color: '#475569',
  },
  buttonTextDestructive: {
    color: '#DC2626',
  },
});
