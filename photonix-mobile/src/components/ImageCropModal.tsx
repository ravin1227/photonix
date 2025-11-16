import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';
import AuthenticatedImage from './AuthenticatedImage';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const CROP_SIZE = Math.min(SCREEN_WIDTH - 40, 300);

interface ImageCropModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onSave: (cropData: {x: number; y: number; width: number; height: number; scale: number}) => void;
}

export default function ImageCropModal({
  visible,
  imageUri,
  onClose,
  onSave,
}: ImageCropModalProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      const newScale = Math.max(0.5, Math.min(3, savedScale.value * event.scale));
      scale.value = newScale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {translateX: translateX.value},
        {translateY: translateY.value},
        {scale: scale.value},
      ],
    };
  });

  const handleZoomIn = () => {
    const newScale = Math.min(savedScale.value + 0.2, 3);
    scale.value = withSpring(newScale);
    savedScale.value = newScale;
  };

  const handleZoomOut = () => {
    const newScale = Math.max(savedScale.value - 0.2, 0.5);
    scale.value = withSpring(newScale);
    savedScale.value = newScale;
  };

  const handleReset = () => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    scale.value = withSpring(1);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const handleSave = () => {
    const cropData = {
      x: translateX.value,
      y: translateY.value,
      width: CROP_SIZE,
      height: CROP_SIZE,
      scale: scale.value,
    };
    onSave(cropData);
  };

  if (!imageUri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resize & Crop</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cropContainer}>
          {/* Crop overlay */}
          <View style={styles.cropOverlay}>
            <View style={styles.cropFrame} />
            <View style={styles.cropGrid}>
              <View style={[styles.gridLine, styles.gridLineVertical, {left: '33.33%'}]} />
              <View style={[styles.gridLine, styles.gridLineVertical, {left: '66.66%'}]} />
              <View style={[styles.gridLine, styles.gridLineHorizontal, {top: '33.33%'}]} />
              <View style={[styles.gridLine, styles.gridLineHorizontal, {top: '66.66%'}]} />
            </View>
          </View>

          {/* Image with gestures */}
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.imageContainer, animatedStyle]}>
              <AuthenticatedImage
                uri={imageUri}
                style={styles.cropImage}
                resizeMode="contain"
              />
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handleZoomOut} style={styles.controlButton}>
            <Icon name="remove-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReset} style={styles.controlButton}>
            <Icon name="refresh-outline" size={24} color="#ffffff" />
            <Text style={styles.controlButtonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleZoomIn} style={styles.controlButton}>
            <Icon name="add-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  cropContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gestureWrapper: {
    width: CROP_SIZE * 1.5,
    height: CROP_SIZE * 1.5,
  },
  cropOverlay: {
    position: 'absolute',
    width: CROP_SIZE,
    height: CROP_SIZE,
    zIndex: 10,
  },
  cropFrame: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: CROP_SIZE / 2,
  },
  cropGrid: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridLineVertical: {
    width: 1,
    height: '100%',
  },
  gridLineHorizontal: {
    width: '100%',
    height: 1,
  },
  imageContainer: {
    width: CROP_SIZE * 1.5,
    height: CROP_SIZE * 1.5,
  },
  cropImage: {
    width: '100%',
    height: '100%',
    borderRadius: (CROP_SIZE * 1.5) / 2,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
  },
});

