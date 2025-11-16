import {API_CONFIG, getApiUrl} from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  errors?: string[];
  message?: string;
}

interface ExtendedRequestInit extends RequestInit {
  skipAuth?: boolean;
}

class ApiService {
  private baseUrl: string;
  private token: string | null = null;
  private initialized: boolean = false;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    console.log('[ApiService] Initial baseUrl from config:', this.baseUrl);
    this.initialize();
  }

  // Initialize: Load saved server URL if exists
  private async initialize() {
    if (this.initialized) return;

    try {
      console.log('[ApiService] Loading saved server URL from AsyncStorage...');
      const savedServerUrl = await AsyncStorage.getItem('serverUrl');
      if (savedServerUrl) {
        this.baseUrl = savedServerUrl.endsWith('/api/v1') ? savedServerUrl : `${savedServerUrl}/api/v1`;
        console.log('[ApiService] Loaded saved server URL:', this.baseUrl);
      } else {
        console.log('[ApiService] No saved server URL found, using default');
      }
      this.initialized = true;
    } catch (error) {
      console.error('[ApiService] Error loading saved server URL:', error);
      this.initialized = true;
    }
  }

  // Set base URL (for QR login with dynamic server)
  setBaseUrl(url: string) {
    this.baseUrl = url.endsWith('/api/v1') ? url : `${url}/api/v1`;
    console.log('[ApiService] Base URL updated to:', this.baseUrl);
  }

  // Get base URL
  getBaseUrl(): string {
    return this.baseUrl;
  }

  // Set authentication token
  setToken(token: string | null) {
    this.token = token;
  }

  // Get authentication token
  getToken(): string | null {
    return this.token;
  }

  // Build headers with authentication
  private getHeaders(includeAuth: boolean = true): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: ExtendedRequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      // Use dynamic baseUrl instead of API_CONFIG
      const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      const headers = {
        ...this.getHeaders(!options.skipAuth),
        ...options.headers,
      };

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      } as RequestInit);

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      let data: any;
      if (isJson) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          error: data.error || data.message || `HTTP ${response.status}`,
          errors: data.errors,
        };
      }

      return {data};
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          error: 'Request timeout - please check your connection',
        };
      }
      return {
        error: error.message || 'Network error occurred',
      };
    }
  }

  // GET request
  async get<T>(endpoint: string, options?: ExtendedRequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  // POST request
  async post<T>(
    endpoint: string,
    body?: any,
    options?: ExtendedRequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // PUT request
  async put<T>(
    endpoint: string,
    body?: any,
    options?: ExtendedRequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // PATCH request
  async patch<T>(
    endpoint: string,
    body?: any,
    options?: ExtendedRequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string, options?: ExtendedRequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  // Upload file (multipart/form-data)
  async upload<T>(
    endpoint: string,
    file: {uri: string; type: string; name: string},
    options?: ExtendedRequestInit,
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      const formData = new FormData();
      
      formData.append('photo', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as any);

      const headers: Record<string, string> = {};
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        ...options,
      } as RequestInit);

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      let data: any;
      if (isJson) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          error: data.error || data.message || `HTTP ${response.status}`,
          errors: data.errors,
        };
      }

      return {data};
    } catch (error: any) {
      return {
        error: error.message || 'Network error occurred',
      };
    }
  }
}

export default new ApiService();

