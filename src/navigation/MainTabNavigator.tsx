/**
 * Main Tab Navigator
 * Bottom tab navigation for main app screens
 */

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {DashboardScreen} from '../modules/dashboard/screens/DashboardScreen';
import {RouteScreen} from '../modules/jobs/screens/RouteScreen';
import {ProfileScreen} from '../modules/profile/screens/ProfileScreen';
import {EarningsScreen} from '../modules/earnings/screens/EarningsScreen';
import {PerformanceScreen} from '../modules/performance/screens/PerformanceScreen';
import {ModernFloatingTabBar} from '../components/organisms/BottomTabBar';
import {MainTabParamList} from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={props => <ModernFloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tab.Screen name="Home" component={DashboardScreen} />
      {/* The Jobs tab is the day's route; a live job opens full-screen above
          the tabs via the ActiveJob stack route. */}
      <Tab.Screen name="Jobs" component={RouteScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Performance" component={PerformanceScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
