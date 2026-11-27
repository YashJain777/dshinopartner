/**
 * Dashboard Screen Types
 */

import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {CompositeScreenProps} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {MainTabParamList, RootStackParamList} from '../../../../navigation/types';

export type DashboardScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export interface AgencyData {
  name: string;
  type: string;
  rating: number;
  badge: string;
  isOnline: boolean;
  logoUrl?: string;
}

export interface WalletData {
  balance: number;
  currency: string;
}

export interface TodaySummary {
  jobsCompleted: number;
  todaysEarnings: number;
  timeOnline: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  isUnread: boolean;
  type: 'job' | 'payment' | 'info';
}
