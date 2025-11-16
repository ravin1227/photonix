import React from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - 48) / 3; // 3 columns with padding

interface PhotoSkeletonProps {
  count?: number;
}

export default function PhotoSkeleton({count = 9}: PhotoSkeletonProps) {
  return (
    <View style={styles.container}>
      {Array.from({length: count}).map((_, index) => (
        <View key={index} style={styles.skeletonPhoto}>
          <View style={styles.skeletonImage} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  },
  skeletonPhoto: {
    width: '32%',
    aspectRatio: 1,
    marginBottom: 4,
  },
  skeletonImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    opacity: 0.5,
  },
});

