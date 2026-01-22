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
let supabaseService;
try {
  supabaseService = new SupabaseService();
  console.log('✅ Supabase service initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Supabase service:', error.message);
  console.log('Make sure to set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file');
  process.exit(1);
}

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Generate a concise summary of user intent from prompt content
const generateSummary = (prompt) => {
  if (!prompt || !prompt.prompt) return 'Generate AI response';
  
  const text = prompt.prompt.toLowerCase();
  
  // Define patterns to identify common intents
  const intentPatterns = [
    { pattern: /help me (analyze|review|assess|evaluate)/, intent: 'Analyze' },
    { pattern: /create a? (plan|strategy|framework|roadmap)/, intent: 'Plan' },
    { pattern: /write a? (email|message|letter|document|report)/, intent: 'Write' },
    { pattern: /generate (ideas|suggestions|options|alternatives)/, intent: 'Brainstorm' },
    { pattern: /make a? (decision|choice) about/, intent: 'Decide' },
    { pattern: /compare (.*?) (and|vs|versus|with)/, intent: 'Compare' },
    { pattern: /summarize|provide a summary/, intent: 'Summarize' },
    { pattern: /explain|help me understand/, intent: 'Explain' },
    { pattern: /research|investigate|find information/, intent: 'Research' },
    { pattern: /optimize|improve|enhance/, intent: 'Optimize' },
    { pattern: /solve|fix|resolve/, intent: 'Solve' },
    { pattern: /design|create|build/, intent: 'Design' },
    { pattern: /negotiate|discuss/, intent: 'Negotiate' },
    { pattern: /present|pitch/, intent: 'Present' },
    { pattern: /schedule|organize|manage/, intent: 'Organize' }
  ];
  
  // Extract main subject/topic
  const topicPatterns = [
    { pattern: /(project|product|feature|initiative)/, topic: 'project' },
    { pattern: /(team|staff|employee|people)/, topic: 'team' },
    { pattern: /(strategy|strategic|vision)/, topic: 'strategy' },
    { pattern: /(budget|financial|cost|revenue)/, topic: 'budget' },
    { pattern: /(customer|client|user)/, topic: 'customer' },
    { pattern: /(market|competition|competitor)/, topic: 'market' },
    { pattern: /(process|workflow|procedure)/, topic: 'process' },
    { pattern: /(stakeholder|partner)/, topic: 'stakeholders' },
    { pattern: /(meeting|presentation|discussion)/, topic: 'meeting' },
    { pattern: /(risk|problem|issue|challenge)/, topic: 'risks' }
  ];
  
  // Find intent
  let intent = 'Help with';
  for (const { pattern, intent: matchedIntent } of intentPatterns) {
    if (pattern.test(text)) {
      intent = matchedIntent;
      break;
    }
  }
  
  // Find topic
  let topic = 'task';
  for (const { pattern, topic: matchedTopic } of topicPatterns) {
    if (pattern.test(text)) {
      topic = matchedTopic;
      break;
    }
  }
  
  // Use title or description as fallback context
  if (topic === 'task' && prompt.title) {
    const title = prompt.title.toLowerCase();
    for (const { pattern, topic: matchedTopic } of topicPatterns) {
      if (pattern.test(title)) {
        topic = matchedTopic;
        break;
      }
    }
  }
  
  // Generate final summary
  if (intent === 'Help with') {
    // Fallback to extracting from title/description
    if (prompt.title && prompt.title.length < 60) {
      return prompt.title;
    }
    return `Guide ${topic} decisions and actions`;
  }
  
  return `${intent} ${topic} systematically`;
};

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'supabase',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get all prompts
app.get('/api/prompts', asyncHandler(async (req, res) => {
  try {
    const { category, search, tags } = req.query;
    const filters = {};
    
    if (category) filters.category = category;
    if (search) filters.search = search;
    if (tags) filters.tags = tags.split(',').map(t => t.trim());
    
    const prompts = await supabaseService.getAllPrompts(filters);
    
    // Add summaries to all prompts
    const enrichedPrompts = prompts.map(prompt => ({
      ...prompt,
      summary: prompt.summary || generateSummary(prompt)
    }));
    
    res.json(enrichedPrompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
}));

// Get single prompt
app.get('/api/prompts/:id', asyncHandler(async (req, res) => {
  try {
    const prompt = await supabaseService.getPromptById(req.params.id);
    
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    // Add summary to the prompt
    const enrichedPrompt = {
      ...prompt,
      summary: prompt.summary || generateSummary(prompt)
    };
    
    res.json(enrichedPrompt);
  } catch (error) {
    console.error('Error fetching prompt:', error);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
}));

// Create prompt
app.post('/api/prompts', asyncHandler(async (req, res) => {
  try {
    // For now, use a default user ID (you'll replace this with actual auth later)
    const userId = req.headers.authorization || 'default-user-id';
    
    const prompt = await supabaseService.createPrompt(req.body, userId);
    
    // Add summary
    const enrichedPrompt = {
      ...prompt,
      summary: prompt.summary || generateSummary(prompt)
    };
    
    res.status(201).json(enrichedPrompt);
  } catch (error) {
    console.error('Error creating prompt:', error);
    res.status(500).json({ error: 'Failed to create prompt' });
  }
}));

// Update prompt
app.put('/api/prompts/:id', asyncHandler(async (req, res) => {
  try {
    const userId = req.headers.authorization || 'default-user-id';
    
    const prompt = await supabaseService.updatePrompt(req.params.id, req.body, userId);
    
    // Add summary
    const enrichedPrompt = {
      ...prompt,
      summary: prompt.summary || generateSummary(prompt)
    };
    
    res.json(enrichedPrompt);
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
}));

// Delete prompt
app.delete('/api/prompts/:id', asyncHandler(async (req, res) => {
  try {
    const userId = req.headers.authorization || 'default-user-id';
    
    await supabaseService.deletePrompt(req.params.id, userId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
}));

// Add review
app.post('/api/prompts/:id/reviews', asyncHandler(async (req, res) => {
  try {
    const userId = req.headers.authorization || 'default-user-id';
    
    const review = await supabaseService.addReview(req.params.id, req.body, userId);
    res.status(201).json(review);
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
}));

// Get comments
app.get('/api/prompts/:id/comments', asyncHandler(async (req, res) => {
  try {
    const comments = await supabaseService.getComments(req.params.id);
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
}));

// Add comment
app.post('/api/prompts/:id/comments', asyncHandler(async (req, res) => {
  try {
    const userId = req.headers.authorization || 'default-user-id';
    
    const comment = await supabaseService.addComment(req.params.id, req.body, userId);
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
}));

// Get categories
app.get('/api/categories', asyncHandler(async (req, res) => {
  try {
    const categories = await supabaseService.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}));

// Create category
app.post('/api/categories', asyncHandler(async (req, res) => {
  try {
    const category = await supabaseService.createCategory(req.body);
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
}));

// Get stats
app.get('/api/stats', asyncHandler(async (req, res) => {
  try {
    const stats = await supabaseService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}));

// Search prompts
app.get('/api/search', asyncHandler(async (req, res) => {
  try {
    const { q, category, minRating } = req.query;
    const filters = {};
    
    if (category) filters.category = category;
    if (minRating) filters.minRating = parseFloat(minRating);
    
    const prompts = await supabaseService.searchPrompts(q, filters);
    
    // Add summaries
    const enrichedPrompts = prompts.map(prompt => ({
      ...prompt,
      summary: prompt.summary || generateSummary(prompt)
    }));
    
    res.json(enrichedPrompts);
  } catch (error) {
    console.error('Error searching prompts:', error);
    res.status(500).json({ error: 'Failed to search prompts' });
  }
}));

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Prompt Library API (Supabase) running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️  Database: Supabase PostgreSQL`);
  console.log(`🔑 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;