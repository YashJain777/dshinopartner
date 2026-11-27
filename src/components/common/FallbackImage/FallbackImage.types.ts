import {ImageProps, ImageSourcePropType, StyleProp, ImageStyle} from 'react-native';

export interface FallbackImageProps extends Omit<ImageProps, 'source'> {
  source?: ImageSourcePropType | {uri?: string | null} | null;
  fallbackSource?: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
}
