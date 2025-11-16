import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import authService, {User} from '../services/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{success: boolean; error?: string}>;
  signup: (email: string, password: string, passwordConfirmation: string, name: string) => Promise<{success: boolean; error?: string}>;
  qrLogin: (token: string, serverUrl?: string) => Promise<{success: boolean; error?: string}>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        // Load token first to ensure it's available for API calls
        const token = await authService.loadToken();
        console.log('AuthContext: Token loaded on startup:', token ? `${token.substring(0, 20)}...` : 'none');
        
        const authenticated = await authService.isAuthenticated();
        if (authenticated) {
          const savedUser = await authService.getUser();
          setUser(savedUser);
          setIsAuthenticated(true);
          console.log('AuthContext: User authenticated:', savedUser?.email);
        } else {
          console.log('AuthContext: User not authenticated');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<{success: boolean; error?: string}> => {
    try {
      const response = await authService.login({email, password});
      if (response.data) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        return {success: true};
      } else {
        return {success: false, error: response.error || 'Login failed'};
      }
    } catch (error: any) {
      return {success: false, error: error.message || 'Login failed'};
    }
  };

  const signup = async (
    email: string,
    password: string,
    passwordConfirmation: string,
    name: string,
  ): Promise<{success: boolean; error?: string}> => {
    try {
      const response = await authService.signup({
        email,
        password,
        password_confirmation: passwordConfirmation,
        name,
      });
      if (response.data) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        return {success: true};
      } else {
        return {
          success: false,
          error: response.error || response.errors?.join(', ') || 'Signup failed',
        };
      }
    } catch (error: any) {
      return {success: false, error: error.message || 'Signup failed'};
    }
  };

  const qrLogin = async (
    token: string,
    serverUrl?: string,
  ): Promise<{success: boolean; error?: string}> => {
    try {
      const response = await authService.qrLogin(token, serverUrl);
      if (response.data && response.data.token) {
        // Update auth state
        setUser(response.data.user);
        setIsAuthenticated(true);
        return {success: true};
      } else {
        return {success: false, error: response.error || 'QR login failed'};
      }
    } catch (error: any) {
      return {success: false, error: error.message || 'QR login failed'};
    }
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        signup,
        qrLogin,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

