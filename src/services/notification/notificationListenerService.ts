/**
 * FCM Notification Listener Service
 * Configures foreground, background tap, and cold start listeners for push notifications
 * Compatible with @react-native-firebase/messaging v26+ (getMessaging)
 */

import {getMessaging} from '@react-native-firebase/messaging';
import {handleNotificationPayload} from './notificationPayloadHandler';
import {registerDeviceForPush} from './registerDevice';
import {useAuthStore} from '../../store/auth.store';

let isListenerConfigured = false;

/**
 * Initialize FCM Notification Listeners
 */
export const setupNotificationListeners = () => {
  if (isListenerConfigured) return;

  try {
    const messagingInstance = getMessaging();

    // 1. Foreground Message Handler
    messagingInstance.onMessage(async (remoteMessage: any) => {
      console.log('[NotificationListener] Foreground Notification Received:', remoteMessage);
      handleNotificationPayload(remoteMessage, true);
    });

    // 2. Background Tap Handler (App open from background state via notification)
    messagingInstance.onNotificationOpenedApp((remoteMessage: any) => {
      console.log('[NotificationListener] Notification Tapped from Background:', remoteMessage);
      handleNotificationPayload(remoteMessage, false);
    });

    // 3. Cold Start / Killed State Tap Handler (App launched from killed state via notification)
    messagingInstance
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (remoteMessage) {
          console.log('[NotificationListener] Notification Tapped from Cold Start:', remoteMessage);
          handleNotificationPayload(remoteMessage, false);
        }
      })
      .catch((err: any) => {
        console.warn('[NotificationListener] Error checking initial notification:', err);
      });

    // 4. Token rotation. FCM issues a new token on reinstall, cleared app data
    //    and device restore. Without this the backend keeps the dead token and
    //    the partner silently stops receiving pushes until they log out and
    //    back in — which is why most partners had no live token on record.
    messagingInstance.onTokenRefresh(() => {
      if (!useAuthStore.getState().isAuthenticated) {
        return;
      }
      registerDeviceForPush().catch((err: unknown) => {
        console.warn('[NotificationListener] Token re-registration failed:', err);
      });
    });

    isListenerConfigured = true;
    console.log('[NotificationListener] FCM Listeners initialized successfully');
  } catch (error) {
    console.warn('[NotificationListener] Firebase Messaging listeners setup skipped:', error);
  }
};
