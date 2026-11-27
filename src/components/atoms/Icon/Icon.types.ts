import {StyleProp, ViewStyle} from 'react-native';

export type IconName =
  | 'check'
  | 'close'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'arrowRight'
  | 'arrowUp'
  | 'arrowDown'
  | 'plus'
  | 'pin'
  | 'pinCheck'
  | 'pinOff'
  | 'navigation'
  | 'camera'
  | 'image'
  | 'lock'
  | 'clipboard'
  | 'wrench'
  | 'bell'
  | 'home'
  | 'briefcase'
  | 'wallet'
  | 'barChart'
  | 'user'
  | 'userOff'
  | 'userCheck'
  | 'phone'
  | 'mail'
  | 'alert'
  | 'info'
  | 'clock'
  | 'clockAlarm'
  | 'star'
  | 'box'
  | 'calendar'
  | 'pause'
  | 'truck'
  | 'shield'
  | 'document'
  | 'settings'
  | 'send'
  | 'flash'
  | 'car'
  | 'carOff'
  | 'map'
  | 'edit'
  | 'chat'
  | 'bank'
  | 'idCard'
  | 'bottle'
  | 'cloth'
  | 'brush'
  | 'tyre';

export interface IconProps {
  name: IconName;
  /** 20 and 24 are the two sizes the design uses. */
  size?: number;
  color?: string;
  /** Single stroke weight across the app. Only raise it for tiny ticks. */
  strokeWidth?: number;
  /** Fills the shape instead of stroking it (star ratings only). */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Decorative by default; pass a label when the icon is the only content. */
  accessibilityLabel?: string;
}
