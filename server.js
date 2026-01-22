const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();
const SupabaseService = require('./supabase-service');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase service
const supabaseService = new SupabaseService();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3005', 'http://localhost:3000', 'https://prompt-library-rouge.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
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
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await supabaseService.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
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
    const { category, search, tags } = req.query;
    const filters = { category, search, tags };
    
    let prompts = await supabaseService.getAllPrompts(filters);
    
    // Add summaries to prompts
    prompts = prompts.map(prompt => ({
      ...prompt,
      summary: generateSummary(prompt.prompt, prompt.title)
    }));
    
    res.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

app.get('/api/prompts/:id', async (req, res) => {
  try {
    const prompt = await supabaseService.getPromptById(req.params.id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    // Add summary
    prompt.summary = generateSummary(prompt.prompt, prompt.title);
    
    res.json(prompt);
  } catch (error) {
    console.error('Error fetching prompt:', error);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

app.post('/api/prompts', async (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    const prompt = await supabaseService.createPrompt(req.body, userId);
    
    // Add summary
    prompt.summary = generateSummary(prompt.prompt, prompt.title);
    
    res.status(201).json(prompt);
  } catch (error) {
    console.error('Error creating prompt:', error);
    res.status(500).json({ error: 'Failed to create prompt' });
  }
});

app.put('/api/prompts/:id', async (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    const prompt = await supabaseService.updatePrompt(req.params.id, req.body, userId);
    
    // Add summary
    prompt.summary = generateSummary(prompt.prompt, prompt.title);
    
    res.json(prompt);
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

app.delete('/api/prompts/:id', async (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    await supabaseService.deletePrompt(req.params.id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// Reviews
app.post('/api/prompts/:id/reviews', async (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    const review = await supabaseService.addReview(req.params.id, req.body, userId);
    res.status(201).json(review);
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// Comments
app.get('/api/prompts/:id/comments', async (req, res) => {
  try {
    const comments = await supabaseService.getComments(req.params.id);
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/prompts/:id/comments', async (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    const comment = await supabaseService.addComment(req.params.id, req.body, userId);
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await supabaseService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Search
app.get('/api/search', async (req, res) => {
  try {
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
    res.status(500).json({ error: 'Failed to search prompts' });
  }
});

// Auth routes (basic for now)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const result = await supabaseService.createUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await supabaseService.signInUser(email, password);
    res.json(result);
  } catch (error) {
    console.error('Error signing in:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

// Usage tracking
app.post('/api/prompts/:id/track', async (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    const metadata = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    await supabaseService.trackUsage(req.params.id, userId, metadata);
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({ error: 'Failed to track usage' });
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