import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {CommonActions} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../../navigation/AuthNavigator';

type PermissionsScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Permissions'
>;

export default function PermissionsScreen() {
  const navigation = useNavigation();
  
  const navigateToMain = () => {
    // Navigate to Main screen by resetting the root navigator
    // Get the root navigator (parent of AuthNavigator)
    const rootNavigator = navigation.getParent();
    if (rootNavigator) {
      rootNavigator.reset({
        index: 0,
        routes: [{name: 'Main'}],
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Section */}
      <View style={styles.topSection}>
        <View style={styles.illustration} />
        <Text style={styles.heading}>Enable Permissions</Text>
        <Text style={styles.description}>
          Grant permissions to access your photos and connect to your server
        </Text>
      </View>

      {/* Permission Cards */}
      <View style={styles.permissionsContainer}>
        {/* Photos Access Card */}
        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon} />
          <View style={styles.permissionContent}>
            <Text style={styles.permissionTitle}>Photo Library Access</Text>
            <Text style={styles.permissionDescription}>
              Access your photos to upload to your server
            </Text>
          </View>
          <TouchableOpacity style={styles.enableButton}>
            <Text style={styles.enableButtonText}>Enable</Text>
          </TouchableOpacity>
        </View>

        {/* Local Network Card */}
        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon} />
          <View style={styles.permissionContent}>
            <Text style={styles.permissionTitle}>Local Network Discovery</Text>
            <Text style={styles.permissionDescription}>
              Discover and connect to your server on local network
            </Text>
          </View>
          <TouchableOpacity style={styles.enableButton}>
            <Text style={styles.enableButtonText}>Enable</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={navigateToMain}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.skipLink}
          onPress={navigateToMain}>
          <Text style={styles.skipLinkText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingBottom: 40,
  },
  topSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 48,
  },
  illustration: {
    width: 150,
    height: 150,
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    marginBottom: 24,
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
    lineHeight: 24,
  },
  permissionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    gap: 16,
  },
  permissionIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#e0e0e0',
    borderRadius: 24,
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666666',
  },
  enableButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#000000',
    borderRadius: 8,
  },
  enableButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
  skipLink: {
    alignItems: 'center',
  },
  skipLinkText: {
    fontSize: 14,
    color: '#666666',
  },
});

