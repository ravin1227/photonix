import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../../navigation/AuthNavigator';

type ConnectScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Connect'
>;

export default function ConnectScreen() {
  const navigation = useNavigation<ConnectScreenNavigationProp>();

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Connect to Server</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Illustration Placeholder */}
        <View style={styles.illustration} />

        <Text style={styles.heading}>Find your server</Text>
        <Text style={styles.description}>
          Connect to your Photonix server on your local network
        </Text>

        {/* Connection Methods */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('QRScanner')}>
            <Text style={styles.primaryButtonText}>Scan QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login')}>
            <Text style={styles.secondaryButtonText}>
              Enter Server Address
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tertiaryLink}>
            <Text style={styles.tertiaryLinkText}>
              Auto-discover on network
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Help Text */}
      <View style={styles.helpSection}>
        <Text style={styles.helpText}>
          Make sure you're on the same network
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    height: 80,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#000000',
  },
  navTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  illustration: {
    width: 200,
    height: 200,
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    marginBottom: 32,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  tertiaryLinkText: {
    fontSize: 14,
    color: '#666666',
  },
  helpSection: {
    paddingBottom: 32,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#999999',
  },
});

