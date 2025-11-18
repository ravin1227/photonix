import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Animated} from 'react-native';
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

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Animate when uploading
  useEffect(() => {
    if (isUploading) {
      // Pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Rotation animation for cloud
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
    }
  }, [isUploading, pulseAnim, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progress = uploadedCount && totalCount ? Math.round((uploadedCount / totalCount) * 100) : 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.uploadButton,
          isUploading && styles.uploadButtonUploading,
          showUploadedState && styles.uploadButtonCompleted
        ]}
        onPress={onPress}
        disabled={isUploading}>
        {isUploading ? (
          <Animated.View
            style={{
              transform: [{scale: pulseAnim}, {rotate}],
            }}>
            <Icon name="cloud-upload" size={22} color="#4caf50" />
          </Animated.View>
        ) : showUploadedState ? (
          <Icon name="checkmark-circle" size={20} color="#4caf50" />
        ) : (
          <Icon name="cloud-upload-outline" size={20} color="#666666" />
        )}
        {isUploading && totalCount ? (
          <Text style={styles.uploadTextGreen}>{progress}%</Text>
        ) : null}
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
  uploadButtonUploading: {
    backgroundColor: '#f1f8f4',
    borderColor: '#4caf50',
    borderWidth: 2,
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
  uploadTextGreen: {
    fontSize: 13,
    color: '#4caf50',
    fontWeight: '700',
  },
  menuButton: {
    padding: 4,
  },
});

