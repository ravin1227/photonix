import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import AuthenticatedImage from '../../components/AuthenticatedImage';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import peopleService, {Person} from '../../services/peopleService';
import {PeopleStackParamList} from '../../navigation/PeopleStackNavigator';
import {API_CONFIG} from '../../config/api';

type PeopleScreenNavigationProp = NativeStackNavigationProp<
  PeopleStackParamList,
  'PeopleList'
>;

export default function PeopleScreen() {
  const navigation = useNavigation<PeopleScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const loadPeople = async (silent: boolean = false) => {
    try {
      setError(null);
      if (!silent && !isLoading) {
        setIsRefreshing(true);
      }
      const response = await peopleService.getPeople();
      if (response.data) {
        setPeople(response.data.people || []);
        setHasLoadedOnce(true);
        // Debug: Log thumbnail URLs
        if (response.data.people && response.data.people.length > 0) {
          const firstPerson = response.data.people[0];
          console.log('First person thumbnail_url:', firstPerson.thumbnail_url);
          console.log('Normalized URL:', normalizeThumbnailUrl(firstPerson.thumbnail_url));
        }
      } else {
        setError(response.error || 'Failed to load people');
      }
    } catch (err: any) {
      console.error('Error loading people:', err);
      setError(err.message || 'An error occurred');
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPeople();
  }, []);

  // Refresh when screen comes into focus (e.g., when returning from PersonDetailScreen)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we already have data (to avoid double loading on initial mount)
      if (hasLoadedOnce) {
        loadPeople(true); // Silent refresh - don't show loading spinner
      }
    }, [hasLoadedOnce]),
  );

  const onRefresh = () => {
    loadPeople(false); // Show loading spinner on manual refresh
  };

  const formatPhotoCount = (count: number): string => {
    if (count === 0) return 'No photos';
    if (count === 1) return '1 photo';
    if (count < 1000) return `${count} photos`;
    return `${(count / 1000).toFixed(1)}K photos`;
  };

  const normalizeThumbnailUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    // Extract base URL from API_CONFIG (remove /api/v1)
    const baseUrl = API_CONFIG.BASE_URL.replace('/api/v1', '').replace(/\/$/, '');
    
    // If URL is already absolute and starts with http
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Replace localhost/127.0.0.1 with the actual server host for physical devices
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        // Extract the path from the original URL
        const urlPath = url.replace(/https?:\/\/[^\/]+/, '');
        // Construct new URL with correct host
        return `${baseUrl}${urlPath}`;
      }
      // Already has correct host, use as-is
      return url;
    }
    
    // If relative URL, make it absolute
    return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
  };

  const getPersonDisplayName = (person: Person): string => {
    return person.name || `Person ${person.id}`;
  };

  const getPersonThumbnailUrl = (person: Person): string | null => {
    // Normalize thumbnail URL to handle localhost issues
    return normalizeThumbnailUrl(person.thumbnail_url);
  };

  const safeAreaEdges = ['top'] as const;
  const containerStyle = Platform.OS === 'android' 
    ? [styles.container, {paddingBottom: Math.max(insets.bottom, 16)}]
    : styles.container;

  return (
    <>
      {Platform.OS === 'android' && (
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#ffffff"
          translucent={false}
        />
      )}
      <SafeAreaView style={containerStyle} edges={safeAreaEdges}>
        <View style={styles.header}>
        <Text style={styles.title}>People</Text>
      </View>

      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadPeople()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.gridContainer}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }>
          {/* People Grid */}
          {people.map((person) => {
            const thumbnailUrl = getPersonThumbnailUrl(person);
            return (
              <TouchableOpacity
                key={person.id}
                style={styles.faceCard}
                onPress={() =>
                  navigation.navigate('PersonDetail', {
                    personId: person.id,
                    personName: getPersonDisplayName(person),
                  })
                }>
                <AuthenticatedImage
                  uri={thumbnailUrl}
                  style={styles.faceThumbnail}
                  placeholderStyle={styles.faceThumbnailPlaceholder}
                  resizeMode="cover"
                />
                <Text style={styles.faceName} numberOfLines={1}>
                  {getPersonDisplayName(person)}
                </Text>
                <Text style={styles.faceCount}>
                  {formatPhotoCount(person.photo_count)}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Add Person Card */}
          <TouchableOpacity style={styles.addPersonCard}>
            <Text style={styles.addPersonText}>+</Text>
            <Text style={styles.addPersonLabel}>Add Person</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
      </SafeAreaView>
    </>
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
  gridContainer: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  faceCard: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  faceThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e0e0e0',
    marginBottom: 6,
  },
  faceThumbnailPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e0e0e0',
    marginBottom: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  faceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
    textAlign: 'center',
  },
  faceCount: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  addPersonCard: {
    width: '25%',
    height: 110,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  addPersonText: {
    fontSize: 24,
    color: '#666666',
    marginBottom: 6,
  },
  addPersonLabel: {
    fontSize: 12,
    color: '#666666',
  },
});

