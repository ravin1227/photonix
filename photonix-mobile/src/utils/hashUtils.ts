import CryptoJS from 'crypto-js';
import RNFS from 'react-native-fs';

/**
 * Calculate SHA-1 hash of a file
 * Used for pre-upload deduplication check
 * @param fileUri - File URI (file:// or ph://)
 * @param keepTempFile - If true, don't delete temp file (for ph:// URIs) - caller must clean up
 * @returns Object with hash and optional tempFilePath
 */
export async function calculateFileHash(
  fileUri: string,
  keepTempFile: boolean = false
): Promise<{hash: string; tempFilePath?: string}> {
  try {
    let filePath = fileUri;
    let tempFilePath: string | undefined;
    
    // Convert ph:// URIs to file:// URIs for iOS
    if (fileUri.startsWith('ph://')) {
      const fileExtension = fileUri.split('.').pop() || 'jpg';
      const tempFileName = `photonix_hash_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const destPath = `${RNFS.TemporaryDirectoryPath}/${tempFileName}`;
      await RNFS.copyAssetsFileIOS(fileUri, destPath, 0, 0);
      filePath = destPath;
      tempFilePath = destPath;
      
      // Read file data
      const fileData = await RNFS.readFile(filePath, 'base64');
      
      // Clean up temporary file unless caller wants to keep it
      if (!keepTempFile) {
        await RNFS.unlink(filePath).catch(() => {});
        tempFilePath = undefined;
      }
      
      // Calculate SHA-1 hash
      const hash = CryptoJS.SHA1(CryptoJS.enc.Base64.parse(fileData)).toString(CryptoJS.enc.Hex);
      return {hash, tempFilePath};
    } else {
      // For file:// URIs, remove the file:// prefix
      const cleanPath = fileUri.replace('file://', '');
      const fileData = await RNFS.readFile(cleanPath, 'base64');
      
      // Calculate SHA-1 hash
      const hash = CryptoJS.SHA1(CryptoJS.enc.Base64.parse(fileData)).toString(CryptoJS.enc.Hex);
      return {hash};
    }
  } catch (error) {
    console.error('[HashUtils] Error calculating hash:', error);
    throw error;
  }
}

/**
 * Calculate SHA-1 hashes for multiple files in parallel
 * @param fileUris - Array of file URIs
 * @param keepTempFiles - If true, keep temp files for ph:// URIs (caller must clean up)
 * @returns Array of objects with hash and optional tempFilePath (same order as input)
 */
export async function calculateFileHashes(
  fileUris: string[],
  keepTempFiles: boolean = true
): Promise<Array<{hash: string; tempFilePath?: string} | null>> {
  // Calculate hashes in parallel (but limit concurrency to avoid memory issues)
  const BATCH_SIZE = 5; // Process 5 files at a time
  const results: Array<{hash: string; tempFilePath?: string} | null> = [];
  
  for (let i = 0; i < fileUris.length; i += BATCH_SIZE) {
    const batch = fileUris.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(uri => calculateFileHash(uri, keepTempFiles).catch(error => {
        console.error(`[HashUtils] Failed to hash ${uri}:`, error);
        return null; // Return null for failed hashes
      }))
    );
    results.push(...batchResults);
  }
  
  return results;
}

