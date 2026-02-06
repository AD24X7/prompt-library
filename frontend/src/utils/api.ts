import axios from 'axios';
import { Prompt, Category, Stats, Review, User, Comment } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3005/api';
console.log('API_BASE_URL configured as:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // Handle auth errors
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      // Optionally redirect to login
    }
    
    return Promise.reject(error);
  }
);

export const promptsApi = {
  getAll: (params?: { category?: string; search?: string; tags?: string }) => 
    api.get<{ data: Prompt[] }>('/prompts', { params }),
  
  getById: (id: string) => 
    api.get<{ data: Prompt }>(`/prompts/${id}`),
  
  create: (prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'rating' | 'reviews'>) =>
    api.post<{ data: Prompt }>('/prompts', prompt),
  
  update: (id: string, prompt: Partial<Prompt>) =>
    api.put<{ data: Prompt }>(`/prompts/${id}`, prompt),
  
  delete: (id: string) =>
    api.delete(`/prompts/${id}`),
  
  trackUsage: (id: string) =>
    api.post(`/prompts/${id}/use`),
  
  addReview: (id: string, review: { 
    rating: number; 
    comment?: string; 
    toolUsed: string; 
    promptEdits?: string;
    whatWorked?: string; 
    whatDidntWork?: string; 
    improvementSuggestions?: string; 
    testRunGraphicsLink?: string;
    screenshots?: string[];
    mediaFiles?: string[];
    parentReviewId?: string;
  }) =>
    api.post<{ data: Review }>(`/prompts/${id}/review`, review),
};

export const categoriesApi = {
  getAll: () => api.get<{ data: Category[] }>('/categories'),
  create: (category: { name: string; description?: string }) =>
    api.post<{ data: Category }>('/categories', category),
};

export const statsApi = {
  get: () => api.get<{ data: Stats }>('/stats'),
};

// Auth API
export const authApi = {
  signUp: (data: { email: string; password: string; name: string }) =>
    api.post<{ success: boolean; token: string; user: User }>('/auth/signup', data),
  
  signIn: (data: { email: string; password: string }) =>
    api.post<{ success: boolean; token: string; user: User }>('/auth/signin', data),
  
  sendVerificationCode: (data: { email: string }) =>
    api.post<{ success: boolean; message: string }>('/auth/send-verification', data),
  
  verifyCode: (data: { email: string; code: string }) =>
    api.post<{ success: boolean; token: string; user: User }>('/auth/verify-code', data),
  
  getMe: () =>
    api.get<{ success: boolean; user: User }>('/auth/me'),
  
  refreshToken: () =>
    api.post<{ success: boolean; token: string }>('/auth/refresh')
};

export const commentsApi = {
  getComments: (promptId: string) => 
    api.get<Comment[]>(`/prompts/${promptId}/comments`),
  
  createComment: (promptId: string, data: { content: string; parentId?: string }) =>
    api.post<Comment>(`/prompts/${promptId}/comments`, data),
  
  updateComment: (commentId: string, data: { content: string }) =>
    api.put<Comment>(`/comments/${commentId}`, data),
  
  deleteComment: (commentId: string) =>
    api.delete<{ success: boolean }>(`/comments/${commentId}`)
};

export default api;