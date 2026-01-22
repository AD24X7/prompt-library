const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Inline Supabase service to avoid import issues in serverless
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

  async getStats() {
    try {
      const [promptsResult, categoriesResult] = await Promise.all([
        this.client.from('prompts').select('id', { count: 'exact' }),
        this.client.from('categories').select('id', { count: 'exact' })
      ]);

      return {
        totalPrompts: promptsResult.count || 0,
        totalCategories: categoriesResult.count || 0,
        totalUsage: 0,
        averageRating: 4.5,
        topCategories: [],
        recentPrompts: []
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase service safely
let supabaseService;
try {
  supabaseService = new SupabaseService();
} catch (error) {
  console.error('Failed to initialize Supabase service:', error);
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// CORS configuration - allow all origins for now
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    supabase: supabaseService ? 'initialized' : 'failed',
    environment: process.env.NODE_ENV || 'development'
  });
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
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database service not available' });
    }
    const categories = await supabaseService.getAllCategories();
    res.json(categories || []);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
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
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database service not available' });
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
    res.status(500).json({ error: 'Failed to fetch prompts', details: error.message });
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
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: Supabase`);
  });
}

module.exports = app;