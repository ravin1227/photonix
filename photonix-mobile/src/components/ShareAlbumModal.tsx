import React, {useState, useEffect, useRef} from 'react';
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
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import albumSharingService, {AlbumShare, AlbumSharesResponse, UserSearchResult} from '../services/albumSharingService';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Array<UserSearchResult & {canContribute: boolean}>>([]);
  const [canContribute, setCanContribute] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shares, setShares] = useState<AlbumShare[]>([]);
  const [owner, setOwner] = useState<{id: number; name: string; email: string} | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      loadShares();
    } else {
      // Reset form when modal closes
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      setShowSearchResults(false);
      setCanContribute(false);
    }
  }, [visible, albumId]);

  // Debounced user search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('Searching users with query:', searchQuery.trim());
        const response = await albumSharingService.searchUsers(searchQuery.trim());
        console.log('Search response:', response);
        if (response.error) {
          console.error('Search error:', response.error);
          setSearchResults([]);
          setShowSearchResults(false);
        } else if (response.data) {
          // Filter out users already added and owner
          const filtered = response.data.users.filter(
            user => !selectedUsers.some(s => s.id === user.id) &&
                     !(owner && owner.id === user.id)
          );
          console.log('Filtered search results:', filtered);
          setSearchResults(filtered);
          setShowSearchResults(filtered.length > 0);
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
        setShowSearchResults(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedUsers, owner]);

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

  const handleAddUser = (user: UserSearchResult) => {
    const newUser = {...user, canContribute};
    setSelectedUsers(prev => [...prev, newUser]);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    console.log('Added user:', newUser);
  };

  const handleRemoveUser = (userId: number) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one user to share with');
      return;
    }

    try {
      setIsSharing(true);
      const errors: string[] = [];

      // Share with each selected user
      for (const user of selectedUsers) {
        try {
          console.log(`Sharing with user: ${user.email}, canContribute: ${user.canContribute}`);
          const response = await albumSharingService.shareAlbum(
            albumId,
            user.email,
            user.canContribute
          );

          if (response.error) {
            errors.push(`${user.name}: ${response.error}`);
          } else {
            console.log(`Successfully shared with ${user.email}`);
          }
        } catch (error: any) {
          errors.push(`${user.name}: ${error.message}`);
        }
      }

      if (errors.length === 0) {
        Alert.alert(
          'Success',
          `Album shared with ${selectedUsers.length} user${selectedUsers.length === 1 ? '' : 's'}`
        );
        setSelectedUsers([]);
        setCanContribute(false);
        loadShares();
      } else {
        Alert.alert(
          'Partial Success',
          `Shared with ${selectedUsers.length - errors.length} user${selectedUsers.length - errors.length === 1 ? '' : 's'}.\n\nFailed:\n${errors.join('\n')}`
        );
        // Remove successfully shared users from the list
        const failedEmails = new Set(errors.map(e => e.split(':')[0]));
        setSelectedUsers(prev => prev.filter(u => failedEmails.has(u.name)));
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
        <ScrollView style={styles.shareForm}>
          <Text style={styles.sectionTitle}>Share with someone</Text>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#999999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search user by name or email"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isSearching && <ActivityIndicator color="#999999" style={styles.searchSpinner} />}
          </View>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <FlatList
                data={searchResults}
                renderItem={({item}) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => handleAddUser(item)}>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{item.name}</Text>
                      <Text style={styles.resultEmail}>{item.email}</Text>
                    </View>
                    <Icon name="add-circle" size={24} color="#2196f3" />
                  </TouchableOpacity>
                )}
                keyExtractor={item => item.id.toString()}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <View style={styles.selectedUsersContainer}>
              <Text style={styles.selectedUsersTitle}>Adding access for:</Text>
              {selectedUsers.map(user => (
                <View key={user.id} style={styles.selectedUserItem}>
                  <View style={styles.selectedUserInfo}>
                    <Text style={styles.selectedUserName}>{user.name}</Text>
                    <Text style={styles.selectedUserEmail}>{user.email}</Text>
                    <Text style={styles.selectedUserPermission}>
                      {user.canContribute ? 'Can view and add photos' : 'Can view only'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeUserButton}
                    onPress={() => handleRemoveUser(user.id)}>
                    <Icon name="close-circle" size={24} color="#F44336" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

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
            style={[styles.shareButton, (isSharing || selectedUsers.length === 0) && styles.shareButtonDisabled]}
            onPress={handleShare}
            disabled={isSharing || selectedUsers.length === 0}>
            {isSharing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="share-outline" size={20} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>
                  Share with {selectedUsers.length} {selectedUsers.length === 1 ? 'user' : 'users'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#F9F9F9',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  searchResultsContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  resultEmail: {
    fontSize: 12,
    color: '#666666',
  },
  selectedUsersContainer: {
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#BFE0FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  selectedUsersTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196f3',
    marginBottom: 8,
  },
  selectedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    marginBottom: 6,
  },
  selectedUserInfo: {
    flex: 1,
  },
  selectedUserName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  selectedUserEmail: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  selectedUserPermission: {
    fontSize: 11,
    color: '#2196f3',
    fontWeight: '500',
  },
  removeUserButton: {
    padding: 4,
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
