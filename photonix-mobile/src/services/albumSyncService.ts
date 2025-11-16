import AsyncStorage from '@react-native-async-storage/async-storage';
import devicePhotoService, {DevicePhoto} from './devicePhotoService';
import uploadTrackingService from './uploadTrackingService';
import photoService from './photoService';

const SYNC_ALBUMS_KEY = 'sync_albums';
const LAST_SYNC_KEY = 'last_sync';
const ALBUM_PHOTO_COUNTS_KEY = 'album_photo_counts';

export interface SyncAlbum {
  albumId: string; // Device album ID
  albumName: string;
  enabled: boolean;
  lastSyncedAt: number;
  photoCount: number; // Number of photos at last sync
}

export interface SyncResult {
  albumName: string;
  newPhotosFound: number;
  uploaded: number;
  failed: number;
  skipped: number; // Already uploaded
}

class AlbumSyncService {
  // Get all sync-enabled albums
  async getSyncAlbums(): Promise<SyncAlbum[]> {
    try {
      const data = await AsyncStorage.getItem(SYNC_ALBUMS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting sync albums:', error);
      return [];
    }
  }

  // Check if an album is sync-enabled
  async isAlbumSynced(albumId: string): Promise<boolean> {
    const syncAlbums = await this.getSyncAlbums();
    const album = syncAlbums.find(a => a.albumId === albumId);
    return album?.enabled || false;
  }

  // Enable sync for an album
  async enableSync(albumId: string, albumName: string): Promise<void> {
    try {
      const syncAlbums = await this.getSyncAlbums();
      const existingIndex = syncAlbums.findIndex(a => a.albumId === albumId);

      // Get current photo count
      const result = await devicePhotoService.getAlbumPhotos(albumName, 1000);
      const photoCount = result.photos.length;

      if (existingIndex >= 0) {
        // Update existing
        syncAlbums[existingIndex] = {
          ...syncAlbums[existingIndex],
          enabled: true,
          albumName,
          photoCount,
          lastSyncedAt: Date.now(),
        };
      } else {
        // Add new
        syncAlbums.push({
          albumId,
          albumName,
          enabled: true,
          lastSyncedAt: Date.now(),
          photoCount,
        });
      }

      await AsyncStorage.setItem(SYNC_ALBUMS_KEY, JSON.stringify(syncAlbums));
    } catch (error) {
      console.error('Error enabling sync:', error);
      throw error;
    }
  }

  // Disable sync for an album
  async disableSync(albumId: string): Promise<void> {
    try {
      const syncAlbums = await this.getSyncAlbums();
      const updated = syncAlbums.map(album =>
        album.albumId === albumId
          ? {...album, enabled: false}
          : album
      );
      await AsyncStorage.setItem(SYNC_ALBUMS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error disabling sync:', error);
      throw error;
    }
  }

  // Remove album from sync list
  async removeSyncAlbum(albumId: string): Promise<void> {
    try {
      const syncAlbums = await this.getSyncAlbums();
      const filtered = syncAlbums.filter(a => a.albumId !== albumId);
      await AsyncStorage.setItem(SYNC_ALBUMS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing sync album:', error);
      throw error;
    }
  }

  // Detect new photos in a synced album
  async detectNewPhotos(albumName: string, lastKnownCount: number): Promise<DevicePhoto[]> {
    try {
      const result = await devicePhotoService.getAlbumPhotos(albumName, 1000);
      const currentPhotos = result.photos;

      if (currentPhotos.length <= lastKnownCount) {
        return []; // No new photos
      }

      // Sort by timestamp (newer first) and take only new ones
      const sortedPhotos = [...currentPhotos].sort((a, b) => b.timestamp - a.timestamp);
      const newPhotos = sortedPhotos.slice(0, currentPhotos.length - lastKnownCount);

      // Filter out already uploaded photos
      const unuploadedNew: DevicePhoto[] = [];
      for (const photo of newPhotos) {
        const isUploaded = await uploadTrackingService.isPhotoUploaded(photo.id);
        if (!isUploaded) {
          unuploadedNew.push(photo);
        }
      }

      return unuploadedNew;
    } catch (error) {
      console.error('Error detecting new photos:', error);
      return [];
    }
  }

  // Upload new photos from a synced album
  async syncAlbum(albumId: string, batchSize: number = 3): Promise<SyncResult> {
    try {
      const syncAlbums = await this.getSyncAlbums();
      const syncAlbum = syncAlbums.find(a => a.albumId === albumId && a.enabled);

      if (!syncAlbum) {
        throw new Error('Album is not enabled for sync');
      }

      // Detect new photos
      const newPhotos = await this.detectNewPhotos(
        syncAlbum.albumName,
        syncAlbum.photoCount
      );

      if (newPhotos.length === 0) {
        return {
          albumName: syncAlbum.albumName,
          newPhotosFound: 0,
          uploaded: 0,
          failed: 0,
          skipped: 0,
        };
      }

      // Upload new photos in batches
      let uploadedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < newPhotos.length; i += batchSize) {
        const batch = newPhotos.slice(i, i + batchSize);

        const batchPhotos = batch.map(photo => ({
          uri: photo.uri,
          type: 'image/jpeg',
          name: photo.filename,
          id: photo.id,
          timestamp: photo.timestamp,
        }));

        try {
          const uploadResponse = await photoService.uploadPhotos(batchPhotos);

          if (!uploadResponse.error && uploadResponse.data?.results) {
            const successful = uploadResponse.data.results.successful || [];
            const failed = uploadResponse.data.results.failed || [];

            // Track successful uploads
            if (successful.length > 0) {
              const trackingData = successful.map((result: any, index: number) => ({
                deviceId: batchPhotos[index].id || batchPhotos[index].uri,
                serverPhotoId: result.photo?.id || 0,
                filename: batchPhotos[index].name,
              })).filter((item: any) => item.serverPhotoId > 0);

              if (trackingData.length > 0) {
                await uploadTrackingService.trackUploadedPhotos(trackingData);
              }

              uploadedCount += successful.length;
            }

            failedCount += failed.length;
          } else {
            failedCount += batch.length;
          }
        } catch (error) {
          console.error('Error uploading batch:', error);
          failedCount += batch.length;
        }
      }

      // Update sync album with new photo count
      await this.updateAlbumPhotoCount(albumId, syncAlbum.albumName);

      return {
        albumName: syncAlbum.albumName,
        newPhotosFound: newPhotos.length,
        uploaded: uploadedCount,
        failed: failedCount,
        skipped: 0,
      };
    } catch (error) {
      console.error('Error syncing album:', error);
      throw error;
    }
  }

  // Sync all enabled albums
  async syncAllAlbums(onProgress?: (album: string, result: SyncResult) => void): Promise<SyncResult[]> {
    const syncAlbums = await this.getSyncAlbums();
    const enabledAlbums = syncAlbums.filter(a => a.enabled);

    const results: SyncResult[] = [];

    for (const album of enabledAlbums) {
      try {
        const result = await this.syncAlbum(album.albumId);
        results.push(result);

        if (onProgress) {
          onProgress(album.albumName, result);
        }
      } catch (error) {
        console.error(`Error syncing album ${album.albumName}:`, error);
        results.push({
          albumName: album.albumName,
          newPhotosFound: 0,
          uploaded: 0,
          failed: 0,
          skipped: 0,
        });
      }
    }

    // Update last sync time
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

    return results;
  }

  // Update album photo count
  async updateAlbumPhotoCount(albumId: string, albumName: string): Promise<void> {
    try {
      const syncAlbums = await this.getSyncAlbums();
      const result = await devicePhotoService.getAlbumPhotos(albumName, 1000);

      const updated = syncAlbums.map(album =>
        album.albumId === albumId
          ? {...album, photoCount: result.photos.length, lastSyncedAt: Date.now()}
          : album
      );

      await AsyncStorage.setItem(SYNC_ALBUMS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating photo count:', error);
    }
  }

  // Get last sync time
  async getLastSyncTime(): Promise<number | null> {
    try {
      const time = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return time ? parseInt(time, 10) : null;
    } catch (error) {
      return null;
    }
  }

  // Check if sync is needed (based on time interval)
  async shouldSync(intervalMinutes: number = 30): Promise<boolean> {
    const lastSync = await this.getLastSyncTime();
    if (!lastSync) return true;

    const now = Date.now();
    const elapsed = now - lastSync;
    const intervalMs = intervalMinutes * 60 * 1000;

    return elapsed >= intervalMs;
  }
}

export default new AlbumSyncService();
