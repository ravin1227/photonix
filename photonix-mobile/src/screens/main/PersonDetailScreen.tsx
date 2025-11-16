import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import AuthenticatedImage from '../../components/AuthenticatedImage';
import ImageCropModal from '../../components/ImageCropModal';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import peopleService, {PersonDetailResponse, Face} from '../../services/peopleService';
import {PeopleStackParamList} from '../../navigation/PeopleStackNavigator';
import {API_CONFIG} from '../../config/api';

type PersonDetailScreenRouteProp = RouteProp<PeopleStackParamList, 'PersonDetail'>;
type PersonDetailScreenNavigationProp = NativeStackNavigationProp<
  PeopleStackParamList,
  'PersonDetail'
>;

export default function PersonDetailScreen() {
  const route = useRoute<PersonDetailScreenRouteProp>();
  const navigation = useNavigation<PersonDetailScreenNavigationProp>();
  const {personId, personName} = route.params;

  const [personData, setPersonData] = useState<PersonDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showFaceSelector, setShowFaceSelector] = useState(false);
  const [availableFaces, setAvailableFaces] = useState<Face[]>([]);
  const [isLoadingFaces, setIsLoadingFaces] = useState(false);
  const [isUpdatingThumbnail, setIsUpdatingThumbnail] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedFaceUri, setSelectedFaceUri] = useState<string | null>(null);
  const [selectedFaceId, setSelectedFaceId] = useState<number | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

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

  const loadPersonData = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      setError(null);
      const response = await peopleService.getPerson(personId, pageNum, 50);
      if (response.data) {
        if (refresh || pageNum === 1) {
          setPersonData(response.data);
          // Log thumbnail URLs for debugging
          if (response.data.photos.length > 0) {
            console.log('First photo thumbnail URL:', response.data.photos[0].thumbnail_urls);
            console.log('Normalized URL:', normalizeThumbnailUrl(response.data.photos[0].thumbnail_urls?.medium));
          }
        } else {
          // Append photos for pagination
          setPersonData((prev) => {
            if (!prev) return response.data;
            return {
              ...prev,
              photos: [...prev.photos, ...response.data.photos],
              meta: response.data.meta,
            };
          });
        }
        setHasMore(response.data.meta.current_page < response.data.meta.total_pages);
      } else {
        setError(response.error || 'Failed to load person details');
      }
    } catch (err: any) {
      console.error('Error loading person data:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPersonData();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    loadPersonData(1, true);
  };

  const loadMore = () => {
    if (!isLoading && hasMore && personData) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPersonData(nextPage);
    }
  };

  const loadAvailableFaces = async () => {
    setIsLoadingFaces(true);
    try {
      const response = await peopleService.getPersonFaces(personId, 1, 100);
      if (response.data) {
        setAvailableFaces(response.data.faces || []);
        setShowFaceSelector(true);
      } else {
        Alert.alert('Error', response.error || 'Failed to load faces');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load faces');
    } finally {
      setIsLoadingFaces(false);
    }
  };

  const handleSelectFace = (face: Face) => {
    const faceUri = face.thumbnail_url ? normalizeThumbnailUrl(face.thumbnail_url) : null;
    if (faceUri) {
      setSelectedFaceId(face.id);
      setSelectedFaceUri(faceUri);
      setShowFaceSelector(false);
      setShowCropModal(true);
    } else {
      Alert.alert('Error', 'Face thumbnail not available');
    }
  };

  const handleCropSave = async (cropData: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  }) => {
    if (!selectedFaceId) return;

    setIsUpdatingThumbnail(true);
    setShowCropModal(false);
    try {
      // For now, just update the cover face
      // In the future, we could send the crop data to the backend
      const response = await peopleService.updateCoverFace(personId, selectedFaceId);
      if (response.data) {
        // Reload person data to get updated thumbnail
        await loadPersonData(1, true);
        Alert.alert('Success', 'Thumbnail updated successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to update thumbnail');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update thumbnail');
    } finally {
      setIsUpdatingThumbnail(false);
      setSelectedFaceId(null);
      setSelectedFaceUri(null);
    }
  };

  const handleStartEditName = () => {
    const currentName = personData?.person?.name || personName;
    setEditedName(currentName);
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setIsSavingName(true);
    try {
      const response = await peopleService.updatePersonName(personId, editedName.trim());
      if (response.data) {
        // Reload person data to get updated name
        await loadPersonData(1, true);
        setIsEditingName(false);
        setEditedName('');
        
        // Update navigation params to reflect new name
        navigation.setParams({
          personId,
          personName: editedName.trim(),
        });
      } else {
        Alert.alert('Error', response.error || 'Failed to update name');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update name');
    } finally {
      setIsSavingName(false);
    }
  };

  const formatPhotoCount = (count: number): string => {
    if (count === 0) return 'No photos';
    if (count === 1) return '1 photo';
    if (count < 1000) return `${count} photos`;
    return `${(count / 1000).toFixed(1)}K photos`;
  };

  const getThumbnailUrl = (photo: any): string | null => {
    const url = photo.thumbnail_urls?.medium || photo.thumbnail_urls?.small || null;
    return normalizeThumbnailUrl(url);
  };

  const renderPhoto = ({item: photo}: {item: any}) => {
    const thumbnailUrl = getThumbnailUrl(photo);
    return (
      <TouchableOpacity style={styles.photoThumbnail}>
        <AuthenticatedImage
          uri={thumbnailUrl}
          style={styles.photoImage}
          placeholderStyle={styles.photoPlaceholder}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  if (isLoading && !personData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{personName}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !personData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{personName}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadPersonData()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const person = personData?.person;
  const photos = personData?.photos || [];

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
          {isEditingName ? editedName : person?.name || personName}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <FlatList
        style={styles.content}
        data={photos}
        renderItem={renderPhoto}
        numColumns={3}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <View>
            {/* Person Thumbnail and Stats */}
            <View style={styles.personInfoSection}>
              <View style={styles.thumbnailContainer}>
                <AuthenticatedImage
                  uri={person?.thumbnail_url ? normalizeThumbnailUrl(person.thumbnail_url) : null}
                  style={styles.personThumbnail}
                  placeholderStyle={styles.personThumbnailPlaceholder}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.editThumbnailButton}
                  onPress={loadAvailableFaces}
                  disabled={isLoadingFaces || isUpdatingThumbnail}>
                  <Icon name="camera" size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <View style={styles.nameContainer}>
                {isEditingName ? (
                  <View style={styles.nameEditContainer}>
                    <TextInput
                      style={styles.nameInput}
                      value={editedName}
                      onChangeText={setEditedName}
                      placeholder="Enter name"
                      placeholderTextColor="#999999"
                      autoFocus
                      maxLength={255}
                    />
                    <TouchableOpacity
                      onPress={handleSaveName}
                      disabled={isSavingName}
                      style={styles.nameSaveButton}>
                      {isSavingName ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : (
                        <Icon name="checkmark" size={20} color="#000000" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleCancelEditName}
                      disabled={isSavingName}
                      style={styles.nameCancelButton}>
                      <Icon name="close" size={20} color="#666666" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.nameDisplayContainer}>
                    <Text style={styles.personName}>
                      {person?.name || personName}
                    </Text>
                    <TouchableOpacity
                      onPress={handleStartEditName}
                      style={styles.editNameButton}
                      disabled={isUpdatingThumbnail}>
                      <Icon name="pencil" size={16} color="#666666" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <Text style={styles.personStats}>
                {formatPhotoCount(person?.photo_count || 0)} • {person?.face_count || 0} faces
              </Text>
            </View>

            {/* Photos Section Title */}
            {photos.length > 0 && (
              <View style={styles.photosSectionHeader}>
                <Text style={styles.sectionTitle}>Photos</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No photos found</Text>
          </View>
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListFooterComponent={
          hasMore && photos.length > 0 ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color="#666666" />
            </View>
          ) : null
        }
      />

      {/* Face Selector Modal */}
      <Modal
        visible={showFaceSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFaceSelector(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Thumbnail</Text>
              <TouchableOpacity
                onPress={() => setShowFaceSelector(false)}
                style={styles.closeButton}>
                <Icon name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            {isLoadingFaces ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#000000" />
              </View>
            ) : availableFaces.length > 0 ? (
              <FlatList
                data={availableFaces}
                numColumns={3}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({item: face}) => (
                  <TouchableOpacity
                    style={styles.faceOption}
                    onPress={() => handleSelectFace(face)}
                    disabled={isUpdatingThumbnail}>
                    <AuthenticatedImage
                      uri={face.thumbnail_url ? normalizeThumbnailUrl(face.thumbnail_url) : null}
                      style={styles.faceOptionImage}
                      placeholderStyle={styles.faceOptionPlaceholder}
                      resizeMode="cover"
                    />
                    {isUpdatingThumbnail && (
                      <View style={styles.faceOptionOverlay}>
                        <ActivityIndicator size="small" color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.modalFacesGrid}
              />
            ) : (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No faces available</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Image Crop Modal */}
      <ImageCropModal
        visible={showCropModal}
        imageUri={selectedFaceUri}
        onClose={() => {
          setShowCropModal(false);
          setSelectedFaceId(null);
          setSelectedFaceUri(null);
        }}
        onSave={handleCropSave}
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
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  personInfoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  personThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    marginBottom: 16,
  },
  personThumbnailPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    marginBottom: 16,
  },
  nameContainer: {
    width: '100%',
    marginBottom: 8,
  },
  nameDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  personName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  editNameButton: {
    padding: 4,
  },
  nameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  nameInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingVertical: 4,
    maxWidth: 200,
  },
  nameSaveButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameCancelButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personStats: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  photosSectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  photoThumbnail: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 2,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  thumbnailContainer: {
    position: 'relative',
  },
  editThumbnailButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  modalFacesGrid: {
    padding: 16,
  },
  faceOption: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 4,
    position: 'relative',
  },
  faceOptionImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  faceOptionPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  faceOptionOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 16,
    color: '#666666',
  },
});

