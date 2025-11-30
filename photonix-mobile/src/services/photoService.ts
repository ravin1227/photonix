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
  uploaded_by: {
    id: number;
    name: string;
  };
  is_mine: boolean;
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

  // Check which photos already exist on server (pre-upload deduplication)
  // Accepts array of SHA-1 hashes and returns existing hashes
  async checkBulkUpload(checksums: string[]) {
    try {
      if (!checksums || checksums.length === 0) {
        return {data: {existing_hashes: [], total_checked: 0, existing_count: 0, new_count: 0}};
      }

      // Batch check in chunks of 50 (backend limit)
      const BATCH_SIZE = 50;
      const allExistingHashes: string[] = [];

      for (let i = 0; i < checksums.length; i += BATCH_SIZE) {
        const batch = checksums.slice(i, i + BATCH_SIZE);
        const response = await apiService.post<{
          existing_hashes: string[];
          total_checked: number;
          existing_count: number;
          new_count: number;
        }>('/photos/check_bulk_upload', {checksums: batch});

        if (response.data?.existing_hashes) {
          allExistingHashes.push(...response.data.existing_hashes);
        }
      }

      // Also collect existing photo IDs
      const allExistingPhotoIds: Record<string, {id: number}> = {};
      
      for (let i = 0; i < checksums.length; i += BATCH_SIZE) {
        const batch = checksums.slice(i, i + BATCH_SIZE);
        const response = await apiService.post<{
          existing_hashes: string[];
          existing_photos: Record<string, {id: number}>;
          total_checked: number;
          existing_count: number;
          new_count: number;
        }>('/photos/check_bulk_upload', {checksums: batch});

        if (response.data?.existing_photos) {
          Object.assign(allExistingPhotoIds, response.data.existing_photos);
        }
      }

      return {
        data: {
          existing_hashes: allExistingHashes,
          existing_photos: allExistingPhotoIds,
          total_checked: checksums.length,
          existing_count: allExistingHashes.length,
          new_count: checksums.length - allExistingHashes.length,
        },
      };
    } catch (error: any) {
      console.error('[PhotoService] checkBulkUpload error:', error);
      return {
        error: error.message || 'Failed to check bulk upload',
        data: {existing_hashes: [], total_checked: 0, existing_count: 0, new_count: 0},
      };
    }
  }

  // Upload single photo
  async uploadPhoto(file: {uri: string; type: string; name: string}, capturedAt?: string) {
    return apiService.upload<PhotoUploadResponse>('/photos', file, {captured_at: capturedAt});
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

