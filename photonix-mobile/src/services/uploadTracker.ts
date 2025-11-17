import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * UploadTracker keeps track of which local photos have been uploaded to the cloud
 * This helps prevent duplicates and provides sync status
 */
class UploadTracker {
  private STORAGE_KEY = '@photonix_uploaded_photos';
  private cache: Record<string, number> | null = null;

  /**
   * Mark a local photo as uploaded with its cloud ID
   * @param localUri - Local device URI (e.g., 'ph://...' on iOS, 'file://...' on Android)
   * @param cloudId - ID of the photo in the cloud/backend
   */
  async markAsUploaded(localUri: string, cloudId: number): Promise<void> {
    try {
      const uploaded = await this.getUploadedPhotos();
      uploaded[localUri] = cloudId;
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(uploaded));
      this.cache = uploaded; // Update cache
      console.log(`[UploadTracker] Marked ${localUri} as uploaded with ID ${cloudId}`);
    } catch (error) {
      console.error('[UploadTracker] Error marking as uploaded:', error);
    }
  }

  /**
   * Get all uploaded photos mapping (local URI -> cloud ID)
   */
  async getUploadedPhotos(): Promise<Record<string, number>> {
    try {
      // Return cached version if available
      if (this.cache !== null) {
        return this.cache;
      }

      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      const uploaded = data ? JSON.parse(data) : {};
      this.cache = uploaded; // Cache it
      return uploaded;
    } catch (error) {
      console.error('[UploadTracker] Error getting uploaded photos:', error);
      return {};
    }
  }

  /**
   * Check if a local photo has been uploaded
   * @param localUri - Local device URI
   * @returns Cloud ID if uploaded, null otherwise
   */
  async getCloudId(localUri: string): Promise<number | null> {
    const uploaded = await this.getUploadedPhotos();
    return uploaded[localUri] || null;
  }

  /**
   * Check if a local photo has been uploaded
   */
  async isUploaded(localUri: string): Promise<boolean> {
    const cloudId = await this.getCloudId(localUri);
    return cloudId !== null;
  }

  /**
   * Remove upload tracking for a photo (e.g., if cloud photo is deleted)
   * @param localUri - Local device URI
   */
  async removeUploadTracking(localUri: string): Promise<void> {
    try {
      const uploaded = await this.getUploadedPhotos();
      delete uploaded[localUri];
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(uploaded));
      this.cache = uploaded;
      console.log(`[UploadTracker] Removed tracking for ${localUri}`);
    } catch (error) {
      console.error('[UploadTracker] Error removing upload tracking:', error);
    }
  }

  /**
   * Clear all upload tracking (use with caution!)
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      this.cache = null;
      console.log('[UploadTracker] Cleared all upload tracking');
    } catch (error) {
      console.error('[UploadTracker] Error clearing upload tracking:', error);
    }
  }

  /**
   * Get statistics about uploaded photos
   */
  async getStats(): Promise<{totalTracked: number; cloudIds: number[]}> {
    const uploaded = await this.getUploadedPhotos();
    const cloudIds = Object.values(uploaded);
    return {
      totalTracked: cloudIds.length,
      cloudIds,
    };
  }
}

export default new UploadTracker();
