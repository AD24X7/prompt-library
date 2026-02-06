const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Read JSON data files
const usersPath = path.join(__dirname, 'backend/data/users.json');
const promptsPath = path.join(__dirname, 'backend/data/prompts.json');
const categoriesPath = path.join(__dirname, 'backend/data/categories.json');
const commentsPath = path.join(__dirname, 'backend/data/comments.json');

function readJSONFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

function writeJSONFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw error;
  }
}

// Generate summary helper function
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
    'code': ['code', 'programming', 'development', 'software'],
    'content': ['content', 'article', 'slides', 'presentation']
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

// Middleware
app.use(cors({
  origin: ['http://localhost:3005', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = readJSONFile(usersPath);
    
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ data: { user: req.user } });
});

// User registration
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    
    const users = readJSONFile(usersPath);
    
    // Check if user already exists
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = {
      id: uuidv4(),
      email,
      name,
      password: hashedPassword,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1976d2&color=fff`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    users.push(user);
    writeJSONFile(usersPath, users);
    
    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json({
      data: {
        success: true,
        token,
        user: userWithoutPassword
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Categories
app.get('/api/categories', (req, res) => {
  const categories = readJSONFile(categoriesPath);
  res.json(categories);
});

// Prompts
app.get('/api/prompts', (req, res) => {
  try {
    let prompts = readJSONFile(promptsPath);
    
    // Add summaries to all prompts
    prompts = prompts.map(prompt => ({
      ...prompt,
      summary: generateSummary(prompt.prompt, prompt.title)
    }));
    
    res.json({ data: prompts });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

app.get('/api/prompts/:id', (req, res) => {
  try {
    const prompts = readJSONFile(promptsPath);
    let prompt = prompts.find(p => p.id === req.params.id);
    
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    // Add summary
    prompt.summary = generateSummary(prompt.prompt, prompt.title);
    
    res.json({ data: prompt });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// Create new prompt
app.post('/api/prompts', authenticateToken, (req, res) => {
  try {
    const { title, description, prompt, category, tags, difficulty, estimatedTime, placeholders } = req.body;
    
    if (!title || !prompt) {
      return res.status(400).json({ error: 'Title and prompt are required' });
    }
    
    const prompts = readJSONFile(promptsPath);
    const newPrompt = {
      id: uuidv4(),
      title,
      description: description || '',
      prompt,
      category: category || 'Uncategorized',
      tags: tags || [],
      difficulty: difficulty || 'medium',
      estimatedTime: estimatedTime || '5-10 minutes',
      placeholders: placeholders || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      rating: 0,
      reviews: []
    };
    
    prompts.push(newPrompt);
    writeJSONFile(promptsPath, prompts);
    
    res.status(201).json({ data: newPrompt });
  } catch (error) {
    console.error('Error creating prompt:', error);
    res.status(500).json({ error: 'Failed to create prompt' });
  }
});

// Update prompt
app.put('/api/prompts/:id', authenticateToken, (req, res) => {
  try {
    const prompts = readJSONFile(promptsPath);
    const index = prompts.findIndex(p => p.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    const updatedPrompt = {
      ...prompts[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    prompts[index] = updatedPrompt;
    writeJSONFile(promptsPath, prompts);
    
    res.json({ data: updatedPrompt });
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

// Delete prompt
app.delete('/api/prompts/:id', authenticateToken, (req, res) => {
  try {
    const prompts = readJSONFile(promptsPath);
    const index = prompts.findIndex(p => p.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    prompts.splice(index, 1);
    writeJSONFile(promptsPath, prompts);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// Add review to prompt
app.post('/api/prompts/:id/review', authenticateToken, (req, res) => {
  try {
    const prompts = readJSONFile(promptsPath);
    const index = prompts.findIndex(p => p.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    const { rating, comment, toolUsed, promptEdits, whatWorked, whatDidntWork, improvementSuggestions, screenshots } = req.body;
    
    if (!rating || !toolUsed) {
      return res.status(400).json({ error: 'Rating and toolUsed are required' });
    }
    
    const review = {
      id: uuidv4(),
      rating,
      comment: comment || '',
      toolUsed,
      promptEdits: promptEdits || '',
      whatWorked: whatWorked || '',
      whatDidntWork: whatDidntWork || '',
      improvementSuggestions: improvementSuggestions || '',
      screenshots: screenshots || [],
      userEmail: req.user.email,
      userName: req.user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    prompts[index].reviews.push(review);
    
    // Recalculate average rating
    const reviews = prompts[index].reviews;
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    prompts[index].rating = totalRating / reviews.length;
    prompts[index].updatedAt = new Date().toISOString();
    
    writeJSONFile(promptsPath, prompts);
    
    res.status(201).json({ data: review });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// Update review
app.put('/api/reviews/:id', authenticateToken, (req, res) => {
  try {
    const prompts = readJSONFile(promptsPath);
    let reviewFound = false;
    let updatedPrompt = null;
    
    for (const prompt of prompts) {
      const reviewIndex = prompt.reviews.findIndex(r => r.id === req.params.id);
      if (reviewIndex !== -1) {
        const review = prompt.reviews[reviewIndex];
        
        // Check if user owns this review
        if (review.userEmail !== req.user.email) {
          return res.status(403).json({ error: 'Not authorized to edit this review' });
        }
        
        // Update review
        prompt.reviews[reviewIndex] = {
          ...review,
          ...req.body,
          updatedAt: new Date().toISOString()
        };
        
        // Recalculate average rating
        const totalRating = prompt.reviews.reduce((sum, r) => sum + r.rating, 0);
        prompt.rating = totalRating / prompt.reviews.length;
        prompt.updatedAt = new Date().toISOString();
        
        updatedPrompt = prompt;
        reviewFound = true;
        break;
      }
    }
    
    if (!reviewFound) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    writeJSONFile(promptsPath, prompts);
    
    res.json({ success: true, prompt: updatedPrompt });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete review
app.delete('/api/reviews/:id', authenticateToken, (req, res) => {
  try {
    const prompts = readJSONFile(promptsPath);
    let reviewFound = false;
    
    for (const prompt of prompts) {
      const reviewIndex = prompt.reviews.findIndex(r => r.id === req.params.id);
      if (reviewIndex !== -1) {
        const review = prompt.reviews[reviewIndex];
        
        // Check if user owns this review
        if (review.userEmail !== req.user.email) {
          return res.status(403).json({ error: 'Not authorized to delete this review' });
        }
        
        prompt.reviews.splice(reviewIndex, 1);
        
        // Recalculate average rating
        if (prompt.reviews.length > 0) {
          const totalRating = prompt.reviews.reduce((sum, r) => sum + r.rating, 0);
          prompt.rating = totalRating / prompt.reviews.length;
        } else {
          prompt.rating = 0;
        }
        prompt.updatedAt = new Date().toISOString();
        
        reviewFound = true;
        break;
      }
    }
    
    if (!reviewFound) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    writeJSONFile(promptsPath, prompts);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Comments
app.get('/api/prompts/:id/comments', (req, res) => {
  const comments = readJSONFile(commentsPath);
  const promptComments = comments.filter(c => c.promptId === req.params.id && !c.parentId);
  
  // Add replies
  const commentsWithReplies = promptComments.map(comment => ({
    ...comment,
    replies: comments.filter(c => c.parentId === comment.id)
  }));
  
  res.json(commentsWithReplies);
});

// Stats
app.get('/api/stats', (req, res) => {
  try {
    const prompts = readJSONFile(promptsPath);
    const categories = readJSONFile(categoriesPath);
    
    // Calculate stats
    const totalPrompts = prompts.length;
    const totalCategories = categories.length;
    
    // Recent prompts
    const recentPrompts = prompts
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(prompt => ({
        ...prompt,
        summary: generateSummary(prompt.prompt, prompt.title)
      }));
    
    // Category counts
    const categoryCounts = {};
    prompts.forEach(prompt => {
      if (prompt.category) {
        categoryCounts[prompt.category] = (categoryCounts[prompt.category] || 0) + 1;
      }
    });
    
    const topCategories = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    res.json({
      totalPrompts,
      totalCategories,
      totalUsage: 0,
      averageRating: 0,
      topCategories,
      recentPrompts
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 JSON Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Data: JSON files`);
});

module.exports = app;