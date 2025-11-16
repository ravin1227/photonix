// API Configuration
export const API_CONFIG = {
  // Change this to your backend URL
  // For local development, use your computer's IP address or localhost
  BASE_URL: __DEV__
    ? 'http://192.168.0.164:3000/api/v1'  // Use your Mac's IP for both iOS and Android
    : 'http://192.168.0.164:3000/api/v1', // Production - change to your domain

  TIMEOUT: 30000, // 30 seconds
};

// Helper to get full URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

