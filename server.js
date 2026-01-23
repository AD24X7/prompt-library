const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Inline Supabase service to avoid import issues in serverless
class SupabaseService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    // Only initialize if we have the required config
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      console.warn('⚠️  Missing Supabase configuration - running in fallback mode');
      this.isConfigured = false;
      return;
    }
    
    try {
      // Admin client for server-side operations
      this.adminClient = createClient(this.supabaseUrl, this.supabaseServiceKey);
      
      // Public client for user operations  
      this.client = createClient(this.supabaseUrl, this.supabaseAnonKey);
      
      this.isConfigured = true;
      console.log('✅ Supabase clients initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase clients:', error.message);
      this.isConfigured = false;
    }
  }

  async getAllCategories() {
    if (!this.isConfigured) {
      return []; // Return empty array if not configured
    }
    
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

  async getAllPrompts(filters = {}) {
    if (!this.isConfigured) {
      return []; // Return empty array if not configured
    }
    
    try {
      let query = this.client
        .from('prompts')
        .select(`
          *,
          category:categories(id, name, description),
          reviews(
            id, rating, comment, tool_used, created_at,
            user:users(id, name, avatar)
          )
        `);

      // Apply filters
      if (filters.category) {
        query = query.eq('category_name', filters.category);
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,prompt.ilike.%${filters.search}%`);
      }

      // Default ordering
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform data to match frontend expectations
      return data.map(prompt => ({
        ...prompt,
        tags: typeof prompt.tags === 'string' ? JSON.parse(prompt.tags || '[]') : prompt.tags || [],
        placeholders: typeof prompt.placeholders === 'string' ? JSON.parse(prompt.placeholders || '[]') : prompt.placeholders || [],
        apps: typeof prompt.apps === 'string' ? JSON.parse(prompt.apps || '[]') : prompt.apps || [],
        urls: typeof prompt.urls === 'string' ? JSON.parse(prompt.urls || '[]') : prompt.urls || [],
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
            id, rating, comment, tool_used, created_at,
            user:users(id, name, avatar)
          )
        `)
        .eq('id', promptId)
        .single();
      
      if (error) throw error;
      
      // Transform data
      const prompt = {
        ...data,
        tags: typeof data.tags === 'string' ? JSON.parse(data.tags || '[]') : data.tags || [],
        placeholders: typeof data.placeholders === 'string' ? JSON.parse(data.placeholders || '[]') : data.placeholders || [],
        apps: typeof data.apps === 'string' ? JSON.parse(data.apps || '[]') : data.apps || [],
        urls: typeof data.urls === 'string' ? JSON.parse(data.urls || '[]') : data.urls || [],
        category: data.category_name,
        reviews: data.reviews || []
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

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase service safely
let supabaseService;
let supabaseError = null;
try {
  supabaseService = new SupabaseService();
  if (supabaseService.isConfigured) {
    console.log('✅ Supabase service initialized successfully');
  } else {
    console.log('⚠️  Supabase service created but not configured - running in fallback mode');
    supabaseError = 'Missing environment variables';
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase service:', error.message);
  supabaseError = error.message;
  // Create a dummy service for fallback
  supabaseService = { isConfigured: false };
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        process.env.FRONTEND_URL, 
        process.env.RAILWAY_STATIC_URL,
        /\.up\.railway\.app$/,
        /\.railway\.app$/
      ].filter(Boolean)
    : ['http://localhost:3005', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'user-id']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging - skip in serverless
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('combined'));
}

// Generate summary helper function (simplified version)
function generateSummary(prompt, title) {
  if (!prompt || typeof prompt !== 'string') return title || 'Untitled prompt';
  
  const cleanPrompt = prompt.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
  
  // Intent patterns
  const intents = {
    'Analyze': ['analyze', 'analysis', 'examine', 'review', 'assess', 'evaluate', 'study'],
    'Plan': ['plan', 'strategy', 'roadmap', 'schedule', 'organize', 'outline'],
    'Write': ['write', 'create', 'draft', 'compose', 'generate', 'produce'],
    'Optimize': ['optimize', 'improve', 'enhance', 'refine', 'streamline'],
    'Debug': ['debug', 'fix', 'troubleshoot', 'resolve', 'solve'],
    'Design': ['design', 'architect', 'structure', 'layout', 'framework']
  };
  
  // Topic patterns  
  const topics = {
    'project': ['project', 'initiative', 'program'],
    'team': ['team', 'group', 'staff', 'personnel'],
    'strategy': ['strategy', 'approach', 'methodology'],
    'process': ['process', 'workflow', 'procedure'],
    'product': ['product', 'feature', 'functionality'],
    'marketing': ['marketing', 'campaign', 'promotion'],
    'code': ['code', 'programming', 'development', 'software']
  };
  
  // Find matching intent
  let matchedIntent = 'Process';
  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some(keyword => cleanPrompt.includes(keyword))) {
      matchedIntent = intent;
      break;
    }
  }
  
  // Find matching topic
  let matchedTopic = 'content';
  for (const [topic, keywords] of Object.entries(topics)) {
    if (keywords.some(keyword => cleanPrompt.includes(keyword))) {
      matchedTopic = topic;
      break;
    }
  }
  
  return `${matchedIntent} ${matchedTopic}`;
}

// Routes

// Railway healthcheck endpoint
app.get('/health', (req, res) => {
  const healthData = { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    supabase: (supabaseService && supabaseService.isConfigured) ? 'configured' : 'not-configured',
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    envVars: {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'missing',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'set' : 'missing',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'set' : 'missing'
    }
  };
  
  if (supabaseError) {
    healthData.supabaseError = supabaseError;
  }
  
  res.json(healthData);
});

// API healthcheck endpoint 
app.get('/api/health', (req, res) => {
  const healthData = { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    supabase: supabaseService ? 'initialized' : 'failed',
    environment: process.env.NODE_ENV || 'development'
  };
  
  if (supabaseError) {
    healthData.supabaseError = supabaseError;
  }
  
  res.json(healthData);
});

// Root route for Vercel
app.get('/', (req, res) => {
  res.json({ 
    message: 'Prompt Library API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    if (!supabaseService || !supabaseService.isConfigured) {
      return res.json([]); // Return empty array instead of error
    }
    const categories = await supabaseService.getAllCategories();
    res.json(categories || []);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.json([]); // Return empty array on error too
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const category = await supabaseService.createCategory(req.body);
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Prompts
app.get('/api/prompts', async (req, res) => {
  try {
    if (!supabaseService || !supabaseService.isConfigured) {
      return res.json([]); // Return empty array instead of error
    }
    
    const { category, search, tags } = req.query;
    const filters = { category, search, tags };
    
    let prompts = await supabaseService.getAllPrompts(filters);
    
    // Add summaries to prompts
    prompts = (prompts || []).map(prompt => ({
      ...prompt,
      summary: generateSummary(prompt.prompt, prompt.title)
    }));
    
    res.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.json([]); // Return empty array on error too
  }
});

app.get('/api/prompts/:id', async (req, res) => {
  try {
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database service not available' });
    }
    
    const prompt = await supabaseService.getPromptById(req.params.id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    // Add summary
    prompt.summary = generateSummary(prompt.prompt, prompt.title);
    
    res.json(prompt);
  } catch (error) {
    console.error('Error fetching prompt:', error);
    res.status(500).json({ error: 'Failed to fetch prompt', details: error.message });
  }
});

app.post('/api/prompts', async (req, res) => {
  try {
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database service not available' });
    }
    
    const userId = req.headers['user-id'] || 'anonymous';
    const prompt = await supabaseService.createPrompt(req.body, userId);
    
    // Add summary
    prompt.summary = generateSummary(prompt.prompt, prompt.title);
    
    res.status(201).json(prompt);
  } catch (error) {
    console.error('Error creating prompt:', error);
    res.status(500).json({ error: 'Failed to create prompt', details: error.message });
  }
});

// Reviews
app.post('/api/prompts/:id/reviews', async (req, res) => {
  try {
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database service not available' });
    }
    
    const userId = req.headers['user-id'] || 'anonymous';
    const review = await supabaseService.addReview(req.params.id, req.body, userId);
    res.status(201).json(review);
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ error: 'Failed to add review', details: error.message });
  }
});

// Comments
app.get('/api/prompts/:id/comments', async (req, res) => {
  try {
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database service not available' });
    }
    
    const comments = await supabaseService.getComments(req.params.id);
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments', details: error.message });
  }
});

app.post('/api/prompts/:id/comments', async (req, res) => {
  try {
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database service not available' });
    }
    
    const userId = req.headers['user-id'] || 'anonymous';
    const comment = await supabaseService.addComment(req.params.id, req.body, userId);
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment', details: error.message });
  }
});

// Search
app.get('/api/search', async (req, res) => {
  try {
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database service not available' });
    }
    
    const { q: query, category, minRating } = req.query;
    const filters = { category, minRating: minRating ? parseInt(minRating) : undefined };
    
    let prompts = await supabaseService.searchPrompts(query, filters);
    
    // Add summaries
    prompts = prompts.map(prompt => ({
      ...prompt,
      summary: generateSummary(prompt.prompt, prompt.title)
    }));
    
    res.json(prompts);
  } catch (error) {
    console.error('Error searching prompts:', error);
    res.status(500).json({ error: 'Failed to search prompts', details: error.message });
  }
});

// Stats
app.get('/api/stats', async (req, res) => {
  try {
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database service not available' });
    }
    const stats = await supabaseService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
if (require.main === module) {
  console.log('🔄 Starting server...');
  console.log(`📍 PORT environment variable: ${process.env.PORT}`);
  console.log(`🎯 Will bind to port: ${PORT}`);
  
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server successfully started!`);
    console.log(`📍 Listening on: 0.0.0.0:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: Supabase ${(supabaseService && supabaseService.isConfigured) ? '✅' : '❌'}`);
    console.log(`🌐 Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`🔗 API endpoints available at: http://0.0.0.0:${PORT}/api/*`);
    
    if (supabaseError) {
      console.log(`⚠️  Supabase not configured: ${supabaseError}`);
      console.log(`💡 Server will work in fallback mode - add environment variables to enable full functionality`);
    }
  });
  
  server.on('error', (error) => {
    console.error('❌ Server failed to start:', error);
  });
}

module.exports = app;