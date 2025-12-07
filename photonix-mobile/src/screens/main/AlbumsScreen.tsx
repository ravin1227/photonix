import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import albumService, {Album} from '../../services/albumService';
import photoService from '../../services/photoService';
import {API_CONFIG} from '../../config/api';
import AuthImage from '../../components/AuthImage';
import CreateAlbumModal from '../../components/CreateAlbumModal';
import UploadButton from '../../components/UploadButton';
import {pickPhotos, SelectedPhoto} from '../../components/PhotoPicker';
import uploadTrackingService from '../../services/uploadTrackingService';
import devicePhotoService from '../../services/devicePhotoService';
import albumSyncService from '../../services/albumSyncService';
import {AlbumsStackParamList} from '../../navigation/AlbumsStackNavigator';
import {Image} from 'react-native';

type AlbumsScreenNavigationProp = NativeStackNavigationProp<
  AlbumsStackParamList,
  'AlbumsList'
>;

type AlbumsScreenRouteProp = RouteProp<AlbumsStackParamList, 'AlbumsList'>;

export default function AlbumsScreen() {
  const navigation = useNavigation<AlbumsScreenNavigationProp>();
  const route = useRoute<AlbumsScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploadingAlbums, setUploadingAlbums] = useState<{[albumId: number]: {isUploading: boolean; uploaded: number; total: number}}>({});
  const [deviceAlbums, setDeviceAlbums] = useState<Array<{id: string; name: string; photoCount: number; coverUri?: string}>>([]);
  const [isLoadingDeviceAlbums, setIsLoadingDeviceAlbums] = useState(false);
  const [uploadingDeviceAlbums, setUploadingDeviceAlbums] = useState<{[albumName: string]: {isUploading: boolean; uploaded: number; total: number}}>({});
  const [uploadedDeviceAlbums, setUploadedDeviceAlbums] = useState<Set<string>>(new Set());
  const [syncEnabledAlbums, setSyncEnabledAlbums] = useState<Set<string>>(new Set());
  const [deviceUploadedServerAlbums, setDeviceUploadedServerAlbums] = useState<Map<number, {deviceAlbumName: string; syncEnabled: boolean}>>(new Map());
  const [openMenuAlbumId, setOpenMenuAlbumId] = useState<number | null>(null);
  const [menuButtonLayout, setMenuButtonLayout] = useState<{x: number; y: number; width: number; height: number} | null>(null);
  const menuButtonRef = useRef<any>(null);

  useEffect(() => {
    loadAlbums();
    loadDeviceAlbums();
    loadUploadedAlbumStatus();
    loadSyncStatus();
    loadDeviceUploadedServerAlbums();
  }, []);

  // Load mapping of server albums to device album uploads
  const loadDeviceUploadedServerAlbums = async () => {
    try {
      const uploadedAlbums = await uploadTrackingService.getUploadedAlbums();
      const syncAlbums = await albumSyncService.getSyncAlbums();
      const syncSet = new Set(syncAlbums.filter(a => a.enabled).map(a => a.albumId));

      const mapping = new Map<number, {deviceAlbumName: string; syncEnabled: boolean}>();

      for (const uploaded of uploadedAlbums) {
        if (uploaded.serverAlbumId) {
          // Find the device album name for this server album
          const deviceAlbum = deviceAlbums.find(a => a.id === uploaded.deviceAlbumId);
          if (deviceAlbum) {
            mapping.set(uploaded.serverAlbumId, {
              deviceAlbumName: deviceAlbum.name,
              syncEnabled: syncSet.has(uploaded.deviceAlbumId),
            });
          }
        }
      }

      setDeviceUploadedServerAlbums(mapping);
      console.log('[AlbumsScreen] Loaded device-uploaded server albums:', mapping);
    } catch (error) {
      console.error('[AlbumsScreen] Error loading device-uploaded albums:', error);
    }
  };

  // Load which device albums have been uploaded
  const loadUploadedAlbumStatus = async () => {
    try {
      const uploadedAlbums = await uploadTrackingService.getUploadedAlbums();
      const uploadedSet = new Set(uploadedAlbums.map(a => a.deviceAlbumId));
      setUploadedDeviceAlbums(uploadedSet);
      console.log('[AlbumsScreen] Loaded uploaded albums:', uploadedSet);
    } catch (error) {
      console.error('[AlbumsScreen] Error loading uploaded albums:', error);
    }
  };

  // Load sync status
  const loadSyncStatus = async () => {
    try {
      const syncAlbums = await albumSyncService.getSyncAlbums();
      const syncSet = new Set(syncAlbums.filter(a => a.enabled).map(a => a.albumName));
      setSyncEnabledAlbums(syncSet);
      console.log('[AlbumsScreen] Loaded sync-enabled albums:', syncSet);
    } catch (error) {
      console.error('[AlbumsScreen] Error loading sync status:', error);
    }
  };

  const loadDeviceAlbums = async () => {
    setIsLoadingDeviceAlbums(true);
    try {
      console.log('[AlbumsScreen] Loading device albums...');
      const albums = await devicePhotoService.getAlbums();
      console.log('[AlbumsScreen] Loaded device albums:', albums.length);
      setDeviceAlbums(albums);
    } catch (error: any) {
      console.error('[AlbumsScreen] Error loading device albums:', error.message);
      // Show alert if permission denied
      if (error.message && error.message.includes('permission')) {
        Alert.alert(
          'Photo Access Required',
          'Please allow Photonix to access your photos in Settings > Photonix > Photos',
          [{text: 'OK'}]
        );
      }
      setDeviceAlbums([]);
    } finally {
      setIsLoadingDeviceAlbums(false);
    }
  };

  // Handle album deletion from AlbumDetailScreen
  useEffect(() => {
    if (route.params?.deletedAlbumId) {
      const deletedId = route.params.deletedAlbumId;
      console.log('[AlbumsScreen] Handling deletion of album:', deletedId);

      // Remove the deleted album from the list silently
      setAlbums(prevAlbums => prevAlbums.filter(album => album.id !== deletedId));

      // If this was a device-uploaded album, restore it to device albums
      setDeviceUploadedServerAlbums(prevMap => {
        const newMap = new Map(prevMap);
        const deviceAlbumInfo = newMap.get(deletedId);

        if (deviceAlbumInfo) {
          console.log('[AlbumsScreen] Album was device-uploaded, restoring to device albums');
          newMap.delete(deletedId);

          // Find the device album ID associated with this server album and restore it
          if (deviceAlbumInfo.deviceAlbumName) {
            const deviceAlbum = deviceAlbums.find(a => a.name === deviceAlbumInfo.deviceAlbumName);
            if (deviceAlbum) {
              // Remove from tracking service and UI state
              uploadTrackingService.removeUploadedAlbum(deviceAlbum.id);
              setUploadedDeviceAlbums(prevSet => {
                const newSet = new Set(prevSet);
                newSet.delete(deviceAlbum.id);
                console.log('[AlbumsScreen] Restored device album to Device Albums section:', deviceAlbum.id);
                return newSet;
              });
            }
          }
        }

        return newMap;
      });

      // Clear the route param to prevent re-triggering
      navigation.setParams({deletedAlbumId: undefined});
    }
  }, [route.params?.deletedAlbumId, navigation, deviceAlbums]);

  const loadAlbums = async () => {
    try {
      setIsLoading(true);
      const response = await albumService.getAlbums();
      if (response.data) {
        setAlbums(response.data.albums);
        // Reload device-uploaded albums mapping after albums are loaded
        await loadDeviceUploadedServerAlbums();
      }
    } catch (error) {
      console.error('Error loading albums:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadAlbums();
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleAddToAlbum = async (albumId: number) => {
    try {
      // Open photo picker
      const selectedPhotos = await pickPhotos({maxSelection: 100});
      
      if (selectedPhotos.length === 0) {
        return; // User cancelled
      }

      // Set uploading state
      setUploadingAlbums(prev => ({
        ...prev,
        [albumId]: {isUploading: true, uploaded: 0, total: selectedPhotos.length},
      }));

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
        setUploadingAlbums(prev => ({
          ...prev,
          [albumId]: {isUploading: false, uploaded: 0, total: 0},
        }));
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

      // Mark as completed
      setUploadingAlbums(prev => ({
        ...prev,
        [albumId]: {isUploading: false, uploaded: selectedPhotos.length, total: selectedPhotos.length},
      }));

      Alert.alert('Success', `Added ${photoIds.length} photo(s) to album`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add photos to album');
      setUploadingAlbums(prev => ({
        ...prev,
        [albumId]: {isUploading: false, uploaded: 0, total: 0},
      }));
    }
  };

  const handleUploadToAlbum = async (albumId: number) => {
    try {
      const selectedPhotos = await pickPhotos({maxSelection: 100});

      if (selectedPhotos.length === 0) {
        return;
      }

      // Set uploading state
      setUploadingAlbums(prev => ({
        ...prev,
        [albumId]: {isUploading: true, uploaded: 0, total: selectedPhotos.length},
      }));

      // Upload and add to album
      await handleAddToAlbum(albumId);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload photos');
    }
  };

  const handleUploadDeviceAlbum = async (deviceAlbum: {id: string; name: string; photoCount: number; coverUri?: string}) => {
    try {
      console.log(`[AlbumsScreen] Starting upload of device album: ${deviceAlbum.name}`);

      // Set uploading state
      setUploadingDeviceAlbums(prev => ({
        ...prev,
        [deviceAlbum.name]: {isUploading: true, uploaded: 0, total: deviceAlbum.photoCount},
      }));

      // Get all photos from device album
      console.log(`[AlbumsScreen] Fetching ${deviceAlbum.photoCount} photos from device album...`);
      const devicePhotos = await devicePhotoService.getAllAlbumPhotos(deviceAlbum.name);
      console.log(`[AlbumsScreen] Fetched ${devicePhotos.length} photos from device album`);

      if (devicePhotos.length === 0) {
        Alert.alert('No Photos', `No photos found in ${deviceAlbum.name}`);
        setUploadingDeviceAlbums(prev => ({
          ...prev,
          [deviceAlbum.name]: {isUploading: false, uploaded: 0, total: 0},
        }));
        return;
      }

      // Prepare photos with capturedAt timestamps (preserve original dates from device)
      const photosToUpload = devicePhotos.map(photo => ({
        uri: photo.uri,
        type: photo.type || 'image/jpeg',
        name: photo.filename,
        capturedAt: new Date(photo.timestamp).toISOString(), // Use device timestamp
      }));

      console.log(`[AlbumsScreen] Uploading ${photosToUpload.length} photos...`);

      // Upload photos
      const uploadResponse = await photoService.uploadPhotos(photosToUpload);

      if (uploadResponse.error) {
        console.error(`[AlbumsScreen] Upload error: ${uploadResponse.error}`);
        Alert.alert('Upload Failed', uploadResponse.error);
        setUploadingDeviceAlbums(prev => ({
          ...prev,
          [deviceAlbum.name]: {isUploading: false, uploaded: 0, total: 0},
        }));
        return;
      }

      // Get uploaded photo results
      const results = uploadResponse.data?.results || {};
      const successful = results.successful || [];
      const failed = results.failed || [];
      const summary = uploadResponse.data?.summary;

      console.log(`[AlbumsScreen] Upload summary:`, summary);

      // Track uploaded photos
      if (successful.length > 0) {
        const trackingData = successful.map((result: any) => ({
          deviceId: result.filename,
          serverPhotoId: result.photo?.id || 0,
          filename: result.filename,
        })).filter((item: any) => item.serverPhotoId > 0);

        if (trackingData.length > 0) {
          await uploadTrackingService.trackUploadedPhotos(trackingData);
        }
      }

      // Update uploading state with final results
      setUploadingDeviceAlbums(prev => ({
        ...prev,
        [deviceAlbum.name]: {
          isUploading: false,
          uploaded: successful.length,
          total: devicePhotos.length,
        },
      }));

      // Track the uploaded album
      console.log(`[AlbumsScreen] Tracking album as uploaded: ${deviceAlbum.id}`);
      await uploadTrackingService.trackUploadedAlbum(deviceAlbum.id, undefined, successful.length);

      // Create a server album with the same name as device album
      console.log(`[AlbumsScreen] Creating server album: ${deviceAlbum.name}`);
      let serverAlbumId: number | undefined;

      try {
        const createResponse = await albumService.createAlbum({
          name: deviceAlbum.name,
          description: `Photos from device album "${deviceAlbum.name}"`,
        });

        if (createResponse.data?.album?.id) {
          serverAlbumId = createResponse.data.album.id;
          console.log(`[AlbumsScreen] Server album created: ${serverAlbumId}`);

          // Add all uploaded photos to the new album
          const photoIds = successful.map((p: any) => p.photo?.id).filter(Boolean);
          console.log(`[AlbumsScreen] Adding ${photoIds.length} photos to album ${serverAlbumId}`);

          for (const photoId of photoIds) {
            try {
              await albumService.addPhotoToAlbum(serverAlbumId, photoId);
            } catch (error) {
              console.error(`[AlbumsScreen] Error adding photo to album:`, error);
            }
          }

          // Track the server album
          await uploadTrackingService.trackUploadedAlbum(deviceAlbum.id, serverAlbumId, successful.length);
        }
      } catch (error) {
        console.error('[AlbumsScreen] Error creating server album:', error);
        // Continue even if album creation fails
      }

      // Update UI to show album as uploaded
      setUploadedDeviceAlbums(prev => new Set([...prev, deviceAlbum.id]));

      // Show result with sync option
      const message = failed.length > 0
        ? `${successful.length} photos uploaded, ${failed.length} failed`
        : `All ${successful.length} photos uploaded successfully`;

      Alert.alert(
        'Upload Complete',
        message,
        [
          {text: 'Done', style: 'default'},
          {
            text: 'Enable Auto-Sync',
            onPress: () => handleEnableSync(deviceAlbum),
            style: 'default'
          }
        ]
      );

      // Reload albums to show updates
      setTimeout(() => {
        loadAlbums();
        loadDeviceAlbums();
        loadUploadedAlbumStatus();
      }, 1000);
    } catch (error: any) {
      console.error('[AlbumsScreen] Error uploading device album:', error);
      Alert.alert('Error', error.message || 'Failed to upload device album');
      setUploadingDeviceAlbums(prev => ({
        ...prev,
        [deviceAlbum.name]: {isUploading: false, uploaded: 0, total: 0},
      }));
    }
  };

  const handleEnableSync = async (deviceAlbum: {id: string; name: string; photoCount: number; coverUri?: string}) => {
    try {
      console.log(`[AlbumsScreen] Enabling auto-sync for album: ${deviceAlbum.name}`);
      await albumSyncService.enableSync(deviceAlbum.id, deviceAlbum.name);
      setSyncEnabledAlbums(prev => new Set([...prev, deviceAlbum.name]));
      Alert.alert('Auto-Sync Enabled', `New photos added to "${deviceAlbum.name}" will be automatically uploaded`);
      loadSyncStatus();
      loadDeviceUploadedServerAlbums();
    } catch (error: any) {
      console.error('[AlbumsScreen] Error enabling sync:', error);
      Alert.alert('Error', error.message || 'Failed to enable auto-sync');
    }
  };

  const handleDisableSync = async (deviceAlbum: {id: string; name: string; photoCount: number; coverUri?: string}) => {
    try {
      console.log(`[AlbumsScreen] Disabling auto-sync for album: ${deviceAlbum.name}`);
      await albumSyncService.disableSync(deviceAlbum.id);
      setSyncEnabledAlbums(prev => {
        const updated = new Set(prev);
        updated.delete(deviceAlbum.name);
        return updated;
      });
      Alert.alert('Auto-Sync Disabled', `Auto-sync disabled for "${deviceAlbum.name}"`);
      loadSyncStatus();
      loadDeviceUploadedServerAlbums();
    } catch (error: any) {
      console.error('[AlbumsScreen] Error disabling sync:', error);
      Alert.alert('Error', error.message || 'Failed to disable auto-sync');
    }
  };

  const handleUploadRemainingPhotos = async (album: Album) => {
    try {
      console.log(`[AlbumsScreen] Uploading remaining photos to album: ${album.name}`);

      // Find the corresponding device album upload
      const deviceUpload = Array.from(deviceUploadedServerAlbums.values()).find(
        d => d && 'deviceAlbumName' in d
      );

      if (!deviceUpload) {
        Alert.alert('Error', 'Could not find device album mapping');
        return;
      }

      // Get all photos from device album
      const devicePhotos = await devicePhotoService.getAllAlbumPhotos(deviceUpload.deviceAlbumName);

      if (devicePhotos.length === 0) {
        Alert.alert('No Photos', 'No new photos found in this device album');
        return;
      }

      // Filter out already uploaded photos (based on tracking service)
      const uploadedPhotoIds = new Set();
      const uploadedPhotos = await uploadTrackingService.getUploadedAlbums();
      uploadedPhotos.forEach(up => {
        // This would need to track individual photos, for now we'll upload all
      });

      // Prepare photos with timestamps
      const photosToUpload = devicePhotos.map(photo => ({
        uri: photo.uri,
        type: photo.type || 'image/jpeg',
        name: photo.filename,
        capturedAt: new Date(photo.timestamp).toISOString(),
      }));

      console.log(`[AlbumsScreen] Uploading ${photosToUpload.length} photos to album ${album.id}`);

      // Upload photos
      const uploadResponse = await photoService.uploadPhotos(photosToUpload);

      if (uploadResponse.error) {
        console.error(`[AlbumsScreen] Upload error: ${uploadResponse.error}`);
        Alert.alert('Upload Failed', uploadResponse.error);
        return;
      }

      const results = uploadResponse.data?.results || {};
      const successful = results.successful || [];
      const failed = results.failed || [];

      // Add photos to album
      const photoIds = successful.map((p: any) => p.photo?.id).filter(Boolean);
      for (const photoId of photoIds) {
        try {
          await albumService.addPhotoToAlbum(album.id, photoId);
        } catch (error) {
          console.error('[AlbumsScreen] Error adding photo to album:', error);
        }
      }

      const message = failed.length > 0
        ? `${successful.length} photos uploaded, ${failed.length} failed`
        : `All ${successful.length} new photos uploaded successfully`;

      Alert.alert('Upload Complete', message);

      // Reload albums
      setTimeout(() => {
        loadAlbums();
        loadUploadedAlbumStatus();
      }, 1000);
    } catch (error: any) {
      console.error('[AlbumsScreen] Error uploading remaining photos:', error);
      Alert.alert('Error', error.message || 'Failed to upload photos');
    }
  };

  const handleAlbumCreated = () => {
    loadAlbums();
  };

  const handleMenuButtonPress = (albumId: number) => {
    setOpenMenuAlbumId(openMenuAlbumId === albumId ? null : albumId);

    // Measure button position when opening menu
    if (openMenuAlbumId !== albumId && menuButtonRef.current) {
      menuButtonRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setMenuButtonLayout({x: pageX, y: pageY, width, height});
      });
    }
  };

  const getCoverImageUrl = (album: Album): string | null => {
    if (!album.cover_photo_url) return null;
    if (album.cover_photo_url.startsWith('http')) {
      return album.cover_photo_url;
    }
    return `${API_CONFIG.BASE_URL.replace('/api/v1', '')}${album.cover_photo_url}`;
  };

  const safeAreaEdges = ['top'] as const;
  const containerStyle = Platform.OS === 'android' 
    ? [styles.container, {paddingBottom: Math.max(insets.bottom, 16)}]
    : styles.container;

  if (isLoading && albums.length === 0) {
    return (
      <>
        {Platform.OS === 'android' && (
          <StatusBar
            barStyle="dark-content"
            backgroundColor="#ffffff"
            translucent={false}
          />
        )}
        <SafeAreaView style={containerStyle} edges={safeAreaEdges}>
        <View style={styles.header}>
          <Text style={styles.title}>Albums</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading albums...</Text>
        </View>
      </SafeAreaView>
      </>
    );
  }

  return (
    <>
      {Platform.OS === 'android' && (
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#ffffff"
          translucent={false}
        />
      )}
      <SafeAreaView style={containerStyle} edges={safeAreaEdges}>
      <View style={styles.header}>
        <Text style={styles.title}>Albums</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }>
        {/* My Albums Section */}
        <Text style={styles.sectionTitle}>My Albums</Text>
        <View style={styles.albumsGrid}>
          {albums.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No albums yet</Text>
              <Text style={styles.emptySubtext}>
                Create your first album to organize photos
              </Text>
            </View>
          ) : (
            albums.map(album => {
              const coverUrl = getCoverImageUrl(album);
              const uploadState = uploadingAlbums[album.id];
              const hasUploaded = uploadState && uploadState.uploaded === uploadState.total && uploadState.total > 0;
              
              return (
                <TouchableOpacity 
                  key={album.id} 
                  style={styles.albumCard}
                  onPress={() => {
                    navigation.navigate('AlbumDetail', {
                      albumId: album.id,
                      albumName: album.name,
                    });
                  }}
                  activeOpacity={0.8}>
              <View style={styles.albumCoverContainer}>
                    {coverUrl ? (
                      <AuthImage
                        source={{uri: coverUrl}}
                        style={styles.albumCover}
                        resizeMode="cover"
                        onError={() => {
                          console.warn(`[AlbumsScreen] Failed to load cover image for album: ${album.name}`);
                        }}
                      />
                    ) : null}
                    {!coverUrl && (
                      <View style={styles.albumCover}>
                        <Icon name="albums-outline" size={48} color="#999999" />
                      </View>
                    )}

                    {/* Device Album Indicator Badge */}
                    {deviceUploadedServerAlbums.has(album.id) && (
                      <View style={styles.deviceAlbumIndicator}>
                        <Icon name="phone-portrait" size={12} color="#2196f3" />
                        <Text style={styles.deviceAlbumIndicatorText}>Device</Text>
                      </View>
                    )}

                    {/* Sync Status Badge - For device-uploaded albums */}
                    {deviceUploadedServerAlbums.has(album.id) && deviceUploadedServerAlbums.get(album.id)?.syncEnabled && (
                      <View style={styles.syncActiveBadge}>
                        <Icon name="sync" size={18} color="#2196f3" />
                      </View>
                    )}

                    {/* Single Menu Button for Device Albums */}
                    {deviceUploadedServerAlbums.has(album.id) && (
                      <TouchableOpacity
                        ref={menuButtonRef}
                        style={styles.deviceAlbumMenuButton}
                        onPress={() => {
                          handleMenuButtonPress(album.id);
                        }}>
                        <Icon name="ellipsis-vertical" size={20} color="#ffffff" />
                      </TouchableOpacity>
                    )}

                {/* Only show + button for non-device-uploaded albums */}
                {!deviceUploadedServerAlbums.has(album.id) && (
                  <TouchableOpacity
                    style={styles.addIcon}
                    onPress={() => handleAddToAlbum(album.id)}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                    <Icon name="add-circle" size={24} color="#000000" />
                  </TouchableOpacity>
                )}
              </View>
                  <View style={styles.albumInfoContainer}>
                    <View style={styles.albumHeaderRow}>
                      <Text style={styles.albumName} numberOfLines={1}>
                        {album.name}
                      </Text>
                      <Text style={styles.albumCount} numberOfLines={1}>
                        {album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}
                      </Text>
                    </View>
                  </View>
            </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Device Albums Section */}
        <Text style={styles.sectionTitle}>Device Albums</Text>
        {isLoadingDeviceAlbums ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#666666" />
            <Text style={styles.loadingText}>Loading device albums...</Text>
          </View>
        ) : (
          // Filter to show only non-uploaded device albums
          (() => {
            const pendingDeviceAlbums = deviceAlbums.filter(album => !uploadedDeviceAlbums.has(album.id));

            return pendingDeviceAlbums.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No pending device albums</Text>
                <Text style={styles.emptySubtext}>
                  All device albums have been uploaded. Check "My Albums" to see them.
                </Text>
              </View>
            ) : (
              <View style={styles.albumsGrid}>
                {pendingDeviceAlbums.map(deviceAlbum => (
              <TouchableOpacity
                key={deviceAlbum.id}
                style={styles.albumCard}
                onPress={() => {
                  // Navigate to device album detail screen
                  navigation.navigate('DeviceAlbumDetail', {
                    albumId: deviceAlbum.id,
                    albumName: deviceAlbum.name,
                  });
                }}
                activeOpacity={0.8}>
                <View style={styles.albumCoverContainer}>
                  {deviceAlbum.coverUri ? (
                    <Image
                      source={{uri: deviceAlbum.coverUri}}
                      style={styles.albumCover}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.albumCover}>
                      <Icon name="albums-outline" size={48} color="#999999" />
                    </View>
                  )}

                  {/* Action Buttons - Bottom Right Side by Side */}
                  <View style={styles.actionButtonsContainer}>
                    {/* Upload or Status Button */}
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        uploadedDeviceAlbums.has(deviceAlbum.id) && styles.uploadedButton,
                      ]}
                      disabled={uploadingDeviceAlbums[deviceAlbum.name]?.isUploading}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (uploadedDeviceAlbums.has(deviceAlbum.id)) {
                          Alert.alert('Already Uploaded', `Enable auto-sync to upload new photos automatically.`);
                        } else {
                          Alert.alert(
                            'Upload Album',
                            `Upload all ${deviceAlbum.photoCount} photos from "${deviceAlbum.name}"?`,
                            [
                              {text: 'Cancel', style: 'cancel'},
                              {
                                text: 'Upload',
                                onPress: () => handleUploadDeviceAlbum(deviceAlbum),
                              },
                            ],
                          );
                        }
                      }}>
                      {uploadingDeviceAlbums[deviceAlbum.name]?.isUploading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Icon
                          name={uploadedDeviceAlbums.has(deviceAlbum.id) ? "checkmark" : "cloud-upload"}
                          size={20}
                          color="#ffffff"
                        />
                      )}
                    </TouchableOpacity>

                    {/* Sync Toggle Button - Only show when album is uploaded */}
                    {uploadedDeviceAlbums.has(deviceAlbum.id) && (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          syncEnabledAlbums.has(deviceAlbum.name) && styles.syncEnabledButton,
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (syncEnabledAlbums.has(deviceAlbum.name)) {
                            handleDisableSync(deviceAlbum);
                          } else {
                            handleEnableSync(deviceAlbum);
                          }
                        }}>
                        <Icon
                          name={syncEnabledAlbums.has(deviceAlbum.name) ? "sync" : "sync-outline"}
                          size={20}
                          color="#ffffff"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={styles.albumInfoContainer}>
                  <Text style={styles.albumName} numberOfLines={1}>
                    {deviceAlbum.name}
                  </Text>
                  <Text style={styles.albumCount}>
                    {deviceAlbum.photoCount} {deviceAlbum.photoCount === 1 ? 'photo' : 'photos'}
                  </Text>
                </View>
              </TouchableOpacity>
                ))}
              </View>
            );
          })()
        )}
      </ScrollView>

      {/* Dropdown Menu - Rendered outside ScrollView */}
      {openMenuAlbumId !== null && menuButtonLayout && (
        <>
          {/* Backdrop to close menu on tap outside */}
          <TouchableOpacity
            style={styles.dropdownBackdrop}
            onPress={() => setOpenMenuAlbumId(null)}
            activeOpacity={0}
          />

          {/* Dropdown Menu */}
          <View
            style={[
              styles.dropdownMenu,
              {
                top: menuButtonLayout.y + menuButtonLayout.height + 8,
                left: Math.max(16, menuButtonLayout.x - 220 + 44),
              },
            ]}>
            {!deviceUploadedServerAlbums.get(openMenuAlbumId)?.syncEnabled && (
              <TouchableOpacity
                style={styles.dropdownMenuItem}
                onPress={() => {
                  setOpenMenuAlbumId(null);
                  const album = albums.find(a => a.id === openMenuAlbumId);
                  if (album) {
                    Alert.alert(
                      'Upload Remaining Photos',
                      'Upload all new photos added to this device album since upload?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Upload',
                          onPress: () => handleUploadRemainingPhotos(album)
                        },
                      ],
                    );
                  }
                }}>
                <Icon name="cloud-upload" size={16} color="#2196f3" />
                <Text style={styles.dropdownMenuText}>Upload Remaining</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.dropdownMenuItem}
              onPress={() => {
                setOpenMenuAlbumId(null);
                const deviceInfo = deviceUploadedServerAlbums.get(openMenuAlbumId);
                if (deviceInfo) {
                  const deviceAlbum = {
                    id: 'device-album-id',
                    name: deviceInfo.deviceAlbumName,
                    photoCount: 0,
                  };
                  if (deviceInfo.syncEnabled) {
                    handleDisableSync(deviceAlbum);
                  } else {
                    handleEnableSync(deviceAlbum);
                  }
                }
              }}>
              <Icon
                name={deviceUploadedServerAlbums.get(openMenuAlbumId)?.syncEnabled ? "sync" : "sync-outline"}
                size={16}
                color={deviceUploadedServerAlbums.get(openMenuAlbumId)?.syncEnabled ? "#ff6b6b" : "#2196f3"}
              />
              <Text style={[styles.dropdownMenuText, deviceUploadedServerAlbums.get(openMenuAlbumId)?.syncEnabled && {color: '#ff6b6b'}]}>
                {deviceUploadedServerAlbums.get(openMenuAlbumId)?.syncEnabled ? 'Disable Sync' : 'Enable Sync'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dropdownMenuItem}
              onPress={() => {
                setOpenMenuAlbumId(null);
                handleAddToAlbum(openMenuAlbumId);
              }}>
              <Icon name="add-circle" size={16} color="#2196f3" />
              <Text style={styles.dropdownMenuText}>Add More Photos</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenCreateModal}
        activeOpacity={0.8}>
        <Icon name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Create Album Modal */}
      <CreateAlbumModal
        visible={showCreateModal}
        onClose={handleCloseCreateModal}
        onSuccess={handleAlbumCreated}
      />
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 24,
    marginBottom: 16,
  },
  albumsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  albumCard: {
    width: '47%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  albumCoverContainer: {
    width: '100%',
    aspectRatio: 1,
    marginBottom: 8,
    position: 'relative',
  },
  albumCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
  },
  autoSyncIcon: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceAlbumBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  deviceAlbumIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2196f3',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  deviceAlbumIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2196f3',
  },
  syncActiveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  deviceAlbumMenuButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 8,
    zIndex: 20,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 19,
  },
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 220,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 21,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  dropdownMenuText: {
    fontSize: 14,
    color: '#2196f3',
    fontWeight: '500',
  },
  albumInfoContainer: {
    marginTop: 8,
  },
  albumHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  albumName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  albumCount: {
    fontSize: 14,
    color: '#666666',
    flexShrink: 0,
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  uploadedButton: {
    backgroundColor: '#4caf50',
  },
  syncEnabledButton: {
    backgroundColor: '#2196f3',
  },
  createAlbumCard: {
    width: '47%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  createAlbumText: {
    fontSize: 16,
    color: '#666666',
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
    width: '100%',
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
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
});

