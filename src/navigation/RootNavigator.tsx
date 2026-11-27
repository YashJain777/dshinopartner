/**
 * Root Navigator
 * Main navigation stack for the app
 */

import React, {useState, useEffect} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {MainTabNavigator} from './MainTabNavigator';
import {LiveJobScreen} from '../modules/jobs/screens/LiveJobScreen';
import {JobHistoryScreen} from '../modules/jobs/screens/JobHistoryScreen';
import {BookingDetailsScreen} from '../modules/jobs/screens/BookingDetailsScreen';
import {TransactionsScreen} from '../modules/earnings/screens/TransactionsScreen';
import {NotificationsScreen} from '../modules/dashboard/screens/NotificationsScreen';
import {TicketListScreen} from '../modules/support/screens/TicketListScreen/TicketListScreen';
import {CreateTicketScreen} from '../modules/support/screens/CreateTicketScreen/CreateTicketScreen';
import {TicketDetailsScreen} from '../modules/support/screens/TicketDetailsScreen/TicketDetailsScreen';
import {ScheduleScreen} from '../modules/profile/screens/ScheduleScreen';
import {InventoryScreen} from '../modules/profile/screens/InventoryScreen';
import {JobTimelineScreen} from '../modules/jobs/screens/JobTimelineScreen';
import {PhotoEvidenceScreen} from '../modules/jobs/screens/PhotoEvidenceScreen';
import {SlotExpiredScreen} from '../modules/jobs/screens/SlotExpiredScreen';
import {GeofenceBlockedScreen} from '../modules/jobs/screens/GeofenceBlockedScreen';
import {CompleteJobScreen} from '../modules/jobs/screens/CompleteJobScreen';
import {JobSuccessScreen} from '../modules/jobs/screens/JobSuccessScreen';
import {SosConfirmScreen} from '../modules/jobs/screens/SosConfirmScreen';
import {KycOnboardingScreen} from '../modules/auth/screens/KycOnboardingScreen/KycOnboardingScreen';
import {getKycStatus} from '../services/api/kyc.api';
import {LoadingScreen} from '../components/molecules/LoadingScreen';
import {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const [kycLoading, setKycLoading] = useState(true);
  const [needsKyc, setNeedsKyc] = useState(false);

  const checkKyc = async () => {
    try {
      const res = await getKycStatus();
      // If the overall KYC status is NOT_STARTED (user hasn't uploaded documents)
      // or if they don't have an Aadhaar number, we prompt for KYC onboarding.
      if (res.overallKycStatus === 'NOT_STARTED' || !res.textDetails?.aadhaarNumber) {
        setNeedsKyc(true);
      } else {
        setNeedsKyc(false);
      }
    } catch (err) {
      console.warn('Failed to check KYC status in RootNavigator:', err);
    } finally {
      setKycLoading(false);
    }
  };

  useEffect(() => {
    checkKyc();
  }, []);

  if (kycLoading) {
    return <LoadingScreen message="Verifying status..." />;
  }

  if (needsKyc) {
    return <KycOnboardingScreen onComplete={() => setNeedsKyc(false)} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="ActiveJob" component={LiveJobScreen} />
      <Stack.Screen name="JobHistory" component={JobHistoryScreen} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
      <Stack.Screen name="Transactions" component={TransactionsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="SupportTickets" component={TicketListScreen} />
      <Stack.Screen name="CreateTicket" component={CreateTicketScreen} />
      <Stack.Screen name="TicketDetails" component={TicketDetailsScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="Inventory" component={InventoryScreen} />
      <Stack.Screen name="JobTimeline" component={JobTimelineScreen} />
      <Stack.Screen name="PhotoEvidence" component={PhotoEvidenceScreen} />
      <Stack.Screen name="SlotExpired" component={SlotExpiredScreen} />
      <Stack.Screen name="GeofenceBlocked" component={GeofenceBlockedScreen} />
      <Stack.Screen name="CompleteJob" component={CompleteJobScreen} />
      <Stack.Screen name="JobSuccess" component={JobSuccessScreen} />
      <Stack.Screen name="SosConfirm" component={SosConfirmScreen} />
    </Stack.Navigator>
  );
};
