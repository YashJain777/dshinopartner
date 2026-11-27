/**
 * Modern Floating Bottom Tab Bar Component
 * Ultra-modern, premium floating capsule navigation with micro-interactions, haptics & keyboard avoidance
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { ModernFloatingTabBarProps } from './BottomTabBar.types';

interface TabMeta {
  label: string;
  activeIcon: string;
  inactiveIcon: string;
}

const TAB_CONFIG: Record<string, TabMeta> = {
  Home: {
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  Jobs: {
    label: 'Jobs',
    activeIcon: 'calendar-month',
    inactiveIcon: 'calendar-month-outline',
  },
  Earnings: {
    label: 'Earnings',
    activeIcon: 'wallet',
    inactiveIcon: 'wallet-outline',
  },
  Performance: {
    label: 'Performance',
    activeIcon: 'chart-bar',
    inactiveIcon: 'chart-bar',
  },
  Profile: {
    label: 'Profile',
    activeIcon: 'account',
    inactiveIcon: 'account-outline',
  },
};

interface FloatingTabItemProps {
  route: any;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const FloatingTabItem: React.FC<FloatingTabItemProps> = ({
  route,
  isFocused,
  onPress,
  onLongPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const config = TAB_CONFIG[route.name] || {
    label: route.name,
    activeIcon: 'circle',
    inactiveIcon: 'circle-outline',
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={config.label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
      style={styles.tabButton}>
      <Animated.View
        style={[
          styles.tabContent,
          isFocused && styles.tabContentActive,
          { transform: [{ scale: scaleAnim }] },
        ]}>
        <Icon
          name={isFocused ? config.activeIcon : config.inactiveIcon}
          size={21}
          color={isFocused ? '#0F172A' : '#94A3B8'}
        />
        <Text
          numberOfLines={1}
          style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
          {config.label}
        </Text>
        {isFocused && <View style={styles.activeDot} />}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const ModernFloatingTabBar: React.FC<ModernFloatingTabBarProps> = ({
  state,
  descriptors: _descriptors,
  navigation,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: 40,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      },
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      },
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [fadeAnim, translateYAnim]);

  if (isKeyboardVisible && Platform.OS === 'android') {
    return null;
  }

  // Dynamic system navigation bar clearance:
  // - If device has system navigation bar (3 buttons) or gesture bar (insets.bottom > 0),
  //   float comfortably above it (+10 on Android, +4 on iOS) so it never overlaps or hides behind system buttons.
  // - If insets.bottom is 0 (hardware buttons or window bounded above nav bar), use a clean 16px floating offset.
  const bottomPosition =
    insets.bottom > 0
      ? insets.bottom + (Platform.OS === 'ios' ? 4 : 10)
      : 16;

  return (
    <Animated.View
      pointerEvents={isKeyboardVisible ? 'none' : 'auto'}
      style={[
        styles.floatingContainer,
        {
          bottom: bottomPosition,
          opacity: fadeAnim,
          transform: [{ translateY: translateYAnim }],
        },
        style,
      ]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <FloatingTabItem
            key={route.key}
            route={route}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </Animated.View>
  );
};

// Backwards compatibility alias
export const BottomTabBar = ModernFloatingTabBar;

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    // iOS shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    // Android elevation
    elevation: 10,
    zIndex: 999,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 14,
    minWidth: 48,
  },
  tabContentActive: {
    backgroundColor: '#F1F5F9', // Subtle luxury Slate Gray pill
  },
  tabLabel: {
    fontSize: 9.5,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A', // Midnight Slate Navy
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#059669', // Emerald accent dot
    marginTop: 2,
  },
});
