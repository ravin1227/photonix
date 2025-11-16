import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import albumService from '../services/albumService';
import photoService, {Photo} from '../services/photoService';
import {API_CONFIG} from '../config/api';
import AuthImage from './AuthImage';

interface CreateAlbumModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateAlbumModal({
  visible,
  onClose,
  onSuccess,
}: CreateAlbumModalProps) {
  const insets = useSafeAreaInsets();
  const [albumName, setAlbumName] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [albumPrivacy, setAlbumPrivacy] = useState<'private' | 'shared' | 'public'>('private');
  const [albumType, setAlbumType] = useState<'manual' | 'smart' | 'date_based'>('manual');
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([]);
  const [availablePhotos, setAvailablePhotos] = useState<Photo[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPhotos();
    } else {
      // Reset form when modal closes
      setAlbumName('');
      setAlbumDescription('');
      setAlbumPrivacy('private');
      setAlbumType('manual');
      setSelectedPhotos([]);
    }
  }, [visible]);

  const loadPhotos = async () => {
    try {
      setIsLoadingPhotos(true);
      const response = await photoService.getPhotos(1, 1000);
      if (response.data) {
        setAvailablePhotos(response.data.photos);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setIsLoadingPhotos(false);
    }
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

  const handleCreateAlbum = async () => {
    if (!albumName.trim()) {
      Alert.alert('Error', 'Please enter an album name');
      return;
    }

    try {
      setIsCreating(true);
      
      const createResponse = await albumService.createAlbum({
        name: albumName.trim(),
        description: albumDescription.trim() || undefined,
        privacy: albumPrivacy,
        album_type: albumType,
      });

      if (createResponse.error) {
        Alert.alert('Error', createResponse.error);
        setIsCreating(false);
        return;
      }

      const newAlbum = createResponse.data?.album;
      if (!newAlbum) {
        Alert.alert('Error', 'Failed to create album');
        setIsCreating(false);
        return;
      }

      if (selectedPhotos.length > 0) {
        const addPhotoPromises = selectedPhotos.map(photoId =>
          albumService.addPhotoToAlbum(newAlbum.id, photoId)
        );
        await Promise.all(addPhotoPromises);
      }

      Alert.alert('Success', 'Album created successfully', [
        {
          text: 'OK',
          onPress: () => {
            onClose();
            if (onSuccess) {
              onSuccess();
            }
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create album: ' + (error.message || 'Unknown error'));
    } finally {
      setIsCreating(false);
    }
  };

  const getThumbnailUrl = (photo: Photo): string => {
    const url = photo.thumbnail_urls?.small || photo.thumbnail_urls?.medium || photo.thumbnail_urls?.large || '';
    if (!url) return '';
    if (url.startsWith('http')) {
      return url;
    }
    const baseUrl = API_CONFIG.BASE_URL.replace('/api/v1', '');
    return `${baseUrl}${url}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.modalCloseButton}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Create Album</Text>
          <TouchableOpacity
            onPress={handleCreateAlbum}
            disabled={isCreating || !albumName.trim()}
            style={[
              styles.modalSaveButton,
              (!albumName.trim() || isCreating) && styles.modalSaveButtonDisabled,
            ]}>
            <Text
              style={[
                styles.modalSaveText,
                (!albumName.trim() || isCreating) && styles.modalSaveTextDisabled,
              ]}>
              {isCreating ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} contentContainerStyle={{paddingBottom: insets.bottom + 20}}>
          {/* Album Name */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Album Name *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Enter album name"
              value={albumName}
              onChangeText={setAlbumName}
              maxLength={100}
            />
          </View>

          {/* Description */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              placeholder="Add a description (optional)"
              value={albumDescription}
              onChangeText={setAlbumDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          {/* Privacy */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Privacy</Text>
            <View style={styles.optionGroup}>
              {(['private', 'shared', 'public'] as const).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    albumPrivacy === option && styles.optionButtonActive,
                  ]}
                  onPress={() => setAlbumPrivacy(option)}>
                  <Icon
                    name={
                      option === 'private'
                        ? 'lock-closed-outline'
                        : option === 'shared'
                        ? 'people-outline'
                        : 'globe-outline'
                    }
                    size={20}
                    color={albumPrivacy === option ? '#000000' : '#666666'}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      albumPrivacy === option && styles.optionTextActive,
                    ]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Album Type */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Album Type</Text>
            <View style={styles.optionGroup}>
              {(['manual', 'smart', 'date_based'] as const).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    albumType === option && styles.optionButtonActive,
                  ]}
                  onPress={() => setAlbumType(option)}>
                  <Text
                    style={[
                      styles.optionText,
                      albumType === option && styles.optionTextActive,
                    ]}>
                    {option === 'manual'
                      ? 'Manual'
                      : option === 'smart'
                      ? 'Smart'
                      : 'Date Based'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Select Photos */}
          <View style={styles.formSection}>
            <View style={styles.formSectionHeader}>
              <Text style={styles.formLabel}>Select Photos</Text>
              {selectedPhotos.length > 0 && (
                <Text style={styles.selectedCount}>
                  {selectedPhotos.length} selected
                </Text>
              )}
            </View>
            
            {isLoadingPhotos ? (
              <View style={styles.photosLoadingContainer}>
                <ActivityIndicator size="small" color="#666666" />
                <Text style={styles.photosLoadingText}>Loading photos...</Text>
              </View>
            ) : availablePhotos.length === 0 ? (
              <View style={styles.photosEmptyContainer}>
                <Text style={styles.photosEmptyText}>No photos available</Text>
              </View>
            ) : (
              <View style={styles.photosGrid}>
                {availablePhotos.map(photo => {
                  const thumbnailUrl = getThumbnailUrl(photo);
                  const isSelected = selectedPhotos.includes(photo.id);
                  return (
                    <TouchableOpacity
                      key={photo.id}
                      style={styles.photoSelectItem}
                      onPress={() => togglePhotoSelection(photo.id)}>
                      {thumbnailUrl ? (
                        <AuthImage
                          source={{uri: thumbnailUrl}}
                          style={styles.photoSelectImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.photoSelectPlaceholder}>
                          <Icon name="ban" size={24} color="#999999" />
                        </View>
                      )}
                      {isSelected && (
                        <View style={styles.photoSelectOverlay}>
                          <View style={styles.photoSelectCheck}>
                            <Icon name="checkmark" size={20} color="#ffffff" />
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalSaveButton: {
    padding: 8,
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  modalSaveTextDisabled: {
    color: '#999999',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  formSection: {
    marginTop: 24,
  },
  formSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    gap: 6,
  },
  optionButtonActive: {
    borderColor: '#000000',
    backgroundColor: '#f5f5f5',
  },
  optionText: {
    fontSize: 14,
    color: '#666666',
  },
  optionTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  selectedCount: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  photosLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photosLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  photosEmptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  photosEmptyText: {
    fontSize: 14,
    color: '#666666',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  photoSelectItem: {
    width: '32%',
    aspectRatio: 1,
    position: 'relative',
  },
  photoSelectImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  photoSelectPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoSelectOverlay: {
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
  photoSelectCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

