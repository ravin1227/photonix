import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import PeopleScreen from '../screens/main/PeopleScreen';
import PersonDetailScreen from '../screens/main/PersonDetailScreen';

export type PeopleStackParamList = {
  PeopleList: undefined;
  PersonDetail: {
    personId: number;
    personName: string;
  };
};

const Stack = createNativeStackNavigator<PeopleStackParamList>();

export default function PeopleStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="PeopleList" component={PeopleScreen} />
      <Stack.Screen
        name="PersonDetail"
        component={PersonDetailScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
}

