/**
 * Root Navigator
 * Main navigation stack for the app
 */

import React, {useState, useEffect, useCallback} from 'react';
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

  /**
   * Decides between the KYC checklist and the app proper.
   *
   * The failure path used to swallow the error and fall through to the tabs.
   * For the partner this matters most to — one who has just registered, and
   * whose account the backend suspends until their documents are approved —
   * that meant landing on a Home tab where every request 403s: an app that
   * loads and then does nothing, with no explanation. The KYC screen is the
   * safe default, because it is the one screen such a partner can actually
   * use, and the only endpoints it needs are the ones that stay open to them.
   */
  const checkKyc = useCallback(async () => {
    try {
      const res = await getKycStatus();
      const approved = ['APPROVED', 'VERIFIED'].includes(
        String(res.overallKycStatus || '').toUpperCase(),
      );
      // Not started, no Aadhaar on file, or still under review — all of these
      // mean the partner belongs on the checklist, not in the tabs.
      setNeedsKyc(!approved || !res.textDetails?.aadhaarNumber);
    } catch (err) {
      console.warn('Failed to check KYC status in RootNavigator:', err);
      setNeedsKyc(true);
    } finally {
      setKycLoading(false);
    }
  }, []);

  useEffect(() => {
    checkKyc();
  }, [checkKyc]);

  if (kycLoading) {
    return <LoadingScreen message="Verifying status..." />;
  }

  if (needsKyc) {
    // Re-ask the server rather than assuming Done means approved. The
    // backend keeps a partner suspended until an admin signs off their
    // documents, so flipping this locally dropped them into tabs where every
    // request 403s — the Done button appeared to do nothing at all.
    return <KycOnboardingScreen onComplete={checkKyc} />;
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
