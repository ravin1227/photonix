import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
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

  useEffect(() => {
    if (activeFilter === 'Recent') {
      loadPhotos();
      loadDevicePhotos();
    } else if (activeFilter === 'Albums') {
      loadAlbums();
    } else if (activeFilter === 'People') {
      loadPeople();
    }
  }, [activeFilter]);

  // Check upload status for dates when photos are loaded
  useEffect(() => {
    if (photos.length > 0 && activeFilter === 'Recent') {
      const mergedDates = getMergedPhotosByDate();
      mergedDates.forEach(({date}) => {
        checkDateUploadStatus(date);
      });
    }
  }, [photos, devicePhotos, activeFilter]);

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

  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      const response = await photoService.getPhotos(1, 100);
      console.log('Photos API Response:', JSON.stringify(response, null, 2));
      if (response.data) {
        console.log('Loaded photos:', response.data.photos.length);
        if (response.data.photos.length > 0) {
          console.log('First photo:', JSON.stringify(response.data.photos[0], null, 2));
        }
        setPhotos(response.data.photos || []);
      } else {
        // Network error or no data - don't crash, just log
        console.warn('No data in response:', response.error);
        // Set empty array instead of crashing
        setPhotos([]);
      }
    } catch (error: any) {
      // Handle network errors gracefully
      console.error('Error loading photos:', error);
      // Set empty array on error so app doesn't crash
      setPhotos([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    if (activeFilter === 'Recent') {
      loadPhotos();
      loadDevicePhotos();
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

  // Merge server photos and device photos by date
  const getMergedPhotosByDate = () => {
    const serverGrouped = groupPhotosByDate();
    const allDates = new Set([
      ...Object.keys(serverGrouped),
      ...Object.keys(devicePhotos),
    ]);

    return Array.from(allDates)
      .filter(date => {
        const serverCount = serverGrouped[date]?.length || 0;
        const deviceCount = devicePhotos[date]?.length || 0;
        return serverCount > 0 || deviceCount > 0;
      })
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        date,
        serverPhotos: serverGrouped[date] || [],
        devicePhotos: devicePhotos[date] || [],
      }));
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

    const mergedDates = getMergedPhotosByDate();

    if (mergedDates.length === 0 && !isLoading && !isLoadingDevicePhotos) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No photos yet</Text>
          <Text style={styles.emptySubtext}>Upload your first photo to get started</Text>
      </View>
      );
    }

    return (
      <>
        {mergedDates.map(({date, serverPhotos, devicePhotos: dateDevicePhotos}) => {
          const uploadState = uploadingDates[date];
          const dateStatus = dateUploadStatus[date];
          const allUploaded = dateStatus?.allUploaded || false;
          const hasUploaded = uploadState && uploadState.uploaded === uploadState.total && uploadState.total > 0;
          const totalPhotos = serverPhotos.length + dateDevicePhotos.length;
          
          return (
            <View key={`${date}-${totalPhotos}`}>
              <View style={styles.dateHeaderContainer}>
                <Text style={styles.dateHeader}>{date}</Text>
                <UploadButton
                  onPress={() => handleUploadDatePhotos(date)}
                  isUploading={uploadState?.isUploading || false}
                  uploadedCount={uploadState?.uploaded}
                  totalCount={uploadState?.total}
                  showMenu={allUploaded || hasUploaded}
                  isAllUploaded={allUploaded}
                  onMenuPress={() => {
                    Alert.alert(
                      'Date Options',
                      'Choose an action',
                      [
                        {text: 'Cancel', style: 'cancel'},
                        {text: 'Upload More', onPress: () => handleUploadDatePhotos(date)},
                        {text: 'View All', onPress: () => {/* Navigate to date filter */}},
                      ],
                    );
                  }}
                />
              </View>
              <View style={styles.grid}>
              {/* Render server photos (uploaded) */}
              {serverPhotos
                .filter((photo: Photo) => photo && photo.id)
                .map((photo: Photo) => {
                  const thumbnailUrl = getThumbnailUrl(photo);
                  return (
                    <View key={`server-${photo.id}`} style={styles.photoThumbnail}>
                      <TouchableOpacity
                        style={styles.photoTouchable}
                        onPress={() => {
                          navigation.navigate('PhotoViewer', {photoId: photo.id});
                        }}>
                        {thumbnailUrl ? (
                          <AuthImage
                            source={{uri: thumbnailUrl}}
                            style={styles.photoImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.photoPlaceholder}>
                            <Icon 
                              name="ban" 
                              size={32} 
                              color="#999999" 
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                      {/* Upload status indicator - photos from server are always uploaded */}
                      <View style={styles.photoStatusIndicator}>
                        <PhotoUploadStatus isUploaded={true} size={18} />
                      </View>
                    </View>
                );
              })}
              
              {/* Render device photos (not uploaded yet) */}
              {dateDevicePhotos.map((devicePhoto: DevicePhoto) => {
                return (
                  <View key={`device-${devicePhoto.id}`} style={styles.photoThumbnail}>
                    <TouchableOpacity
                      style={styles.photoTouchable}
                      onPress={async () => {
                        // Check upload status
                        const uploaded = await uploadTrackingService.isPhotoUploaded(devicePhoto.id);
                        if (uploaded) {
                          // Find server photo ID and navigate to server version
                          const uploadedInfo = await uploadTrackingService.getUploadedPhoto(devicePhoto.id);
                          if (uploadedInfo?.serverPhotoId) {
                            navigation.navigate('PhotoViewer', {photoId: uploadedInfo.serverPhotoId});
                          } else {
                            // Fallback to local if server ID not found
                            navigation.navigate('PhotoViewer', {
                              localUri: devicePhoto.uri,
                              photoTitle: devicePhoto.filename,
                            });
                          }
                        } else {
                          // View local photo directly without uploading
                          navigation.navigate('PhotoViewer', {
                            localUri: devicePhoto.uri,
                            photoTitle: devicePhoto.filename,
                          });
                        }
                      }}>
                      <Image
                        source={{uri: devicePhoto.uri}}
                        style={styles.photoImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    {/* Upload status indicator */}
                    <View style={styles.photoStatusIndicator}>
                      <PhotoUploadStatus 
                        isUploaded={false} 
                        size={18} 
                      />
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
        }>
        {renderContent()}
      </ScrollView>

      {/* Floating Action Button - Show on Albums and Recent tabs */}
      {activeFilter === 'Albums' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleOpenCreateModal}
          activeOpacity={0.8}>
          <Icon name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}
      {activeFilter === 'Recent' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleUploadAllPhotos}
          activeOpacity={0.8}>
          <Icon name="cloud-upload" size={28} color="#ffffff" />
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

