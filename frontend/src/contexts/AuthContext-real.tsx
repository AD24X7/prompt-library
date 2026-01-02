import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider?: 'email' | 'google' | 'outlook';
  verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithOutlook: () => Promise<void>;
  signOut: () => void;
  sendVerificationCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage and verify token
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          // Verify token is still valid
          const response = await authApi.getMe();
          if (response.data.success) {
            setUser(response.data.user);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          }
        } catch (error) {
          // Token invalid, clear storage
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          console.error('Failed to verify auth token:', error);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Helper function to save auth data
  const saveAuthData = (token: string, userData: User) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  // Helper function to clear auth data
  const clearAuthData = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const signIn = async (email: string, password?: string) => {
    try {
      setLoading(true);
      
      if (!password) {
        throw new Error('Password is required for email sign in');
      }
      
      const response = await authApi.signIn({ email, password });
      
      if (response.data.success) {
        saveAuthData(response.data.token, response.data.user);
      } else {
        throw new Error('Sign in failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      
      const response = await authApi.signUp({ email, password, name });
      
      if (response.data.success) {
        saveAuthData(response.data.token, response.data.user);
      } else {
        throw new Error('Sign up failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCode = async (email: string) => {
    try {
      setLoading(true);
      
      const response = await authApi.sendVerificationCode({ email });
      
      if (!response.data.success) {
        throw new Error('Failed to send verification code');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (email: string, code: string) => {
    try {
      setLoading(true);
      
      const response = await authApi.verifyCode({ email, code });
      
      if (response.data.success) {
        saveAuthData(response.data.token, response.data.user);
      } else {
        throw new Error('Code verification failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      
      // For now, show message that OAuth is not implemented yet
      // In production, this would redirect to Google OAuth
      throw new Error('Google OAuth is not implemented yet. Please use email/password or verification code.');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const signInWithOutlook = async () => {
    try {
      setLoading(true);
      
      // For now, show message that OAuth is not implemented yet
      // In production, this would redirect to Microsoft OAuth
      throw new Error('Microsoft OAuth is not implemented yet. Please use email/password or verification code.');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in with Outlook');
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    clearAuthData();
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithOutlook,
    signOut,
    sendVerificationCode,
    verifyCode
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};