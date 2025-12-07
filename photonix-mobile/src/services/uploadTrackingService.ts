import AsyncStorage from '@react-native-async-storage/async-storage';

const UPLOADED_PHOTOS_KEY = '@photonix:uploaded_photos';
const UPLOADED_ALBUMS_KEY = '@photonix:uploaded_albums';

export interface UploadedPhoto {
  deviceId: string; // Device-specific photo identifier (URI or asset ID)
  serverPhotoId: number;
  uploadedAt: string;
  filename: string;
}

export interface UploadedAlbum {
  deviceAlbumId: string;
  serverAlbumId?: number; // If synced to server album
  uploadedAt: string;
  photoCount: number;
}

class UploadTrackingService {
  // Track uploaded photo
  async trackUploadedPhoto(deviceId: string, serverPhotoId: number, filename: string) {
    try {
      const uploaded = await this.getUploadedPhotos();
      const newPhoto: UploadedPhoto = {
        deviceId,
        serverPhotoId,
        uploadedAt: new Date().toISOString(),
        filename,
      };
      
      // Remove existing entry if any (update)
      const filtered = uploaded.filter(p => p.deviceId !== deviceId);
      filtered.push(newPhoto);
      
      await AsyncStorage.setItem(UPLOADED_PHOTOS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error tracking uploaded photo:', error);
    }
  }

  // Track multiple uploaded photos
  async trackUploadedPhotos(photos: Array<{deviceId: string; serverPhotoId: number; filename: string}>) {
    try {
      const uploaded = await this.getUploadedPhotos();
      const newPhotos: UploadedPhoto[] = photos.map(p => ({
        deviceId: p.deviceId,
        serverPhotoId: p.serverPhotoId,
        uploadedAt: new Date().toISOString(),
        filename: p.filename,
      }));
      
      // Merge with existing, avoiding duplicates
      const deviceIds = new Set(newPhotos.map(p => p.deviceId));
      const filtered = uploaded.filter(p => !deviceIds.has(p.deviceId));
      const merged = [...filtered, ...newPhotos];
      
      await AsyncStorage.setItem(UPLOADED_PHOTOS_KEY, JSON.stringify(merged));
    } catch (error) {
      console.error('Error tracking uploaded photos:', error);
    }
  }

  // Check if photo is uploaded
  async isPhotoUploaded(deviceId: string): Promise<boolean> {
    try {
      const uploaded = await this.getUploadedPhotos();
      return uploaded.some(p => p.deviceId === deviceId);
    } catch (error) {
      console.error('Error checking photo upload status:', error);
      return false;
    }
  }

  // Get uploaded photos
  async getUploadedPhotos(): Promise<UploadedPhoto[]> {
    try {
      const data = await AsyncStorage.getItem(UPLOADED_PHOTOS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting uploaded photos:', error);
      return [];
    }
  }

  // Get uploaded photo by device ID
  async getUploadedPhoto(deviceId: string): Promise<UploadedPhoto | null> {
    try {
      const uploaded = await this.getUploadedPhotos();
      return uploaded.find(p => p.deviceId === deviceId) || null;
    } catch (error) {
      console.error('Error getting uploaded photo:', error);
      return null;
    }
  }

  // Track uploaded album
  async trackUploadedAlbum(deviceAlbumId: string, serverAlbumId: number | undefined, photoCount: number) {
    try {
      const uploaded = await this.getUploadedAlbums();
      const newAlbum: UploadedAlbum = {
        deviceAlbumId,
        serverAlbumId,
        uploadedAt: new Date().toISOString(),
        photoCount,
      };
      
      const filtered = uploaded.filter(a => a.deviceAlbumId !== deviceAlbumId);
      filtered.push(newAlbum);
      
      await AsyncStorage.setItem(UPLOADED_ALBUMS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error tracking uploaded album:', error);
    }
  }

  // Check if album is uploaded
  async isAlbumUploaded(deviceAlbumId: string): Promise<boolean> {
    try {
      const uploaded = await this.getUploadedAlbums();
      return uploaded.some(a => a.deviceAlbumId === deviceAlbumId);
    } catch (error) {
      console.error('Error checking album upload status:', error);
      return false;
    }
  }

  // Get uploaded albums
  async getUploadedAlbums(): Promise<UploadedAlbum[]> {
    try {
      const data = await AsyncStorage.getItem(UPLOADED_ALBUMS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting uploaded albums:', error);
      return [];
    }
  }

  // Clear all tracking data (for testing/debugging)
  async clearAllTracking() {
    try {
      await AsyncStorage.removeItem(UPLOADED_PHOTOS_KEY);
      await AsyncStorage.removeItem(UPLOADED_ALBUMS_KEY);
    } catch (error) {
      console.error('Error clearing tracking data:', error);
    }
  }

  // Remove photo from tracking (if deleted from server)
  async removeUploadedPhoto(deviceId: string) {
    try {
      const uploaded = await this.getUploadedPhotos();
      const filtered = uploaded.filter(p => p.deviceId !== deviceId);
      await AsyncStorage.setItem(UPLOADED_PHOTOS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing uploaded photo:', error);
    }
  }

  // Remove album from tracking (if deleted from server)
  async removeUploadedAlbum(deviceAlbumId: string) {
    try {
      const uploaded = await this.getUploadedAlbums();
      const filtered = uploaded.filter(a => a.deviceAlbumId !== deviceAlbumId);
      await AsyncStorage.setItem(UPLOADED_ALBUMS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing uploaded album:', error);
    }
  }
}

export default new UploadTrackingService();

