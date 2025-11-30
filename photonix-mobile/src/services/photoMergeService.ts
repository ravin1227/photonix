import {Photo} from './photoService';
import {CameraRoll, PhotoIdentifier} from '@react-native-camera-roll/camera-roll';
import {Platform} from 'react-native';
import uploadTracker from './uploadTracker';
import devicePhotoService from './devicePhotoService';

export interface LocalPhoto {
  uri: string;
  filename: string;
  timestamp: number; // Unix timestamp in seconds
  type: string;
  fileSize: number;
  width: number;
  height: number;
}

export interface MergedPhoto {
  id: string; // Unique ID: 'cloud_123' or 'local_abc'
  uri: string; // Display URI (cloud thumbnail or local uri)
  originalUri?: string; // Original local URI for uploads
  filename: string;
  capturedAt: Date;
  fileSize: number;
  width: number;
  height: number;
  isLocal: boolean; // Is photo on device
  isUploaded: boolean; // Is photo uploaded to cloud
  cloudId?: number; // Cloud photo ID if uploaded
  cloudData?: Photo; // Full cloud photo data
  syncStatus: 'uploaded' | 'pending' | 'local_only';
}

class PhotoMergeService {
  // Cache local photos to avoid re-reading from device every time
  private localPhotosCache: LocalPhoto[] | null = null;
  private cacheTimestamp: number = 0;
  private CACHE_DURATION = 60000; // Cache for 60 seconds

  /**
   * Get all photos from device camera roll (with caching and pagination)
   * Fetches ALL photos from device using pagination to handle large libraries
   */
  async getLocalPhotos(limit: number | null = null, forceRefresh: boolean = false): Promise<LocalPhoto[]> {
    try {
      // Return cached photos if available and not expired
      const now = Date.now();
      if (
        !forceRefresh &&
        this.localPhotosCache &&
        now - this.cacheTimestamp < this.CACHE_DURATION &&
        limit === null // Only use cache if fetching all photos
      ) {
        console.log('[PhotoMergeService] Returning cached local photos:', this.localPhotosCache.length);
        return this.localPhotosCache;
      }

      // IMPORTANT: Request permission before accessing photos
      console.log('[PhotoMergeService] Checking photo library permission...');
      const hasPermission = await devicePhotoService.checkPermission();
      if (!hasPermission) {
        console.log('[PhotoMergeService] Requesting photo library permission...');
        const granted = await devicePhotoService.requestPermission();
        if (!granted) {
          console.log('[PhotoMergeService] Permission denied, returning empty array');
          return [];
        }
      }

      console.log('[PhotoMergeService] Fetching local photos from device...');
      const allPhotos: LocalPhoto[] = [];
      const BATCH_SIZE = 1000; // Fetch 1000 photos per batch
      let after: string | undefined = undefined;
      let hasNextPage = true;
      let batchCount = 0;

      // Fetch all photos using pagination
      while (hasNextPage && (limit === null || allPhotos.length < limit)) {
        batchCount++;
        const currentBatchSize = limit && limit - allPhotos.length < BATCH_SIZE
          ? limit - allPhotos.length
          : BATCH_SIZE;

        const params: any = {
          first: currentBatchSize,
          assetType: 'Photos',
          include: ['filename', 'fileSize', 'imageSize'],
        };

        if (after) {
          params.after = after;
        }

        const result = await CameraRoll.getPhotos(params);

        const batchPhotos = result.edges.map((edge: PhotoIdentifier) => ({
          uri: edge.node.image.uri,
          filename: edge.node.image.filename || 'unknown.jpg',
          timestamp: edge.node.timestamp,
          type: edge.node.type,
          fileSize: edge.node.image.fileSize || 0,
          width: edge.node.image.width,
          height: edge.node.image.height,
        }));

        allPhotos.push(...batchPhotos);
        
        // Check if there are more photos
        hasNextPage = result.page_info.has_next_page;
        after = result.page_info.end_cursor;

        const progressPercent = limit 
          ? Math.round((allPhotos.length / limit) * 100)
          : Math.min(100, Math.round((allPhotos.length / 10000) * 100)); // Estimate for unlimited
        
        console.log(`[PhotoMergeService] Batch ${batchCount}: Fetched ${batchPhotos.length} photos (total: ${allPhotos.length}${limit ? `/${limit}` : ''})`);

        // Stop if we've reached the limit
        if (limit && allPhotos.length >= limit) {
          break;
        }
      }

      console.log(`[PhotoMergeService] ✅ Total photos fetched: ${allPhotos.length} in ${batchCount} batch(es)`);

      // Update cache only if fetching all photos (no limit)
      if (limit === null) {
        this.localPhotosCache = allPhotos;
        this.cacheTimestamp = now;
        console.log('[PhotoMergeService] Cached', allPhotos.length, 'local photos');
      }

      return allPhotos;
    } catch (error) {
      console.error('[PhotoMergeService] Error getting local photos:', error);
      return [];
    }
  }

  /**
   * Clear the local photos cache (call when user uploads new photos)
   */
  clearCache() {
    this.localPhotosCache = null;
    this.cacheTimestamp = 0;
    console.log('[PhotoMergeService] Cache cleared');
  }

  /**
   * Convert cloud photos to MergedPhoto format instantly (no merge)
   * Used for instant display before background merge completes
   */
  cloudPhotosToMerged(cloudPhotos: Photo[]): MergedPhoto[] {
    return cloudPhotos.map(photo => ({
      id: `cloud_${photo.id}`,
      uri: this.getCloudPhotoUri(photo),
      filename: photo.original_filename,
      capturedAt: new Date(photo.captured_at || photo.created_at),
      fileSize: photo.file_size,
      width: photo.width,
      height: photo.height,
      isLocal: false,
      isUploaded: true,
      cloudId: photo.id,
      cloudData: photo,
      syncStatus: 'uploaded' as const,
    }));
  }

  /**
   * Merge photos in background (non-blocking)
   * Returns a promise that resolves when merge is complete
   */
  async mergePhotosInBackground(
    cloudPhotos: Photo[],
    onComplete: (merged: MergedPhoto[]) => void
  ): Promise<void> {
    // Run merge in next tick to not block UI
    setTimeout(async () => {
      try {
        const merged = await this.mergePhotos(cloudPhotos);
        onComplete(merged);
      } catch (error) {
        console.error('[PhotoMergeService] Background merge error:', error);
        // On error, just use cloud photos
        onComplete(this.cloudPhotosToMerged(cloudPhotos));
      }
    }, 0);
  }

  /**
   * Create a deduplication key from photo metadata
   * This helps identify if a local photo is the same as a cloud photo
   */
  private createDeduplicationKey(
    filename: string,
    fileSize: number,
    timestamp: number,
  ): string {
    // Use filename + size + timestamp (rounded to day) as key
    const dateKey = new Date(timestamp * 1000).toISOString().split('T')[0];
    return `${filename}_${fileSize}_${dateKey}`;
  }

  /**
   * Check if local photo matches cloud photo
   */
  private isMatchingPhoto(local: LocalPhoto, cloud: Photo): boolean {
    // Match by filename and file size
    const filenameMatch = local.filename === cloud.original_filename;
    const sizeMatch = local.fileSize === cloud.file_size;

    // Check if timestamps are within 1 day (account for timezone differences)
    let timestampMatch = false;
    if (cloud.captured_at) {
      const cloudDate = new Date(cloud.captured_at).getTime();
      const localDate = local.timestamp * 1000;
      const diffDays = Math.abs(cloudDate - localDate) / (1000 * 60 * 60 * 24);
      timestampMatch = diffDays < 1;
    }

    // Consider it a match if filename + size match, OR if all three match
    return (filenameMatch && sizeMatch) || (filenameMatch && sizeMatch && timestampMatch);
  }

  /**
   * Merge local device photos with cloud photos into a unified timeline
   * Deduplicates based on filename, size, and capture date
   * Optimized to only process relevant local photos (date range matching)
   */
  async mergePhotos(cloudPhotos: Photo[]): Promise<MergedPhoto[]> {
    try {
    console.log(`[PhotoMergeService] Starting merge with ${cloudPhotos.length} cloud photos`);

      // If no cloud photos, just return all local photos
      if (!cloudPhotos || cloudPhotos.length === 0) {
        console.log('[PhotoMergeService] No cloud photos, loading ALL local photos');
        // Fetch ALL local photos (no limit) using pagination
        const allLocalPhotos = await this.getLocalPhotos(null);
        console.log(`[PhotoMergeService] Found ${allLocalPhotos.length} local photos`);

        return allLocalPhotos.map(localPhoto => ({
          id: `local_${localPhoto.uri}`,
          uri: localPhoto.uri,
          originalUri: localPhoto.uri,
          filename: localPhoto.filename,
          capturedAt: new Date(localPhoto.timestamp * 1000),
          fileSize: localPhoto.fileSize,
          width: localPhoto.width,
          height: localPhoto.height,
          isLocal: true,
          isUploaded: false,
          syncStatus: 'local_only' as const,
        })).sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
      }

    const merged: MergedPhoto[] = [];
      
      // Get date range from cloud photos to optimize local photo fetching
      const cloudDates = cloudPhotos
        .map(p => p.captured_at ? new Date(p.captured_at).getTime() : new Date(p.created_at).getTime())
        .filter(d => !isNaN(d));
      
      const minDate = cloudDates.length > 0 ? Math.min(...cloudDates) : 0;
      const maxDate = cloudDates.length > 0 ? Math.max(...cloudDates) : Date.now();
      
      // Get local photos (cached, so fast)
      // Fetch ALL local photos (no limit) using pagination to get all device photos
      const allLocalPhotos = await this.getLocalPhotos(null);
    const uploadedPhotos = await uploadTracker.getUploadedPhotos();

      // Use ALL local photos instead of filtering by date range
      // This ensures all device photos are shown in the timeline
      const relevantLocalPhotos = allLocalPhotos;

      console.log(`[PhotoMergeService] Found ${allLocalPhotos.length} total local photos to merge`);

    // Create a map of cloud photos for quick lookup
    const cloudPhotoMap = new Map<number, Photo>();
    cloudPhotos.forEach(photo => {
      cloudPhotoMap.set(photo.id, photo);
    });

    // Track which cloud photos we've matched to local photos
    const matchedCloudIds = new Set<number>();

      // Process relevant local photos first
      for (const localPhoto of relevantLocalPhotos) {
      // Check if this local photo has been uploaded (tracked locally)
      const cloudId = uploadedPhotos[localPhoto.uri];
      let matchedCloudPhoto: Photo | undefined;

      if (cloudId && cloudPhotoMap.has(cloudId)) {
        // We tracked this upload locally
        matchedCloudPhoto = cloudPhotoMap.get(cloudId);
        matchedCloudIds.add(cloudId);
      } else {
        // Try to find matching cloud photo by metadata
        for (const cloudPhoto of cloudPhotos) {
          if (!matchedCloudIds.has(cloudPhoto.id) && this.isMatchingPhoto(localPhoto, cloudPhoto)) {
            matchedCloudPhoto = cloudPhoto;
            matchedCloudIds.add(cloudPhoto.id);
            // Track this match for future
            await uploadTracker.markAsUploaded(localPhoto.uri, cloudPhoto.id);
            break;
          }
        }
      }

      if (matchedCloudPhoto) {
        // Photo exists both locally and in cloud (uploaded)
        merged.push({
          id: `cloud_${matchedCloudPhoto.id}`,
          uri: this.getCloudPhotoUri(matchedCloudPhoto),
          originalUri: localPhoto.uri,
          filename: matchedCloudPhoto.original_filename,
          capturedAt: new Date(matchedCloudPhoto.captured_at || matchedCloudPhoto.created_at),
          fileSize: matchedCloudPhoto.file_size,
          width: matchedCloudPhoto.width,
          height: matchedCloudPhoto.height,
          isLocal: true,
          isUploaded: true,
          cloudId: matchedCloudPhoto.id,
          cloudData: matchedCloudPhoto,
          syncStatus: 'uploaded',
        });
      } else {
        // Photo only exists locally (not uploaded)
        merged.push({
          id: `local_${localPhoto.uri}`,
          uri: localPhoto.uri,
          originalUri: localPhoto.uri,
          filename: localPhoto.filename,
          capturedAt: new Date(localPhoto.timestamp * 1000),
          fileSize: localPhoto.fileSize,
          width: localPhoto.width,
          height: localPhoto.height,
          isLocal: true,
          isUploaded: false,
          syncStatus: 'local_only',
        });
      }
    }

    // Add cloud-only photos (photos that don't exist on device)
    for (const cloudPhoto of cloudPhotos) {
      if (!matchedCloudIds.has(cloudPhoto.id)) {
        merged.push({
          id: `cloud_${cloudPhoto.id}`,
          uri: this.getCloudPhotoUri(cloudPhoto),
          filename: cloudPhoto.original_filename,
          capturedAt: new Date(cloudPhoto.captured_at || cloudPhoto.created_at),
          fileSize: cloudPhoto.file_size,
          width: cloudPhoto.width,
          height: cloudPhoto.height,
          isLocal: false,
          isUploaded: true,
          cloudId: cloudPhoto.id,
          cloudData: cloudPhoto,
          syncStatus: 'uploaded',
        });
      }
    }

    // Sort by capture date (newest first)
    merged.sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());

    console.log(`[PhotoMergeService] Merge complete: ${merged.length} total photos`);
    console.log(`[PhotoMergeService] Breakdown: ${merged.filter(p => p.syncStatus === 'uploaded').length} uploaded, ${merged.filter(p => p.syncStatus === 'local_only').length} local only`);

    return merged;
    } catch (error) {
      console.error('[PhotoMergeService] Error in mergePhotos:', error);
      // Return cloud photos only on error
      return this.cloudPhotosToMerged(cloudPhotos);
    }
  }

  /**
   * Get the best URI for displaying a cloud photo
   */
  getCloudPhotoUri(photo: Photo): string {
    // Use large thumbnail if available, fallback to medium, then small
    // Make sure URLs are absolute (include base URL if relative)
    const baseUrl = require('../config/api').API_CONFIG.BASE_URL.replace('/api/v1', '');
    
    if (photo.thumbnail_urls?.large) {
      const url = photo.thumbnail_urls.large;
      return url.startsWith('http') ? url : `${baseUrl}${url}`;
    }
    if (photo.thumbnail_urls?.medium) {
      const url = photo.thumbnail_urls.medium;
      return url.startsWith('http') ? url : `${baseUrl}${url}`;
    }
    if (photo.thumbnail_urls?.small) {
      const url = photo.thumbnail_urls.small;
      return url.startsWith('http') ? url : `${baseUrl}${url}`;
    }
    return '';
  }

  /**
   * Group photos by date for timeline display (like Google Photos)
   */
  groupPhotosByDate(photos: MergedPhoto[]): Map<string, MergedPhoto[]> {
    const groups = new Map<string, MergedPhoto[]>();

    photos.forEach(photo => {
      const dateKey = photo.capturedAt.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }

      groups.get(dateKey)!.push(photo);
    });

    return groups;
  }

  /**
   * Format date for display (e.g., "Today", "Yesterday", "March 15, 2024")
   */
  formatDateHeader(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time parts for comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      // Format as "March 15, 2024"
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  }
}

export default new PhotoMergeService();
