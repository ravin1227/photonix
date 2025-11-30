import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../../navigation/AuthNavigator';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Welcome'
>;

export default function WelcomeScreen() {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Center Section */}
      <View style={[styles.centerSection, {paddingTop: insets.top}]}>
        {/* App Icon Placeholder */}
        <View style={styles.iconPlaceholder} />

        {/* App Name */}
        <Text style={styles.appName}>Photonix</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>Your private photo gallery</Text>
      </View>

      {/* Bottom Section */}
      <View style={[styles.bottomSection, {paddingBottom: insets.bottom + 16}]}>
        {/* Primary Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Connect')}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        {/* Secondary Text */}
        <TouchableOpacity
          style={styles.secondaryLink}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.secondaryLinkText}>
            Already have an account? Sign in
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
    marginBottom: 32,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  bottomSection: {
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryLink: {
    alignItems: 'center',
  },
  secondaryLinkText: {
    fontSize: 14,
    color: '#666666',
  },
});

