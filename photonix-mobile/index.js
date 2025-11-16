/**
 * @format
 */

// Import react-native-reanimated first to initialize worklets runtime
import 'react-native-reanimated';

import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import BackgroundFetch from 'react-native-background-fetch';

// Register headless task for background sync (Android only)
const BackgroundSyncHeadlessTask = async (event) => {
  const taskId = event.taskId;
  const isTimeout = event.timeout;

  if (isTimeout) {
    console.log('[BackgroundSync] Headless task timeout:', taskId);
    BackgroundFetch.finish(taskId);
    return;
  }

  console.log('[BackgroundSync] Headless task started:', taskId);

  try {
    // Import services dynamically to avoid issues during headless execution
    const albumSyncService = require('./src/services/albumSyncService').default;
    const notificationService = require('./src/services/notificationService').default;

    // Perform sync
    const results = await albumSyncService.syncAllAlbums();

    // Filter albums that had new photos
    const albumsWithNewPhotos = results.filter(r => r.newPhotosFound > 0);

    if (albumsWithNewPhotos.length > 0) {
      const totalUploaded = albumsWithNewPhotos.reduce((sum, r) => sum + r.uploaded, 0);
      const totalFailed = albumsWithNewPhotos.reduce((sum, r) => sum + r.failed, 0);

      console.log(`[BackgroundSync] Headless sync complete: ${totalUploaded} uploaded, ${totalFailed} failed`);

      // Show notification
      if (totalUploaded > 0) {
        await notificationService.showUploadCompleteNotification(
          totalUploaded,
          totalFailed,
          albumsWithNewPhotos.map(r => r.albumName)
        );
      }
    }
  } catch (error) {
    console.error('[BackgroundSync] Headless task error:', error);
  }

  BackgroundFetch.finish(taskId);
};

// Register the headless task
BackgroundFetch.registerHeadlessTask(BackgroundSyncHeadlessTask);

AppRegistry.registerComponent(appName, () => App);
