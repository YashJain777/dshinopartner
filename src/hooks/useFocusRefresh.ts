/**
 * Refetch when a screen is actually being looked at.
 *
 * Every data hook in this app fetched once on mount and then sat still. Only
 * the live job polled. So when the agency cancelled a booking, or the
 * partner finished one, the Jobs tab and the dashboard kept showing the old
 * state until the partner pulled to refresh or restarted the app — they had
 * no way to know the screen was stale, which is the worst version of this.
 *
 * This covers the two moments that matter without a socket connection:
 *
 *   - returning to a screen (switching tabs, going back from a job)
 *   - bringing the app back from the background
 *
 * and, where a screen asks for it, a slow poll WHILE IT IS FOCUSED. Focused
 * is the important word: a background timer on every screen would keep the
 * radio awake and drain a battery that has to last a full shift.
 *
 * The first focus is skipped, because the hook that owns the data has just
 * fetched on mount and a second identical request helps nobody.
 */

import {useCallback, useRef} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

export interface FocusRefreshOptions {
  /** Poll every N ms while focused. Omit for focus-only refreshing. */
  intervalMs?: number;
  /** Set false to suspend (e.g. nothing to watch yet). Default true. */
  enabled?: boolean;
}

export const useFocusRefresh = (
  refresh: () => void | Promise<void>,
  {intervalMs, enabled = true}: FocusRefreshOptions = {},
): void => {
  // Kept in a ref so a refresh identity that changes every render does not
  // restart the interval on every render.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const hasFocusedOnce = useRef(false);

  const run = useCallback(() => {
    Promise.resolve(refreshRef.current()).catch(() => {
      // A failed background refresh must not crash the screen; the hook that
      // owns the data surfaces its own error state.
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return;
      }

      if (hasFocusedOnce.current) {
        run();
      } else {
        hasFocusedOnce.current = true;
      }

      const appStateRef = {current: AppState.currentState as AppStateStatus};
      const subscription = AppState.addEventListener('change', next => {
        if (appStateRef.current.match(/inactive|background/) && next === 'active') {
          run();
        }
        appStateRef.current = next;
      });

      const timer =
        intervalMs && intervalMs > 0
          ? setInterval(() => {
              if (AppState.currentState === 'active') {
                run();
              }
            }, intervalMs)
          : null;

      return () => {
        subscription.remove();
        if (timer) {
          clearInterval(timer);
        }
      };
    }, [enabled, intervalMs, run]),
  );
};
