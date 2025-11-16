import {Platform, Alert} from 'react-native';

class NotificationService {
  // Show notification when photos are uploaded in background
  async showUploadCompleteNotification(
    uploadedCount: number,
    failedCount: number,
    albumNames: string[]
  ): Promise<void> {
    try {
      const title = uploadedCount === 1 ? '1 photo uploaded' : `${uploadedCount} photos uploaded`;

      let message = '';
      if (albumNames.length === 1) {
        message = `From "${albumNames[0]}"`;
      } else if (albumNames.length === 2) {
        message = `From "${albumNames[0]}" and "${albumNames[1]}"`;
      } else {
        message = `From ${albumNames.length} albums`;
      }

      if (failedCount > 0) {
        message += ` • ${failedCount} failed`;
      }

      console.log('[NotificationService] Upload notification:', {title, message});

      // For now, just log (later can add react-native-push-notification)
      // In development, we can show an alert if app is in foreground
      if (__DEV__) {
        console.log(`[Notification] ${title}: ${message}`);
      }

      // TODO: Implement actual push notifications with react-native-push-notification
      // For now, this is just a placeholder that logs
    } catch (error) {
      console.error('[NotificationService] Error showing notification:', error);
    }
  }

  // Show notification when sync fails
  async showSyncFailedNotification(error: string): Promise<void> {
    console.error('[NotificationService] Sync failed:', error);
    // TODO: Implement actual notifications
  }
}

export default new NotificationService();
