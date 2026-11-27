/**
 * Modern Floating Bottom Tab Bar Types
 */

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleProp, ViewStyle } from 'react-native';

export type TabRoute = 'home' | 'jobs' | 'earnings' | 'performance' | 'profile';

export interface TabConfig {
  route: TabRoute;
  icon: string;
  label: string;
}

export type ModernFloatingTabBarProps = BottomTabBarProps & {
  style?: StyleProp<ViewStyle>;
};
