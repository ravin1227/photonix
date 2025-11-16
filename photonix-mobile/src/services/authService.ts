import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './api';

const TOKEN_KEY = '@photonix:token';
const USER_KEY = '@photonix:user';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  password_confirmation: string;
  name: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  storage_quota: number;
  created_at: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

class AuthService {
  // Load token from storage
  async loadToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        apiService.setToken(token);
      }
      return token;
    } catch (error) {
      console.error('Error loading token:', error);
      return null;
    }
  }

  // Save token to storage
  private async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      apiService.setToken(token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  // Save user to storage
  async saveUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  // Get user from storage
  async getUser(): Promise<User | null> {
    try {
      const userJson = await AsyncStorage.getItem(USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error loading user:', error);
      return null;
    }
  }

  // Login user
  async login(credentials: LoginCredentials) {
    const response = await apiService.post<AuthResponse>('/auth/login', {
      user: credentials,
    }, {skipAuth: true});

    if (response.data && response.data.token) {
      await this.saveToken(response.data.token);
      await this.saveUser(response.data.user);
    }

    return response;
  }

  // Signup user
  async signup(data: SignupData) {
    const response = await apiService.post<AuthResponse>('/auth/signup', {
      user: data,
    }, {skipAuth: true});

    if (response.data && response.data.token) {
      await this.saveToken(response.data.token);
      await this.saveUser(response.data.user);
    }

    return response;
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      apiService.setToken(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  // QR Login - no password required
  async qrLogin(token: string, serverUrl?: string) {
    // If server URL is provided (from QR code), permanently update API config
    if (serverUrl) {
      apiService.setBaseUrl(serverUrl);
      // Save server URL to storage for future use
      await AsyncStorage.setItem('serverUrl', serverUrl);
    }

    const response = await apiService.post<AuthResponse>('/auth/qr_login', {
      token: token,
    }, {skipAuth: true});

    if (response.data && response.data.token) {
      await this.saveToken(response.data.token);
      await this.saveUser(response.data.user);
    }

    return response;
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await this.loadToken();
    return token !== null;
  }
}

export default new AuthService();

