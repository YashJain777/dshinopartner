import React, {useState, useEffect} from 'react';
import {StatusBar, Alert, useColorScheme} from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {SplashScreen} from './src/modules/onboarding/screens/SplashScreen';
import {AuthNavigator} from './src/navigation/AuthNavigator';
import {RootNavigator} from './src/navigation/RootNavigator';
import {useAuthStore} from './src/store/auth.store';
import {useAppGate} from './src/hooks/useAppGate';
import {AppGateScreen} from './src/components/molecules/AppGateScreen';
import {tokens} from './src/theme/tokens';

import {navigationRef} from './src/navigation/navigationRef';
import {setupNotificationListeners} from './src/services/notification';
import {InAppNotificationModal} from './src/components/molecules/InAppNotificationModal/InAppNotificationModal';
import {AppAlertModal} from './src/components/molecules/AppAlertModal';
import {showAppAlert} from './src/services/alert';
import {startPhotoQueue} from './src/services/upload/photoQueue';

// ─── Upgrade native Alert.alert to Dshino Ultra-Modern AppAlertModal ──────────
Alert.alert = (title: string, message?: string, buttons?: any[], options?: any) => {
  showAppAlert(title, message, buttons, options);
};

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const {isAuthenticated, loadStoredAuth} = useAuthStore();
  const {status: gateStatus, config: gateConfig, recheck} = useAppGate();

  /**
   * Every StatusBar here used to be hardcoded to dark icons on a white bar.
   * That left a white strip with invisible icons above every screen in dark
   * mode, and it was wrong even in light mode on the auth stack, which is
   * dark in both themes by design.
   */
  const isDark = useColorScheme() === 'dark';
  const t = isDark ? tokens.dark : tokens.light;

  // Without this the navigator's own background is white, so a dark-mode
  // screen transition flashes white between screens.
  const navTheme = isDark
    ? {...DarkTheme, colors: {...DarkTheme.colors, background: tokens.dark.surfaceContainer}}
    : {...DefaultTheme, colors: {...DefaultTheme.colors, background: tokens.light.surfaceContainer}};

  useEffect(() => {
    // Load stored authentication on app start
    loadStoredAuth();
    // Setup push notification listeners
    setupNotificationListeners();
    // Resume any evidence photos that were still queued when the app closed,
    // so they go up without the partner having to reopen the job.
    startPhotoQueue();
  }, [loadStoredAuth]);

  // Show splash screen first
  if (showSplash) {
    return (
      <SafeAreaProvider>
        {/* The splash is a light surface in both themes. */}
        <StatusBar barStyle="dark-content" backgroundColor={tokens.light.surface} />
        <SplashScreen
          onComplete={() => setShowSplash(false)}
          duration={3000} // 3 seconds
        />
      </SafeAreaProvider>
    );
  }

  // Block the app when this build is unsupported or the platform is down.
  // Checked after the splash so the gate never flashes over it, and before
  // auth so an unsupported build cannot even reach the login screen.
  if (gateStatus === 'UPDATE_REQUIRED' || gateStatus === 'MAINTENANCE') {
    return (
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={t.surface}
        />
        <AppGateScreen mode={gateStatus} config={gateConfig} onRetry={recheck} />
        <AppAlertModal />
      </SafeAreaProvider>
    );
  }

  // Show login stack if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={tokens.dark.surface} />
        <NavigationContainer theme={DarkTheme}>
          <AuthNavigator />
        </NavigationContainer>
        <InAppNotificationModal />
        <AppAlertModal />
      </SafeAreaProvider>
    );
  }

  // Show main app after authentication
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={t.surface}
      />
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>
      <InAppNotificationModal />
      <AppAlertModal />
    </SafeAreaProvider>
  );
}

export default App;
