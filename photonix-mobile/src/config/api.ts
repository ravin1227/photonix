// API Configuration
export const API_CONFIG = {
  // Cloudflare Tunnel URL - accessible from anywhere
  BASE_URL: __DEV__
    ? 'https://api.asharedclick.com/api/v1'  // Cloudflare Tunnel (development)
    : 'https://api.asharedclick.com/api/v1', // Cloudflare Tunnel (production)

  TIMEOUT: 30000, // 30 seconds
};

// Helper to get full URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

