import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider?: 'email' | 'google' | 'outlook';
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

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Save user to localStorage when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const signIn = async (email: string, password?: string) => {
    try {
      setLoading(true);
      
      // For demo purposes, create a mock user
      // In production, this would call your backend API
      const mockUser: User = {
        id: `user_${Date.now()}`,
        email,
        name: email.split('@')[0],
        provider: 'email'
      };
      
      setUser(mockUser);
    } catch (error) {
      throw new Error('Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      
      // For demo purposes, create a mock user
      // In production, this would call your backend API
      const mockUser: User = {
        id: `user_${Date.now()}`,
        email,
        name,
        provider: 'email'
      };
      
      setUser(mockUser);
    } catch (error) {
      throw new Error('Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      
      // For demo purposes, create a mock Google user
      // In production, this would integrate with Google OAuth
      const mockUser: User = {
        id: `google_user_${Date.now()}`,
        email: 'demo@gmail.com',
        name: 'Demo Google User',
        avatar: 'https://via.placeholder.com/40',
        provider: 'google'
      };
      
      setUser(mockUser);
    } catch (error) {
      throw new Error('Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const signInWithOutlook = async () => {
    try {
      setLoading(true);
      
      // For demo purposes, create a mock Outlook user
      // In production, this would integrate with Microsoft OAuth
      const mockUser: User = {
        id: `outlook_user_${Date.now()}`,
        email: 'demo@outlook.com',
        name: 'Demo Outlook User',
        avatar: 'https://via.placeholder.com/40',
        provider: 'outlook'
      };
      
      setUser(mockUser);
    } catch (error) {
      throw new Error('Failed to sign in with Outlook');
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
  };

  const sendVerificationCode = async (email: string) => {
    // For demo purposes, just simulate sending a code
    // In production, this would send an actual email
    console.log(`Verification code sent to ${email}: 123456`);
    alert(`Demo: Verification code sent to ${email}. Use code: 123456`);
  };

  const verifyCode = async (email: string, code: string) => {
    // For demo purposes, accept any 6-digit code
    if (code === '123456' || code.length === 6) {
      return;
    } else {
      throw new Error('Invalid verification code');
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithOutlook,
    signOut,
    sendVerificationCode,
    verifyCode,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};