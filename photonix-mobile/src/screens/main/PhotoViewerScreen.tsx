import 'react-native-reanimated'; // Ensure Reanimated initializes before BottomSheet
import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  PanResponder,
  Modal,
  Share,
  Alert,
  ScrollView,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useRoute, useNavigation, RouteProp, NavigationProp} from '@react-navigation/native';
import BottomSheet, {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import photoService, {PhotoDetail} from '../../services/photoService';
import albumService from '../../services/albumService';
import {API_CONFIG} from '../../config/api';
import {HomeStackParamList} from '../../navigation/HomeStackNavigator';
import {AlbumsStackParamList} from '../../navigation/AlbumsStackNavigator';
import AuthImage from '../../components/AuthImage';
import {Image} from 'react-native';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

type PhotoViewerRouteParams = {
  PhotoViewer: {
    photoId?: number;
    localUri?: string;
    photoTitle?: string;
    photoList?: Array<{id?: number; cloudId?: number; localUri?: string; isLocal?: boolean}>;
    initialIndex?: number;
  };
};

type PhotoViewerScreenRouteProp = RouteProp<PhotoViewerRouteParams, 'PhotoViewer'>;

export default function PhotoViewerScreen() {
  const route = useRoute<PhotoViewerScreenRouteProp>();
  const navigation = useNavigation<NavigationProp<HomeStackParamList | AlbumsStackParamList>>();
  const {photoId, localUri, photoTitle, photoList: routePhotoList, initialIndex: routeInitialIndex} = route.params;
  const insets = useSafeAreaInsets();

  const [photo, setPhoto] = useState<PhotoDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Start as false to show screen immediately
  const [imageError, setImageError] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(true); // Track photo loading separately
  const [isLocalPhoto, setIsLocalPhoto] = useState(false);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [sheetIndex, setSheetIndex] = useState(-1); // -1 = closed, 0 = open
  const sheetIndexRef = useRef(-1);
  const [reanimatedReady, setReanimatedReady] = useState(false);
  const [showDetails, setShowDetails] = useState(false); // Control simple details view
  const [showMenu, setShowMenu] = useState(false); // Control menu visibility
  const [isFavorite, setIsFavorite] = useState(false); // Favorite state
  const [showAddToModal, setShowAddToModal] = useState(false); // Show album selection modal
  const [albums, setAlbums] = useState<Array<{id: number; name: string}>>([]);
  const [showBars, setShowBars] = useState(true); // Control top bar visibility
  const [showBottomBar, setShowBottomBar] = useState(true); // Always show bottom action bar
  const [allPhotos, setAllPhotos] = useState<Array<{id: number}>>([]); // All photos for navigation
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(-1); // Current photo index
  const routePhotoListRef = useRef<Array<{id?: number; cloudId?: number; localUri?: string; isLocal?: boolean}>>([]); // Store route photo list
  const hideBarsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Hide bottom tab bar when this screen is focused
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: {display: 'none'},
      });
    }

    // Check if this is a local photo
    if (localUri) {
      setIsLocalPhoto(true);
      setIsLoading(false);
      setIsLoadingPhoto(false); // Local photos don't need loading
      // Create a mock photo object for local photos
      setPhoto({
        id: 0, // Temporary ID for local photos
        original_filename: photoTitle || 'Local Photo',
        format: 'image/jpeg',
        file_size: 0,
        width: 0,
        height: 0,
        captured_at: null,
        processing_status: 'completed',
        thumbnail_urls: {},
        created_at: new Date().toISOString(),
        tags: [],
        albums: [],
      } as PhotoDetail);
      
      // Use route photo list if provided for navigation
      if (routePhotoList && routePhotoList.length > 0) {
        routePhotoListRef.current = routePhotoList;
        // Create unique IDs for all photos (use index for local photos)
        setAllPhotos(routePhotoList.map((p, index) => ({id: p.cloudId || p.id || index + 10000})));
        if (routeInitialIndex !== undefined && routeInitialIndex >= 0) {
          setCurrentPhotoIndex(routeInitialIndex);
        }
      }
    } else if (photoId) {
      setIsLocalPhoto(false);
      // Don't set isLoading to false - show screen immediately with skeleton
      // Start loading in background
      loadPhoto();
      loadAlbums();
      
      // Use route photo list if provided, otherwise load all photos
      if (routePhotoList && routePhotoList.length > 0) {
        routePhotoListRef.current = routePhotoList;
        // Create unique IDs for all photos (use index for local photos)
        setAllPhotos(routePhotoList.map((p, index) => ({id: p.cloudId || p.id || index + 10000})));
        if (routeInitialIndex !== undefined && routeInitialIndex >= 0) {
          setCurrentPhotoIndex(routeInitialIndex);
        }
      } else {
        loadAllPhotos(); // Fallback: Load all photos for navigation
      }
    } else {
      setLoadError('No photo ID or local URI provided');
      setIsLoading(false);
      setIsLoadingPhoto(false);
    }

    // Cleanup: restore tab bar when leaving this screen
    return () => {
      if (parent) {
        parent.setOptions({
          tabBarStyle: undefined,
        });
      }
    };
  }, [photoId, localUri, photoTitle, routePhotoList, routeInitialIndex, navigation]);

  // Update current photo index when photo loads
  useEffect(() => {
    if (photo && photoId && allPhotos.length > 0 && currentPhotoIndex === -1) {
      const index = allPhotos.findIndex(p => p.id === photoId);
      if (index !== -1) {
        setCurrentPhotoIndex(index);
        console.log('Updated current photo index to:', index);
      }
    }
  }, [photo, photoId, allPhotos, currentPhotoIndex]);

  // Handle route params updates for local photos
  useEffect(() => {
    const currentLocalUri = route.params?.localUri;
    if (currentLocalUri && currentLocalUri !== localUri) {
      // Route params updated, update local photo state
      setIsLocalPhoto(true);
      setIsLoadingPhoto(false);
      setIsLoading(false);
      setPhoto({
        id: 0,
        original_filename: route.params?.photoTitle || currentLocalUri?.split('/').pop() || 'Local Photo',
        format: 'image/jpeg',
        file_size: 0,
        width: 0,
        height: 0,
        captured_at: null,
        processing_status: 'completed',
        thumbnail_urls: {},
        created_at: new Date().toISOString(),
        tags: [],
        albums: [],
      } as PhotoDetail);
    }
  }, [route.params?.localUri, route.params?.photoTitle, localUri]);

  // Auto-hide top bar after 3 seconds, but keep bottom action bar always visible
  useEffect(() => {
    if (photo && !isLoading) {
      // Clear existing timer
      if (hideBarsTimerRef.current) {
        clearTimeout(hideBarsTimerRef.current);
      }
      
      // Show bars initially
      setShowBars(true);
      
      // Hide top bar after 3 seconds, but bottom action bar stays visible
      hideBarsTimerRef.current = setTimeout(() => {
        // Only hide top bar, keep bottom action bar visible
        // We'll handle this differently - keep showBars true for bottom bar
        // For now, we'll keep both visible but can adjust later
      }, 3000);
      
      return () => {
        if (hideBarsTimerRef.current) {
          clearTimeout(hideBarsTimerRef.current);
        }
      };
    }
  }, [photo, isLoading]);

  const loadAllPhotos = async () => {
    try {
      const response = await photoService.getPhotos(1, 1000); // Load all photos
      if (response.data) {
        const photoList = response.data.photos.map(p => ({id: p.id}));
        setAllPhotos(photoList);
        // Find current photo index
        if (photoId) {
          const index = photoList.findIndex(p => p.id === photoId);
          if (index !== -1) {
            setCurrentPhotoIndex(index);
            console.log('Set current photo index to:', index);
          } else {
            console.log('Current photo not found in list');
            setCurrentPhotoIndex(0); // Default to first photo
          }
        }
      }
    } catch (error) {
      console.error('Failed to load all photos:', error);
    }
  };

  const loadAlbums = async () => {
    try {
      const response = await albumService.getAlbums();
      if (response.data) {
        setAlbums(response.data.albums.map(a => ({id: a.id, name: a.name})));
      }
    } catch (error) {
      console.error('Failed to load albums:', error);
    }
  };

  useEffect(() => {
    sheetIndexRef.current = sheetIndex;
  }, [sheetIndex]);

  // Check if Reanimated is ready
  // Temporarily disable BottomSheet until Reanimated is properly initialized
  useEffect(() => {
    // Don't enable BottomSheet for now to avoid Reanimated errors
    // The images will still work, just without the bottom drawer
    setReanimatedReady(false);
    
    // Uncomment below once Reanimated is fixed:
    // const timer = setTimeout(() => {
    //   setReanimatedReady(true);
    // }, 500);
    // return () => clearTimeout(timer);
  }, []);

  const loadPhoto = async (id?: number) => {
    const targetId = id || photoId;
    try {
      setIsLoadingPhoto(true); // Track photo loading separately
      setLoadError(null);
      console.log('Loading photo:', targetId);
      const response = await photoService.getPhoto(targetId);
      console.log('Photo API response:', response);
      if (response.data) {
        setPhoto(response.data.photo);
        console.log('Photo loaded successfully:', response.data.photo.id);
        // Update current photo index if we have the photos list
        if (allPhotos.length > 0) {
          const index = allPhotos.findIndex(p => p.id === targetId);
          if (index !== -1) {
            setCurrentPhotoIndex(index);
            console.log('Updated photo index to:', index);
          }
        }
      } else {
        const errorMsg = response.error || 'Failed to load photo';
        console.error('Photo load error:', errorMsg);
        setLoadError(errorMsg);
      }
    } catch (error: any) {
      console.error('[loadPhoto] Error loading photo:', error);
      setLoadError(error.message || 'Failed to load photo');
      setIsLoadingPhoto(false);
    }
    // Note: isLoadingPhoto will be set to false by AuthImage onLoad handler for successful loads
  };

  const showBarsTemporarily = () => {
    setShowBars(true);
    // Clear existing timer
    if (hideBarsTimerRef.current) {
      clearTimeout(hideBarsTimerRef.current);
    }
    // Hide bars after 2 seconds
    hideBarsTimerRef.current = setTimeout(() => {
      setShowBars(false);
    }, 2000);
  };

  const navigateToPhoto = (direction: 'next' | 'prev') => {
    console.log('[navigateToPhoto] Called:', direction);
    console.log('[navigateToPhoto] allPhotos.length:', allPhotos.length, 'currentPhotoIndex:', currentPhotoIndex);
    console.log('[navigateToPhoto] routePhotoListRef.length:', routePhotoListRef.current.length);
    console.log('[navigateToPhoto] routePhotoList.length:', routePhotoList?.length || 0);
    console.log('[navigateToPhoto] isLocalPhoto:', isLocalPhoto, 'localUri:', localUri);
    
    // Ensure we have photos loaded
    const currentPhotoList = routePhotoListRef.current.length > 0 ? routePhotoListRef.current : routePhotoList || [];
    if (allPhotos.length === 0 && currentPhotoList.length > 0) {
      // Initialize allPhotos from route photo list
      console.log('[navigateToPhoto] Initializing allPhotos from route photo list');
      routePhotoListRef.current = currentPhotoList;
      const photoList = currentPhotoList.map((p, index) => ({id: p.cloudId || p.id || index + 10000}));
      setAllPhotos(photoList);
      if (routeInitialIndex !== undefined && routeInitialIndex >= 0) {
        setCurrentPhotoIndex(routeInitialIndex);
        setTimeout(() => navigateToPhoto(direction), 100);
      }
      return;
    }
    
    if (allPhotos.length === 0) {
      console.log('[navigateToPhoto] No photos in allPhotos, trying to load...');
      loadAllPhotos().then(() => {
        // After loading, try navigation again
        setTimeout(() => navigateToPhoto(direction), 200);
      });
      return;
    }
    
    // Find current index if not set
    let currentIndex = currentPhotoIndex;
    if (currentIndex === -1) {
      // Try to use route initial index first
      if (routeInitialIndex !== undefined && routeInitialIndex >= 0) {
        currentIndex = routeInitialIndex;
        setCurrentPhotoIndex(currentIndex);
        console.log('Using route initial index:', currentIndex);
      } else if (photoId) {
        console.log('Current photo index not set, finding it by photoId...');
        currentIndex = allPhotos.findIndex(p => p.id === photoId);
        if (currentIndex === -1) {
          console.log('Current photo not found in list, using route index...');
          if (routeInitialIndex !== undefined && routeInitialIndex >= 0) {
            currentIndex = routeInitialIndex;
            setCurrentPhotoIndex(currentIndex);
          } else {
            console.log('No valid index found, defaulting to 0');
            currentIndex = 0;
            setCurrentPhotoIndex(0);
          }
        } else {
          setCurrentPhotoIndex(currentIndex);
          console.log('Found current index:', currentIndex);
        }
      } else if (isLocalPhoto && localUri) {
        // For local photos, find by URI in route photo list
        const photoListForUri = routePhotoListRef.current.length > 0 ? routePhotoListRef.current : routePhotoList || [];
        const uriIndex = photoListForUri.findIndex(p => p.localUri === localUri);
        if (uriIndex !== -1) {
          currentIndex = uriIndex;
          setCurrentPhotoIndex(currentIndex);
          console.log('Found local photo index by URI:', currentIndex);
        } else if (routeInitialIndex !== undefined && routeInitialIndex >= 0) {
          currentIndex = routeInitialIndex;
          setCurrentPhotoIndex(currentIndex);
          console.log('Using route initial index for local photo:', currentIndex);
        } else {
          console.log('No valid index found for local photo, defaulting to 0');
          currentIndex = 0;
          setCurrentPhotoIndex(0);
        }
      } else {
        console.log('No photoId or localUri, defaulting to 0');
        currentIndex = 0;
        setCurrentPhotoIndex(0);
      }
    }
    
    if (currentIndex === -1) {
      console.log('Still no valid index, defaulting to 0');
      currentIndex = 0;
      setCurrentPhotoIndex(0);
    }
    
    let newIndex: number;
    if (direction === 'next') {
      newIndex = currentIndex + 1;
      if (newIndex >= allPhotos.length) {
        console.log('Already at last photo');
        return; // Already at last photo
      }
    } else {
      newIndex = currentIndex - 1;
      if (newIndex < 0) {
        console.log('Already at first photo');
        return; // Already at first photo
      }
    }
    
    console.log('Navigating to index:', newIndex);

    // Get photo info from route photo list if available (reuse currentPhotoList from above)
    if (currentPhotoList && currentPhotoList[newIndex]) {
      const nextPhoto = currentPhotoList[newIndex];
      setCurrentPhotoIndex(newIndex);
      
      if (nextPhoto.isLocal && nextPhoto.localUri) {
        // Navigate to local photo
        console.log('[navigateToPhoto] Navigating to local photo:', nextPhoto.localUri);
        setIsLocalPhoto(true);
        setIsLoadingPhoto(true); // Set loading to show transition
        setIsLoading(false);
        setImageError(false);
        setPhoto({
          id: 0,
          original_filename: nextPhoto.localUri?.split('/').pop() || 'Local Photo',
          format: 'image/jpeg',
          file_size: 0,
          width: 0,
          height: 0,
          captured_at: null,
          processing_status: 'completed',
          thumbnail_urls: {},
          created_at: new Date().toISOString(),
          tags: [],
          albums: [],
        } as PhotoDetail);
        // Update route params for local photo - this will trigger re-render
        // IMPORTANT: Preserve photoList and initialIndex to avoid losing navigation context
        navigation.setParams({
          localUri: nextPhoto.localUri,
          photoTitle: nextPhoto.localUri?.split('/').pop() || 'Local Photo',
          photoId: undefined,
          photoList: routePhotoList,
          initialIndex: newIndex,
        });
        // Image onLoad will set isLoadingPhoto to false
      } else if (nextPhoto.cloudId || nextPhoto.id) {
        // Navigate to cloud photo
        setIsLocalPhoto(false);
        const newPhotoId = nextPhoto.cloudId || nextPhoto.id;
        if (newPhotoId) {
          // Don't clear photo immediately - keep showing current photo while loading
          // This prevents black screen during transition
          setIsLoadingPhoto(true);
          loadPhoto(newPhotoId);
          // IMPORTANT: Preserve photoList and initialIndex to avoid losing navigation context
          navigation.setParams({
            photoId: newPhotoId,
            localUri: undefined,
            photoTitle: undefined,
            photoList: routePhotoList,
            initialIndex: newIndex,
          });
        }
      }
    } else {
      // Fallback: use allPhotos array (server photos only)
      const newPhotoId = allPhotos[newIndex]?.id;
      if (newPhotoId) {
        setCurrentPhotoIndex(newIndex);
        loadPhoto(newPhotoId);
      }
    }
    
    showBarsTemporarily();
  };

  const getImageUrl = (): string => {
    // If local photo, return local URI directly (use route params to get updated value)
    const currentLocalUri = route.params?.localUri || localUri;
    if (isLocalPhoto && currentLocalUri) {
      return currentLocalUri;
    }
    
    if (!photo) return '';
    
    const baseUrl = API_CONFIG.BASE_URL.replace('/api/v1', '');
    
    // Use original file for full-screen viewing (best quality)
    // The /download endpoint serves the original file
    const originalUrl = `${baseUrl}/api/v1/photos/${photo.id}/download`;
    
    // Fallback to large thumbnail if we want faster loading
    // For now, use original for best quality
    return originalUrl;
    
    // Alternative: Use large thumbnail for faster loading
    // const url = photo.thumbnail_urls?.large || photo.thumbnail_urls?.medium || photo.thumbnail_urls?.small || '';
    // if (!url) return '';
    // if (url.startsWith('http')) {
    //   return url;
    // }
    // return `${baseUrl}${url}`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSheetChanges = useCallback((index: number) => {
    setSheetIndex(index);
  }, []);

  const openSheet = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const closeSheet = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  const handleMenuDetails = () => {
    setShowMenu(false);
    if (reanimatedReady) {
      openSheet();
    } else {
      setShowDetails(true);
    }
  };

  const handleMenuShare = async () => {
    setShowMenu(false);
    if (!photo) return;

    try {
      let imageUrl: string;
      const currentLocalUri = route.params?.localUri || localUri;
      if (isLocalPhoto && currentLocalUri) {
        // Share local photo
        imageUrl = currentLocalUri;
      } else {
        // Share server photo
        const baseUrl = API_CONFIG.BASE_URL.replace('/api/v1', '');
        imageUrl = `${baseUrl}/api/v1/photos/${photo.id}/download`;
      }
      
      if (!imageUrl) {
        Alert.alert('Error', 'Unable to share photo - image URL not available');
        return;
      }

      const result = await Share.share({
        message: `Check out this photo: ${photo.original_filename}`,
        url: imageUrl,
        title: photo.original_filename,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Shared with activity type:', result.activityType);
        } else {
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to share photo: ' + (error.message || 'Unknown error'));
    }
  };

  const handleFavorite = async () => {
    if (!photo) return;
    showBarsTemporarily(); // Show bars when interacting
    // TODO: Implement favorite API call
    setIsFavorite(!isFavorite);
    // For now, just toggle local state
    // await photoService.toggleFavorite(photo.id);
  };

  const handleShare = async () => {
    if (!photo) return;
    showBarsTemporarily();
    await handleMenuShare();
  };

  const handleEdit = () => {
    showBarsTemporarily();
    // TODO: Navigate to edit screen or show edit options
    Alert.alert('Edit', 'Edit functionality coming soon');
  };

  const handleAddTo = () => {
    showBarsTemporarily();
    setShowAddToModal(true);
  };

  const handleAddToAlbum = async (albumId: number) => {
    if (!photo) return;
    if (isLocalPhoto) {
      Alert.alert('Info', 'Please upload the photo first before adding it to an album');
      return;
    }
    try {
      const response = await albumService.addPhotoToAlbum(albumId, photo.id);
      if (response.data) {
        Alert.alert('Success', 'Photo added to album');
        setShowAddToModal(false);
      } else if (response.error) {
        Alert.alert('Error', response.error);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to add photo to album: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDelete = () => {
    if (!photo) return;
    if (isLocalPhoto) {
      Alert.alert('Info', 'This is a local photo. Delete it from your device gallery instead.');
      return;
    }
    showBarsTemporarily();
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const deletedPhotoId = photo.id;
              const response = await photoService.deletePhoto(deletedPhotoId);
              if (response.data) {
                // Remove from allPhotos array
                setAllPhotos(prev => prev.filter(p => p.id !== deletedPhotoId));
                
                // Navigate back and pass deleted photo ID to update HomeScreen
                // @ts-ignore - Navigation params type issue with union types
                navigation.navigate('HomeList', {deletedPhotoId});
              } else if (response.error) {
                Alert.alert('Error', response.error);
              }
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete photo: ' + (error.message || 'Unknown error'));
            }
          },
        },
      ],
    );
  };

  // Pan responder for swipe gestures (left/right for navigation)
  // Use useMemo to recreate when dependencies change
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => {
          // Enable for any photos that have navigation available
          const currentPhotoList = routePhotoListRef.current.length > 0 ? routePhotoListRef.current : routePhotoList || [];
          const hasPhotos = allPhotos.length > 1 || currentPhotoList.length > 1;
          console.log('[PanResponder] Should enable:', hasPhotos, 'allPhotos:', allPhotos.length, 'routePhotoList:', currentPhotoList.length);
          return hasPhotos;
        },
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Don't intercept if no photos to navigate
          const currentPhotoList = routePhotoListRef.current.length > 0 ? routePhotoListRef.current : routePhotoList || [];
          if (allPhotos.length <= 1 && currentPhotoList.length <= 1) return false;
          
          // Don't intercept touches in the top bar area (first 100px) or bottom bar area
          const {locationY} = evt.nativeEvent;
          const bottomBarArea = SCREEN_HEIGHT - 120; // Account for bottom action bar
          if (locationY <= 100 || locationY >= bottomBarArea) return false;
          
          // Check for horizontal movement (prioritize horizontal swipes)
          const {dx, dy} = gestureState;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          
          // Require minimum horizontal movement and that it's more horizontal than vertical
          return absDx > 10 && absDx > absDy * 0.7; // Horizontal movement is dominant
        },
        onPanResponderGrant: () => {
          // Show bars when user starts interacting
          showBarsTemporarily();
        },
        onPanResponderMove: (evt, gestureState) => {
          // Show bars during any swipe
          if (!showBars) {
            setShowBars(true);
          }
        },
        onPanResponderRelease: (evt, gestureState) => {
          // Don't process if no photos to navigate
          const currentPhotoList = routePhotoListRef.current.length > 0 ? routePhotoListRef.current : routePhotoList || [];
          if (allPhotos.length <= 1 && currentPhotoList.length <= 1) {
            console.log('[PanResponder] Not enough photos to navigate');
            return;
          }
          
          const {dx, dy} = gestureState;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          const swipeThreshold = 40; // Minimum swipe distance (reduced for easier triggering)
          
          console.log('Swipe detected - dx:', dx, 'dy:', dy, 'absDx:', absDx, 'absDy:', absDy);
          console.log('Current photo index:', currentPhotoIndex, 'Total photos:', allPhotos.length);
          
          // Prioritize horizontal swipes for photo navigation
          if (absDx > absDy && absDx > swipeThreshold) {
            // Horizontal swipe detected
            if (dx > 0) {
              // Swipe right -> previous photo
              console.log('Swiping right - going to previous photo');
              navigateToPhoto('prev');
            } else {
              // Swipe left -> next photo
              console.log('Swiping left - going to next photo');
              navigateToPhoto('next');
            }
          } else if (absDy > absDx && absDy > 50 && sheetIndexRef.current === -1) {
            // Vertical swipe for drawer (only if not swiping horizontally)
            if (dy < -50) {
              // Swipe up -> open drawer
              openSheet();
            }
          }
        },
        onPanResponderTerminate: () => {
          // Gesture was cancelled
        },
      }),
    [isLocalPhoto, allPhotos.length, currentPhotoIndex, showBars, navigateToPhoto, showBarsTemporarily, openSheet, routePhotoList],
  );

  // Handle tap on image to show/hide bars
  const handleImageTap = () => {
    showBarsTemporarily();
  };

  // Show error screen only if we have an error and not loading
  if (!photo && !isLoadingPhoto && loadError) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color="#ffffff" />
          <Text style={styles.errorText}>
            {loadError || 'Photo not found'}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
          {loadError && (
            <TouchableOpacity
              style={[styles.backButton, {marginTop: 12, backgroundColor: '#333333'}]}
              onPress={() => loadPhoto()}>
              <Text style={styles.backButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={false} />
      
          {/* Full Screen Image */}
          <View
            style={styles.imageContainer}
            {...panResponder.panHandlers}>
            {isLoadingPhoto && !photo && !isLocalPhoto && !route.params?.localUri && !localUri ? (
              // Show skeleton loader only when loading cloud photo and no photo exists and no local URI
              <View style={styles.skeletonContainer}>
                <View style={styles.skeletonImage} />
                <View style={styles.skeletonOverlay}>
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={styles.skeletonText}>Loading photo...</Text>
                </View>
              </View>
            ) : getImageUrl() && (photo || (isLocalPhoto && (route.params?.localUri || localUri))) ? (
              <TouchableOpacity
                style={styles.imageTouchable}
                activeOpacity={1}
                onPress={handleImageTap}
                delayPressIn={200}>
                {isLocalPhoto ? (
                  <Image
                    key={`local_${route.params?.localUri || localUri}_${currentPhotoIndex}`} // Force re-render when URI or index changes
                    source={{uri: getImageUrl()}}
                    style={styles.fullImage}
                    resizeMode="contain"
                    onLoadStart={() => {
                      console.log('[Image] Loading local photo:', getImageUrl());
                    }}
                    onLoad={() => {
                      console.log('[Image] Local photo loaded');
                      setIsLoadingPhoto(false);
                    }}
                    onError={(error) => {
                      console.error('[Image] Local photo error:', error);
                      setImageError(true);
                      setIsLoadingPhoto(false);
                    }}
                  />
                ) : (
                  <AuthImage
                    key={`cloud_${photo?.id}_${currentPhotoIndex}`} // Force re-render when photo ID or index changes
                    source={{uri: getImageUrl()}}
                    style={styles.fullImage}
                    resizeMode="contain"
                    onLoadStart={() => {
                      console.log('[AuthImage] Loading cloud photo:', getImageUrl());
                    }}
                    onLoad={() => {
                      console.log('[AuthImage] Cloud photo loaded');
                      setIsLoadingPhoto(false);
                    }}
                    onError={(error) => {
                      console.error('[AuthImage] Cloud photo error:', error);
                      setImageError(true);
                      setIsLoadingPhoto(false);
                    }}
                  />
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.imageErrorContainer}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.imageErrorText}>
                  {photo?.processing_status === 'pending' || photo?.processing_status === 'processing'
                    ? 'Processing image...'
                    : 'Loading image...'}
                </Text>
              </View>
            )}
          </View>

      {/* Top Bar */}
      {showBars && (
        <View style={[styles.topBarContainer, {paddingTop: insets.top}]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBarButton}
            onPress={() => navigation.goBack()}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.topBarSpacer} />
          <TouchableOpacity
            style={styles.topBarButton}
            onPress={handleFavorite}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            activeOpacity={0.7}>
            <Icon 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? "#ff3040" : "#ffffff"} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.topBarButton}
            onPress={() => {
              showBarsTemporarily();
              setShowMenu(true);
            }}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            activeOpacity={0.7}>
            <Icon name="ellipsis-vertical" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
      )}

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}>
          <View 
            style={[styles.menuContainer, {top: insets.top + 60, right: 16}]}
            onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleMenuDetails}
              activeOpacity={0.7}>
              <Icon name="information-circle-outline" size={20} color="#000000" />
              <Text style={styles.menuItemText}>Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleMenuShare}
              activeOpacity={0.7}>
              <Icon name="share-outline" size={20} color="#000000" />
              <Text style={styles.menuItemText}>Share</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Pull Up Indicator - Only show if BottomSheet is enabled */}
      {reanimatedReady && sheetIndex === -1 && (
        <View style={styles.pullIndicator}>
          <View style={styles.pullIndicatorBar} />
          <TouchableOpacity
            style={styles.pullUpButton}
            onPress={openSheet}
            activeOpacity={0.7}>
            <Icon name="chevron-up" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Simple Details View - Fallback when BottomSheet is disabled */}
      {!reanimatedReady && photo && showDetails && (
        <View style={styles.simpleDetailsContainer}>
          <View style={styles.simpleDetailsContent}>
            <View style={styles.simpleDetailsHeader}>
              <Text style={styles.simpleDetailsTitle}>Photo Details</Text>
              <TouchableOpacity
                onPress={() => setShowDetails(false)}
                style={styles.closeDetailsButton}>
                <Icon name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.simpleDetailsText}>
              Filename: {photo.original_filename}
            </Text>
            <Text style={styles.simpleDetailsText}>
              Date: {formatDate(photo.captured_at || photo.created_at)}
            </Text>
            <Text style={styles.simpleDetailsText}>
              Size: {photo.width} × {photo.height}
            </Text>
            <Text style={styles.simpleDetailsText}>
              File Size: {(photo.file_size / 1024 / 1024).toFixed(2)} MB
            </Text>
            {photo.camera_make && (
              <Text style={styles.simpleDetailsText}>
                Camera: {photo.camera_make} {photo.camera_model || ''}
              </Text>
            )}
            {photo.iso && (
              <Text style={styles.simpleDetailsText}>ISO: {photo.iso}</Text>
            )}
            {photo.aperture && (
              <Text style={styles.simpleDetailsText}>Aperture: f/{photo.aperture}</Text>
            )}
            {photo.shutter_speed && (
              <Text style={styles.simpleDetailsText}>Shutter Speed: {photo.shutter_speed}</Text>
            )}
            {photo.focal_length && (
              <Text style={styles.simpleDetailsText}>Focal Length: {photo.focal_length}mm</Text>
            )}
          </View>
        </View>
      )}

      {/* Bottom Sheet Drawer - Only render if Reanimated is ready */}
      {reanimatedReady ? (
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={['25%', '50%', '90%']}
          onChange={handleSheetChanges}
          enablePanDownToClose
          enableContentPanningGesture
          backgroundStyle={styles.bottomSheetBackground}
          handleIndicatorStyle={styles.handleIndicator}
          animateOnMount={false}>
          <BottomSheetScrollView
          style={styles.bottomSheetContent}
          contentContainerStyle={styles.bottomSheetScrollContent}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handleBar} />
          </View>

          {/* Photo Info */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Details</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Filename</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {photo.original_filename}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>
                {formatDate(photo.captured_at || photo.created_at)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Size</Text>
              <Text style={styles.infoValue}>
                {photo.width} × {photo.height}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>File Size</Text>
              <Text style={styles.infoValue}>
                {(photo.file_size / 1024 / 1024).toFixed(2)} MB
              </Text>
            </View>

            {photo.camera_make && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Camera</Text>
                <Text style={styles.infoValue}>
                  {photo.camera_make} {photo.camera_model || ''}
                </Text>
              </View>
            )}

            {photo.iso && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>ISO</Text>
                <Text style={styles.infoValue}>{photo.iso}</Text>
              </View>
            )}

            {photo.aperture && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Aperture</Text>
                <Text style={styles.infoValue}>f/{photo.aperture}</Text>
              </View>
            )}

            {photo.shutter_speed && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Shutter Speed</Text>
                <Text style={styles.infoValue}>{photo.shutter_speed}</Text>
              </View>
            )}

            {photo.focal_length && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Focal Length</Text>
                <Text style={styles.infoValue}>{photo.focal_length}mm</Text>
              </View>
            )}
          </View>

          {/* Tags */}
          {photo.tags && photo.tags.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {photo.tags.map(tag => (
                  <View key={tag.id} style={styles.tag}>
                    <Text style={styles.tagText}>{tag.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Albums */}
          {photo.albums && photo.albums.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Albums</Text>
              {photo.albums.map(album => (
                <TouchableOpacity key={album.id} style={styles.albumItem}>
                  <Icon name="albums-outline" size={20} color="#000000" />
                  <Text style={styles.albumName}>{album.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          </BottomSheetScrollView>
        </BottomSheet>
      ) : null}

      {/* Bottom Action Bar - Always visible */}
      {showBottomBar && (
        <View style={[styles.bottomActionBar, {paddingBottom: insets.bottom}]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
          activeOpacity={0.7}>
          <Icon name="share-outline" size={24} color="#ffffff" />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleEdit}
          activeOpacity={0.7}>
          <Icon name="create-outline" size={24} color="#ffffff" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAddTo}
          activeOpacity={0.7}>
          <Icon name="add-outline" size={24} color="#ffffff" />
          <Text style={styles.actionButtonText}>Add to</Text>
        </TouchableOpacity>
        {/* Only show delete button if photo is owned by current user */}
        {photo?.is_mine && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDelete}
            activeOpacity={0.7}>
            <Icon name="trash-outline" size={24} color="#ff3040" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
      )}

      {/* Add to Album Modal */}
      <Modal
        visible={showAddToModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddToModal(false)}>
        <View style={styles.addToModalOverlay}>
          <View style={[styles.addToModalContent, {paddingBottom: insets.bottom + 20}]}>
            <View style={styles.addToModalHeader}>
              <Text style={styles.addToModalTitle}>Add to Album</Text>
              <TouchableOpacity
                onPress={() => setShowAddToModal(false)}
                style={styles.addToModalCloseButton}>
                <Icon name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            {albums.length === 0 ? (
              <View style={styles.addToModalEmpty}>
                <Text style={styles.addToModalEmptyText}>No albums available</Text>
                <Text style={styles.addToModalEmptySubtext}>Create an album first</Text>
              </View>
            ) : (
              <ScrollView style={styles.addToModalList}>
                {albums.map(album => (
                  <TouchableOpacity
                    key={album.id}
                    style={styles.addToModalItem}
                    onPress={() => handleAddToAlbum(album.id)}
                    activeOpacity={0.7}>
                    <Icon name="albums-outline" size={24} color="#000000" />
                    <Text style={styles.addToModalItemText}>{album.name}</Text>
                    <Icon name="chevron-forward" size={20} color="#999999" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  imageErrorContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageErrorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  topBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44, // Ensure minimum touch target size
    backgroundColor: 'transparent',
    width: '100%',
  },
  topBarButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 22,
    zIndex: 101,
  },
  topBarSpacer: {
    flex: 1,
  },
  pullIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 20,
    zIndex: 5,
  },
  pullIndicatorBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
    marginBottom: 8,
  },
  pullUpButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  bottomSheetBackground: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#e0e0e0',
    width: 40,
  },
  bottomSheetContent: {
    flex: 1,
  },
  bottomSheetScrollContent: {
    paddingBottom: 32,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: '#000000',
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  albumName: {
    fontSize: 14,
    color: '#000000',
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  skeletonContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a2a',
    opacity: 0.6,
  },
  skeletonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  simpleDetailsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  simpleDetailsContent: {
    paddingBottom: 20,
  },
  simpleDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  simpleDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeDetailsButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleDetailsText: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuContainer: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#000000',
    marginLeft: 12,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#ffffff',
    marginTop: 4,
    fontWeight: '500',
  },
  deleteButtonText: {
    color: '#ff3040',
  },
  addToModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  addToModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingTop: 20,
  },
  addToModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addToModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  addToModalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToModalList: {
    paddingVertical: 8,
  },
  addToModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addToModalItemText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    marginLeft: 12,
  },
  addToModalEmpty: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToModalEmptyText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  addToModalEmptySubtext: {
    fontSize: 14,
    color: '#999999',
  },
});

