import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface UploadButtonProps {
  onPress: () => void;
  isUploading?: boolean;
  uploadedCount?: number;
  totalCount?: number;
  showMenu?: boolean;
  onMenuPress?: () => void;
  isAllUploaded?: boolean; // All photos for this date/album are uploaded
}

export default function UploadButton({
  onPress,
  isUploading = false,
  uploadedCount,
  totalCount,
  showMenu = false,
  onMenuPress,
  isAllUploaded = false,
}: UploadButtonProps) {
  const isCompleted = uploadedCount !== undefined && totalCount !== undefined && uploadedCount === totalCount;
  const showUploadedState = isAllUploaded || isCompleted;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.uploadButton, showUploadedState && styles.uploadButtonCompleted]}
        onPress={onPress}
        disabled={isUploading}>
        {isUploading ? (
          <ActivityIndicator size="small" color="#000000" />
        ) : showUploadedState ? (
          <Icon name="checkmark-circle-outline" size={20} color="#000000" />
        ) : (
          <Icon name="cloud-upload-outline" size={20} color="#000000" />
        )}
        {isUploading && totalCount && (
          <Text style={styles.uploadText}>
            {uploadedCount || 0}/{totalCount}
          </Text>
        )}
      </TouchableOpacity>
      {showMenu && (
        <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
          <Icon name="ellipsis-vertical" size={18} color="#666666" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  uploadButtonCompleted: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
  },
  uploadText: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '500',
  },
  menuButton: {
    padding: 4,
  },
});

