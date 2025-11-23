import React, {useState, useEffect} from 'react';
import {Image, ImageProps, View, ActivityIndicator, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@photonix:token';

interface AuthImageProps extends Omit<ImageProps, 'source'> {
  source: {uri: string};
  fallbackSource?: ImageProps['source'];
}

/**
 * Image component that handles authenticated image requests
 * React Native's Image component doesn't support custom headers,
 * so we fetch the image with auth and convert to data URI
 */
export default function AuthImage({source, fallbackSource, style, ...props}: AuthImageProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(false);

        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (!token) {
          console.warn('No auth token available for image');
          setError(true);
          setIsLoading(false);
          return;
        }

        console.log('AuthImage: Loading image from:', source.uri);
        console.log('AuthImage: Token available:', token ? `${token.substring(0, 20)}...` : 'none');

        // Set timeout for image loading (30 seconds)
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            console.error('Image load timeout');
            setError(true);
            setIsLoading(false);
          }
        }, 30000);

        const response = await fetch(source.uri, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('AuthImage: Response status:', response.status, response.statusText);

        if (cancelled) {
          clearTimeout(timeoutId);
          return;
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          let errorMessage = `Failed to fetch image: ${response.status}`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            // If not JSON, use the text as is
            if (errorText && errorText !== 'Unknown error') {
              errorMessage = errorText;
            }
          }
          console.error(`AuthImage error: ${response.status} ${response.statusText}`, errorMessage);
          clearTimeout(timeoutId);
          
          // If 404 and we have a fallback source, use it instead of showing error
          if (response.status === 404 && fallbackSource) {
            console.log('AuthImage: 404 error, falling back to local image');
            setImageUri((fallbackSource as any).uri);
            setIsLoading(false);
            return;
          }
          
          setError(true);
          setIsLoading(false);
          return;
        }

        const blob = await response.blob();
        if (cancelled) {
          clearTimeout(timeoutId);
          return;
        }

        console.log('AuthImage: Blob received, size:', blob.size, 'type:', blob.type);

        clearTimeout(timeoutId);
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!cancelled) {
            console.log('AuthImage: Image loaded successfully, data URI length:', reader.result ? String(reader.result).length : 0);
            setImageUri(reader.result as string);
            setIsLoading(false);
          }
        };
        reader.onerror = (error) => {
          if (!cancelled) {
            console.error('FileReader error:', error);
            setError(true);
            setIsLoading(false);
          }
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading authenticated image:', err);
          clearTimeout(timeoutId);
          setError(true);
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [source.uri]);

  if (isLoading) {
    return (
      <View style={[style, styles.container]}>
        <ActivityIndicator size="small" color="#666666" />
      </View>
    );
  }

  if (error) {
    // Show broken camera icon
    return (
      <View style={[style, styles.container, styles.errorContainer]}>
        <Icon name="ban" size={32} color="#999999" />
      </View>
    );
  }

  if (!imageUri) {
    return null;
  }

  return <Image source={{uri: imageUri}} style={style} {...props} />;
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  errorContainer: {
    backgroundColor: '#e0e0e0',
  },
});

