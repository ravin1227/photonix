import {CameraRoll, GetPhotosParams, PhotoIdentifier} from '@react-native-camera-roll/camera-roll';
import {Platform, PermissionsAndroid} from 'react-native';

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

  // Request photo library permission
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Photo Library Permission',
            message: 'Photonix needs access to your photos to display and upload them',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        this.hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        return this.hasPermission;
      } catch (err) {
        console.warn(err);
        this.hasPermission = false;
        return false;
      }
    } else {
      // iOS permissions are handled via Info.plist
      // CameraRoll will request permission automatically
      try {
        const hasPermission = await CameraRoll.hasMediaLibraryPermission();
        this.hasPermission = hasPermission;
        if (!hasPermission) {
          const result = await CameraRoll.requestMediaLibraryPermission();
          this.hasPermission = result === 'granted' || result === 'limited';
        }
        return this.hasPermission || false;
      } catch (error) {
        console.error('Error checking iOS permission:', error);
        return false;
      }
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

