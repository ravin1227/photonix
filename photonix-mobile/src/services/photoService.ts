import apiService from './api';

export interface Photo {
  id: number;
  original_filename: string;
  format: string;
  file_size: number;
  width: number;
  height: number;
  captured_at: string | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  thumbnail_urls?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  created_at: string;
}

export interface PhotoDetail extends Photo {
  camera_make?: string;
  camera_model?: string;
  iso?: number;
  aperture?: number;
  shutter_speed?: string;
  focal_length?: number;
  latitude?: number;
  longitude?: number;
  tags: Array<{
    id: number;
    name: string;
    type: string;
  }>;
  albums: Array<{
    id: number;
    name: string;
  }>;
}

export interface PhotosResponse {
  photos: Photo[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

export interface PhotoUploadResponse {
  message: string;
  photo: Photo;
  results?: {
    successful: Array<{
      index: number;
      filename: string;
      photo: Photo;
    }>;
    failed: Array<{
      index: number;
      filename: string;
      errors: string[];
    }>;
  };
  summary?: {
    total: number;
    successful: number;
    failed: number;
  };
}

class PhotoService {
  // Get all photos with pagination
  async getPhotos(page: number = 1, perPage: number = 50) {
    return apiService.get<PhotosResponse>(
      `/photos?page=${page}&per_page=${perPage}`,
    );
  }

  // Get photo details
  async getPhoto(id: number) {
    return apiService.get<{photo: PhotoDetail}>(`/photos/${id}`);
  }

  // Upload single photo
  async uploadPhoto(file: {uri: string; type: string; name: string}) {
    return apiService.upload<PhotoUploadResponse>('/photos', file);
  }

  // Upload multiple photos (bulk upload)
  async uploadPhotos(files: Array<{uri: string; type: string; name: string}>) {
    try {
      console.log(`[PhotoService] Starting upload of ${files.length} photos`);
      const {getApiUrl} = require('../config/api');
      const url = getApiUrl('/photos');
      console.log(`[PhotoService] Upload URL: ${url}`);

      const formData = new FormData();

      // Append all photos to formData with 'photos[]' key for bulk upload
      // Rails expects 'photos[]' which becomes params[:photos] array
      files.forEach((file, index) => {
        console.log(`[PhotoService] Adding file ${index + 1}/${files.length}: ${file.name}`);
        formData.append('photos[]', {
          uri: file.uri,
          type: file.type || 'image/jpeg', // Ensure type is set
          name: file.name || `photo_${Date.now()}_${index}.jpg`, // Ensure name is set
        } as any);
      });

      const token = apiService.getToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('[PhotoService] Auth token present:', token.substring(0, 20) + '...');
      } else {
        console.warn('[PhotoService] No auth token found!');
      }
      // Don't set Content-Type header - let fetch set it automatically with boundary for FormData

      console.log('[PhotoService] Sending request...');
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });
      const duration = Date.now() - startTime;
      console.log(`[PhotoService] Response received in ${duration}ms, status: ${response.status}`);

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      console.log(`[PhotoService] Content-Type: ${contentType}, isJson: ${isJson}`);

      let data: any;
      if (isJson) {
        data = await response.json();
        console.log('[PhotoService] Response JSON:', JSON.stringify(data, null, 2));
      } else {
        data = await response.text();
        console.log('[PhotoService] Response text:', data);
      }

      if (!response.ok) {
        console.error('[PhotoService] Upload failed:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error || data.message,
          errors: data.errors,
        });
        return {
          error: data.error || data.message || `HTTP ${response.status}`,
          errors: data.errors,
          status: response.status,
          data: data,
        };
      }

      console.log('[PhotoService] Upload successful!');
      return {data, status: response.status};
    } catch (error: any) {
      console.error('[PhotoService] Upload exception:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      return {
        error: error.message || 'Network error occurred',
      };
    }
  }

  // Delete photo
  async deletePhoto(id: number) {
    return apiService.delete<{message: string}>(`/photos/${id}`);
  }

  // Get thumbnail URL (helper method)
  getThumbnailUrl(photo: Photo, size: 'small' | 'medium' | 'large' = 'medium'): string {
    // If thumbnail URL is relative, make it absolute
    const url = photo.thumbnail_urls[size];
    if (url.startsWith('http')) {
      return url;
    }
    // For now, return as-is. In production, prepend base URL
    return url;
  }
}

export default new PhotoService();

