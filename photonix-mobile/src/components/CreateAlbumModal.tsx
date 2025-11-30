import React, {useState, useEffect, useRef} from 'react';
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
  Switch,
  FlatList,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {Image} from 'react-native';
import albumService from '../services/albumService';
import photoService, {Photo} from '../services/photoService';
import albumSharingService, {UserSearchResult} from '../services/albumSharingService';
import devicePhotoService, {DevicePhoto} from '../services/devicePhotoService';
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
  const [albumPrivacy, setAlbumPrivacy] = useState<'private' | 'shared'>('private');
  // Album type is always 'manual' for now
  const albumType: 'manual' = 'manual';
  // Unified photo type for both uploaded and device photos
  type SelectablePhoto = 
    | {type: 'uploaded'; id: number; photo: Photo}
    | {type: 'device'; id: string; photo: DevicePhoto};
  
  const [selectedPhotos, setSelectedPhotos] = useState<Array<{type: 'uploaded' | 'device'; id: number | string}>>([]);
  const [availablePhotos, setAvailablePhotos] = useState<SelectablePhoto[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Pagination state
  const [uploadedPage, setUploadedPage] = useState(1);
  const [hasMoreUploaded, setHasMoreUploaded] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [devicePhotosLoaded, setDevicePhotosLoaded] = useState(false);
  const PER_PAGE = 50; // Load 50 photos at a time
  
  // User search and contributors
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [canContribute, setCanContribute] = useState(true); // Default: can contribute
  const [contributors, setContributors] = useState<Array<UserSearchResult & {canContribute: boolean}>>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      loadPhotos();
    } else {
      // Reset form when modal closes
      setAlbumName('');
      setAlbumDescription('');
      setAlbumPrivacy('private');
      setSelectedPhotos([]);
      setSearchQuery('');
      setSearchResults([]);
      setContributors([]);
      setShowSearchResults(false);
      setCanContribute(true);
      // Reset pagination
      setUploadedPage(1);
      setHasMoreUploaded(true);
      setDevicePhotosLoaded(false);
      setAvailablePhotos([]);
    }
  }, [visible]);

  // Debounced user search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim() || albumPrivacy !== 'shared') {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('Searching users with query:', searchQuery.trim());
        const response = await albumSharingService.searchUsers(searchQuery.trim());
        console.log('Search response:', response);
        if (response.error) {
          console.error('Search error:', response.error);
          setSearchResults([]);
          setShowSearchResults(false);
        } else if (response.data) {
          // Filter out users already added as contributors
          const filtered = response.data.users.filter(
            user => !contributors.some(c => c.id === user.id)
          );
          console.log('Filtered search results:', filtered);
          setSearchResults(filtered);
          setShowSearchResults(filtered.length > 0);
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
        setShowSearchResults(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, albumPrivacy, contributors]);

  const loadPhotos = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setIsLoadingPhotos(true);
        setUploadedPage(1);
        setHasMoreUploaded(true);
        setDevicePhotosLoaded(false);
      } else {
        setIsLoadingMore(true);
      }

      const newPhotos: SelectablePhoto[] = [];

      // Load uploaded photos (paginated)
      try {
        const uploadedResponse = await photoService.getPhotos(page, PER_PAGE);
        if (uploadedResponse.data) {
          const uploadedPhotos = uploadedResponse.data.photos.map((photo: Photo) => ({
            type: 'uploaded' as const,
            id: photo.id,
            photo,
          }));
          newPhotos.push(...uploadedPhotos);
          
          // Check if there are more pages
          const meta = uploadedResponse.data.meta;
          const hasMore = meta ? meta.current_page < meta.total_pages : false;
          setHasMoreUploaded(hasMore);
          setUploadedPage(page);
          
          console.log(`Loaded page ${page}: ${uploadedPhotos.length} uploaded photos (hasMore: ${hasMore})`);
        }
      } catch (error: any) {
        console.error('Error loading uploaded photos:', error);
        setHasMoreUploaded(false);
      }

      // Load device photos only on first page
      if (page === 1 && !devicePhotosLoaded) {
        try {
          const hasPermission = await devicePhotoService.checkPermission();
          if (!hasPermission) {
            console.log('Device photo permission not granted, requesting...');
            const granted = await devicePhotoService.requestPermission();
            if (!granted) {
              console.log('Device photo permission denied, skipping device photos');
              setDevicePhotosLoaded(true); // Mark as attempted
            } else {
              // Permission granted, load device photos
              const devicePhotosResult = await devicePhotoService.getPhotos(PER_PAGE);
              
              if (devicePhotosResult && devicePhotosResult.photos) {
                const devicePhotos = devicePhotosResult.photos.map((photo: DevicePhoto) => ({
                  type: 'device' as const,
                  id: photo.uri,
                  photo,
                }));
                newPhotos.push(...devicePhotos);
                console.log(`Loaded ${devicePhotos.length} device photos`);
              }
              setDevicePhotosLoaded(true);
            }
          } else {
            // Permission already granted
            const devicePhotosResult = await devicePhotoService.getPhotos(PER_PAGE);
            
            if (devicePhotosResult && devicePhotosResult.photos) {
              const devicePhotos = devicePhotosResult.photos.map((photo: DevicePhoto) => ({
                type: 'device' as const,
                id: photo.uri,
                photo,
              }));
              newPhotos.push(...devicePhotos);
              console.log(`Loaded ${devicePhotos.length} device photos`);
            }
            setDevicePhotosLoaded(true);
          }
        } catch (error: any) {
          console.error('Error loading device photos:', error);
          setDevicePhotosLoaded(true); // Mark as attempted to avoid retrying
        }
      }

      // Sort by timestamp (newest first)
      if (newPhotos.length > 0) {
        newPhotos.sort((a, b) => {
          const aTime = a.type === 'uploaded' 
            ? new Date(a.photo.captured_at || a.photo.created_at).getTime()
            : a.photo.timestamp;
          const bTime = b.type === 'uploaded'
            ? new Date(b.photo.captured_at || b.photo.created_at).getTime()
            : b.photo.timestamp;
          return bTime - aTime;
        });
      }

      // Append or replace photos
      if (append) {
        setAvailablePhotos(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(p => `${p.type}_${p.id}`));
          const uniqueNew = newPhotos.filter(p => !existingIds.has(`${p.type}_${p.id}`));
          return [...prev, ...uniqueNew].sort((a, b) => {
            const aTime = a.type === 'uploaded' 
              ? new Date(a.photo.captured_at || a.photo.created_at).getTime()
              : a.photo.timestamp;
            const bTime = b.type === 'uploaded'
              ? new Date(b.photo.captured_at || b.photo.created_at).getTime()
              : b.photo.timestamp;
            return bTime - aTime;
          });
        });
      } else {
        setAvailablePhotos(newPhotos);
      }

      console.log(`Total photos: ${append ? availablePhotos.length + newPhotos.length : newPhotos.length}`);
    } catch (error: any) {
      console.error('Unexpected error loading photos:', error);
    } finally {
      setIsLoadingPhotos(false);
      setIsLoadingMore(false);
    }
  };

  const loadMorePhotos = () => {
    if (!isLoadingMore && hasMoreUploaded && !isLoadingPhotos) {
      loadPhotos(uploadedPage + 1, true);
    }
  };

  const togglePhotoSelection = (photo: SelectablePhoto) => {
    setSelectedPhotos(prev => {
      const existingIndex = prev.findIndex(
        p => p.type === photo.type && p.id === photo.id
      );
      if (existingIndex >= 0) {
        return prev.filter((_, index) => index !== existingIndex);
      } else {
        return [...prev, {type: photo.type, id: photo.id}];
      }
    });
  };

  const isPhotoSelected = (photo: SelectablePhoto): boolean => {
    return selectedPhotos.some(p => p.type === photo.type && p.id === photo.id);
  };

  const handleUserSelect = (user: UserSearchResult) => {
    // Add user to contributors if not already added
    if (!contributors.some(c => c.id === user.id)) {
      console.log('Adding contributor:', user, 'canContribute:', canContribute);
      setContributors(prev => {
        const updated = [...prev, {...user, canContribute}];
        console.log('Updated contributors:', updated);
        return updated;
      });
    }
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleRemoveContributor = (userId: number) => {
    setContributors(prev => prev.filter(c => c.id !== userId));
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

      // Handle selected photos - upload device photos first, then add all to album
      if (selectedPhotos.length > 0) {
        const uploadedPhotoIds: number[] = [];
        const devicePhotosToUpload: Array<{uri: string; type: string; name: string; capturedAt?: string}> = [];

        // Separate uploaded and device photos
        for (const selected of selectedPhotos) {
          if (selected.type === 'uploaded') {
            uploadedPhotoIds.push(selected.id as number);
          } else {
            // Find the device photo
            const devicePhoto = availablePhotos.find(
              p => p.type === 'device' && p.id === selected.id
            );
            if (devicePhoto && devicePhoto.type === 'device') {
              const uri = devicePhoto.photo.uri;
              const filename = devicePhoto.photo.filename || `photo_${Date.now()}.jpg`;
              const mimeType = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
              const capturedAt = devicePhoto.photo.timestamp 
                ? new Date(devicePhoto.photo.timestamp).toISOString()
                : undefined;
              
              devicePhotosToUpload.push({
                uri,
                type: mimeType,
                name: filename,
                capturedAt,
              });
            }
          }
        }

        // Upload device photos first
        if (devicePhotosToUpload.length > 0) {
          console.log(`Uploading ${devicePhotosToUpload.length} device photos...`);
          const uploadResponse = await photoService.uploadPhotos(devicePhotosToUpload);
          
          if (uploadResponse.error) {
            Alert.alert('Warning', `Failed to upload some device photos: ${uploadResponse.error}`);
          } else if (uploadResponse.data?.results?.successful) {
            const uploadedIds = uploadResponse.data.results.successful.map(
              (result: any) => result.photo.id
            );
            uploadedPhotoIds.push(...uploadedIds);
            console.log(`Successfully uploaded ${uploadedIds.length} device photos`);
          }
        }

        // Add all photos (both already uploaded and newly uploaded) to album
        const allPhotoIds = [...uploadedPhotoIds];
        if (allPhotoIds.length > 0) {
          const addPhotoPromises = allPhotoIds.map(photoId =>
            albumService.addPhotoToAlbum(newAlbum.id, photoId)
          );
          await Promise.all(addPhotoPromises);
          console.log(`Added ${allPhotoIds.length} photos to album`);
        }
      }

      // Share album with contributors if privacy is shared
      let sharedCount = 0;
      let failedShares: string[] = [];
      
      if (albumPrivacy === 'shared' && contributors.length > 0) {
        console.log(`Sharing album ${newAlbum.id} with ${contributors.length} contributors:`, contributors);
        const shareResults = await Promise.allSettled(
          contributors.map(async (contributor) => {
            try {
              console.log(`Sharing with ${contributor.email} (${contributor.name}), canContribute: ${contributor.canContribute}...`);
              const shareResponse = await albumSharingService.shareAlbum(
                newAlbum.id,
                contributor.email,
                contributor.canContribute
              );
              if (shareResponse.error) {
                console.error(`Failed to share with ${contributor.email}:`, shareResponse.error);
                throw new Error(shareResponse.error);
              } else {
                console.log(`Successfully shared with ${contributor.email}`);
                return { success: true, email: contributor.email, name: contributor.name };
              }
            } catch (error: any) {
              console.error(`Error sharing with ${contributor.email}:`, error);
              return {
                success: false,
                email: contributor.email,
                name: contributor.name,
                error: error.message || 'Unknown error',
              };
            }
          })
        );

        shareResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              sharedCount++;
            } else {
              failedShares.push(`${result.value.name} (${result.value.error})`);
            }
          } else {
            failedShares.push(`Unknown error`);
          }
        });

        console.log(`Sharing complete: ${sharedCount} succeeded, ${failedShares.length} failed`);
      }

      let successMessage = 'Album created successfully';
      if (albumPrivacy === 'shared' && contributors.length > 0) {
        if (sharedCount > 0) {
          successMessage += `\nShared with ${sharedCount} contributor${sharedCount > 1 ? 's' : ''}`;
        }
        if (failedShares.length > 0) {
          successMessage += `\n\nFailed to share with:\n${failedShares.join('\n')}`;
        }
      }

      Alert.alert(
        sharedCount > 0 || failedShares.length === 0 ? 'Success' : 'Warning',
        successMessage,
        [
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

  const getPhotoThumbnail = (selectablePhoto: SelectablePhoto): string | null => {
    if (selectablePhoto.type === 'uploaded') {
      const url = selectablePhoto.photo.thumbnail_urls?.small || 
                  selectablePhoto.photo.thumbnail_urls?.medium || 
                  selectablePhoto.photo.thumbnail_urls?.large || '';
      if (!url) return null;
      if (url.startsWith('http')) {
        return url;
      }
      const baseUrl = API_CONFIG.BASE_URL.replace('/api/v1', '');
      return `${baseUrl}${url}`;
    } else {
      // Device photo - use URI directly
      return selectablePhoto.photo.uri;
    }
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
              {(['private', 'shared'] as const).map(option => (
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
                        : 'people-outline'
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

          {/* Contributors - Show when Shared is selected */}
          {albumPrivacy === 'shared' && (
            <View style={styles.formSection}>
              <View style={styles.contributorsHeader}>
                <Text style={styles.formLabel}>Add Contributors</Text>
                <View style={styles.contributionToggleContainer}>
                  <Text style={styles.contributionToggleLabel}>
                    {canContribute ? 'Can contribute' : 'Read only'}
                  </Text>
                  <Switch
                    value={canContribute}
                    onValueChange={setCanContribute}
                    trackColor={{false: '#E0E0E0', true: '#4CAF50'}}
                    thumbColor={canContribute ? '#FFFFFF' : '#F5F5F5'}
                  />
                </View>
              </View>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowSearchResults(true);
                    }
                  }}
                />
                {isSearching && (
                  <ActivityIndicator
                    size="small"
                    color="#666666"
                    style={styles.searchLoader}
                  />
                )}
              </View>

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <View style={styles.searchResultsContainer}>
                  {searchResults.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.searchResultItem}
                      onPress={() => handleUserSelect(item)}
                      activeOpacity={0.7}>
                      <View style={styles.searchResultInfo}>
                        <Text style={styles.searchResultName}>{item.name}</Text>
                        <Text style={styles.searchResultEmail}>{item.email}</Text>
                      </View>
                      <Icon name="add-circle-outline" size={24} color="#000000" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Contributors List */}
              {contributors.length > 0 && (
                <View style={styles.contributorsContainer}>
                  <Text style={styles.contributorsLabel}>
                    Contributors ({contributors.length})
                  </Text>
                  {contributors.map(contributor => (
                    <View key={contributor.id} style={styles.contributorItem}>
                      <View style={styles.contributorInfo}>
                        <Text style={styles.contributorName}>{contributor.name}</Text>
                        <Text style={styles.contributorEmail}>{contributor.email}</Text>
                        <Text style={styles.contributorPermission}>
                          {contributor.canContribute ? 'Can contribute' : 'Read only'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveContributor(contributor.id)}
                        style={styles.removeContributorButton}>
                        <Icon name="close-circle" size={24} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Album Type - Commented out for now, default is 'manual' */}
          {/* <View style={styles.formSection}>
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
          </View> */}

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
              <FlatList
                data={availablePhotos}
                renderItem={({item: photo}) => {
                  const thumbnailUrl = getPhotoThumbnail(photo);
                  const isSelected = isPhotoSelected(photo);
                  const photoKey = `${photo.type}_${photo.id}`;
                  return (
                    <TouchableOpacity
                      style={styles.photoSelectItem}
                      onPress={() => togglePhotoSelection(photo)}>
                      {thumbnailUrl ? (
                        photo.type === 'uploaded' ? (
                          <AuthImage
                            source={{uri: thumbnailUrl}}
                            style={styles.photoSelectImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Image
                            source={{uri: thumbnailUrl}}
                            style={styles.photoSelectImage}
                            resizeMode="cover"
                          />
                        )
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
                      {photo.type === 'device' && (
                        <View style={styles.devicePhotoBadge}>
                          <Icon name="phone-portrait-outline" size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                keyExtractor={(item) => `${item.type}_${item.id}`}
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
                contentContainerStyle={styles.photosGrid}
                scrollEnabled={false}
                nestedScrollEnabled={true}
              />
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
    paddingBottom: 8,
  },
  photoSelectItem: {
    width: '33.33%',
    aspectRatio: 1,
    position: 'relative',
    padding: 2,
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
  searchContainer: {
    position: 'relative',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    paddingRight: 40,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  searchLoader: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  searchResultsContainer: {
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  searchResultEmail: {
    fontSize: 14,
    color: '#666666',
  },
  contributorsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contributionToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contributionToggleLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  contributorsContainer: {
    marginTop: 16,
  },
  contributorsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  contributorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  contributorInfo: {
    flex: 1,
  },
  contributorName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  contributorEmail: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  contributorPermission: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 2,
  },
  removeContributorButton: {
    padding: 4,
  },
  devicePhotoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    padding: 4,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadMoreContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666666',
  },
});

