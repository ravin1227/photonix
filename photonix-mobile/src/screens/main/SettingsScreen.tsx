import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../contexts/AuthContext';
import {API_CONFIG} from '../../config/api';

export default function SettingsScreen() {
  const {user, logout} = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSigningOut(true);
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ],
      {cancelable: true},
    );
  };

  const getServerUrl = () => {
    const url = API_CONFIG.BASE_URL.replace('/api/v1', '');
    return url.replace(/^https?:\/\//, ''); // Remove http:// or https://
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getUserInitials()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Account Details</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleSignOut}
            disabled={isSigningOut}>
            {isSigningOut ? (
              <View style={styles.signOutLoading}>
                <ActivityIndicator size="small" color="#ff3b30" />
                <Text style={[styles.settingLabel, styles.destructive, styles.signOutText]}>
                  Signing out...
                </Text>
              </View>
            ) : (
              <Text style={[styles.settingLabel, styles.destructive]}>Sign Out</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Server Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Server</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Server Connection</Text>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>{getServerUrl()}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Sync Settings</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Appearance</Text>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Theme</Text>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>System</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Storage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Storage</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Cache Size</Text>
            <Text style={styles.settingValueText}>125 MB</Text>
          </View>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Download Quality</Text>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>High</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>About</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>App Version</Text>
            <Text style={styles.settingValueText}>1.0.0</Text>
          </View>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Help & Support</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000000',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666666',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#000000',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValueText: {
    fontSize: 16,
    color: '#666666',
  },
  chevron: {
    fontSize: 20,
    color: '#999999',
  },
  destructive: {
    color: '#ff3b30',
  },
  signOutLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signOutText: {
    marginLeft: 8,
  },
});

