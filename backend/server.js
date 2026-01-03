const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure data directory exists
fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(path.join(DATA_DIR, 'prompts'));
fs.ensureDirSync(path.join(DATA_DIR, 'categories'));

// Initialize default data
const initializeData = async () => {
  const promptsFile = path.join(DATA_DIR, 'prompts.json');
  const categoriesFile = path.join(DATA_DIR, 'categories.json');
  
  if (!await fs.pathExists(promptsFile)) {
    // Load sample prompts if file doesn't exist
    const samplePromptsPath = path.join(__dirname, 'data', 'sample-prompts.json');
    if (await fs.pathExists(samplePromptsPath)) {
      const samplePrompts = await fs.readJson(samplePromptsPath);
      await fs.writeJson(promptsFile, samplePrompts);
    } else {
      await fs.writeJson(promptsFile, []);
    }
  }
  
  if (!await fs.pathExists(categoriesFile)) {
    const defaultCategories = [
      { id: uuidv4(), name: 'Strategy & Vision', description: 'Strategic planning and vision setting prompts' },
      { id: uuidv4(), name: 'Stakeholder Communication', description: 'Communication with stakeholders and teams' },
      { id: uuidv4(), name: 'Product Planning', description: 'Product roadmap and planning prompts' },
      { id: uuidv4(), name: 'Decision Making', description: 'Decision frameworks and analysis' },
      { id: uuidv4(), name: 'Team Management', description: 'Team leadership and management' },
      { id: uuidv4(), name: 'Analysis & Research', description: 'Market and competitive analysis' }
    ];
    await fs.writeJson(categoriesFile, defaultCategories);
  }
};

// Helper functions
const readData = async (filename) => {
  try {
    return await fs.readJson(path.join(DATA_DIR, filename));
  } catch (error) {
    return [];
  }
};

const writeData = async (filename, data) => {
  await fs.writeJson(path.join(DATA_DIR, filename), data, { spaces: 2 });
};

// Routes

// Get all prompts
app.get('/api/prompts', async (req, res) => {
  try {
    const prompts = await readData('prompts.json');
    const { category, search, tags } = req.query;
    
    let filtered = prompts;
    
    if (category) {
      filtered = filtered.filter(p => p.category === category);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.prompt.toLowerCase().includes(searchLower)
      );
    }
    
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim().toLowerCase());
      filtered = filtered.filter(p => 
        p.tags && p.tags.some(tag => 
          tagList.includes(tag.toLowerCase())
        )
      );
    }
    
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// Get single prompt
app.get('/api/prompts/:id', async (req, res) => {
  try {
    const prompts = await readData('prompts.json');
    const prompt = prompts.find(p => p.id === req.params.id);
    
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    res.json(prompt);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// Create new prompt
app.post('/api/prompts', async (req, res) => {
  try {
    const { title, description, prompt, category, tags, difficulty, estimatedTime, placeholders } = req.body;
    
    if (!title || !prompt) {
      return res.status(400).json({ error: 'Title and prompt are required' });
    }
    
    const prompts = await readData('prompts.json');
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
    await writeData('prompts.json', prompts);
    
    res.status(201).json(newPrompt);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create prompt' });
  }
});

// Update prompt
app.put('/api/prompts/:id', async (req, res) => {
  try {
    const prompts = await readData('prompts.json');
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
    await writeData('prompts.json', prompts);
    
    res.json(updatedPrompt);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

// Delete prompt
app.delete('/api/prompts/:id', async (req, res) => {
  try {
    const prompts = await readData('prompts.json');
    const index = prompts.findIndex(p => p.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    prompts.splice(index, 1);
    await writeData('prompts.json', prompts);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// Get categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await readData('categories.json');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
app.post('/api/categories', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    const categories = await readData('categories.json');
    const newCategory = {
      id: uuidv4(),
      name,
      description: description || '',
      createdAt: new Date().toISOString()
    };
    
    categories.push(newCategory);
    await writeData('categories.json', categories);
    
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Track usage
app.post('/api/prompts/:id/use', async (req, res) => {
  try {
    const prompts = await readData('prompts.json');
    const index = prompts.findIndex(p => p.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    prompts[index].usageCount = (prompts[index].usageCount || 0) + 1;
    prompts[index].lastUsed = new Date().toISOString();
    
    await writeData('prompts.json', prompts);
    
    res.json({ message: 'Usage tracked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track usage' });
  }
});

// Add review/rating
app.post('/api/prompts/:id/review', async (req, res) => {
  try {
    const { rating, comment, toolUsed, whatWorked, whatDidntWork, improvementSuggestions, testRunGraphicsLink, mediaFiles } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    const prompts = await readData('prompts.json');
    const index = prompts.findIndex(p => p.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    const review = {
      id: uuidv4(),
      rating,
      comment: comment || '',
      toolUsed: toolUsed || undefined,
      whatWorked: whatWorked || undefined,
      whatDidntWork: whatDidntWork || undefined,
      improvementSuggestions: improvementSuggestions || undefined,
      testRunGraphicsLink: testRunGraphicsLink || undefined,
      mediaFiles: mediaFiles || [],
      createdAt: new Date().toISOString()
    };
    
    if (!prompts[index].reviews) {
      prompts[index].reviews = [];
    }
    
    prompts[index].reviews.push(review);
    
    // Calculate average rating
    const avgRating = prompts[index].reviews.reduce((sum, r) => sum + r.rating, 0) / prompts[index].reviews.length;
    prompts[index].rating = Math.round(avgRating * 10) / 10;
    
    await writeData('prompts.json', prompts);
    
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const prompts = await readData('prompts.json');
    const categories = await readData('categories.json');
    
    const stats = {
      totalPrompts: prompts.length,
      totalCategories: categories.length,
      totalUsage: prompts.reduce((sum, p) => sum + (p.usageCount || 0), 0),
      averageRating: prompts.length > 0 ? prompts.reduce((sum, p) => sum + (p.rating || 0), 0) / prompts.length : 0,
      topCategories: categories.map(cat => ({
        name: cat.name,
        count: prompts.filter(p => p.category === cat.name).length
      })).sort((a, b) => b.count - a.count).slice(0, 5),
      recentPrompts: prompts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Auth middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const users = await readData('users.json');
    const user = users.find(u => u.id === decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    
    const users = await readData('users.json');
    
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
    await writeData('users.json', users);
    
    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json({
      success: true,
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const users = await readData('users.json');
    const user = users.find(u => u.email === email);
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json({
    success: true,
    user: userWithoutPassword
  });
});

// Comments routes
app.get('/api/prompts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await readData('comments.json');
    const users = await readData('users.json');
    
    const promptComments = comments.filter(c => c.promptId === id);
    
    // Build threaded comment structure
    const commentMap = new Map();
    const topLevelComments = [];
    
    // First pass: create comment objects with user info
    promptComments.forEach(comment => {
      const user = users.find(u => u.id === comment.userId);
      const commentWithUser = {
        ...comment,
        user: user ? {
          id: user.id,
          name: user.name,
          avatar: user.avatar
        } : {
          id: 'deleted',
          name: 'Deleted User',
          avatar: 'https://ui-avatars.com/api/?name=?&background=ccc&color=666'
        },
        replies: []
      };
      commentMap.set(comment.id, commentWithUser);
    });
    
    // Second pass: build thread structure
    commentMap.forEach(comment => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        topLevelComments.push(comment);
      }
    });
    
    // Sort by creation date
    const sortComments = (comments) => {
      comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      comments.forEach(comment => {
        if (comment.replies.length > 0) {
          sortComments(comment.replies);
        }
      });
    };
    
    sortComments(topLevelComments);
    
    res.json(topLevelComments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/prompts/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentId } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    // Verify prompt exists
    const prompts = await readData('prompts.json');
    if (!prompts.find(p => p.id === id)) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    // If parentId is provided, verify parent comment exists
    if (parentId) {
      const comments = await readData('comments.json');
      const parentComment = comments.find(c => c.id === parentId && c.promptId === id);
      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }
    
    const comment = {
      id: uuidv4(),
      promptId: id,
      userId: req.user.id,
      content: content.trim(),
      parentId: parentId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const comments = await readData('comments.json');
    comments.push(comment);
    await writeData('comments.json', comments);
    
    // Return comment with user info
    const commentWithUser = {
      ...comment,
      user: {
        id: req.user.id,
        name: req.user.name,
        avatar: req.user.avatar
      },
      replies: []
    };
    
    res.status(201).json(commentWithUser);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

app.put('/api/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    const comments = await readData('comments.json');
    const commentIndex = comments.findIndex(c => c.id === commentId);
    
    if (commentIndex === -1) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    const comment = comments[commentIndex];
    
    // Only allow user to edit their own comment
    if (comment.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this comment' });
    }
    
    comment.content = content.trim();
    comment.updatedAt = new Date().toISOString();
    
    await writeData('comments.json', comments);
    
    res.json(comment);
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

app.delete('/api/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comments = await readData('comments.json');
    const commentIndex = comments.findIndex(c => c.id === commentId);
    
    if (commentIndex === -1) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    const comment = comments[commentIndex];
    
    // Only allow user to delete their own comment
    if (comment.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }
    
    // Delete comment and all its replies
    const deleteCommentAndReplies = (commentId) => {
      const toDelete = comments.filter(c => c.parentId === commentId);
      toDelete.forEach(reply => deleteCommentAndReplies(reply.id));
      
      const index = comments.findIndex(c => c.id === commentId);
      if (index !== -1) {
        comments.splice(index, 1);
      }
    };
    
    deleteCommentAndReplies(commentId);
    
    await writeData('comments.json', comments);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  await initializeData();
  app.listen(PORT, () => {
    console.log(`🚀 Prompt Library API running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
};

startServer().catch(console.error);