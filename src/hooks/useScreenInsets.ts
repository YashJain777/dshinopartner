/**
 * Bottom-edge spacing, in one place.
 *
 * Two different things sit at the bottom of this app and both have to clear
 * the Android system navigation — the three-button bar or the gesture pill:
 *
 *   - the floating tab bar, which is absolutely positioned and 64pt tall, so
 *     scrollable tab screens must pad past it or their last row is unreachable
 *   - sticky action bars on stack screens (swipe to start, open this job),
 *     which must sit above the system nav, not under it
 *
 * Devices with hardware buttons report a zero bottom inset, so both values
 * fall back to a deliberate gap rather than collapsing to nothing.
 */

import {Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

/** Mirrors `floatingContainer.height` in BottomTabBar. */
export const FLOATING_TAB_BAR_HEIGHT = 64;

/** The gap BottomTabBar leaves between itself and the system navigation. */
const tabBarOffset = (bottomInset: number): number =>
  bottomInset > 0 ? bottomInset + (Platform.OS === 'ios' ? 4 : 10) : 16;

export interface ScreenInsets {
  /** Raw bottom safe-area inset. */
  bottom: number;
  /**
   * Bottom padding for a scroll view on a tab screen, so content clears the
   * floating tab bar and the system navigation beneath it.
   */
  tabContentPadding: number;
  /**
   * Bottom padding for a sticky action bar on a stack screen (no tab bar).
   */
  stickyBarPadding: number;
  /**
   * Bottom padding for scroll content on a stack screen that has no sticky
   * bar of its own.
   */
  stackContentPadding: number;
}

export const useScreenInsets = (): ScreenInsets => {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom ?? 0;

  return {
    bottom,
    // Bar height + its offset from the system nav + breathing room.
    tabContentPadding: FLOATING_TAB_BAR_HEIGHT + tabBarOffset(bottom) + 12,
    stickyBarPadding: Math.max(bottom, 12) + 4,
    stackContentPadding: bottom + 24,
  };
};
