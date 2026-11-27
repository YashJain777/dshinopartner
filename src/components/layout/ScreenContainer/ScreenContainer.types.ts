import {ReactNode, ReactElement} from 'react';
import {StyleProp, ViewStyle, RefreshControlProps} from 'react-native';
import {Edges} from 'react-native-safe-area-context';

export interface ScreenContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: Edges;
  backgroundColor?: string;
  scrollable?: boolean;
  showsVerticalScrollIndicator?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
  testID?: string;
}
