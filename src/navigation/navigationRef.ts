/**
 * Navigation Reference
 * Enables top-level navigation outside of React Components (e.g. Push Notification Handlers)
 */

import {createNavigationContainerRef} from '@react-navigation/native';
import {RootStackParamList} from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Safely navigate to a screen from outside a React component.
 * Checks if navigation container is mounted & ready first.
 */
export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName],
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params as any);
  } else {
    console.warn('[NavigationRef] Navigation requested before container was ready:', name);
  }
}
