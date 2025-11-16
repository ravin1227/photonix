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
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
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
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploadingAlbums, setUploadingAlbums] = useState<{[albumId: number]: {isUploading: boolean; uploaded: number; total: number}}>({});
  const [deviceAlbums, setDeviceAlbums] = useState<Array<{id: string; name: string; photoCount: number; coverUri?: string}>>([]);
  const [isLoadingDeviceAlbums, setIsLoadingDeviceAlbums] = useState(false);

  useEffect(() => {
    loadAlbums();
    loadDeviceAlbums();
  }, []);

  const loadDeviceAlbums = async () => {
    setIsLoadingDeviceAlbums(true);
    try {
      const albums = await devicePhotoService.getAlbums();
      setDeviceAlbums(albums);
    } catch (error: any) {
      console.error('Error loading device albums:', error);
      // Don't show error to user, just log it
      // User might not have granted permission yet
      setDeviceAlbums([]);
    } finally {
      setIsLoadingDeviceAlbums(false);
    }
  };

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

  const loadAlbums = async () => {
    try {
      setIsLoading(true);
      const response = await albumService.getAlbums();
      if (response.data) {
        setAlbums(response.data.albums);
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

      // Upload photos first
      const uploadResponse = await photoService.uploadPhotos(selectedPhotos);

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

  const handleAlbumCreated = () => {
    loadAlbums();
  };

  const getCoverImageUrl = (album: Album): string | null => {
    if (!album.cover_photo_url) return null;
    if (album.cover_photo_url.startsWith('http')) {
      return album.cover_photo_url;
    }
    return `${API_CONFIG.BASE_URL.replace('/api/v1', '')}${album.cover_photo_url}`;
  };

  if (isLoading && albums.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Albums</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading albums...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
                      />
                    ) : (
                      <View style={styles.albumCover}>
                        <Icon name="albums-outline" size={48} color="#999999" />
                      </View>
                    )}
                <TouchableOpacity 
                  style={styles.addIcon}
                  onPress={() => handleAddToAlbum(album.id)}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <Icon name="add-circle" size={24} color="#000000" />
                </TouchableOpacity>
              </View>
                  <View style={styles.albumInfoContainer}>
                    <Text style={styles.albumName} numberOfLines={1}>
                      {album.name}
                    </Text>
                    <View style={styles.albumFooter}>
                      <Text style={styles.albumCount}>
                        {album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}
                      </Text>
                      <UploadButton
                        onPress={() => handleUploadToAlbum(album.id)}
                        isUploading={uploadState?.isUploading || false}
                        uploadedCount={uploadState?.uploaded}
                        totalCount={uploadState?.total}
                        showMenu={hasUploaded}
                        onMenuPress={() => {
                          Alert.alert(
                            'Album Options',
                            'Choose an action',
                            [
                              {text: 'Cancel', style: 'cancel'},
                              {text: 'Upload More', onPress: () => handleUploadToAlbum(album.id)},
                              {text: 'View Album', onPress: () => {
                                navigation.navigate('AlbumDetail', {
                                  albumId: album.id,
                                  albumName: album.name,
                                });
                              }},
                            ],
                          );
                        }}
                      />
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
        ) : deviceAlbums.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No device albums found</Text>
            <Text style={styles.emptySubtext}>
              {Platform.OS === 'ios' 
                ? 'No albums found in your photo library'
                : 'Device album access may be limited on Android'}
            </Text>
          </View>
        ) : (
          <View style={styles.albumsGrid}>
            {deviceAlbums.map(deviceAlbum => (
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
                  <TouchableOpacity
                    style={styles.uploadDeviceAlbumButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      Alert.alert(
                        'Upload Album',
                        `Upload all ${deviceAlbum.photoCount} photos from "${deviceAlbum.name}"?`,
                        [
                          {text: 'Cancel', style: 'cancel'},
                          {
                            text: 'Upload',
                            onPress: async () => {
                              // TODO: Implement device album upload
                              Alert.alert('Info', 'Device album upload coming soon');
                            },
                          },
                        ],
                      );
                    }}>
                    <Icon name="cloud-upload" size={20} color="#000000" />
                  </TouchableOpacity>
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
        )}
      </ScrollView>

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
  albumInfoContainer: {
    marginTop: 8,
  },
  albumFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  albumName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  albumCount: {
    fontSize: 14,
    color: '#666666',
  },
  uploadDeviceAlbumButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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

