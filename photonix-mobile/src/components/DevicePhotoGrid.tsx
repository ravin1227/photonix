import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {launchImageLibrary, ImagePickerResponse} from 'react-native-image-picker';
import PhotoUploadStatus from './PhotoUploadStatus';
import uploadTrackingService from '../services/uploadTrackingService';
import {SelectedPhoto} from './PhotoPicker';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - 48) / 3; // 3 columns with padding

interface DevicePhoto {
  uri: string;
  id: string;
  timestamp: number;
  isUploaded: boolean;
}

interface DevicePhotoGridProps {
  onPhotoSelect?: (photos: SelectedPhoto[]) => void;
  maxSelection?: number;
  showUploadStatus?: boolean;
}

export default function DevicePhotoGrid({
  onPhotoSelect,
  maxSelection = 50,
  showUploadStatus = true,
}: DevicePhotoGridProps) {
  const [devicePhotos, setDevicePhotos] = useState<DevicePhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDevicePhotos();
  }, []);

  const loadDevicePhotos = async () => {
    setIsLoading(true);
    try {
      // Load all photos from device
      launchImageLibrary(
        {
          mediaType: 'photo',
          selectionLimit: 0, // Get all photos
          includeBase64: false,
        },
        async (response: ImagePickerResponse) => {
          if (response.errorCode || !response.assets) {
            setIsLoading(false);
            return;
          }

          // Get uploaded photos tracking
          const uploadedPhotos = await uploadTrackingService.getUploadedPhotos();
          const uploadedIds = new Set(uploadedPhotos.map(p => p.deviceId));

          // Map device photos with upload status
          const photos: DevicePhoto[] = response.assets.map(asset => {
            const deviceId = asset.id || asset.uri || '';
            return {
              uri: asset.uri || '',
              id: deviceId,
              timestamp: asset.timestamp || Date.now(),
              isUploaded: uploadedIds.has(deviceId),
            };
          });

          // Sort by timestamp (newest first)
          photos.sort((a, b) => b.timestamp - a.timestamp);

          setDevicePhotos(photos);
          setIsLoading(false);
        },
      );
    } catch (error) {
      console.error('Error loading device photos:', error);
      setIsLoading(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      if (newSelected.size < maxSelection) {
        newSelected.add(photoId);
      }
    }
    setSelectedPhotos(newSelected);
  };

  const handleUploadSelected = () => {
    const selected = devicePhotos.filter(p => selectedPhotos.has(p.id));
    const selectedForUpload: SelectedPhoto[] = selected.map(p => ({
      uri: p.uri,
      type: 'image/jpeg',
      name: `photo_${p.id}.jpg`,
      id: p.id,
      timestamp: p.timestamp,
    }));

    if (onPhotoSelect) {
      onPhotoSelect(selectedForUpload);
    }
  };

  const renderPhoto = ({item: photo}: {item: DevicePhoto}) => {
    const isSelected = selectedPhotos.has(photo.id);
    
    return (
      <TouchableOpacity
        style={[styles.photoContainer, isSelected && styles.photoSelected]}
        onPress={() => togglePhotoSelection(photo.id)}>
        <View style={styles.photoWrapper}>
          {/* Photo thumbnail would go here - using placeholder for now */}
          <View style={styles.photoThumbnail} />
          
          {/* Upload Status Indicator */}
          {showUploadStatus && (
            <View style={styles.statusIndicator}>
              <PhotoUploadStatus
                isUploaded={photo.isUploaded}
                size={20}
              />
            </View>
          )}

          {/* Selection Indicator */}
          {isSelected && (
            <View style={styles.selectionIndicator}>
              <View style={styles.selectionCheckmark} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading device photos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {selectedPhotos.size > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>
            {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected
          </Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadSelected}>
            <Text style={styles.uploadButtonText}>Upload Selected</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <FlatList
        data={devicePhotos}
        renderItem={renderPhoto}
        numColumns={3}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  uploadButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#000000',
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    padding: 16,
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    margin: 2,
  },
  photoSelected: {
    opacity: 0.7,
  },
  photoWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  statusIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionCheckmark: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
});

