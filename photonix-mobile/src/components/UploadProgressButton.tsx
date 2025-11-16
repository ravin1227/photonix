import React, {useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';

interface UploadProgressButtonProps {
  onPress: () => void;
  isUploading: boolean;
  progress: number; // 0 to 1
  disabled?: boolean;
  size?: number;
}

export default function UploadProgressButton({
  onPress,
  isUploading,
  progress,
  disabled = false,
  size = 24,
}: UploadProgressButtonProps) {
  const rotation = useSharedValue(0);
  const iconSize = size;
  const containerSize = iconSize + 16; // Add padding for the circle
  const strokeWidth = 2.5;
  const radius = (containerSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animate rotation when uploading
  useEffect(() => {
    if (isUploading) {
      rotation.value = withRepeat(
        withTiming(360, {duration: 2000}),
        -1,
        false,
      );
    } else {
      rotation.value = 0;
    }
  }, [isUploading]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{rotate: `${rotation.value}deg`}],
    };
  });

  // Calculate stroke dash for progress
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={disabled || isUploading}
      activeOpacity={0.7}>
      <View style={[styles.iconContainer, {width: containerSize, height: containerSize}]}>
        {/* Progress circle background */}
        {isUploading && (
          <View style={styles.progressWrapper}>
            {/* Background circle */}
            <View
              style={[
                styles.circle,
                {
                  width: containerSize,
                  height: containerSize,
                  borderRadius: containerSize / 2,
                  borderWidth: strokeWidth,
                  borderColor: '#e0e0e0',
                },
              ]}
            />
            {/* Progress circle - using border trick */}
            <View
              style={[
                styles.circle,
                {
                  width: containerSize,
                  height: containerSize,
                  borderRadius: containerSize / 2,
                  borderWidth: strokeWidth,
                  borderColor: '#000000',
                  borderRightColor: progress > 0.25 ? '#000000' : 'transparent',
                  borderBottomColor: progress > 0.5 ? '#000000' : 'transparent',
                  borderLeftColor: progress > 0.75 ? '#000000' : 'transparent',
                  transform: [{rotate: `${progress * 360 - 90}deg`}],
                },
              ]}
            />
            {/* Additional progress segments for smoother appearance */}
            {progress > 0.25 && (
              <View
                style={[
                  styles.circle,
                  {
                    width: containerSize,
                    height: containerSize,
                    borderRadius: containerSize / 2,
                    borderWidth: strokeWidth,
                    borderColor: '#000000',
                    borderTopColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderLeftColor: 'transparent',
                  },
                ]}
              />
            )}
            {progress > 0.5 && (
              <View
                style={[
                  styles.circle,
                  {
                    width: containerSize,
                    height: containerSize,
                    borderRadius: containerSize / 2,
                    borderWidth: strokeWidth,
                    borderColor: '#000000',
                    borderTopColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderBottomColor: 'transparent',
                  },
                ]}
              />
            )}
          </View>
        )}
        {/* Cloud icon */}
        <Animated.View style={animatedStyle}>
          <Icon
            name="cloud-upload"
            size={iconSize}
            color={disabled ? '#999999' : '#000000'}
          />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
  },
});
