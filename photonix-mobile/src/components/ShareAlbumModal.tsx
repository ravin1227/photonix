import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import albumSharingService, {AlbumShare, AlbumSharesResponse} from '../services/albumSharingService';

interface ShareAlbumModalProps {
  visible: boolean;
  albumId: number;
  albumName: string;
  onClose: () => void;
}

export default function ShareAlbumModal({
  visible,
  albumId,
  albumName,
  onClose,
}: ShareAlbumModalProps) {
  const [email, setEmail] = useState('');
  const [canContribute, setCanContribute] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shares, setShares] = useState<AlbumShare[]>([]);
  const [owner, setOwner] = useState<{id: number; name: string; email: string} | null>(null);

  useEffect(() => {
    if (visible) {
      loadShares();
    }
  }, [visible, albumId]);

  const loadShares = async () => {
    try {
      setIsLoading(true);
      const response = await albumSharingService.getAlbumShares(albumId);
      if (response.data) {
        setShares(response.data.shares);
        setOwner(response.data.owner);
      }
    } catch (error: any) {
      console.error('Error loading shares:', error);
      Alert.alert('Error', 'Failed to load sharing information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setIsSharing(true);
      const response = await albumSharingService.shareAlbum(
        albumId,
        email.trim().toLowerCase(),
        canContribute
      );

      if (response.error) {
        Alert.alert('Error', response.error);
      } else {
        Alert.alert('Success', response.data?.message || 'Album shared successfully');
        setEmail('');
        setCanContribute(false);
        loadShares();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to share album');
    } finally {
      setIsSharing(false);
    }
  };

  const handleUnshare = async (share: AlbumShare) => {
    Alert.alert(
      'Remove Access',
      `Remove ${share.user.name}'s access to this album?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await albumSharingService.unshareAlbum(albumId, share.id);
              if (response.error) {
                Alert.alert('Error', response.error);
              } else {
                Alert.alert('Success', 'Access removed');
                loadShares();
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove access');
            }
          },
        },
      ]
    );
  };

  const renderShare = ({item}: {item: AlbumShare}) => {
    if (item.is_owner) {
      return null; // Don't show owner in the shares list
    }

    return (
      <View style={styles.shareItem}>
        <View style={styles.shareInfo}>
          <Text style={styles.shareName}>{item.user.name}</Text>
          <Text style={styles.shareEmail}>{item.user.email}</Text>
          <Text style={styles.sharePermissions}>
            {item.can_contribute ? 'Can view and add photos' : 'Can view'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleUnshare(item)}>
          <Icon name="close-circle" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share Album</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Album Info */}
        <View style={styles.albumInfo}>
          <Text style={styles.albumName}>{albumName}</Text>
          {owner && (
            <Text style={styles.ownerText}>
              Owner: {owner.name} ({owner.email})
            </Text>
          )}
        </View>

        {/* Share Form */}
        <View style={styles.shareForm}>
          <Text style={styles.sectionTitle}>Share with someone</Text>
          <TextInput
            style={styles.emailInput}
            placeholder="Enter email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.permissionRow}>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionLabel}>Can contribute</Text>
              <Text style={styles.permissionDescription}>
                {canContribute
                  ? 'Can view, add photos, and delete their own photos'
                  : 'Can only view photos (read-only)'}
              </Text>
            </View>
            <Switch
              value={canContribute}
              onValueChange={setCanContribute}
              trackColor={{false: '#E0E0E0', true: '#4CAF50'}}
              thumbColor={canContribute ? '#FFFFFF' : '#F5F5F5'}
            />
          </View>

          <View style={styles.permissionNote}>
            <Icon name="information-circle-outline" size={16} color="#666666" />
            <Text style={styles.permissionNoteText}>
              Album owner can always delete any photo and manage sharing
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
            onPress={handleShare}
            disabled={isSharing}>
            {isSharing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="share-outline" size={20} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>Share Album</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Shared With List */}
        <View style={styles.sharedList}>
          <Text style={styles.sectionTitle}>
            Shared with ({shares.filter(s => !s.is_owner).length})
          </Text>
          {isLoading ? (
            <ActivityIndicator style={styles.loader} size="large" color="#000000" />
          ) : shares.filter(s => !s.is_owner).length === 0 ? (
            <Text style={styles.emptyText}>
              This album hasn't been shared with anyone yet
            </Text>
          ) : (
            <FlatList
              data={shares}
              renderItem={renderShare}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  albumInfo: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  albumName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  ownerText: {
    fontSize: 14,
    color: '#666666',
  },
  shareForm: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  permissionInfo: {
    flex: 1,
    marginRight: 12,
  },
  permissionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666666',
  },
  permissionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  permissionNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sharedList: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    paddingBottom: 16,
  },
  shareItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  shareInfo: {
    flex: 1,
  },
  shareName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  shareEmail: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  sharePermissions: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  removeButton: {
    padding: 8,
  },
  loader: {
    marginTop: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginTop: 32,
  },
});
