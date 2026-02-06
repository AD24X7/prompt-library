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
  summary?: string; // Auto-generated one-line summary of user intent
  lastUsed?: string;
  placeholders?: string[];
  apps?: string[]; // Apps/tools that work well with this prompt
  urls?: string[]; // Relevant URLs/resources
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  toolUsed: string; // Required now
  department?: string; // Department information
  promptEdits?: string; // New field for prompt modifications
  whatWorked?: string;
  whatDidntWork?: string;
  improvementSuggestions?: string;
  testRunGraphicsLink?: string;
  mediaFiles?: string[];
  screenshots?: string[]; // Native screenshot support
  parentReviewId?: string; // For threading follow-up reviews
  followUpReviews?: Review[]; // Nested follow-up reviews for the same tool
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
  role: 'admin' | 'user';
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