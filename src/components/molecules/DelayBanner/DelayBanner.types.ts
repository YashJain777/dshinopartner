/**
 * Delay Banner Types
 */

import {StyleProp, ViewStyle} from 'react-native';
import {SlaState} from '../../../types/api.types';

export interface DelayBannerProps {
  /** From the booking endpoints; the backend evaluates the lateness policy. */
  slaState: SlaState;
  /** Minutes past the slot start, as the backend measured it. */
  minutesLate: number;
  /** True once the cron has sent the customer the running-late notice. */
  customerNotified: boolean;
  style?: StyleProp<ViewStyle>;
}
