import {CameraRoll, GetPhotosParams, PhotoIdentifier} from '@react-native-camera-roll/camera-roll';
import {Platform, PermissionsAndroid, Linking, Alert} from 'react-native';

export interface DevicePhoto {
  id: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
  timestamp: number;
  creationTime?: number;
  modificationTime?: number;
  type?: string;
}

export interface DeviceAlbum {
  id: string;
  name: string;
  photoCount: number;
  coverUri?: string;
}

class DevicePhotoService {
  private hasPermission: boolean | null = null;

  // Check if permission is granted
  async checkPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const apiLevel = Platform.Version as number;
        const permission = apiLevel >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

        const result = await PermissionsAndroid.check(permission);
        this.hasPermission = result;
        return result;
      } catch (err) {
        console.error('[DevicePhotoService] Permission check error:', err);
        return false;
      }
    } else {
      // iOS: CameraRoll handles permissions automatically
      // Just return true - permission request happens on first CameraRoll.getPhotos() call
      console.log('[DevicePhotoService] iOS: Assuming permission granted (handled by CameraRoll)');
      return true;
    }
  }

  // Show dialog to open app settings
  showSettingsDialog(): void {
    Alert.alert(
      'Photo Library Access Required',
      'Photonix needs access to your photos to display and upload them. Please enable photo library access in Settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ],
    );
  }

  // Request photo library permission
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        // Android 13+ (API 33+) uses READ_MEDIA_IMAGES
        // Older versions use READ_EXTERNAL_STORAGE
        const apiLevel = Platform.Version as number;
        const permission = apiLevel >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

        console.log(`[DevicePhotoService] Requesting permission: ${permission} (API ${apiLevel})`);

        const granted = await PermissionsAndroid.request(
          permission,
          {
            title: 'Photo Library Access',
            message: 'Photonix needs access to your photos to display and upload them',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Deny',
            buttonPositive: 'Allow',
          },
        );

        console.log(`[DevicePhotoService] Permission result: ${granted}`);
        this.hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        return this.hasPermission;
      } catch (err) {
        console.error('[DevicePhotoService] Permission request error:', err);
        this.hasPermission = false;
        return false;
      }
    } else {
      // iOS: CameraRoll will request permission automatically on first access
      // Just assume permission is granted - CameraRoll.getPhotos() will handle it
      console.log('[DevicePhotoService] iOS: Permissions handled by CameraRoll automatically');
      this.hasPermission = true;
      return true;
    }
  }

  // Get device photos with pagination
  async getPhotos(
    first: number = 100,
    after?: string,
    groupTypes?: string,
  ): Promise<{photos: DevicePhoto[]; endCursor?: string; hasNextPage: boolean}> {
    try {
      // Request permission if not already granted
      if (this.hasPermission === null || this.hasPermission === false) {
        const granted = await this.requestPermission();
        if (!granted) {
          throw new Error('Photo library permission denied');
        }
      }

      const params: GetPhotosParams = {
        first,
        assetType: 'Photos',
        groupTypes: groupTypes || 'All',
      };

      if (after) {
        params.after = after;
      }

      const result = await CameraRoll.getPhotos(params);

      const photos: DevicePhoto[] = result.edges.map((edge: PhotoIdentifier) => {
        const asset = edge.node;
        return {
          id: asset.image.uri,
          uri: asset.image.uri,
          filename: asset.image.filename || `photo_${asset.image.uri.split('/').pop()}`,
          width: asset.image.width,
          height: asset.image.height,
          timestamp: asset.timestamp * 1000, // Convert to milliseconds
          creationTime: asset.timestamp * 1000,
          modificationTime: asset.modificationTime ? asset.modificationTime * 1000 : undefined,
          type: asset.type,
        };
      });

      return {
        photos,
        endCursor: result.page_info.end_cursor,
        hasNextPage: result.page_info.has_next_page,
      };
    } catch (error: any) {
      console.error('Error getting device photos:', error);
      throw new Error(error.message || 'Failed to get device photos');
    }
  }

  // Get photos grouped by date
  async getPhotosByDate(): Promise<{[date: string]: DevicePhoto[]}> {
    try {
      const {photos} = await this.getPhotos(1000); // Get up to 1000 photos
      
      const grouped: {[date: string]: DevicePhoto[]} = {};
      
      photos.forEach(photo => {
        const date = new Date(photo.timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(photo);
      });

      // Sort photos within each date (newest first)
      Object.keys(grouped).forEach(date => {
        grouped[date].sort((a, b) => b.timestamp - a.timestamp);
      });

      return grouped;
    } catch (error: any) {
      console.error('Error getting photos by date:', error);
      throw error;
    }
  }

  // Get device albums
  async getAlbums(): Promise<DeviceAlbum[]> {
    try {
      // Request permission if not already granted
      if (this.hasPermission === null || this.hasPermission === false) {
        const granted = await this.requestPermission();
        if (!granted) {
          throw new Error('Photo library permission denied');
        }
      }

      if (Platform.OS === 'ios') {
        // iOS supports album fetching
        const albums = await CameraRoll.getAlbums({assetType: 'Photos'});
        
        // Get cover photo for each album
        const albumsWithCovers = await Promise.all(
          albums.map(async (album) => {
            let coverUri: string | undefined;
            try {
              // Get first photo from album as cover
              const photos = await CameraRoll.getPhotos({
                first: 1,
                assetType: 'Photos',
                groupName: album.title,
              });
              if (photos.edges.length > 0) {
                coverUri = photos.edges[0].node.image.uri;
              }
            } catch (error) {
              console.warn(`Failed to get cover for album ${album.title}:`, error);
            }
            
            return {
              id: album.title,
              name: album.title,
              photoCount: album.count,
              coverUri,
            };
          })
        );
        
        return albumsWithCovers;
      } else {
        // Android: CameraRoll.getAlbums() is available but may have limited support
        // Try to get albums, fallback to empty array if not supported
        try {
          const albums = await CameraRoll.getAlbums({assetType: 'Photos'});
          
          const albumsWithCovers = await Promise.all(
            albums.map(async (album) => {
              let coverUri: string | undefined;
              try {
                // Get first photo from album as cover
                const photos = await CameraRoll.getPhotos({
                  first: 1,
                  assetType: 'Photos',
                  groupName: album.title,
                });
                if (photos.edges.length > 0) {
                  coverUri = photos.edges[0].node.image.uri;
                }
              } catch (error) {
                console.warn(`Failed to get cover for album ${album.title}:`, error);
              }
              
              return {
                id: album.title,
                name: album.title,
                photoCount: album.count,
                coverUri,
              };
            })
          );
          
          return albumsWithCovers;
        } catch (error) {
          // Android may not support getAlbums, return empty array
          console.warn('Android album fetching not supported:', error);
          return [];
        }
      }
    } catch (error: any) {
      console.error('Error getting device albums:', error);
      return [];
    }
  }

  // Get photos from a specific device album
  async getAlbumPhotos(albumName: string, first: number = 100, after?: string): Promise<{photos: DevicePhoto[]; endCursor?: string; hasNextPage: boolean}> {
    try {
      // Request permission if not already granted
      if (this.hasPermission === null || this.hasPermission === false) {
        const granted = await this.requestPermission();
        if (!granted) {
          throw new Error('Photo library permission denied');
        }
      }

      const params: GetPhotosParams = {
        first,
        assetType: 'Photos',
        groupName: albumName,
      };

      if (after) {
        params.after = after;
      }

      const result = await CameraRoll.getPhotos(params);

      const photos: DevicePhoto[] = result.edges.map((edge: PhotoIdentifier) => {
        const asset = edge.node;
        return {
          id: asset.image.uri,
          uri: asset.image.uri,
          filename: asset.image.filename || `photo_${asset.image.uri.split('/').pop()}`,
          width: asset.image.width,
          height: asset.image.height,
          timestamp: asset.timestamp * 1000,
          creationTime: asset.timestamp * 1000,
          modificationTime: asset.modificationTime ? asset.modificationTime * 1000 : undefined,
          type: asset.type,
        };
      });

      return {
        photos,
        endCursor: result.page_info.end_cursor,
        hasNextPage: result.page_info.has_next_page,
      };
    } catch (error: any) {
      console.error('Error getting album photos:', error);
      throw new Error(error.message || 'Failed to get album photos');
    }
  }

  // Get photos for a specific date range
  async getPhotosForDateRange(startDate: Date, endDate: Date): Promise<DevicePhoto[]> {
    try {
      const {photos} = await this.getPhotos(1000);
      
      return photos.filter(photo => {
        const photoDate = new Date(photo.timestamp);
        return photoDate >= startDate && photoDate <= endDate;
      });
    } catch (error: any) {
      console.error('Error getting photos for date range:', error);
      throw error;
    }
  }
}

export default new DevicePhotoService();

