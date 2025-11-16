import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AlbumsScreen from '../screens/main/AlbumsScreen';
import AlbumDetailScreen from '../screens/main/AlbumDetailScreen';
import DeviceAlbumDetailScreen from '../screens/main/DeviceAlbumDetailScreen';
import PhotoViewerScreen from '../screens/main/PhotoViewerScreen';

export type AlbumsStackParamList = {
  AlbumsList: {
    deletedAlbumId?: number;
  } | undefined;
  AlbumDetail: {
    albumId: number;
    albumName: string;
  };
  DeviceAlbumDetail: {
    albumId: string;
    albumName: string;
  };
  PhotoViewer: {
    photoId?: number;
    localUri?: string;
    photoTitle?: string;
  };
};

const Stack = createNativeStackNavigator<AlbumsStackParamList>();

export default function AlbumsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="AlbumsList" component={AlbumsScreen} />
      <Stack.Screen
        name="AlbumDetail"
        component={AlbumDetailScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="DeviceAlbumDetail"
        component={DeviceAlbumDetailScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
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
    </Stack.Navigator>
  );
}

