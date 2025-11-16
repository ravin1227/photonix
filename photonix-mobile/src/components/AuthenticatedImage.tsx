import React, {useState, useEffect} from 'react';
import {Image, View, ImageProps, StyleProp, ImageStyle} from 'react-native';
import apiService from '../services/api';

interface AuthenticatedImageProps extends Omit<ImageProps, 'source'> {
  uri: string | null;
  style?: StyleProp<ImageStyle>;
  placeholderStyle?: StyleProp<ImageStyle>;
}

export default function AuthenticatedImage({
  uri,
  style,
  placeholderStyle,
  ...props
}: AuthenticatedImageProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uri) {
      setImageUri(null);
      setIsLoading(false);
      return;
    }

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(false);

        const token = apiService.getToken();
        if (!token) {
          console.warn('No auth token available for image:', uri);
          setError(true);
          setIsLoading(false);
          return;
        }

        // Fetch image with auth headers
        const response = await fetch(uri, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Convert to base64 data URI for React Native
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setImageUri(base64data);
          setIsLoading(false);
        };
        reader.onerror = () => {
          throw new Error('Failed to convert image to base64');
        };
        reader.readAsDataURL(blob);
      } catch (err: any) {
        console.error('Error loading authenticated image:', err);
        console.error('Failed URL:', uri);
        setError(true);
        setIsLoading(false);
      }
    };

    loadImage();
  }, [uri]);

  if (!uri || error) {
    return <View style={[style, placeholderStyle]} />;
  }

  if (isLoading) {
    return <View style={[style, placeholderStyle]} />;
  }

  return (
    <Image
      {...props}
      source={{uri: imageUri || ''}}
      style={style}
      onError={(e) => {
        console.error('Image render error:', e.nativeEvent.error);
        setError(true);
        if (props.onError) {
          props.onError(e);
        }
      }}
    />
  );
}

