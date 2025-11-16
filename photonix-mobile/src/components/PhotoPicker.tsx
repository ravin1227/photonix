import React from 'react';
import {launchImageLibrary, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import {Alert} from 'react-native';

export interface SelectedPhoto {
  uri: string;
  type: string;
  name: string;
  fileSize?: number;
  width?: number;
  height?: number;
  id?: string; // Device-specific photo ID for tracking
  timestamp?: number; // Photo timestamp for matching
}

interface PhotoPickerOptions {
  maxSelection?: number;
  mediaType?: MediaType;
  includeBase64?: boolean;
  dateFilter?: {
    startDate: Date;
    endDate: Date;
  };
}

export const pickPhotos = (
  options: PhotoPickerOptions = {},
): Promise<SelectedPhoto[]> => {
  return new Promise((resolve, reject) => {
    const {
      maxSelection = 50,
      mediaType = 'photo',
      includeBase64 = false,
    } = options;

    launchImageLibrary(
      {
        mediaType: mediaType,
        selectionLimit: maxSelection,
        includeBase64: includeBase64,
        quality: 0.8, // Compress images slightly for faster upload
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel) {
          resolve([]);
          return;
        }

        if (response.errorCode) {
          let errorMessage = 'Failed to pick images';
          switch (response.errorCode) {
            case 'camera_unavailable':
              errorMessage = 'Camera is not available';
              break;
            case 'permission':
              errorMessage = 'Permission to access photos was denied';
              break;
            case 'others':
              errorMessage = response.errorMessage || errorMessage;
              break;
          }
          reject(new Error(errorMessage));
          return;
        }

        if (!response.assets || response.assets.length === 0) {
          resolve([]);
          return;
        }

        const selectedPhotos: SelectedPhoto[] = response.assets.map((asset, index) => ({
          uri: asset.uri || '',
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `photo_${Date.now()}_${index}.jpg`,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height,
          id: asset.id || asset.uri || `photo_${Date.now()}_${index}`, // Use asset ID if available, fallback to URI
          timestamp: asset.timestamp || Date.now(),
        }));

        resolve(selectedPhotos);
      },
    );
  });
};

export const pickSinglePhoto = (): Promise<SelectedPhoto | null> => {
  return new Promise((resolve, reject) => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel) {
          resolve(null);
          return;
        }

        if (response.errorCode) {
          let errorMessage = 'Failed to pick image';
          switch (response.errorCode) {
            case 'camera_unavailable':
              errorMessage = 'Camera is not available';
              break;
            case 'permission':
              errorMessage = 'Permission to access photos was denied';
              break;
            case 'others':
              errorMessage = response.errorMessage || errorMessage;
              break;
          }
          reject(new Error(errorMessage));
          return;
        }

        if (!response.assets || response.assets.length === 0) {
          resolve(null);
          return;
        }

        const asset = response.assets[0];
        resolve({
          uri: asset.uri || '',
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height,
          id: asset.id || asset.uri || `photo_${Date.now()}`,
          timestamp: asset.timestamp || Date.now(),
        });
      },
    );
  });
};

