export interface Prompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  rating: number;
  reviews: Review[];
  lastUsed?: string;
  placeholders?: string[];
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  toolUsed?: string;
  whatWorked?: string;
  whatDidntWork?: string;
  improvementSuggestions?: string;
  testRunGraphicsLink?: string;
  mediaFiles?: string[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Stats {
  totalPrompts: number;
  totalCategories: number;
  totalUsage: number;
  averageRating: number;
  topCategories: { name: string; count: number }[];
  recentPrompts: Prompt[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  promptId: string;
  userId: string;
  content: string;
  parentId: string | null;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  replies: Comment[];
  createdAt: string;
  updatedAt: string;
}