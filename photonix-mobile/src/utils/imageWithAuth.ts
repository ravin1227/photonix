import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@photonix:token';

/**
 * Fetches an image with authentication headers and returns a data URI
 * This is needed because React Native's Image component doesn't support custom headers
 */
export async function getImageWithAuth(imageUrl: string): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) {
      console.error('No auth token available');
      return null;
    }

    const response = await fetch(imageUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return null;
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image with auth:', error);
    return null;
  }
}

