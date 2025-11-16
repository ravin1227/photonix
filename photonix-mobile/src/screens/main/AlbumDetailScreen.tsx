import React, {useState, useEffect} from 'react';
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
  const [availablePhotos, setAvailablePhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isAddingPhotos, setIsAddingPhotos] = useState(false);
  const [permissions, setPermissions] = useState<AlbumPermissions>({
    is_owner: false,
    can_view: true,
    can_add_photos: false,
    can_delete_album: false,
    can_delete_own_photos: false,
    can_delete_any_photos: false,
    can_share: false,
  });

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
    navigation.navigate('PhotoViewer', {photoId});
  };

  const loadAvailablePhotos = async () => {
    try {
      setIsLoadingPhotos(true);
      const response = await photoService.getPhotos(1, 1000);
      if (response.data) {
        // Filter out photos that are already in the album
        const albumPhotoIds = new Set(photos.map(p => p.id));
        const filtered = response.data.photos.filter(
          photo => !albumPhotoIds.has(photo.id),
        );
        setAvailablePhotos(filtered);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  const handleOpenAddPhotosModal = () => {
    setShowAddPhotosModal(true);
    loadAvailablePhotos();
  };

  const handleCloseAddPhotosModal = () => {
    setShowAddPhotosModal(false);
    setSelectedPhotos([]);
  };

  const togglePhotoSelection = (photoId: number) => {
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
      setIsAddingPhotos(true);
      const addPhotoPromises = selectedPhotos.map(photoId =>
        albumService.addPhotoToAlbum(albumId, photoId),
      );

      await Promise.all(addPhotoPromises);

      // Refresh album photos
      await loadPhotos(1);

      Alert.alert('Success', `${selectedPhotos.length} photo(s) added to album`, [
        {text: 'OK', onPress: handleCloseAddPhotosModal},
      ]);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to add photos: ' + (error.message || 'Unknown error'));
    } finally {
      setIsAddingPhotos(false);
    }
  };

  const getThumbnailUrlForSelection = (photo: Photo): string => {
    const url = photo.thumbnail_urls?.small || photo.thumbnail_urls?.medium || photo.thumbnail_urls?.large || '';
    if (!url) return '';
    if (url.startsWith('http')) {
      return url;
    }
    const baseUrl = API_CONFIG.BASE_URL.replace('/api/v1', '');
    return `${baseUrl}${url}`;
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
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setShowDeleteModal(true)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Icon name="trash-outline" size={24} color="#ff3040" />
          </TouchableOpacity>
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
          <View style={styles.grid}>
            {photos.map(photo => {
              const thumbnailUrl = getThumbnailUrl(photo);
              return (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoThumbnail}
                  onPress={() => handlePhotoPress(photo.id)}
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
                </TouchableOpacity>
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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenAddPhotosModal}
        activeOpacity={0.8}>
        <Icon name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

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
              <View style={styles.addPhotosGrid}>
                {availablePhotos.map(photo => {
                  const thumbnailUrl = getThumbnailUrlForSelection(photo);
                  const isSelected = selectedPhotos.includes(photo.id);
                  return (
                    <TouchableOpacity
                      key={photo.id}
                      style={styles.addPhotoSelectItem}
                      onPress={() => togglePhotoSelection(photo.id)}>
                      {thumbnailUrl ? (
                        <AuthImage
                          source={{uri: thumbnailUrl}}
                          style={styles.addPhotoSelectImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.addPhotoSelectPlaceholder}>
                          <Icon name="ban" size={24} color="#999999" />
                        </View>
                      )}
                      {isSelected && (
                        <View style={styles.addPhotoSelectOverlay}>
                          <View style={styles.addPhotoSelectCheck}>
                            <Icon name="checkmark" size={20} color="#ffffff" />
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
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
  photoThumbnail: {
    width: '32%',
    aspectRatio: 1,
    marginBottom: 4,
    flexShrink: 0,
    flexGrow: 0,
    overflow: 'hidden',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 4,
  },
  addPhotoSelectItem: {
    width: '32%',
    aspectRatio: 1,
    position: 'relative',
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
});

