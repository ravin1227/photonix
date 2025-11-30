import BackgroundFetch from 'react-native-background-fetch';
import {Platform} from 'react-native';
import albumSyncService, {SyncResult} from './albumSyncService';
import notificationService from './notificationService';

const BACKGROUND_SYNC_TASK_ID = 'com.photonix.background-sync';

class BackgroundSyncService {
  private isConfigured = false;

  // Configure background fetch
  async configure() {
    if (this.isConfigured) {
      console.log('[BackgroundSync] Already configured');
      return;
    }

    // iOS background fetch requires native AppDelegate setup
    // Skip configuration on iOS if not properly set up to avoid errors
    if (Platform.OS === 'ios') {
      console.log('[BackgroundSync] iOS background fetch requires native setup. Skipping configuration.');
      console.log('[BackgroundSync] To enable: Register background task in AppDelegate.swift');
      return;
    }

    try {
      console.log('[BackgroundSync] Configuring background sync...');

      const status = await BackgroundFetch.configure(
        {
          minimumFetchInterval: 15, // Check every 15 minutes
          stopOnTerminate: false, // Continue after app is terminated
          startOnBoot: true, // Start when device boots
          enableHeadless: true, // Allow headless execution
          requiresBatteryNotLow: false,
          requiresCharging: false,
          requiresDeviceIdle: false,
          requiresStorageNotLow: false,
        },
        async (taskId) => {
          console.log('[BackgroundSync] Task fired:', taskId);
          await this.performSync();
          BackgroundFetch.finish(taskId);
        },
        async (taskId) => {
          console.warn('[BackgroundSync] Task timeout:', taskId);
          BackgroundFetch.finish(taskId);
        }
      );

      console.log('[BackgroundSync] Status:', status);
      this.isConfigured = true;

      // Schedule the task
      await BackgroundFetch.scheduleTask({
        taskId: BACKGROUND_SYNC_TASK_ID,
        delay: 0, // Start immediately
        periodic: true,
        forceAlarmManager: true,
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('[BackgroundSync] Background sync configured successfully');
    } catch (error: any) {
      // Silently handle configuration errors (especially on iOS)
      // Background sync is not critical for app functionality
      if (error?.message?.includes('Background processing task was not registered')) {
        console.log('[BackgroundSync] Background sync not available (requires native setup)');
      } else {
        console.warn('[BackgroundSync] Configuration error (non-critical):', error?.message || error);
      }
    }
  }

  // Perform sync for all enabled albums
  async performSync(): Promise<void> {
    try {
      console.log('[BackgroundSync] Starting sync check...');

      const results = await albumSyncService.syncAllAlbums((albumName, result) => {
        console.log(`[BackgroundSync] Synced ${albumName}:`, result);
      });

      // Filter albums that had new photos
      const albumsWithNewPhotos = results.filter(r => r.newPhotosFound > 0);

      if (albumsWithNewPhotos.length > 0) {
        const totalUploaded = albumsWithNewPhotos.reduce((sum, r) => sum + r.uploaded, 0);
        const totalFailed = albumsWithNewPhotos.reduce((sum, r) => sum + r.failed, 0);

        console.log(`[BackgroundSync] Sync complete: ${totalUploaded} uploaded, ${totalFailed} failed`);

        // Show notification
        if (totalUploaded > 0) {
          await notificationService.showUploadCompleteNotification(
            totalUploaded,
            totalFailed,
            albumsWithNewPhotos.map(r => r.albumName)
          );
        }
      } else {
        console.log('[BackgroundSync] No new photos found in synced albums');
      }
    } catch (error) {
      console.error('[BackgroundSync] Sync error:', error);
    }
  }

  // Manually trigger sync (for testing)
  async triggerSync(): Promise<void> {
    console.log('[BackgroundSync] Manual sync triggered');
    await this.performSync();
  }

  // Stop background sync
  async stop(): Promise<void> {
    try {
      await BackgroundFetch.stop();
      this.isConfigured = false;
      console.log('[BackgroundSync] Stopped');
    } catch (error) {
      console.error('[BackgroundSync] Error stopping:', error);
    }
  }

  // Get current status
  async getStatus(): Promise<number> {
    return await BackgroundFetch.status();
  }
}

export default new BackgroundSyncService();
