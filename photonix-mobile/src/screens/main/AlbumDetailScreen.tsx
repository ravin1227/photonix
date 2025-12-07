import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  PanResponder,
  Animated,
  FlatList,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import albumService, {AlbumPhoto, AlbumPermissions} from '../../services/albumService';
import photoService, {Photo} from '../../services/photoService';
import {AlbumsStackParamList} from '../../navigation/AlbumsStackNavigator';
import {HomeStackParamList} from '../../navigation/HomeStackNavigator';
import {API_CONFIG} from '../../config/api';
import AuthImage from '../../components/AuthImage';
import ShareAlbumModal from '../../components/ShareAlbumModal';
import photoMergeService, {MergedPhoto} from '../../services/photoMergeService';
import uploadTracker from '../../services/uploadTracker';
import devicePhotoService, {DevicePhoto} from '../../services/devicePhotoService';
import {Image} from 'react-native';
import {pickPhotos, SelectedPhoto} from '../../components/PhotoPicker';
import uploadTrackingService from '../../services/uploadTrackingService';

type AlbumDetailRouteParams = {
  AlbumDetail: {
    albumId: number;
    albumName: string;
  };
};

type AlbumDetailScreenRouteProp = RouteProp<AlbumDetailRouteParams, 'AlbumDetail'>;
type AlbumDetailScreenNavigationProp = NativeStackNavigationProp<
  AlbumsStackParamList | HomeStackParamList,
  'AlbumDetail'
>;

export default function AlbumDetailScreen() {
  const route = useRoute<AlbumDetailScreenRouteProp>();
  const navigation = useNavigation<AlbumDetailScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const {albumId, albumName} = route.params;

  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddPhotosModal, setShowAddPhotosModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [availablePhotos, setAvailablePhotos] = useState<MergedPhoto[]>([]); // Changed to MergedPhoto
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]); // Changed to string[] for merged photo IDs
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isAddingPhotos, setIsAddingPhotos] = useState(false);
  
  // Pagination state for add photos modal
  const [uploadedPage, setUploadedPage] = useState(1);
  const [hasMoreUploaded, setHasMoreUploaded] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [devicePhotosLoaded, setDevicePhotosLoaded] = useState(false);
  const PER_PAGE = 50; // Load 50 photos at a time
  const [uploadProgress, setUploadProgress] = useState<{current: number; total: number} | null>(null);
  // Track pending photos being added (placeholders with loading state)
  const [pendingPhotos, setPendingPhotos] = useState<Map<string, {photo: MergedPhoto; status: 'uploading' | 'adding' | 'completed' | 'failed'; cloudId?: number}>>(new Map());
  const [permissions, setPermissions] = useState<AlbumPermissions>({
    is_owner: false,
    can_view: true,
    can_add_photos: false,
    can_delete_album: false,
    can_delete_own_photos: false,
    can_delete_others_photos: false,  // Updated field name
    can_share: false,
  });

  // Multi-select state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(new Set());
  const [isDraggingToSelect, setIsDraggingToSelect] = useState(false);
  const photoPositionsRef = useRef<Map<number, {x: number; y: number; width: number; height: number}>>(new Map());

  useEffect(() => {
    loadPhotos();
    loadAlbumDetails();
  }, [albumId]);

  const loadAlbumDetails = async () => {
    try {
      const response = await albumService.getAlbum(albumId);
      if (response.data && response.data.permissions) {
        setPermissions(response.data.permissions);
      }
    } catch (error) {
      console.error('Error loading album details:', error);
    }
  };

  const loadPhotos = async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      }
      const response = await albumService.getAlbumPhotos(albumId, pageNum, 50);
      if (response.data) {
        if (pageNum === 1) {
          setPhotos(response.data.photos);
        } else {
          setPhotos(prev => [...prev, ...response.data.photos]);
        }
        setHasMore(
          response.data.meta.current_page < response.data.meta.total_pages,
        );
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error loading album photos:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadPhotos(1);
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadPhotos(page + 1);
    }
  };

  const getThumbnailUrl = (photo: AlbumPhoto): string => {
    if (!photo.thumbnail_url) return '';
    if (photo.thumbnail_url.startsWith('http')) {
      return photo.thumbnail_url;
    }
    const baseUrl = API_CONFIG.BASE_URL.replace('/api/v1', '');
    return `${baseUrl}${photo.thumbnail_url}`;
  };

  const handlePhotoPress = (photoId: number) => {
    // Prepare photo list for swipe navigation
    const photoList = photos.map(p => ({
      id: p.id,
      cloudId: p.id,
      localUri: undefined,
      isLocal: false,
    }));
    
    // Find current photo index
    const currentIndex = photos.findIndex(p => p.id === photoId);
    
    navigation.navigate('PhotoViewer', {
      photoId,
      photoList,
      initialIndex: currentIndex >= 0 ? currentIndex : 0,
    });
  };

  const loadAvailablePhotos = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setIsLoadingPhotos(true);
        setUploadedPage(1);
        setHasMoreUploaded(true);
        setDevicePhotosLoaded(false);
      } else {
        setIsLoadingMore(true);
      }

      console.log(`[AlbumDetail] Loading available photos - page ${page}, append: ${append}`);

      const newPhotos: MergedPhoto[] = [];
      const albumPhotoIds = new Set(photos.map(p => p.id));

      // Load uploaded photos (paginated)
      try {
        const response = await photoService.getPhotos(page, PER_PAGE);
        if (response.data) {
          const cloudPhotos = response.data.photos || [];
          
          // Merge with local photos for this batch
          const mergedBatch = await photoMergeService.mergePhotos(cloudPhotos);
          
          // Filter out photos already in album
          const filteredBatch = mergedBatch.filter(photo => {
            if (photo.cloudId) {
              return !albumPhotoIds.has(photo.cloudId);
            }
            return true;
          });
          
          newPhotos.push(...filteredBatch);
          
          // Check if there are more pages
          const meta = response.data.meta;
          const hasMore = meta ? meta.current_page < meta.total_pages : false;
          setHasMoreUploaded(hasMore);
          setUploadedPage(page);
          
          console.log(`[AlbumDetail] Loaded page ${page}: ${filteredBatch.length} photos (hasMore: ${hasMore})`);
        }
      } catch (error: any) {
        console.error('[AlbumDetail] Error loading uploaded photos:', error);
        setHasMoreUploaded(false);
      }

      // Load device photos only on first page
      if (page === 1 && !devicePhotosLoaded) {
        try {
          const hasPermission = await devicePhotoService.checkPermission();
          if (!hasPermission) {
            console.log('[AlbumDetail] Device photo permission not granted, requesting...');
            const granted = await devicePhotoService.requestPermission();
            if (!granted) {
              console.log('[AlbumDetail] Device photo permission denied, skipping device photos');
              setDevicePhotosLoaded(true);
            } else {
              // Permission granted, load device photos
              const devicePhotosResult = await devicePhotoService.getPhotos(PER_PAGE);
              
              if (devicePhotosResult && devicePhotosResult.photos) {
                // Convert device photos to MergedPhoto format
                const deviceMergedPhotos: MergedPhoto[] = devicePhotosResult.photos.map((devicePhoto: DevicePhoto) => ({
                  id: `local_${devicePhoto.uri}`,
                  uri: devicePhoto.uri,
                  originalUri: devicePhoto.uri,
                  filename: devicePhoto.filename,
                  capturedAt: new Date(devicePhoto.timestamp),
                  fileSize: 0,
                  width: devicePhoto.width,
                  height: devicePhoto.height,
                  cloudId: undefined,
                  syncStatus: 'local_only' as const,
                  isUploaded: false,
                }));
                
                // Filter out device photos already in album (by checking if URI matches any uploaded photo)
                const filteredDevice = deviceMergedPhotos.filter(photo => {
                  // Device photos are always new (not in album yet)
                  return true;
                });
                
                newPhotos.push(...filteredDevice);
                console.log(`[AlbumDetail] Loaded ${filteredDevice.length} device photos`);
              }
              setDevicePhotosLoaded(true);
            }
          } else {
            // Permission already granted
            const devicePhotosResult = await devicePhotoService.getPhotos(PER_PAGE);
            
            if (devicePhotosResult && devicePhotosResult.photos) {
              const deviceMergedPhotos: MergedPhoto[] = devicePhotosResult.photos.map((devicePhoto: DevicePhoto) => ({
                id: `local_${devicePhoto.uri}`,
                uri: devicePhoto.uri,
                originalUri: devicePhoto.uri,
                filename: devicePhoto.filename,
                capturedAt: new Date(devicePhoto.timestamp),
                fileSize: 0,
                width: devicePhoto.width,
                height: devicePhoto.height,
                cloudId: undefined,
                syncStatus: 'local_only' as const,
                isUploaded: false,
              }));
              
              newPhotos.push(...deviceMergedPhotos);
              console.log(`[AlbumDetail] Loaded ${deviceMergedPhotos.length} device photos`);
            }
            setDevicePhotosLoaded(true);
          }
        } catch (error: any) {
          console.error('[AlbumDetail] Error loading device photos:', error);
          setDevicePhotosLoaded(true);
        }
      }

      // Sort by timestamp (newest first)
      if (newPhotos.length > 0) {
        newPhotos.sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
      }

      // Append or replace photos
      if (append) {
        setAvailablePhotos(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = newPhotos.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNew].sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
        });
      } else {
        setAvailablePhotos(newPhotos);
      }

      console.log(`[AlbumDetail] Total available photos: ${append ? availablePhotos.length + newPhotos.length : newPhotos.length}`);
    } catch (error: any) {
      console.error('[AlbumDetail] Unexpected error loading photos:', error);
    } finally {
      setIsLoadingPhotos(false);
      setIsLoadingMore(false);
    }
  };

  const loadMorePhotos = () => {
    if (!isLoadingMore && hasMoreUploaded && !isLoadingPhotos) {
      loadAvailablePhotos(uploadedPage + 1, true);
    }
  };

  const handleOpenAddPhotosModal = async () => {
    try {
      // Open native photo picker (same as album card + icon)
      const selectedPhotos = await pickPhotos({maxSelection: 100});
      
      if (selectedPhotos.length === 0) {
        return; // User cancelled
      }

      // Prepare photos with capturedAt timestamps
      const photosToUpload = selectedPhotos.map(photo => ({
        uri: photo.uri,
        type: photo.type,
        name: photo.name,
        capturedAt: photo.timestamp ? new Date(photo.timestamp).toISOString() : undefined,
      }));

      // Upload photos first
      const uploadResponse = await photoService.uploadPhotos(photosToUpload);

      if (uploadResponse.error) {
        Alert.alert('Upload Failed', uploadResponse.error);
        return;
      }

      // Get uploaded photo IDs from response
      const results = uploadResponse.data?.results || {};
      const successful = results.successful || [];
      const photoIds = successful.map((p: any) => p.photo?.id).filter(Boolean);

      // Track uploaded photos
      if (successful.length > 0) {
        const trackingData = successful.map((result: any, index: number) => {
          const photo = selectedPhotos[index];
          return {
            deviceId: photo.id || photo.uri,
            serverPhotoId: result.photo?.id || 0,
            filename: photo.name,
          };
        }).filter((item: any) => item.serverPhotoId > 0);
        
        if (trackingData.length > 0) {
          await uploadTrackingService.trackUploadedPhotos(trackingData);
        }
      }

      // Add photos to album
      if (photoIds.length > 0) {
        for (const photoId of photoIds) {
          await albumService.addPhotoToAlbum(albumId, photoId);
        }
      }

      // Refresh album photos
      await loadPhotos(1);

      Alert.alert('Success', `Added ${photoIds.length} photo(s) to album`);
    } catch (error: any) {
      console.error('[AlbumDetail] Error adding photos:', error);
      Alert.alert('Error', error.message || 'Failed to add photos to album');
    }
  };

  const handleCloseAddPhotosModal = () => {
    setShowAddPhotosModal(false);
    setSelectedPhotos([]);
    // Reset pagination
    setUploadedPage(1);
    setHasMoreUploaded(true);
    setDevicePhotosLoaded(false);
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      if (prev.includes(photoId)) {
        return prev.filter(id => id !== photoId);
      } else {
        return [...prev, photoId];
      }
    });
  };

  const handleAddPhotosToAlbum = async () => {
    if (selectedPhotos.length === 0) {
      Alert.alert('Error', 'Please select at least one photo');
      return;
    }

    try {
      console.log('[AlbumDetail] Adding photos to album:', selectedPhotos);

      // Get the actual photo objects from availablePhotos
      const photosToAdd = availablePhotos.filter(p => selectedPhotos.includes(p.id));

      // Separate local-only photos from already-uploaded photos
      const localPhotos = photosToAdd.filter(p => p.syncStatus === 'local_only');
      const uploadedPhotos = photosToAdd.filter(p => p.cloudId);

      console.log('[AlbumDetail] Local photos to upload:', localPhotos.length);
      console.log('[AlbumDetail] Already uploaded photos:', uploadedPhotos.length);

      // Step 1: Close modal immediately and add placeholders
      handleCloseAddPhotosModal();

      // Add placeholders for all photos being added
      const newPending = new Map(pendingPhotos);
      photosToAdd.forEach(photo => {
        newPending.set(photo.id, {
          photo,
          status: photo.syncStatus === 'local_only' ? 'uploading' : 'adding',
        });
      });
      setPendingPhotos(newPending);

      // Step 2: Upload local photos in background
      const cloudPhotoIds: number[] = [];

      if (localPhotos.length > 0) {
        for (let i = 0; i < localPhotos.length; i++) {
          const photo = localPhotos[i];
          console.log(`[AlbumDetail] Uploading ${i + 1}/${localPhotos.length}: ${photo.filename}`);

          // Update pending photo status
          setPendingPhotos(prev => {
            const updated = new Map(prev);
            const existing = updated.get(photo.id);
            if (existing) {
              updated.set(photo.id, {...existing, status: 'uploading'});
            }
            return updated;
          });

          if (!photo.originalUri) {
            console.warn('[AlbumDetail] Skipping photo without originalUri:', photo.filename);
            setPendingPhotos(prev => {
              const updated = new Map(prev);
              updated.delete(photo.id);
              return updated;
            });
            continue;
          }

          try {
            const file = {
              uri: photo.originalUri,
              type: 'image/jpeg',
              name: photo.filename,
            };

            const result = await photoService.uploadPhoto(file);

            if (result.data?.photo) {
              const cloudId = result.data.photo.id;
              cloudPhotoIds.push(cloudId);

              // Track this upload
              await uploadTracker.markAsUploaded(photo.originalUri, cloudId);
              console.log('[AlbumDetail] Uploaded and tracked:', photo.filename, '→', cloudId);

              // Update pending photo to "adding" status
              setPendingPhotos(prev => {
                const updated = new Map(prev);
                const existing = updated.get(photo.id);
                if (existing) {
                  updated.set(photo.id, {...existing, status: 'adding', cloudId});
                }
                return updated;
              });
            } else {
              console.error('[AlbumDetail] Upload failed for:', photo.filename, result.error);
              setPendingPhotos(prev => {
                const updated = new Map(prev);
                updated.delete(photo.id);
                return updated;
              });
            }
          } catch (error: any) {
            console.error('[AlbumDetail] Upload error for:', photo.filename, error);
            setPendingPhotos(prev => {
              const updated = new Map(prev);
              updated.delete(photo.id);
              return updated;
            });
          }
        }
      }

      // Step 3: Add already-uploaded photos' IDs
      uploadedPhotos.forEach(p => {
        if (p.cloudId) {
          cloudPhotoIds.push(p.cloudId);
        }
      });

      // Step 4: Add all photos to album
      console.log('[AlbumDetail] Adding', cloudPhotoIds.length, 'photos to album');

      const addPhotoPromises = cloudPhotoIds.map(async (photoId) => {
        try {
          await albumService.addPhotoToAlbum(albumId, photoId);
          
          // Find and update the pending photo
          setPendingPhotos(prev => {
            const updated = new Map(prev);
            for (const [key, value] of updated.entries()) {
              if (value.cloudId === photoId || (value.photo.cloudId === photoId)) {
                updated.set(key, {...value, status: 'completed', cloudId: photoId});
              }
            }
            return updated;
          });
        } catch (error: any) {
          console.error('[AlbumDetail] Error adding photo to album:', photoId, error);
          // Mark as failed
          setPendingPhotos(prev => {
            const updated = new Map(prev);
            for (const [key, value] of updated.entries()) {
              if (value.cloudId === photoId || (value.photo.cloudId === photoId)) {
                updated.set(key, {...value, status: 'failed'});
              }
            }
            return updated;
          });
        }
      });

      await Promise.all(addPhotoPromises);

      // Step 5: Refresh album photos after a short delay to let server process
      setTimeout(async () => {
        await loadPhotos(1);
        
        // Clear completed pending photos after refresh (give it a bit more time)
        setTimeout(() => {
          setPendingPhotos(prev => {
            const updated = new Map(prev);
            for (const [key, value] of updated.entries()) {
              if (value.status === 'completed') {
                updated.delete(key);
              }
            }
            return updated;
          });
        }, 500);
      }, 1500);

    } catch (error: any) {
      console.error('[AlbumDetail] Error adding photos:', error);
      // Clear all pending photos on error
      setPendingPhotos(new Map());
      Alert.alert('Error', 'Failed to add photos: ' + (error.message || 'Unknown error'));
    }
  };

  const getThumbnailUrlForSelection = (photo: MergedPhoto): string => {
    // For local photos, return the local URI directly
    if (photo.syncStatus === 'local_only') {
      return photo.uri;
    }

    // For uploaded photos, return the cloud thumbnail
    return photo.uri || '';
  };

  const handleDeletePhoto = async (photoId: number) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo from the album?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await albumService.removePhotoFromAlbum(albumId, photoId);

              if (response.error) {
                Alert.alert('Error', response.error || 'Failed to remove photo');
                return;
              }

              // Refresh photos
              await loadPhotos(1);
              Alert.alert('Success', 'Photo removed from album');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove photo');
            }
          },
        },
      ],
    );
  };

  const handleDeleteAlbum = async () => {
    try {
      setIsDeleting(true);
      const response = await albumService.deleteAlbum(albumId);

      if (response.error) {
        Alert.alert('Error', response.error);
        setIsDeleting(false);
        return;
      }

      // Navigate back to albums list with deleted album ID
      // Check navigation state to determine which navigator we're in
      const state = navigation.getState();
      const routeNames = state.routes.map(route => route.name);

      // If AlbumsList exists in the navigation state, we're in AlbumsStackNavigator
      if (routeNames.includes('AlbumsList')) {
        navigation.navigate('AlbumsList' as never, {deletedAlbumId: albumId} as never);
      } else {
        // Otherwise, we're in HomeStackNavigator, navigate to HomeList
        navigation.navigate('HomeList' as never, {deletedAlbumId: albumId} as never);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to delete album: ' + (error.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Multi-select handlers
  const handleLongPress = (photoId: number, photo: AlbumPhoto) => {
    // Only allow selection of owned photos
    if (!photo.is_mine) {
      Alert.alert('Cannot Select', 'You can only select photos you uploaded');
      return;
    }

    // Enter selection mode
    setIsSelectionMode(true);
    const newSelection = new Set<number>();
    newSelection.add(photoId);
    setSelectedPhotoIds(newSelection);
  };

  const handlePhotoSelection = (photoId: number, photo: AlbumPhoto) => {
    if (!isSelectionMode) return;

    // Only allow selection of owned photos
    if (!photo.is_mine) return;

    setSelectedPhotoIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedPhotoIds(new Set());
    setIsDraggingToSelect(false);
  };

  const handleBatchDelete = async () => {
    if (selectedPhotoIds.size === 0) return;

    Alert.alert(
      'Remove Photos',
      `Are you sure you want to remove ${selectedPhotoIds.size} photo(s) from the album?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete each selected photo
              const deletePromises = Array.from(selectedPhotoIds).map(photoId =>
                albumService.removePhotoFromAlbum(albumId, photoId)
              );

              const results = await Promise.all(deletePromises);

              // Check for errors
              const errors = results.filter(r => r.error);
              if (errors.length > 0) {
                Alert.alert('Error', `Failed to remove ${errors.length} photo(s)`);
              } else {
                Alert.alert('Success', `Removed ${selectedPhotoIds.size} photo(s) from album`);
              }

              // Exit selection mode and refresh
              exitSelectionMode();
              await loadPhotos(1);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove photos');
            }
          },
        },
      ],
    );
  };

  const checkPhotoIntersection = (x: number, y: number): number | null => {
    for (const [photoId, pos] of photoPositionsRef.current.entries()) {
      if (
        x >= pos.x &&
        x <= pos.x + pos.width &&
        y >= pos.y &&
        y <= pos.y + pos.height
      ) {
        return photoId;
      }
    }
    return null;
  };

  // PanResponder for drag-to-select
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isSelectionMode,
      onMoveShouldSetPanResponder: () => isSelectionMode,
      onPanResponderGrant: () => {
        if (isSelectionMode) {
          setIsDraggingToSelect(true);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isSelectionMode) return;

        const {pageX, pageY} = evt.nativeEvent;
        const photoId = checkPhotoIntersection(pageX, pageY);

        if (photoId !== null) {
          const photo = photos.find(p => p.id === photoId);
          if (photo && photo.is_mine) {
            setSelectedPhotoIds(prev => {
              const newSet = new Set(prev);
              newSet.add(photoId);
              return newSet;
            });
          }
        }
      },
      onPanResponderRelease: () => {
        setIsDraggingToSelect(false);
      },
      onPanResponderTerminate: () => {
        setIsDraggingToSelect(false);
      },
    })
  ).current;

  if (isLoading && photos.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Icon name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {albumName}
          </Text>
          {/* Only show delete button if user can delete album */}
          {permissions.can_delete_album ? (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => setShowDeleteModal(true)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Icon name="trash-outline" size={24} color="#ff3040" />
            </TouchableOpacity>
          ) : (
            <View style={styles.deleteButton} />
          )}
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <Icon name="trash-outline" size={48} color="#ff3040" />
              </View>
              <Text style={styles.modalTitle}>Delete Album</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to delete "{albumName}"? This action cannot be undone.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowDeleteModal(false)}
                  disabled={isDeleting}>
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonDelete]}
                  onPress={handleDeleteAlbum}
                  disabled={isDeleting}>
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalButtonDeleteText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {albumName}
        </Text>
        <View style={styles.headerActions}>
          {permissions.can_share && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowShareModal(true)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Icon name="share-social-outline" size={24} color="#000000" />
            </TouchableOpacity>
          )}
          {permissions.can_delete_album && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowDeleteModal(true)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Icon name="trash-outline" size={24} color="#ff3040" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Photos Grid */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.gridContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        onScrollEndDrag={({nativeEvent}) => {
          const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
          const paddingToBottom = 20;
          if (
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom
          ) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}>
        {photos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="images-outline" size={64} color="#999999" />
            <Text style={styles.emptyText}>No photos in this album</Text>
            <Text style={styles.emptySubtext}>
              Add photos to get started
            </Text>
          </View>
        ) : (
          <View style={styles.grid} {...panResponder.panHandlers}>
            {photos.map(photo => {
              const thumbnailUrl = getThumbnailUrl(photo);
              const isSelected = selectedPhotoIds.has(photo.id);
              return (
                <View
                  key={photo.id}
                  style={styles.photoContainer}
                  onLayout={(event) => {
                    const {x, y, width, height} = event.nativeEvent.layout;
                    photoPositionsRef.current.set(photo.id, {x, y, width, height});
                  }}>
                  <TouchableOpacity
                    style={styles.photoThumbnail}
                    onPress={() => {
                      if (isSelectionMode) {
                        handlePhotoSelection(photo.id, photo);
                      } else {
                        handlePhotoPress(photo.id);
                      }
                    }}
                    onLongPress={() => handleLongPress(photo.id, photo)}
                    activeOpacity={0.8}>
                    {thumbnailUrl ? (
                      <AuthImage
                        source={{uri: thumbnailUrl}}
                        style={styles.photoImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Icon name="ban" size={32} color="#999999" />
                      </View>
                    )}

                    {/* Selection overlay */}
                    {isSelectionMode && (
                      <View style={[
                        styles.selectionOverlay,
                        isSelected && styles.selectionOverlaySelected,
                        !photo.is_mine && styles.selectionOverlayDisabled
                      ]}>
                        {photo.is_mine && (
                          <View style={[
                            styles.selectionCheckbox,
                            isSelected && styles.selectionCheckboxSelected
                          ]}>
                            {isSelected && (
                              <Icon name="checkmark" size={16} color="#ffffff" />
                            )}
                          </View>
                        )}
                      </View>
                    )}

                    {/* Show uploader name if not mine */}
                    {!photo.is_mine && !isSelectionMode && (
                      <View style={styles.uploaderBadge}>
                        <Text style={styles.uploaderText} numberOfLines={1}>
                          {photo.uploaded_by.name}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
            
            {/* Render pending photos (placeholders with loaders) */}
            {Array.from(pendingPhotos.values()).map((pending, index) => {
              const pendingId = `pending_${pending.photo.id}_${index}`;
              const thumbnailUrl = pending.photo.syncStatus === 'local_only' 
                ? pending.photo.uri 
                : getThumbnailUrlForSelection(pending.photo);
              
              return (
                <View
                  key={pendingId}
                  style={styles.photoContainer}>
                  <View style={styles.photoThumbnail}>
                    {thumbnailUrl && pending.status !== 'failed' ? (
                      pending.photo.syncStatus === 'local_only' ? (
                        <Image
                          source={{uri: thumbnailUrl}}
                          style={styles.photoImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <AuthImage
                          source={{uri: thumbnailUrl}}
                          style={styles.photoImage}
                          resizeMode="cover"
                        />
                      )
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Icon name="image-outline" size={32} color="#999999" />
                      </View>
                    )}
                    
                    {/* Loading overlay */}
                    <View style={styles.pendingPhotoOverlay}>
                      {pending.status === 'uploading' && (
                        <View style={styles.pendingPhotoLoader}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.pendingPhotoText}>Uploading...</Text>
                        </View>
                      )}
                      {pending.status === 'adding' && (
                        <View style={styles.pendingPhotoLoader}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.pendingPhotoText}>Adding...</Text>
                        </View>
                      )}
                      {pending.status === 'failed' && (
                        <View style={styles.pendingPhotoLoader}>
                          <Icon name="close-circle" size={24} color="#ff3040" />
                          <Text style={styles.pendingPhotoText}>Failed</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        {isLoading && photos.length > 0 && (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color="#666666" />
          </View>
        )}
        </ScrollView>

      {/* Floating Action Button - Only show if user can add photos and not in selection mode */}
      {permissions.can_add_photos && !isSelectionMode && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleOpenAddPhotosModal}
          activeOpacity={0.8}>
          <Icon name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Selection Mode Bottom Bar */}
      {isSelectionMode && (
        <View style={[styles.selectionBar, {paddingBottom: insets.bottom || 20}]}>
          <View style={styles.selectionBarContent}>
            <TouchableOpacity
              style={styles.selectionBarCancelButton}
              onPress={exitSelectionMode}>
              <Text style={styles.selectionBarCancelText}>Cancel</Text>
            </TouchableOpacity>

            <Text style={styles.selectionBarCount}>
              {selectedPhotoIds.size} selected
            </Text>

            <TouchableOpacity
              style={[
                styles.selectionBarDeleteButton,
                selectedPhotoIds.size === 0 && styles.selectionBarDeleteButtonDisabled
              ]}
              onPress={handleBatchDelete}
              disabled={selectedPhotoIds.size === 0}>
              <Icon name="trash-outline" size={20} color={selectedPhotoIds.size > 0 ? "#ffffff" : "#999999"} />
              <Text style={[
                styles.selectionBarDeleteText,
                selectedPhotoIds.size === 0 && styles.selectionBarDeleteTextDisabled
              ]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add Photos Modal */}
      <Modal
        visible={showAddPhotosModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseAddPhotosModal}>
        <SafeAreaView style={styles.addPhotosModalContainer} edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View style={styles.addPhotosModalHeader}>
            <TouchableOpacity
              onPress={handleCloseAddPhotosModal}
              style={styles.addPhotosModalCloseButton}>
              <Text style={styles.addPhotosModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.addPhotosModalTitle}>Add Photos</Text>
            <TouchableOpacity
              onPress={handleAddPhotosToAlbum}
              disabled={isAddingPhotos || selectedPhotos.length === 0}
              style={[
                styles.addPhotosModalSaveButton,
                (selectedPhotos.length === 0 || isAddingPhotos) && styles.addPhotosModalSaveButtonDisabled,
              ]}>
              <Text
                style={[
                  styles.addPhotosModalSaveText,
                  (selectedPhotos.length === 0 || isAddingPhotos) && styles.addPhotosModalSaveTextDisabled,
                ]}>
                {isAddingPhotos ? 'Adding...' : selectedPhotos.length > 0 ? `Add (${selectedPhotos.length})` : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.addPhotosModalContent} contentContainerStyle={{paddingBottom: insets.bottom + 20}}>
            {/* Upload Progress Indicator */}
            {uploadProgress && (
              <View style={styles.uploadProgressContainer}>
                <ActivityIndicator size="small" color="#000000" />
                <Text style={styles.uploadProgressText}>
                  Uploading {uploadProgress.current} of {uploadProgress.total} photo(s)...
                </Text>
              </View>
            )}

            {isLoadingPhotos ? (
              <View style={styles.addPhotosLoadingContainer}>
                <ActivityIndicator size="large" color="#666666" />
                <Text style={styles.addPhotosLoadingText}>Loading photos...</Text>
              </View>
            ) : availablePhotos.length === 0 ? (
              <View style={styles.addPhotosEmptyContainer}>
                <Icon name="images-outline" size={64} color="#999999" />
                <Text style={styles.addPhotosEmptyText}>No photos available</Text>
                <Text style={styles.addPhotosEmptySubtext}>
                  All photos are already in this album
                </Text>
              </View>
            ) : (
              <FlatList
                data={availablePhotos}
                renderItem={({item: photo}) => {
                  const thumbnailUrl = getThumbnailUrlForSelection(photo);
                  const isSelected = selectedPhotos.includes(photo.id);
                  const isLocalOnly = photo.syncStatus === 'local_only';

                  return (
                    <TouchableOpacity
                      key={photo.id}
                      style={styles.addPhotoSelectItem}
                      onPress={() => togglePhotoSelection(photo.id)}>
                      {thumbnailUrl ? (
                        // Use Image for local photos, AuthImage for cloud photos
                        isLocalOnly ? (
                          <Image
                            source={{uri: thumbnailUrl}}
                            style={styles.addPhotoSelectImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <AuthImage
                            source={{uri: thumbnailUrl}}
                            style={styles.addPhotoSelectImage}
                            resizeMode="cover"
                          />
                        )
                      ) : (
                        <View style={styles.addPhotoSelectPlaceholder}>
                          <Icon name="ban" size={24} color="#999999" />
                        </View>
                      )}

                      {/* Local photo badge */}
                      {isLocalOnly && (
                        <View style={styles.localPhotoBadge}>
                          <Icon name="phone-portrait-outline" size={14} color="#ffffff" />
                        </View>
                      )}

                      {/* Selection overlay */}
                      {isSelected && (
                        <View style={styles.addPhotoSelectOverlay}>
                          <View style={styles.addPhotoSelectCheck}>
                            <Icon name="checkmark" size={20} color="#ffffff" />
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                keyExtractor={(item) => item.id}
                numColumns={3}
                onEndReached={loadMorePhotos}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  isLoadingMore ? (
                    <View style={styles.loadMoreContainer}>
                      <ActivityIndicator size="small" color="#666666" />
                      <Text style={styles.loadMoreText}>Loading more photos...</Text>
                    </View>
                  ) : null
                }
                contentContainerStyle={styles.addPhotosGrid}
                scrollEnabled={false}
                nestedScrollEnabled={true}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Icon name="trash-outline" size={48} color="#ff3040" />
            </View>
            <Text style={styles.modalTitle}>Delete Album</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete "{albumName}"? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}>
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={handleDeleteAlbum}
                disabled={isDeleting}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalButtonDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Share Album Modal */}
      <ShareAlbumModal
        visible={showShareModal}
        albumId={albumId}
        albumName={albumName}
        onClose={() => setShowShareModal(false)}
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  gridContainer: {
    padding: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  photoContainer: {
    width: '32%',
    marginBottom: 4,
    position: 'relative',
  },
  photoThumbnail: {
    width: '100%',
    aspectRatio: 1,
    flexShrink: 0,
    flexGrow: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  uploaderBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  uploaderText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalButtonDelete: {
    backgroundColor: '#ff3040',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  modalButtonDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addPhotosModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  addPhotosModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addPhotosModalCloseButton: {
    padding: 8,
  },
  addPhotosModalCancelText: {
    fontSize: 16,
    color: '#666666',
  },
  addPhotosModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  addPhotosModalSaveButton: {
    padding: 8,
  },
  addPhotosModalSaveButtonDisabled: {
    opacity: 0.5,
  },
  addPhotosModalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  addPhotosModalSaveTextDisabled: {
    color: '#999999',
  },
  addPhotosModalContent: {
    flex: 1,
    paddingHorizontal: 4,
  },
  addPhotosLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  addPhotosLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  addPhotosEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  addPhotosEmptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  addPhotosEmptySubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  addPhotosGrid: {
    paddingBottom: 8,
  },
  addPhotoSelectItem: {
    width: '33.33%',
    aspectRatio: 1,
    position: 'relative',
    padding: 2,
  },
  addPhotoSelectImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  addPhotoSelectPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoSelectOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoSelectCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 8,
    gap: 12,
  },
  uploadProgressText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  loadMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666666',
  },
  pendingPhotoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingPhotoLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pendingPhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  localPhotoBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    borderRadius: 4,
    padding: 4,
  },
  // Multi-select styles
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionOverlaySelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  selectionOverlayDisabled: {
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  selectionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionCheckboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  selectionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  selectionBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  selectionBarCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  selectionBarCancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  selectionBarCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  selectionBarDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff3b30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  selectionBarDeleteButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  selectionBarDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  selectionBarDeleteTextDisabled: {
    color: '#999999',
  },
});

