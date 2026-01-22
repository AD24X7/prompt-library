// Supabase service layer for Prompt Library
// This replaces the JSON file-based operations with database operations

const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY');
    }
    
    // Admin client for server-side operations
    this.adminClient = createClient(this.supabaseUrl, this.supabaseServiceKey);
    
    // Public client for user operations
    this.client = createClient(this.supabaseUrl, this.supabaseAnonKey);
  }

  // User Management
  async createUser(userData) {
    try {
      // Create user in Auth
      const { data: authUser, error: authError } = await this.adminClient.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          name: userData.name
        }
      });

      if (authError) throw authError;

      // Create user in public.users table
      const { data: dbUser, error: dbError } = await this.adminClient
        .from('users')
        .insert({
          id: authUser.user.id,
          email: userData.email,
          name: userData.name,
          avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=1976d2&color=fff`
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return { user: dbUser, auth: authUser };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async signInUser(email, password) {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing in user:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  // Category Management
  async getAllCategories() {
    try {
      const { data, error } = await this.client
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }

  async createCategory(categoryData) {
    try {
      const { data, error } = await this.adminClient
        .from('categories')
        .insert(categoryData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  // Prompt Management
  async getAllPrompts(filters = {}) {
    try {
      let query = this.client
        .from('prompts')
        .select(`
          *,
          category:categories(id, name, description),
          reviews(
            id, rating, comment, tool_used, created_at,
            user:users(id, name, avatar)
          ),
          _count:reviews(count)
        `);

      // Apply filters
      if (filters.category) {
        query = query.eq('category_name', filters.category);
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,prompt.ilike.%${filters.search}%`);
      }
      
      if (filters.tags) {
        const tagsArray = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
        query = query.contains('tags', JSON.stringify(tagsArray));
      }

      // Default ordering
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform data to match frontend expectations
      return data.map(prompt => ({
        ...prompt,
        tags: typeof prompt.tags === 'string' ? JSON.parse(prompt.tags) : prompt.tags,
        placeholders: typeof prompt.placeholders === 'string' ? JSON.parse(prompt.placeholders) : prompt.placeholders,
        apps: typeof prompt.apps === 'string' ? JSON.parse(prompt.apps) : prompt.apps,
        urls: typeof prompt.urls === 'string' ? JSON.parse(prompt.urls) : prompt.urls,
        category: prompt.category_name,
        reviews: prompt.reviews || []
      }));
    } catch (error) {
      console.error('Error getting prompts:', error);
      throw error;
    }
  }

  async getPromptById(promptId) {
    try {
      const { data, error } = await this.client
        .from('prompts')
        .select(`
          *,
          category:categories(id, name, description),
          reviews(
            id, rating, comment, tool_used, prompt_edits, what_worked,
            what_didnt_work, improvement_suggestions, test_run_graphics_link,
            media_files, screenshots, parent_review_id, created_at, updated_at,
            user:users(id, name, avatar),
            replies:reviews!parent_review_id(
              id, rating, comment, tool_used, created_at,
              user:users(id, name, avatar)
            )
          )
        `)
        .eq('id', promptId)
        .single();
      
      if (error) throw error;
      
      // Transform data
      const prompt = {
        ...data,
        tags: typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags,
        placeholders: typeof data.placeholders === 'string' ? JSON.parse(data.placeholders) : data.placeholders,
        apps: typeof data.apps === 'string' ? JSON.parse(data.apps) : data.apps,
        urls: typeof data.urls === 'string' ? JSON.parse(data.urls) : data.urls,
        category: data.category_name,
        reviews: data.reviews?.map(review => ({
          ...review,
          media_files: typeof review.media_files === 'string' ? JSON.parse(review.media_files) : review.media_files,
          screenshots: typeof review.screenshots === 'string' ? JSON.parse(review.screenshots) : review.screenshots
        })) || []
      };
      
      return prompt;
    } catch (error) {
      console.error('Error getting prompt by ID:', error);
      throw error;
    }
  }

  async createPrompt(promptData, userId) {
    try {
      // Get category ID from category name
      let categoryId = null;
      if (promptData.category) {
        const { data: categoryData } = await this.client
          .from('categories')
          .select('id')
          .eq('name', promptData.category)
          .single();
        categoryId = categoryData?.id;
      }

      const { data, error } = await this.client
        .from('prompts')
        .insert({
          title: promptData.title,
          description: promptData.description,
          prompt: promptData.prompt,
          category_id: categoryId,
          category_name: promptData.category,
          difficulty: promptData.difficulty || 'medium',
          estimated_time: promptData.estimatedTime || '5-10 minutes',
          tags: JSON.stringify(promptData.tags || []),
          placeholders: JSON.stringify(promptData.placeholders || []),
          apps: JSON.stringify(promptData.apps || []),
          urls: JSON.stringify(promptData.urls || []),
          user_id: userId
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Transform response
      return {
        ...data,
        tags: JSON.parse(data.tags || '[]'),
        placeholders: JSON.parse(data.placeholders || '[]'),
        apps: JSON.parse(data.apps || '[]'),
        urls: JSON.parse(data.urls || '[]'),
        category: data.category_name,
        reviews: []
      };
    } catch (error) {
      console.error('Error creating prompt:', error);
      throw error;
    }
  }

  async updatePrompt(promptId, promptData, userId) {
    try {
      // Get category ID if category name is provided
      let categoryId = null;
      if (promptData.category) {
        const { data: categoryData } = await this.client
          .from('categories')
          .select('id')
          .eq('name', promptData.category)
          .single();
        categoryId = categoryData?.id;
      }

      const updateData = {
        ...promptData,
        category_id: categoryId,
        category_name: promptData.category
      };

      // Convert arrays to JSON strings
      if (promptData.tags) updateData.tags = JSON.stringify(promptData.tags);
      if (promptData.placeholders) updateData.placeholders = JSON.stringify(promptData.placeholders);
      if (promptData.apps) updateData.apps = JSON.stringify(promptData.apps);
      if (promptData.urls) updateData.urls = JSON.stringify(promptData.urls);

      const { data, error } = await this.client
        .from('prompts')
        .update(updateData)
        .eq('id', promptId)
        .eq('user_id', userId) // Ensure user can only update their own prompts
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating prompt:', error);
      throw error;
    }
  }

  async deletePrompt(promptId, userId) {
    try {
      const { error } = await this.client
        .from('prompts')
        .delete()
        .eq('id', promptId)
        .eq('user_id', userId); // Ensure user can only delete their own prompts
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting prompt:', error);
      throw error;
    }
  }

  // Review Management
  async addReview(promptId, reviewData, userId) {
    try {
      const { data, error } = await this.client
        .from('reviews')
        .insert({
          prompt_id: promptId,
          user_id: userId,
          rating: reviewData.rating,
          comment: reviewData.comment,
          tool_used: reviewData.toolUsed,
          prompt_edits: reviewData.promptEdits,
          what_worked: reviewData.whatWorked,
          what_didnt_work: reviewData.whatDidntWork,
          improvement_suggestions: reviewData.improvementSuggestions,
          test_run_graphics_link: reviewData.testRunGraphicsLink,
          parent_review_id: reviewData.parentReviewId,
          media_files: JSON.stringify(reviewData.mediaFiles || []),
          screenshots: JSON.stringify(reviewData.screenshots || [])
        })
        .select(`
          *,
          user:users(id, name, avatar)
        `)
        .single();
      
      if (error) throw error;
      
      // Trigger usage tracking
      await this.trackUsage(promptId, userId);
      
      return {
        ...data,
        media_files: JSON.parse(data.media_files || '[]'),
        screenshots: JSON.parse(data.screenshots || '[]')
      };
    } catch (error) {
      console.error('Error adding review:', error);
      throw error;
    }
  }

  // Comment Management
  async getComments(promptId) {
    try {
      const { data, error } = await this.client
        .from('comments')
        .select(`
          *,
          user:users(id, name, avatar),
          replies:comments!parent_id(
            *,
            user:users(id, name, avatar)
          )
        `)
        .eq('prompt_id', promptId)
        .is('parent_id', null)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }

  async addComment(promptId, commentData, userId) {
    try {
      const { data, error } = await this.client
        .from('comments')
        .insert({
          prompt_id: promptId,
          user_id: userId,
          content: commentData.content,
          parent_id: commentData.parentId
        })
        .select(`
          *,
          user:users(id, name, avatar)
        `)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  // Usage Tracking
  async trackUsage(promptId, userId, metadata = {}) {
    try {
      const { error } = await this.client
        .from('prompt_usage')
        .insert({
          prompt_id: promptId,
          user_id: userId,
          ip_address: metadata.ip,
          user_agent: metadata.userAgent
        });
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error tracking usage:', error);
      // Don't throw error for usage tracking failures
      return { success: false };
    }
  }

  // Analytics
  async getStats() {
    try {
      const [promptsResult, categoriesResult, usageResult, ratingsResult] = await Promise.all([
        this.client.from('prompts').select('id', { count: 'exact' }),
        this.client.from('categories').select('id', { count: 'exact' }),
        this.client.from('prompt_usage').select('id', { count: 'exact' }),
        this.client.from('prompts').select('rating')
      ]);

      // Top categories
      const { data: topCategories } = await this.client
        .from('prompts')
        .select('category_name')
        .not('category_name', 'is', null);

      const categoryCounts = topCategories.reduce((acc, prompt) => {
        acc[prompt.category_name] = (acc[prompt.category_name] || 0) + 1;
        return acc;
      }, {});

      const topCategoriesArray = Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Recent prompts
      const { data: recentPrompts } = await this.client
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Calculate average rating
      const ratings = ratingsResult.data?.map(p => p.rating).filter(r => r > 0) || [];
      const averageRating = ratings.length > 0 ? 
        ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;

      return {
        totalPrompts: promptsResult.count || 0,
        totalCategories: categoriesResult.count || 0,
        totalUsage: usageResult.count || 0,
        averageRating: Math.round(averageRating * 100) / 100,
        topCategories: topCategoriesArray,
        recentPrompts: recentPrompts?.map(prompt => ({
          ...prompt,
          tags: JSON.parse(prompt.tags || '[]'),
          placeholders: JSON.parse(prompt.placeholders || '[]'),
          apps: JSON.parse(prompt.apps || '[]'),
          urls: JSON.parse(prompt.urls || '[]'),
          category: prompt.category_name
        })) || []
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  // Search functionality
  async searchPrompts(query, filters = {}) {
    try {
      let dbQuery = this.client
        .from('prompts')
        .select(`
          *,
          category:categories(id, name),
          reviews(id, rating)
        `);

      if (query) {
        // Full-text search
        dbQuery = dbQuery.or(
          `title.ilike.%${query}%,prompt.ilike.%${query}%,category_name.ilike.%${query}%`
        );
      }

      if (filters.category) {
        dbQuery = dbQuery.eq('category_name', filters.category);
      }

      if (filters.minRating) {
        dbQuery = dbQuery.gte('rating', filters.minRating);
      }

      const { data, error } = await dbQuery
        .order('rating', { ascending: false })
        .order('usage_count', { ascending: false });

      if (error) throw error;

      return data.map(prompt => ({
        ...prompt,
        tags: JSON.parse(prompt.tags || '[]'),
        placeholders: JSON.parse(prompt.placeholders || '[]'),
        apps: JSON.parse(prompt.apps || '[]'),
        urls: JSON.parse(prompt.urls || '[]'),
        category: prompt.category_name,
        reviews: prompt.reviews || []
      }));
    } catch (error) {
      console.error('Error searching prompts:', error);
      throw error;
    }
  }
}

module.exports = SupabaseService;