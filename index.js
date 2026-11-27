/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { getMessaging } from '@react-native-firebase/messaging';
import { handleNotificationPayload } from './src/services/notification/notificationPayloadHandler';

// Background Message Handler for FCM
try {
  getMessaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[Background FCM] Received remote message:', remoteMessage);
    handleNotificationPayload(remoteMessage, false);
  });
} catch (err) {
  console.warn('[Background FCM] Failed to set background handler:', err);
}

AppRegistry.registerComponent(appName, () => App);
