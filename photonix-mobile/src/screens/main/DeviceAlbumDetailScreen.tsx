import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import devicePhotoService, {DevicePhoto} from '../../services/devicePhotoService';
import {AlbumsStackParamList} from '../../navigation/AlbumsStackNavigator';
import {Dimensions} from 'react-native';
import photoService from '../../services/photoService';
import uploadTrackingService from '../../services/uploadTrackingService';
import albumSyncService from '../../services/albumSyncService';
import UploadProgressButton from '../../components/UploadProgressButton';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
// Calculate photo size for 4 columns:
// Container padding: 4 * 2 = 8
// Photo margins: 2 * 2 * 4 photos = 16
// Total: 8 + 16 = 24
const PHOTO_SIZE = (SCREEN_WIDTH - 24) / 4; // 4 columns

type DeviceAlbumDetailScreenRouteProp = RouteProp<
  AlbumsStackParamList,
  'DeviceAlbumDetail'
>;
type DeviceAlbumDetailScreenNavigationProp = NativeStackNavigationProp<
  AlbumsStackParamList,
  'DeviceAlbumDetail'
>;

export default function DeviceAlbumDetailScreen() {
  const route = useRoute<DeviceAlbumDetailScreenRouteProp>();
  const navigation = useNavigation<DeviceAlbumDetailScreenNavigationProp>();
  const {albumName, albumId} = route.params;

  const [photos, setPhotos] = useState<DevicePhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({uploaded: 0, total: 0});
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [uploadedPhotoIds, setUploadedPhotoIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPhotos();
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const enabled = await albumSyncService.isAlbumSynced(albumId);
      setIsSyncEnabled(enabled);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const loadPhotos = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      setError(null);
      if (refresh) {
        setIsRefreshing(true);
      } else if (pageNum === 1) {
        setIsLoading(true);
      }

      const result = await devicePhotoService.getAlbumPhotos(albumName, 50);

      if (refresh || pageNum === 1) {
        setPhotos(result.photos);
      } else {
        setPhotos(prev => [...prev, ...result.photos]);
      }

      setHasMore(result.hasNextPage);

      // Check upload status for all photos
      await checkUploadStatus(result.photos);
    } catch (err: any) {
      console.error('Error loading album photos:', err);
      setError(err.message || 'Failed to load photos');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const checkUploadStatus = async (photosToCheck: DevicePhoto[]) => {
    const newUploadedIds = new Set<string>();

    for (const photo of photosToCheck) {
      const isUploaded = await uploadTrackingService.isPhotoUploaded(photo.id);
      if (isUploaded) {
        newUploadedIds.add(photo.id);
      }
    }

    setUploadedPhotoIds(newUploadedIds);
  };

  const onRefresh = () => {
    setPage(1);
    loadPhotos(1, true);
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPhotos(nextPage);
    }
  };

  const handlePhotoPress = async (photo: DevicePhoto) => {
    // Prepare photo list for swipe navigation
    // Use cached uploadedPhotoIds to avoid multiple async calls
    const photoList = await Promise.all(
      photos.map(async (p) => {
        const isUploaded = uploadedPhotoIds.has(p.id);
        if (isUploaded) {
          const uploadedInfo = await uploadTrackingService.getUploadedPhoto(p.id);
          return {
            id: uploadedInfo?.serverPhotoId,
            cloudId: uploadedInfo?.serverPhotoId,
            localUri: p.uri,
            isLocal: true, // Device photos are always local
          };
        } else {
          return {
            id: undefined,
            cloudId: undefined,
            localUri: p.uri,
            isLocal: true,
          };
        }
      })
    );
    
    // Find current photo index
    const currentIndex = photos.findIndex(p => p.id === photo.id);
    
    // Check if photo is uploaded (use cached state)
    const isUploaded = uploadedPhotoIds.has(photo.id);
    if (isUploaded) {
      // Find server photo ID and navigate to server version
      const uploadedInfo = await uploadTrackingService.getUploadedPhoto(photo.id);
      if (uploadedInfo?.serverPhotoId) {
        navigation.navigate('PhotoViewer', {
          photoId: uploadedInfo.serverPhotoId,
          photoList,
          initialIndex: currentIndex >= 0 ? currentIndex : 0,
        });
      } else {
        // Fallback to local if server ID not found
        navigation.navigate('PhotoViewer', {
          localUri: photo.uri,
          photoTitle: photo.filename,
          photoList,
          initialIndex: currentIndex >= 0 ? currentIndex : 0,
        });
      }
    } else {
      // View local photo directly
      navigation.navigate('PhotoViewer', {
        localUri: photo.uri,
        photoTitle: photo.filename,
        photoList,
        initialIndex: currentIndex >= 0 ? currentIndex : 0,
      });
    }
  };

  const handleToggleSync = async () => {
    try {
      if (isSyncEnabled) {
        await albumSyncService.disableSync(albumId);
        setIsSyncEnabled(false);
        Alert.alert(
          'Sync Tracking Disabled',
          `"${albumName}" is no longer being tracked for new photos.`
        );
      } else {
        await albumSyncService.enableSync(albumId, albumName);
        setIsSyncEnabled(true);
        Alert.alert(
          'Sync Tracking Enabled',
          `"${albumName}" is now being tracked. Tap the sync button to detect and upload new photos added since now.`,
          [
            {text: 'OK', style: 'default'},
            {
              text: 'Sync Now',
              style: 'default',
              onPress: handleSyncNow,
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to toggle sync');
    }
  };

  const handleSyncNow = async () => {
    if (!isSyncEnabled) {
      Alert.alert('Info', 'Please enable sync first');
      return;
    }

    setIsUploading(true);
    try {
      const result = await albumSyncService.syncAlbum(albumId, 3);

      if (result.newPhotosFound === 0) {
        Alert.alert('Up to Date', 'No new photos found in this album');
      } else if (result.uploaded > 0) {
        Alert.alert(
          'Sync Complete',
          `Found ${result.newPhotosFound} new photo(s).\nUploaded: ${result.uploaded}\nFailed: ${result.failed}`
        );
        // Refresh the photo list and upload status
        await loadPhotos(1, true);
      } else {
        Alert.alert(
          'Sync Failed',
          `Found ${result.newPhotosFound} new photo(s) but upload failed. Please check your network connection.`
        );
      }
    } catch (error: any) {
      Alert.alert('Sync Error', error.message || 'Failed to sync album');
    } finally {
      setIsUploading(false);
    }
  };

  // Async batch upload function
  const uploadPhotosInBatches = async (
    photosToUpload: DevicePhoto[],
    batchSize: number = 3,
  ) => {
    console.log(`Starting batch upload for ${photosToUpload.length} photos`);
    let uploadedCount = 0;
    let failedCount = 0;
    const total = photosToUpload.length;

    // Sort photos from newer to older (by timestamp descending)
    const sortedPhotos = [...photosToUpload].sort((a, b) => b.timestamp - a.timestamp);

    // Filter out already uploaded photos
    console.log('Checking for already uploaded photos...');
    const unuploadedPhotos: DevicePhoto[] = [];
    for (const photo of sortedPhotos) {
      const isUploaded = await uploadTrackingService.isPhotoUploaded(photo.id);
      if (!isUploaded) {
        unuploadedPhotos.push(photo);
      }
    }

    console.log(`Found ${unuploadedPhotos.length} unuploaded photos out of ${total} total`);

    if (unuploadedPhotos.length === 0) {
      Alert.alert('Info', 'All photos are already uploaded');
      return {uploaded: total, total, failed: 0};
    }

    console.log(`Will upload in batches of ${batchSize}`);
    console.log('Starting upload process...');

    // Upload in batches
    for (let i = 0; i < unuploadedPhotos.length; i += batchSize) {
      const batch = unuploadedPhotos.slice(i, i + batchSize);
      
      // Convert batch to SelectedPhoto format
      const batchPhotos = batch.map(photo => ({
        uri: photo.uri,
        type: 'image/jpeg',
        name: photo.filename,
        id: photo.id,
        timestamp: photo.timestamp,
      }));

      let retries = 3;
      let batchSuccess = false;

      // Retry logic for failed batches
      while (retries > 0 && !batchSuccess) {
        try {
          // Upload batch
          console.log(`Uploading batch of ${batch.length} photos (attempt ${4 - retries}/3)...`);
          const uploadResponse = await photoService.uploadPhotos(batchPhotos);

          // Log the full response for debugging
          console.log('Upload response:', JSON.stringify(uploadResponse, null, 2));

          if (uploadResponse.error) {
            // Log detailed error information
            console.error('Upload error details:', {
              error: uploadResponse.error,
              data: uploadResponse.data,
              status: uploadResponse.status,
              attempt: `${4 - retries}/3`,
            });

            // Check if it's a network error
            const isNetworkError =
              uploadResponse.error.includes('Network') ||
              uploadResponse.error.includes('network') ||
              uploadResponse.error.includes('Failed to fetch') ||
              uploadResponse.error.includes('timeout');

            if (isNetworkError && retries > 1) {
              // Wait a bit before retrying (exponential backoff)
              const delay = (4 - retries) * 1000; // 1s, 2s, 3s
              console.log(`Network error detected, retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              retries--;
              continue; // Retry this batch
            }

            // If not a network error or out of retries, log and move on
            console.error(`Batch upload error (attempt ${4 - retries}/3): ${uploadResponse.error}`);
            console.error('Full error object:', uploadResponse);
            failedCount += batch.length;
            break; // Move to next batch
          }

          // Success - track uploaded photos
          const results = uploadResponse.data?.results || {};
          const successful = results.successful || [];
          const failed = results.failed || [];

          console.log(`Batch results: ${successful.length} successful, ${failed.length} failed`);

          if (successful.length > 0) {
            // Map successful uploads to tracking data
            // Note: The server may return duplicates (existing photos)
            const trackingData = successful.map((result: any) => {
              // Find the original photo from batchPhotos by index
              const originalPhoto = batchPhotos[result.index];

              return {
                deviceId: originalPhoto?.id || originalPhoto?.uri,
                serverPhotoId: result.photo?.id || 0,
                filename: originalPhoto?.name || result.filename,
                isDuplicate: result.duplicate || false,
              };
            }).filter((item: any) => item.serverPhotoId > 0 && item.deviceId);

            console.log('Tracking data for successful uploads:', trackingData);

            if (trackingData.length > 0) {
              await uploadTrackingService.trackUploadedPhotos(trackingData);
              console.log(`Tracked ${trackingData.length} photos (including duplicates)`);
            }

            uploadedCount += successful.length;
            setUploadProgress({uploaded: uploadedCount, total: unuploadedPhotos.length});
          }

          if (failed.length > 0) {
            console.error('Failed uploads in batch:', failed);
            failedCount += failed.length;
          }

          batchSuccess = true; // Mark batch as processed
        } catch (error: any) {
          const errorMessage = error.message || 'Unknown error';
          console.error('Caught exception during upload:', {
            message: errorMessage,
            error: error,
            stack: error.stack,
            attempt: `${4 - retries}/3`,
          });

          const isNetworkError =
            errorMessage.includes('Network') ||
            errorMessage.includes('network') ||
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('timeout');

          if (isNetworkError && retries > 1) {
            // Wait before retrying
            const delay = (4 - retries) * 1000;
            console.log(`Exception is network error, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries--;
            continue; // Retry this batch
          }

          console.error(`Error uploading batch (attempt ${4 - retries}/3): ${errorMessage}`);
          console.error('Exception details:', error);
          failedCount += batch.length;
          break; // Move to next batch
        }
      }
    }

    return {uploaded: uploadedCount, total: unuploadedPhotos.length, failed: failedCount};
  };

  const handleUploadAll = async () => {
    if (photos.length === 0) {
      Alert.alert('Info', 'No photos to upload');
      return;
    }

    Alert.alert(
      'Upload All Photos',
      `Upload all photos from "${albumName}"? Photos will be uploaded in batches.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Upload',
          onPress: async () => {
            setIsUploading(true);
            setUploadProgress({uploaded: 0, total: photos.length});

            try {
              const result = await uploadPhotosInBatches(photos, 3);

              // Show appropriate message based on results
              if (result.uploaded > 0 && result.failed === 0) {
                Alert.alert(
                  'Upload Complete',
                  `Successfully uploaded ${result.uploaded} photo(s)`,
                );
              } else if (result.uploaded > 0 && result.failed > 0) {
                Alert.alert(
                  'Upload Partially Complete',
                  `Uploaded ${result.uploaded} of ${result.total} photo(s). ${result.failed} failed. Please check your network connection and try again.`,
                );
              } else if (result.uploaded === 0 && result.failed > 0) {
                Alert.alert(
                  'Upload Failed',
                  `Failed to upload ${result.failed} photo(s). Please check your network connection and try again.`,
                  [
                    {text: 'OK', style: 'default'},
                    {
                      text: 'Retry',
                      style: 'default',
                      onPress: () => {
                        // Retry upload
                        handleUploadAll();
                      },
                    },
                  ],
                );
              } else {
                Alert.alert('Upload Failed', 'No photos were uploaded. Please check your network connection and try again.');
              }

              // Refresh photos and upload status
              await loadPhotos(1, true);
            } catch (error: any) {
              Alert.alert(
                'Upload Error',
                error.message || 'Failed to upload photos. Please check your network connection.',
                [
                  {text: 'OK', style: 'default'},
                  {
                    text: 'Retry',
                    style: 'default',
                    onPress: () => {
                      // Retry upload
                      handleUploadAll();
                    },
                  },
                ],
              );
            } finally {
              setIsUploading(false);
              setUploadProgress({uploaded: 0, total: 0});
            }
          },
        },
      ],
    );
  };

  const renderPhoto = ({item: photo}: {item: DevicePhoto}) => {
    const isUploaded = uploadedPhotoIds.has(photo.id);

    return (
      <TouchableOpacity
        style={styles.photoThumbnail}
        onPress={() => handlePhotoPress(photo)}
        activeOpacity={0.8}>
        <Image
          source={{uri: photo.uri}}
          style={styles.photoImage}
          resizeMode="cover"
        />
        {isUploaded && (
          <View style={styles.uploadedIndicator}>
            <Icon name="cloud-done" size={10} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && photos.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {albumName}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && photos.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {albumName}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadPhotos()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {albumName}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleToggleSync}
            disabled={isUploading}>
            <Icon
              name={isSyncEnabled ? 'sync' : 'sync-outline'}
              size={24}
              color={isSyncEnabled ? '#4CAF50' : '#666666'}
            />
          </TouchableOpacity>
          <UploadProgressButton
            onPress={handleUploadAll}
            isUploading={isUploading}
            progress={
              uploadProgress.total > 0
                ? uploadProgress.uploaded / uploadProgress.total
                : 0
            }
            disabled={photos.length === 0}
            size={24}
          />
        </View>
      </View>

      {/* Upload Progress */}
      {isUploading && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Uploading {uploadProgress.uploaded} of {uploadProgress.total} photos...
          </Text>
        </View>
      )}

      {/* Photos Grid */}
      <FlatList
        data={photos}
        renderItem={renderPhoto}
        numColumns={4}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.gridContainer}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No photos in this album</Text>
          </View>
        }
        ListFooterComponent={
          hasMore && photos.length > 0 ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color="#666666" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    marginHorizontal: 10,
  },
  placeholder: {
    width: 40,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  gridContainer: {
    padding: 4,
  },
  photoThumbnail: {
    width: PHOTO_SIZE,
    aspectRatio: 1,
    margin: 2,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  uploadedIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(76, 175, 80, 0.85)',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0.5},
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

