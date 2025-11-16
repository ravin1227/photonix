import React from 'react';
import {View, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface PhotoUploadStatusProps {
  isUploaded: boolean;
  isUploading?: boolean;
  size?: number;
}

export default function PhotoUploadStatus({
  isUploaded,
  isUploading = false,
  size = 20,
}: PhotoUploadStatusProps) {
  if (isUploading) {
    return (
      <View style={styles.container}>
        <Icon name="cloud-upload-outline" size={size} color="#ffffff" />
      </View>
    );
  }

  if (isUploaded) {
    return (
      <View style={styles.container}>
        <Icon name="checkmark-circle-outline" size={size} color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Icon name="cloud-outline" size={size} color="#ffffff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No background, just the icon
  },
});

