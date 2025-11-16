import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from '../screens/main/HomeScreen';
import PhotoViewerScreen from '../screens/main/PhotoViewerScreen';
import AlbumDetailScreen from '../screens/main/AlbumDetailScreen';

export type HomeStackParamList = {
  HomeList: {
    deletedPhotoId?: number;
    deletedAlbumId?: number;
  } | undefined;
  PhotoViewer: {
    photoId?: number; // Server photo ID
    localUri?: string; // Local device photo URI
    photoTitle?: string; // Optional title for local photos
  };
  AlbumDetail: {
    albumId: number;
    albumName: string;
  };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="HomeList" component={HomeScreen} />
      <Stack.Screen
        name="PhotoViewer"
        component={PhotoViewerScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'fade',
          // Hide bottom tab bar when viewing photos
          tabBarStyle: {display: 'none'},
        }}
      />
      <Stack.Screen
        name="AlbumDetail"
        component={AlbumDetailScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
}

