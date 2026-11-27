/**
 * In-App Notification ke liye designed Component
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import {
  subscribeInAppNotification,
  getNotificationPresentation,
  InAppNotificationConfig,
} from '../../../services/notification/inAppNotificationManager';
import { navigateForNotification } from '../../../services/notification/notificationNavigation';
import {tokens} from '../../../theme/tokens';

const { width } = Dimensions.get('window');

export const InAppNotificationModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<InAppNotificationConfig | null>(null);
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const unsubscribe = subscribeInAppNotification(newConfig => {
      setConfig(newConfig);
      setVisible(true);

      // Smooth Entrance Animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    });

    return unsubscribe;
  }, [fadeAnim, scaleAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setConfig(null);
    });
  };

  const presentation = getNotificationPresentation(config?.type);

  // Routes the partner to the screen that can actually show this notification.
  const handlePrimaryAction = () => {
    const { bookingId, type } = config || {};
    handleDismiss();
    // Let the dismiss animation finish before the screen changes.
    setTimeout(() => navigateForNotification({ type, bookingId }), 200);
  };

  if (!visible || !config) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleDismiss}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}>
          {/* Header Accent Bar */}
          <View style={[styles.accentBar, { backgroundColor: presentation.accent }]} />

          {/* Icon Badge & Tag */}
          <View style={styles.headerRow}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconEmoji}>{presentation.emoji}</Text>
            </View>
            <View style={styles.tagBadge}>
              <View style={[styles.liveDot, { backgroundColor: presentation.accent }]} />
              <Text style={[styles.tagText, { color: presentation.accent }]}>
                {presentation.tag}
              </Text>
            </View>
          </View>

          {/* Title & Description */}
          <View style={styles.contentContainer}>
            <Text style={styles.title}>
              {config.title || presentation.fallbackTitle}
            </Text>
            <Text style={styles.body}>
              {config.body || presentation.fallbackBody}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            {presentation.action !== 'NONE' && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: presentation.accent }]}
                activeOpacity={0.8}
                onPress={handlePrimaryAction}>
                <Text style={styles.primaryButtonText}>
                  {presentation.actionLabel}
                </Text>
                <Text style={styles.arrowIcon}>➔</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.7}
              onPress={handleDismiss}>
              <Text style={styles.secondaryButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: Math.min(width * 0.88, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    overflow: 'hidden',

    // Elevation & Shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: tokens.light.brandAction,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: tokens.light.brandContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD6C0',
  },
  iconEmoji: {
    fontSize: 26,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.light.brandAction,
    marginRight: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    color: tokens.light.brandInk,
    letterSpacing: 0.5,
  },
  contentContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    fontWeight: '400',
  },
  buttonGroup: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: tokens.light.brandAction,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: tokens.light.brandAction,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginRight: 6,
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});
