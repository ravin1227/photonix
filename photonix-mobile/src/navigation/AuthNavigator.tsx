import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import ConnectScreen from '../screens/auth/ConnectScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import PermissionsScreen from '../screens/auth/PermissionsScreen';
import QRScannerScreen from '../screens/auth/QRScannerScreen';

export type AuthStackParamList = {
  Welcome: undefined;
  Connect: undefined;
  Login: undefined;
  Permissions: undefined;
  QRScanner: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Connect" component={ConnectScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
    </Stack.Navigator>
  );
}

