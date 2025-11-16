import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import HomeStackNavigator from './HomeStackNavigator';
import AlbumsStackNavigator from './AlbumsStackNavigator';
import PeopleStackNavigator from './PeopleStackNavigator';
import SearchScreen from '../screens/main/SearchScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Albums: undefined;
  People: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#666666',
      }}>
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Photos',
          tabBarIcon: ({color, size}) => (
            <Icon name="images-outline" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({color, size}) => (
            <Icon name="search-outline" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Albums"
        component={AlbumsStackNavigator}
        options={{
          tabBarLabel: 'Albums',
          tabBarIcon: ({color, size}) => (
            <Icon name="albums-outline" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="People"
        component={PeopleStackNavigator}
        options={{
          tabBarLabel: 'People',
          tabBarIcon: ({color, size}) => (
            <Icon name="people-outline" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({color, size}) => (
            <Icon name="settings-outline" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

