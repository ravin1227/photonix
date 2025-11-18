import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Animated, TouchableOpacity} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/Ionicons';

export default function NetworkStatusBanner() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [slideAnim] = useState(new Animated.Value(-100)); // Start above screen
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      // Reset dismissed state when connection changes
      if (state.isConnected === false) {
        setIsDismissed(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Animate banner in/out based on connection status and dismissed state
    if (isConnected === false && !isDismissed) {
      // Show banner
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      // Hide banner
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isConnected, isDismissed, slideAnim]);

  // Don't render anything if connected or dismissed
  if (isConnected === null || isConnected === true) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{translateY: slideAnim}],
        },
      ]}>
      <View style={styles.content}>
        <Icon name="cloud-offline" size={20} color="#ffffff" style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.text}>No Internet Connection</Text>
          <Text style={styles.subtext}>Showing device photos only</Text>
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeButton}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="close" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ff3b30',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingTop: 55, // Account for status bar + more padding
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  icon: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtext: {
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.95,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
