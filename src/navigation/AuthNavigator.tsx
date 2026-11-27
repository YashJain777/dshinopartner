/**
 * Auth Navigator
 * Navigation stack for the authentication flow
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {LoginScreen} from '../modules/auth/screens/LoginScreen';
import {ForgotPasswordScreen} from '../modules/auth/screens/ForgotPasswordScreen';
import {ResetPasswordScreen} from '../modules/auth/screens/ResetPasswordScreen';
import {SignupScreen} from '../modules/auth/screens/SignupScreen';
import {AuthStackParamList} from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
};
