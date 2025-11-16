import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {AuthProvider} from './contexts/AuthContext';
import RootNavigator from './navigation/RootNavigator';
import backgroundSyncService from './services/backgroundSyncService';

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize background sync
    const initBackgroundSync = async () => {
      try {
        await backgroundSyncService.configure();
        console.log('[App] Background sync initialized');
      } catch (error) {
        console.error('[App] Failed to initialize background sync:', error);
      }
    };

    initBackgroundSync();
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;

