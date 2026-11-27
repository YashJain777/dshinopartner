import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {MainTabParamList} from '../../../../navigation/types';

export interface ProfileScreenProps {
  navigation: NativeStackNavigationProp<MainTabParamList, 'Profile'>;
  route: RouteProp<MainTabParamList, 'Profile'>;
}
