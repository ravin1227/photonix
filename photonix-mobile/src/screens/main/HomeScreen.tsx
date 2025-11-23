import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import photoService, {Photo} from '../../services/photoService';
import albumService, {Album} from '../../services/albumService';
import peopleService, {Person} from '../../services/peopleService';
import {API_CONFIG} from '../../config/api';
import {HomeStackParamList} from '../../navigation/HomeStackNavigator';
import AuthImage from '../../components/AuthImage';
import AuthenticatedImage from '../../components/AuthenticatedImage';
import CreateAlbumModal from '../../components/CreateAlbumModal';
import UploadButton from '../../components/UploadButton';
import PhotoUploadStatus from '../../components/PhotoUploadStatus';
import PhotoSkeleton from '../../components/PhotoSkeleton';
import {pickPhotos, SelectedPhoto} from '../../components/PhotoPicker';
import uploadTrackingService from '../../services/uploadTrackingService';
import devicePhotoService, {DevicePhoto} from '../../services/devicePhotoService';
import {parseDateString, getDayStart, getDayEnd, isSameDay} from '../../utils/dateUtils';
import {Image} from 'react-native';
import photoMergeService, {MergedPhoto} from '../../services/photoMergeService';
import uploadTracker from '../../services/uploadTracker';
import NetworkStatusBanner from '../../components/NetworkStatusBanner';

type FilterType = 'Recent' | 'People' | 'Albums';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'HomeList'
>;

type HomeScreenRouteProp = RouteProp<HomeStackParamList, 'HomeList'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<HomeScreenRouteProp>();
  const [activeFilter, setActiveFilter] = useState<FilterType>('Recent');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [mergedPhotos, setMergedPhotos] = useState<MergedPhoto[]>([]); // NEW: Unified timeline
  const [albums, setAlbums] = useState<Album[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploadingDates, setUploadingDates] = useState<{[date: string]: {isUploading: boolean; uploaded: number; total: number}}>({});
  const [dateUploadStatus, setDateUploadStatus] = useState<{[date: string]: {allUploaded: boolean; uploadedCount: number; totalCount: number}}>({});
  const [devicePhotos, setDevicePhotos] = useState<{[date: string]: DevicePhoto[]}>({});
  const [isLoadingDevicePhotos, setIsLoadingDevicePhotos] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePhotos, setHasMorePhotos] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [preloadedPhotos, setPreloadedPhotos] = useState<Photo[]>([]); // Buffer for next page
  const [preloadedPhotosPage2, setPreloadedPhotosPage2] = useState<Photo[]>([]); // Buffer for page after next
  const [isPreloading, setIsPreloading] = useState(false);
  const [isMerging, setIsMerging] = useState(false); // Track merge status
  const PER_PAGE = 50; // Load 50 photos at a time
  const PRELOAD_THRESHOLD = 20; // Preload when 20 photos from bottom
  const PRELOAD_PAGES_AHEAD = 2; // Preload 2 pages ahead for smooth scrolling
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (activeFilter === 'Recent') {
      loadPhotos(); // Now includes merging with device photos
    } else if (activeFilter === 'Albums') {
      loadAlbums();
    } else if (activeFilter === 'People') {
      loadPeople();
    }
  }, [activeFilter]);

  // Get merged photos grouped by date (Google Photos style) - Memoized for performance
  // Moved here so it can be used in useEffect hooks below
  const getMergedPhotosByDate = useMemo(() => {
    const grouped = photoMergeService.groupPhotosByDate(mergedPhotos);

    return Array.from(grouped.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([date, photos]) => ({
        date,
        dateHeader: photoMergeService.formatDateHeader(date),
        photos,
      }));
  }, [mergedPhotos]);

  // Memoize flattened photo list for navigation (computed once, reused)
  const allMergedPhotosForNavigation = useMemo(() => {
    return getMergedPhotosByDate.flatMap(({photos}) => photos);
  }, [getMergedPhotosByDate]);

  // Memoize photo list for navigation (computed once, reused)
  const photoListForNavigation = useMemo(() => {
    return allMergedPhotosForNavigation.map(p => ({
      id: p.cloudId,
      cloudId: p.cloudId,
      localUri: p.isLocal ? p.uri : undefined,
      isLocal: p.isLocal,
    }));
  }, [allMergedPhotosForNavigation]);

  // Check upload status for dates when photos are loaded
  useEffect(() => {
    if (photos.length > 0 && activeFilter === 'Recent') {
      getMergedPhotosByDate.forEach(({date}) => {
        checkDateUploadStatus(date);
      });
    }
  }, [photos, devicePhotos, activeFilter, getMergedPhotosByDate]);

  // Handle photo deletion from PhotoViewerScreen
  useEffect(() => {
    if (route.params?.deletedPhotoId) {
      const deletedId = route.params.deletedPhotoId;
      // Silently remove the deleted photo from the list
      setPhotos(prev => {
        const filtered = prev.filter(p => p.id !== deletedId);
        console.log(`Removed photo ${deletedId} from list. Remaining: ${filtered.length}`);
        return filtered;
      });
      // Clear the param to avoid re-processing on re-render
      navigation.setParams({deletedPhotoId: undefined});
    }
  }, [route.params?.deletedPhotoId, navigation]);

  // Handle album deletion from AlbumDetailScreen
  useEffect(() => {
    if (route.params?.deletedAlbumId) {
      const deletedId = route.params.deletedAlbumId;
      // Remove the deleted album from the list silently
      setAlbums(prevAlbums => prevAlbums.filter(album => album.id !== deletedId));
      // Clear the route param to prevent re-triggering
      navigation.setParams({deletedAlbumId: undefined});
    }
  }, [route.params?.deletedAlbumId, navigation]);

  const loadPhotos = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setIsLoading(true);
        setCurrentPage(1);
        setHasMorePhotos(true);
        setPreloadedPhotos([]); // Clear preload buffers on fresh load
        setPreloadedPhotosPage2([]);
      } else {
        setIsLoadingMore(true);
      }

      console.log(`[HomeScreen] Loading photos - page ${page}, per page ${PER_PAGE}`);

      // PHASE 1: Fetch cloud photos from server (paginated)
      const response = await photoService.getPhotos(page, PER_PAGE);
      console.log('[HomeScreen] Photos API Response:', response.data?.photos.length || 0, 'photos');

      const cloudPhotos = response.data?.photos || [];
      const meta = response.data?.meta;

      // Check if there are more pages
      const hasMore = meta ? meta.current_page < meta.total_pages : false;
      setHasMorePhotos(hasMore);

      // Update photos state
      const allCloudPhotos = append ? [...photos, ...cloudPhotos] : cloudPhotos;
      setPhotos(allCloudPhotos);

      // PHASE 2: Show THUMBNAILS INSTANTLY (no merge blocking)
      // Convert cloud photos to merged format with thumbnails for instant display
      console.log('[HomeScreen] Showing thumbnails instantly from backend...');
      const instantMerged = photoMergeService.cloudPhotosToMerged(cloudPhotos);
      
      if (append && page > 1) {
        // Append to existing merged photos
        setMergedPhotos(prev => {
          // Remove duplicates and append new ones
          const existingIds = new Set(prev.map(p => p.id));
          const newPhotos = instantMerged.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPhotos].sort((a, b) => 
            b.capturedAt.getTime() - a.capturedAt.getTime()
          );
        });
      } else {
        // Replace with new photos (instant thumbnails display)
        setMergedPhotos(instantMerged);
      }

      // PHASE 3: Merge with local photos in BACKGROUND (non-blocking)
      // This happens while user sees thumbnails, then updates UI when ready
      if (!isMerging) {
        setIsMerging(true);
        console.log('[HomeScreen] Starting background merge with local photos...');
        photoMergeService.mergePhotosInBackground(allCloudPhotos, (fullyMerged) => {
          try {
            // Only update if component is still mounted
            if (!isMountedRef.current) {
              console.log('[HomeScreen] Component unmounted, skipping merge update');
              return;
            }
            
            console.log('[HomeScreen] Background merge complete:', fullyMerged.length, 'total photos');
            console.log('[HomeScreen] Breakdown:', {
              uploaded: fullyMerged.filter(p => p.syncStatus === 'uploaded').length,
              localOnly: fullyMerged.filter(p => p.syncStatus === 'local_only').length,
            });

            // Safely update with fully merged photos (includes local photos)
            // Only update if component is still mounted and active filter is Recent
            if (activeFilter === 'Recent' && isMountedRef.current) {
              setMergedPhotos(fullyMerged);
            }
          } catch (error) {
            console.error('[HomeScreen] Error updating merged photos:', error);
          } finally {
            if (isMountedRef.current) {
              setIsMerging(false);
            }
          }
        });
      }

      setCurrentPage(page);

      // PHASE 4: Preload next 2 pages for smooth scrolling
      // Preload page 2 and page 3 in parallel for instant loading
      if (page === 1 && hasMore && !isPreloading) {
        console.log('[HomeScreen] Preloading next 2 pages for smooth scrolling...');
        preloadNextPages([page + 1, page + 2]);
      } else if (hasMore && !isPreloading && preloadedPhotos.length === 0) {
        // For subsequent pages, preload next page
        preloadNextPage(page + 1);
      }

    } catch (error: any) {
      console.error('[HomeScreen] Error loading photos (network may be offline):', error);

      // Even if cloud photo loading fails (offline), still show local photos
      if (page === 1 && !isMerging) {
        console.log('[HomeScreen] Network error - loading local photos only');
        setPhotos([]); // No cloud photos

        // Load local photos even when offline
        setIsMerging(true);
        photoMergeService.mergePhotosInBackground([], (fullyMerged) => {
          try {
            if (!isMountedRef.current) return;

            console.log('[HomeScreen] Offline mode - showing', fullyMerged.length, 'local photos');
            if (activeFilter === 'Recent' && isMountedRef.current) {
              setMergedPhotos(fullyMerged);
            }
          } catch (mergeError) {
            console.error('[HomeScreen] Error loading local photos:', mergeError);
          } finally {
            if (isMountedRef.current) {
              setIsMerging(false);
            }
          }
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  /**
   * Preload next page in background (50 photos buffer)
   * This ensures instant loading when user scrolls
   */
  const preloadNextPage = async (nextPage: number) => {
    if (isPreloading || !hasMorePhotos) return;
    
    try {
      setIsPreloading(true);
      console.log(`[HomeScreen] Preloading page ${nextPage}...`);
      
      const response = await photoService.getPhotos(nextPage, PER_PAGE);
      const preloaded = response.data?.photos || [];
      
      if (preloaded.length > 0) {
        setPreloadedPhotos(preloaded);
        console.log(`[HomeScreen] Preloaded ${preloaded.length} photos for page ${nextPage}`);
      }
    } catch (error) {
      console.error('[HomeScreen] Preload error:', error);
    } finally {
      setIsPreloading(false);
    }
  };

  /**
   * Preload multiple pages in parallel (for initial load)
   * Preloads next 2 pages for smooth scrolling experience
   */
  const preloadNextPages = async (pages: number[]) => {
    if (isPreloading || !hasMorePhotos) return;
    
    try {
      setIsPreloading(true);
      console.log(`[HomeScreen] Preloading pages ${pages.join(', ')} in parallel...`);
      
      // Load all pages in parallel
      const preloadPromises = pages.map(async (page, index) => {
        try {
          const response = await photoService.getPhotos(page, PER_PAGE);
          const preloaded = response.data?.photos || [];
          
          if (preloaded.length > 0) {
            console.log(`[HomeScreen] Preloaded ${preloaded.length} photos for page ${page}`);
            
            // Store in appropriate buffer
            if (index === 0) {
              setPreloadedPhotos(preloaded);
            } else if (index === 1) {
              setPreloadedPhotosPage2(preloaded);
            }
            
            return preloaded;
          }
          return [];
        } catch (error) {
          console.error(`[HomeScreen] Error preloading page ${page}:`, error);
          return [];
        }
      });
      
      await Promise.all(preloadPromises);
      console.log('[HomeScreen] Finished preloading next pages');
    } catch (error) {
      console.error('[HomeScreen] Preload error:', error);
    } finally {
      setIsPreloading(false);
    }
  };

  /**
   * Load more photos - uses preloaded buffer if available
   * Supports 2-page preload buffer for ultra-smooth scrolling
   */
  const loadMorePhotos = () => {
    if (!isLoadingMore && hasMorePhotos && !isLoading) {
      const nextPage = currentPage + 1;
      
      // Check if we have preloaded photos (page 2 buffer)
      if (preloadedPhotos.length > 0) {
        console.log('[HomeScreen] Using preloaded photos buffer, next page:', nextPage);
        setIsLoadingMore(true);
        
        // Use preloaded photos instantly (show thumbnails immediately)
        const instantMerged = photoMergeService.cloudPhotosToMerged(preloadedPhotos);
        
        // Update photos state
        setPhotos(prev => {
          const updated = [...prev, ...preloadedPhotos];
          
          // Merge in background with all photos (only if not already merging)
          if (!isMerging) {
            setIsMerging(true);
            photoMergeService.mergePhotosInBackground(updated, (fullyMerged) => {
              try {
                // Only update if component is still mounted
                if (!isMountedRef.current) {
                  console.log('[HomeScreen] Component unmounted, skipping merge update from preload');
                  return;
                }
                
                if (activeFilter === 'Recent' && isMountedRef.current) {
                  setMergedPhotos(fullyMerged);
                }
              } catch (error) {
                console.error('[HomeScreen] Error updating merged photos from preload:', error);
              } finally {
                if (isMountedRef.current) {
                  setIsMerging(false);
                  setIsLoadingMore(false);
                }
              }
            });
          } else {
            setIsLoadingMore(false);
          }
          
          return updated;
        });
        
        // Update merged photos instantly with thumbnails
        setMergedPhotos(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPhotos = instantMerged.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPhotos].sort((a, b) => 
            b.capturedAt.getTime() - a.capturedAt.getTime()
          );
        });
        
        setCurrentPage(nextPage);
        
        // Move page 3 buffer to page 2 buffer, then preload new page 3
        setPreloadedPhotos(preloadedPhotosPage2);
        setPreloadedPhotosPage2([]);
        
        // Immediately preload next page (keep 2 pages in backup)
        if (hasMorePhotos && !isPreloading && nextPage + 1 <= currentPage + PRELOAD_PAGES_AHEAD) {
          preloadNextPage(nextPage + 1);
        }
      } else {
        // No preload buffer, load normally
        console.log('[HomeScreen] Loading more photos, next page:', nextPage);
        loadPhotos(nextPage, true);
      }
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    if (activeFilter === 'Recent') {
      loadPhotos(); // Now includes merging with device photos
    } else if (activeFilter === 'Albums') {
      loadAlbums();
    } else if (activeFilter === 'People') {
      loadPeople();
    }
  };

  const loadAlbums = async () => {
    try {
      setIsLoadingAlbums(true);
      const response = await albumService.getAlbums();
      if (response.data) {
        setAlbums(response.data.albums);
      }
    } catch (error) {
      console.error('Error loading albums:', error);
    } finally {
      setIsLoadingAlbums(false);
      setIsRefreshing(false);
    }
  };

  const loadPeople = async () => {
    try {
      setIsLoadingPeople(true);
      const response = await peopleService.getPeople();
      if (response.data) {
        setPeople(response.data.people || []);
      }
    } catch (error) {
      console.error('Error loading people:', error);
    } finally {
      setIsLoadingPeople(false);
      setIsRefreshing(false);
    }
  };

  const loadDevicePhotos = async () => {
    try {
      setIsLoadingDevicePhotos(true);
      const grouped = await devicePhotoService.getPhotosByDate();
      setDevicePhotos(grouped);
    } catch (error: any) {
      console.error('Error loading device photos:', error);
      // Don't show error to user, just log it
      // User might not have granted permission yet
    } finally {
      setIsLoadingDevicePhotos(false);
    }
  };

  const normalizeThumbnailUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    // Extract base URL from API_CONFIG (remove /api/v1)
    const baseUrl = API_CONFIG.BASE_URL.replace('/api/v1', '').replace(/\/$/, '');
    
    // If URL is already absolute and starts with http
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Replace localhost/127.0.0.1 with the actual server host for physical devices
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        // Extract the path from the original URL
        const urlPath = url.replace(/https?:\/\/[^\/]+/, '');
        // Construct new URL with correct host
        return `${baseUrl}${urlPath}`;
      }
      // Already has correct host, use as-is
      return url;
    }
    
    // If relative URL, make it absolute
    return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
  };

  const getPersonDisplayName = (person: Person): string => {
    return person.name || `Person ${person.id}`;
  };

  const getPersonThumbnailUrl = (person: Person): string | null => {
    return normalizeThumbnailUrl(person.thumbnail_url);
  };

  const formatPhotoCount = (count: number): string => {
    if (count === 0) return 'No photos';
    if (count === 1) return '1 photo';
    if (count < 1000) return `${count} photos`;
    return `${(count / 1000).toFixed(1)}K photos`;
  };

  // Check upload status for a specific date
  const checkDateUploadStatus = async (dateString: string) => {
    try {
      const targetDate = parseDateString(dateString);
      
      // Get server photos for this date
      const datePhotos = photos.filter(photo => {
        const photoDate = photo.captured_at 
          ? new Date(photo.captured_at)
          : new Date(photo.created_at);
        return isSameDay(photoDate, targetDate);
      });

      // For now, if we have photos on server for this date, 
      // we consider them as uploaded (simplified logic)
      // In a full implementation, we'd compare with device photos count
      const uploadedCount = datePhotos.length;
      const allUploaded = uploadedCount > 0; // Simplified: if photos exist on server, consider uploaded

      setDateUploadStatus(prev => ({
        ...prev,
        [dateString]: {
          allUploaded,
          uploadedCount,
          totalCount: uploadedCount, // This would be device photo count in full implementation
        },
      }));
    } catch (error) {
      console.error('Error checking date upload status:', error);
    }
  };

  // Load device photos for a specific date and filter unuploaded ones
  const getUnuploadedPhotosForDate = async (dateString: string): Promise<SelectedPhoto[]> => {
    try {
      const targetDate = parseDateString(dateString);
      const dayStart = getDayStart(targetDate);
      const dayEnd = getDayEnd(targetDate);

      // Open photo picker to get device photos
      // Note: react-native-image-picker doesn't support date filtering directly,
      // so we'll get all photos and filter them
      const allDevicePhotos = await pickPhotos({maxSelection: 500});
      
      if (allDevicePhotos.length === 0) {
        return [];
      }

      // Get uploaded photos tracking
      const uploadedPhotos = await uploadTrackingService.getUploadedPhotos();
      const uploadedIds = new Set(uploadedPhotos.map(p => p.deviceId));

      // Filter photos by date and exclude already uploaded ones
      const unuploadedPhotos = allDevicePhotos.filter(photo => {
        // Check if photo is from the target date
        const photoDate = photo.timestamp ? new Date(photo.timestamp) : new Date();
        const isInDateRange = photoDate >= dayStart && photoDate <= dayEnd;
        
        // Check if photo is not uploaded
        const isNotUploaded = !uploadedIds.has(photo.id || photo.uri);
        
        return isInDateRange && isNotUploaded;
      });

      return unuploadedPhotos;
    } catch (error) {
      console.error('Error getting unuploaded photos for date:', error);
      return [];
    }
  };

  const handleUploadDatePhotos = async (date: string) => {
    try {
      // Check current status
      const dateStatus = dateUploadStatus[date];
      if (dateStatus?.allUploaded) {
        // Show menu options if all uploaded
        Alert.alert(
          'Date Options',
          'All photos for this date are uploaded',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Upload More', onPress: async () => {
              // User wants to upload more, so proceed with picker
              const unuploadedPhotos = await getUnuploadedPhotosForDate(date);
              if (unuploadedPhotos.length > 0) {
                await uploadSelectedPhotos(unuploadedPhotos, date);
              } else {
                Alert.alert('Info', 'No new photos found for this date');
              }
            }},
          ],
        );
        return;
      }

      // Get unuploaded photos for this date
      const unuploadedPhotos = await getUnuploadedPhotosForDate(date);
      
      if (unuploadedPhotos.length === 0) {
        Alert.alert('Info', 'All photos for this date are already uploaded');
        // Update status
        setDateUploadStatus(prev => ({
          ...prev,
          [date]: {allUploaded: true, uploadedCount: 0, totalCount: 0},
        }));
        return;
      }

      // Confirm upload
      Alert.alert(
        'Upload Photos',
        `Upload ${unuploadedPhotos.length} unuploaded photo(s) from ${date}?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Upload',
            onPress: async () => {
              await uploadSelectedPhotos(unuploadedPhotos, date);
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to get photos');
    }
  };

  const uploadSelectedPhotos = async (selectedPhotos: SelectedPhoto[], date: string) => {
    try {
      // Set uploading state
      setUploadingDates(prev => ({
        ...prev,
        [date]: {isUploading: true, uploaded: 0, total: selectedPhotos.length},
      }));

      // Upload photos
      const uploadResponse = await photoService.uploadPhotos(selectedPhotos);

      if (uploadResponse.error) {
        Alert.alert('Upload Failed', uploadResponse.error);
        setUploadingDates(prev => ({
          ...prev,
          [date]: {isUploading: false, uploaded: 0, total: 0},
        }));
        return;
      }

      // Track uploaded photos
      const results = uploadResponse.data?.results || {};
      const successful = results.successful || [];
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

      // Update date upload status
      await checkDateUploadStatus(date);

      // Mark as completed
      const allUploadedNow = successful.length === selectedPhotos.length;
      setUploadingDates(prev => ({
        ...prev,
        [date]: {isUploading: false, uploaded: successful.length, total: selectedPhotos.length},
      }));

      // Update date status
      setDateUploadStatus(prev => ({
        ...prev,
        [date]: {
          allUploaded: allUploadedNow,
          uploadedCount: successful.length,
          totalCount: selectedPhotos.length,
        },
      }));

      // Refresh photos
      await loadPhotos();

      Alert.alert('Success', `Uploaded ${successful.length} photo(s)`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload photos');
      setUploadingDates(prev => ({
        ...prev,
        [date]: {isUploading: false, uploaded: 0, total: 0},
      }));
    }
  };

  const handleUploadAllPhotos = async () => {
    try {
      const selectedPhotos = await pickPhotos({maxSelection: 200});
      
      if (selectedPhotos.length === 0) {
        return;
      }

      Alert.alert(
        'Upload Photos',
        `Upload ${selectedPhotos.length} photo(s)?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Upload',
            onPress: async () => {
              try {
                const uploadResponse = await photoService.uploadPhotos(selectedPhotos);
                if (uploadResponse.error) {
                  Alert.alert('Upload Failed', uploadResponse.error);
                } else {
                  await loadPhotos();
                  Alert.alert('Success', `Uploaded ${selectedPhotos.length} photo(s)`);
                }
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to upload photos');
              }
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick photos');
    }
  };

  const getAlbumCoverUrl = (album: Album): string | null => {
    if (!album.cover_photo_url) return null;
    if (album.cover_photo_url.startsWith('http')) {
      return album.cover_photo_url;
    }
    return `${API_CONFIG.BASE_URL.replace('/api/v1', '')}${album.cover_photo_url}`;
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleAlbumCreated = () => {
    loadAlbums();
  };

  // Handle uploading local-only photos
  const handleUploadLocalPhotos = async (localPhotos: MergedPhoto[]) => {
    if (localPhotos.length === 0) return;

    // Get the date from the first photo for tracking
    const date = localPhotos[0].capturedAt.toISOString().split('T')[0];

    try {
      console.log('[HomeScreen] Uploading', localPhotos.length, 'local photos for date', date);

      // Set initial uploading state
      setUploadingDates(prev => ({
        ...prev,
        [date]: {isUploading: true, uploaded: 0, total: localPhotos.length},
      }));

      let uploadedCount = 0;
      const tempFilesToCleanup: string[] = []; // Track temporary files for cleanup

      for (const photo of localPhotos) {
        let photoUri = photo.originalUri || photo.uri;
        if (!photoUri) {
          console.warn('[HomeScreen] Skipping photo without URI:', photo.filename);
          continue;
        }

        // Convert ph:// URIs to file:// URIs for iOS uploads
        let tempFileUri: string | null = null;
        if (photoUri.startsWith('ph://')) {
          try {
            // Lazy import react-native-fs only when needed (iOS ph:// URI conversion)
            const RNFS = require('react-native-fs').default;
            if (!RNFS) {
              console.warn('[HomeScreen] react-native-fs not available, skipping ph:// conversion');
              continue;
            }
            const fileExtension = photo.filename.split('.').pop() || 'jpg';
            const tempFileName = `photonix_upload_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
            const destPath = `${RNFS.TemporaryDirectoryPath}/${tempFileName}`;
            await RNFS.copyAssetsFileIOS(photoUri, destPath, 0, 0);
            tempFileUri = `file://${destPath}`;
            tempFilesToCleanup.push(destPath);
            photoUri = tempFileUri;
          } catch (error: any) {
            console.error('[HomeScreen] Error converting ph:// URI to file URI:', error);
            continue;
          }
        }

        const file = {
          uri: photoUri,
          type: 'image/jpeg',
          name: photo.filename,
        };

        // Include the original capture date when uploading
        const capturedAt = photo.capturedAt?.toISOString();
        const result = await photoService.uploadPhoto(file, capturedAt);

        if (result.data?.photo) {
          const cloudId = result.data.photo.id;
          const cloudPhotoData = result.data.photo;
          
          // Track the upload
          await uploadTracker.markAsUploaded(photo.originalUri || photo.uri, cloudId);
          uploadedCount++;

          // Update progress
          setUploadingDates(prev => ({
            ...prev,
            [date]: {isUploading: true, uploaded: uploadedCount, total: localPhotos.length},
          }));

          // Update mergedPhotos state in-place to change icon from cloud to checkmark
          setMergedPhotos(prev => prev.map(p => {
            const photoUriToCheck = p.originalUri || p.uri;
            if (photoUriToCheck === (photo.originalUri || photo.uri) && p.syncStatus === 'local_only' && result.data?.photo) {
              // Get cloud thumbnail URI, but keep local URI as fallback if thumbnails aren't ready yet
              const cloudThumbnailUri = photoMergeService.getCloudPhotoUri(cloudPhotoData);
              const displayUri = cloudThumbnailUri || p.uri; // Use cloud thumbnail if available, otherwise keep local URI
              
              // Update this photo to show as uploaded
              const updatedPhoto = {
                ...p,
                syncStatus: 'uploaded' as const,
                isUploaded: true,
                cloudId: cloudId,
                cloudData: cloudPhotoData,
                // Update URI to use cloud thumbnail if available, otherwise keep local URI
                uri: displayUri,
                // Keep originalUri for reference
                originalUri: p.originalUri || p.uri,
              };

              // Immediately fetch photo details to get thumbnails (retry if not ready)
              const fetchThumbnails = async (retryCount = 0) => {
                try {
                  const photoDetailResponse = await photoService.getPhoto(cloudId);
                  if (photoDetailResponse.data?.photo) {
                    const updatedCloudPhoto = photoDetailResponse.data.photo;
                    const updatedThumbnailUri = photoMergeService.getCloudPhotoUri(updatedCloudPhoto);
                    
                    // Update the photo with new thumbnail URI if available
                    if (updatedThumbnailUri) {
                      setMergedPhotos(prev => prev.map(prevPhoto => {
                        if (prevPhoto.cloudId === cloudId && prevPhoto.syncStatus === 'uploaded') {
                          return {
                            ...prevPhoto,
                            uri: updatedThumbnailUri,
                            cloudData: updatedCloudPhoto,
                          };
                        }
                        return prevPhoto;
                      }));
                    } else if (updatedCloudPhoto.processing_status !== 'completed' && retryCount < 5) {
                      // If still processing and haven't retried too many times, retry after delay
                      setTimeout(() => fetchThumbnails(retryCount + 1), 2000);
                    }
                  }
                } catch (error) {
                  console.error('[HomeScreen] Error fetching updated photo details:', error);
                  // Retry if we haven't tried too many times
                  if (retryCount < 3) {
                    setTimeout(() => fetchThumbnails(retryCount + 1), 2000);
                  }
                }
              };

              // Start fetching thumbnails immediately
              fetchThumbnails();

              return updatedPhoto;
            }
            return p;
          }));

          console.log('[HomeScreen] Uploaded and tracked:', photo.filename, '→', cloudId, `(${uploadedCount}/${localPhotos.length})`);
        }
      }

      // Clean up temporary files
      if (tempFilesToCleanup.length > 0) {
        try {
          // Lazy import react-native-fs only when needed
          const RNFS = require('react-native-fs').default;
          if (RNFS) {
            for (const tempFilePath of tempFilesToCleanup) {
              try {
                await RNFS.unlink(tempFilePath);
                console.log('[HomeScreen] Cleaned up temporary file:', tempFilePath);
              } catch (cleanupError) {
                console.error('[HomeScreen] Error cleaning up temporary file:', tempFilePath, cleanupError);
              }
            }
          }
        } catch (error) {
          console.warn('[HomeScreen] react-native-fs not available for cleanup:', error);
        }
      }

      // Mark as completed
      setUploadingDates(prev => ({
        ...prev,
        [date]: {isUploading: false, uploaded: uploadedCount, total: localPhotos.length},
      }));

      // No need to reload photos - we've updated them in-place
      // No success alert - icons update automatically
    } catch (error: any) {
      console.error('[HomeScreen] Error uploading local photos:', error);
      // Set error state
      setUploadingDates(prev => ({
        ...prev,
        [date]: {isUploading: false, uploaded: 0, total: 0},
      }));
      Alert.alert('Error', error.message || 'Failed to upload photos');
    }
  };

  // Group photos by date (server photos)
  const groupPhotosByDate = () => {
    const grouped: {[key: string]: Photo[]} = {};
    
    photos.forEach(photo => {
      const date = photo.captured_at 
        ? new Date(photo.captured_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : new Date(photo.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
      
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(photo);
    });

    return grouped;
  };


  // Get thumbnail URL - prioritizing small thumbnails (200px) for the grid
  const getThumbnailUrl = (photo: Photo): string => {
    // Prioritize small thumbnail first, then medium, then large as fallback
    const url = photo.thumbnail_urls?.small || photo.thumbnail_urls?.medium || photo.thumbnail_urls?.large || '';
    
    if (!url) {
      console.warn('No thumbnail URL for photo:', photo.id, 'Status:', photo.processing_status);
      return '';
    }
    
    // Log which size we're using (for debugging)
    const size = photo.thumbnail_urls?.small ? 'small' : photo.thumbnail_urls?.medium ? 'medium' : 'large';
    if (__DEV__) {
      console.log(`Using ${size} thumbnail for photo ${photo.id}`);
    }
    
    if (url.startsWith('http')) {
      return url; // Already absolute URL from backend
    }
    // If relative URL, prepend base URL (fallback)
    const baseUrl = API_CONFIG.BASE_URL.replace('/api/v1', '');
    return `${baseUrl}${url}`;
  };

  const renderRecentView = () => {
    // Show skeleton loader when initially loading
    if ((isLoading && photos.length === 0) || (isLoadingDevicePhotos && Object.keys(devicePhotos).length === 0)) {
      return (
        <View style={styles.skeletonContainer}>
          <View style={styles.skeletonDateHeader}>
            <View style={styles.skeletonDateText} />
            <View style={styles.skeletonUploadButton} />
          </View>
          <PhotoSkeleton count={9} />
          <View style={styles.skeletonDateHeader}>
            <View style={styles.skeletonDateText} />
            <View style={styles.skeletonUploadButton} />
          </View>
          <PhotoSkeleton count={6} />
        </View>
      );
    }

    if (getMergedPhotosByDate.length === 0 && !isLoading && !isLoadingDevicePhotos) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No photos yet</Text>
          <Text style={styles.emptySubtext}>Upload your first photo to get started</Text>
      </View>
      );
    }

    return (
      <>
        {getMergedPhotosByDate.map(({date, dateHeader, photos}) => {
          const uploadState = uploadingDates[date];
          const localOnlyPhotos = photos.filter(p => p.syncStatus === 'local_only');
          const hasLocalPhotos = localOnlyPhotos.length > 0;
          const totalPhotos = photos.length;
          
          return (
            <View key={`${date}-${totalPhotos}`}>
              <View style={styles.dateHeaderContainer}>
                <Text style={styles.dateHeader}>{dateHeader}</Text>
                {hasLocalPhotos && (
                  <UploadButton
                    onPress={() => handleUploadLocalPhotos(localOnlyPhotos)}
                    isUploading={uploadState?.isUploading || false}
                    uploadedCount={uploadState?.uploaded}
                    totalCount={uploadState?.total}
                    showMenu={false}
                    isAllUploaded={false}
                  />
                )}
              </View>
              <View style={styles.grid}>
              {/* Render all merged photos (deduplicated, sorted by capture date) */}
              {photos.map((photo: MergedPhoto, index: number) => {
                const isLocalOnly = photo.syncStatus === 'local_only';
                const isUploaded = photo.syncStatus === 'uploaded';

                return (
                  <View key={`${photo.id}_${index}_${photo.uri}`} style={styles.photoThumbnail}>
                    <TouchableOpacity
                      style={styles.photoTouchable}
                      onPress={() => {
                        // Use memoized photo list (already computed, no recalculation)
                        const currentIndex = allMergedPhotosForNavigation.findIndex(p => p.id === photo.id);
                        
                        // For uploaded photos, open in viewer with cloud ID
                        if (photo.cloudId) {
                          navigation.navigate('PhotoViewer', {
                            photoId: photo.cloudId,
                            photoList: photoListForNavigation,
                            initialIndex: currentIndex >= 0 ? currentIndex : 0,
                          });
                        } else {
                          // For local-only photos, open with local URI
                          navigation.navigate('PhotoViewer', {
                            localUri: photo.uri,
                            photoTitle: photo.filename,
                            photoList: photoListForNavigation,
                            initialIndex: currentIndex >= 0 ? currentIndex : 0,
                          });
                        }
                      }}>
                      {/* Use AuthImage for cloud photos with thumbnails, Image for local photos or fallback */}
                      {(() => {
                        // Determine which image to show
                        const hasCloudThumbnail = isUploaded && photo.cloudId && photo.uri && photo.uri.startsWith('http');
                        const localUri = photo.originalUri || photo.uri;
                        
                        if (hasCloudThumbnail) {
                          // Use AuthImage for cloud thumbnails, with local fallback
                          return (
                        <AuthImage
                              key={`cloud_${photo.cloudId}_${photo.uri}`} // Force re-render when URI changes
                          source={{uri: photo.uri}}
                              fallbackSource={localUri ? {uri: localUri} : undefined}
                          style={styles.photoImage}
                          resizeMode="cover"
                        />
                          );
                        } else {
                          // Use local image (either local-only or fallback for uploaded photos without thumbnails)
                          return (
                        <Image
                              key={`local_${photo.id}_${localUri}`} // Force re-render when URI changes
                              source={{uri: localUri || ''}}
                          style={styles.photoImage}
                          resizeMode="cover"
                        />
                          );
                        }
                      })()}
                    </TouchableOpacity>
                    {/* Sync status indicator */}
                    <View style={styles.photoStatusIndicator}>
                      {isLocalOnly && (
                        <Icon name="cloud-upload-outline" size={18} color="#ffffff" />
                      )}
                      {isUploaded && (
                        <PhotoUploadStatus isUploaded={true} size={18} />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
            );
          })}
    </>
  );
  };

  const renderPeopleView = () => {
    if (isLoadingPeople && people.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading people...</Text>
        </View>
      );
    }

    if (people.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No people detected yet</Text>
          <Text style={styles.emptySubtext}>
            Upload photos with faces to see people here
          </Text>
        </View>
      );
    }

    return (
      <>
        <Text style={styles.dateHeader}>People</Text>
        <View style={styles.peopleGrid}>
          {people.map((person) => {
            const thumbnailUrl = getPersonThumbnailUrl(person);
            return (
              <TouchableOpacity
                key={person.id}
                style={styles.peopleThumbnail}
                onPress={() => {
                  // Navigate to People tab's PersonDetail screen
                  // We need to navigate to the People stack first
                  const rootNavigation = navigation.getParent();
                  if (rootNavigation) {
                    // @ts-ignore - Navigating to tab navigator
                    rootNavigation.navigate('People', {
                      screen: 'PersonDetail',
                      params: {
                        personId: person.id,
                        personName: getPersonDisplayName(person),
                      },
                    });
                  }
                }}>
                <AuthenticatedImage
                  uri={thumbnailUrl}
                  style={styles.peoplePlaceholder}
                  placeholderStyle={styles.peoplePlaceholder}
                  resizeMode="cover"
                />
                <Text style={styles.peopleName} numberOfLines={1}>
                  {getPersonDisplayName(person)}
                </Text>
                <Text style={styles.peopleCount}>
                  {formatPhotoCount(person.photo_count)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );
  };

  const renderAlbumsView = () => {
    if (isLoadingAlbums && albums.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading albums...</Text>
        </View>
      );
    }

    if (albums.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No albums yet</Text>
          <Text style={styles.emptySubtext}>
            Create your first album to organize photos
          </Text>
        </View>
      );
    }

    // Separate albums by type
    const autoAlbums = albums.filter(album => album.album_type === 'smart' || album.album_type === 'date_based');
    const myAlbums = albums.filter(album => album.album_type === 'manual');

    return (
      <>
        {autoAlbums.length > 0 && (
          <>
            <Text style={styles.dateHeader}>Auto Albums</Text>
            <View style={styles.grid}>
              {autoAlbums.map(album => {
                const coverUrl = getAlbumCoverUrl(album);
                return (
                  <TouchableOpacity 
                    key={album.id} 
                    style={styles.albumThumbnail}
                    onPress={() => {
                      navigation.navigate('AlbumDetail', {
                        albumId: album.id,
                        albumName: album.name,
                      });
                    }}
                    activeOpacity={0.8}>
                    {coverUrl ? (
                      <AuthImage
                        source={{uri: coverUrl}}
                        style={styles.albumImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.albumPlaceholder}>
                        <Icon name="albums-outline" size={32} color="#999999" />
                      </View>
                    )}
                    <Text style={styles.albumName} numberOfLines={1}>{album.name}</Text>
                    <Text style={styles.albumPhotoCount}>
                      {album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
        {myAlbums.length > 0 && (
          <>
            <Text style={styles.dateHeader}>My Albums</Text>
            <View style={styles.grid}>
              {myAlbums.map(album => {
                const coverUrl = getAlbumCoverUrl(album);
                return (
                  <TouchableOpacity 
                    key={album.id} 
                    style={styles.albumThumbnail}
                    onPress={() => {
                      navigation.navigate('AlbumDetail', {
                        albumId: album.id,
                        albumName: album.name,
                      });
                    }}
                    activeOpacity={0.8}>
                    {coverUrl ? (
                      <AuthImage
                        source={{uri: coverUrl}}
                        style={styles.albumImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.albumPlaceholder}>
                        <Icon name="albums-outline" size={32} color="#999999" />
                      </View>
                    )}
                    <Text style={styles.albumName} numberOfLines={1}>{album.name}</Text>
                    <Text style={styles.albumPhotoCount}>
                      {album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </>
    );
  };

  const renderContent = () => {
    switch (activeFilter) {
      case 'People':
        return renderPeopleView();
      case 'Albums':
        return renderAlbumsView();
      default:
        return renderRecentView();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Network Status Banner */}
      <NetworkStatusBanner />

      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <Text style={styles.appName}>Photonix</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={[styles.tab, activeFilter === 'Recent' && styles.tabActive]}
            onPress={() => setActiveFilter('Recent')}>
            <Text style={[styles.tabText, activeFilter === 'Recent' && styles.tabTextActive]}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeFilter === 'People' && styles.tabActive]}
            onPress={() => setActiveFilter('People')}>
            <Text style={[styles.tabText, activeFilter === 'People' && styles.tabTextActive]}>People</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeFilter === 'Albums' && styles.tabActive]}
            onPress={() => setActiveFilter('Albums')}>
            <Text style={[styles.tabText, activeFilter === 'Albums' && styles.tabTextActive]}>Albums</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content based on active filter */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.gridContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        onScroll={({nativeEvent}) => {
          // Detect when user scrolls near bottom and load more
          const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
          const paddingToBottom = 300; // Trigger load when 300px from bottom
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom;

          if (isCloseToBottom && activeFilter === 'Recent') {
            loadMorePhotos();
          }
          
          // Always keep next page preloaded (50 photos in backup)
          // Preload when buffer is empty and user is scrolling
          if (hasMorePhotos && !isPreloading && preloadedPhotos.length === 0) {
            // Preload next page immediately to keep buffer ready
            preloadNextPage(currentPage + 1);
          }
        }}
        scrollEventThrottle={400}>
        {renderContent()}

        {/* Loading indicator for pagination */}
        {isLoadingMore && (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color="#666666" />
            <Text style={styles.loadMoreText}>Loading more photos...</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button - Show only on Albums tab */}
      {activeFilter === 'Albums' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleOpenCreateModal}
          activeOpacity={0.8}>
          <Icon name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Create Album Modal */}
      <CreateAlbumModal
        visible={showCreateModal}
        onClose={handleCloseCreateModal}
        onSuccess={handleAlbumCreated}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  tabText: {
    fontSize: 16,
    color: '#666666',
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    padding: 16,
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  },
  peopleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  photoThumbnail: {
    width: '32%',
    aspectRatio: 1,
    marginBottom: 4,
    // Ensure proper flex behavior for rearrangement
    flexShrink: 0,
    flexGrow: 0,
    overflow: 'visible', // Changed to visible to show status indicator
    position: 'relative',
  },
  photoTouchable: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  photoStatusIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  photoPlaceholder: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    overflow: 'hidden', // Ensure content stays inside
  },
      loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
      },
      skeletonContainer: {
        padding: 16,
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
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666666',
  },
  peopleThumbnail: {
    width: '25%',
    aspectRatio: 1,
    marginBottom: 16,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  peoplePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 9999,
    marginBottom: 4,
  },
  peopleName: {
    fontSize: 12,
    color: '#000000',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 4,
  },
  peopleCount: {
    fontSize: 10,
    color: '#666666',
    textAlign: 'center',
    marginTop: 2,
  },
  albumThumbnail: {
    width: '32%',
    marginBottom: 16,
  },
  albumImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  albumPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginTop: 8,
  },
      albumPhotoCount: {
        fontSize: 12,
        color: '#666666',
        marginTop: 2,
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
      loadMoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 12,
      },
      loadMoreText: {
        fontSize: 14,
        color: '#666666',
      },
      skeletonDateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 16,
        paddingHorizontal: 0,
      },
      skeletonDateText: {
        width: 120,
        height: 20,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        opacity: 0.5,
      },
      skeletonUploadButton: {
        width: 40,
        height: 32,
        backgroundColor: '#e0e0e0',
        borderRadius: 8,
        opacity: 0.5,
      },
    });

