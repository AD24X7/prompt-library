const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Read JSON data files
const usersPath = path.join(__dirname, 'backend/data/users.json');
const promptsPath = path.join(__dirname, 'backend/data/prompts.json');
const categoriesPath = path.join(__dirname, 'backend/data/categories.json');
const commentsPath = path.join(__dirname, 'backend/data/comments.json');
const pendingPromptsPath = path.join(__dirname, 'backend/data/pending-prompts.json');
const pendingReviewsPath = path.join(__dirname, 'backend/data/pending-reviews.json');

function readJSONFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
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

// Add request logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

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
      { id: user.id, email: user.email, name: user.name, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const users = readJSONFile(usersPath);
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      id: require('crypto').randomUUID(),
      email,
      name,
      password: hashedPassword,
      role: 'user', // Default role for new signups
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1976d2&color=fff`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    users.push(newUser);
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    
    // Create token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatar: newUser.avatar,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Password reset endpoint for development
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const users = readJSONFile(usersPath);
    
    const userIndex = users.findIndex(u => u.email === email);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    users[userIndex].password = hashedPassword;
    users[userIndex].updatedAt = new Date().toISOString();
    
    // Write back to file
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Categories
app.get('/api/categories', (req, res) => {
  const categories = readJSONFile(categoriesPath);
  res.json(categories);
});

// Helper function for admin-only routes
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Optional auth middleware - allows both authenticated and anonymous access
const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Invalid token, but continue as anonymous user
    }
  }
  next();
};

// Prompts - Public endpoint (no auth required)
app.get('/api/prompts', optionalAuth, (req, res) => {
  try {
    let prompts = readJSONFile(promptsPath);
    
    // Add summaries to all prompts
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

app.get('/api/prompts/:id', (req, res) => {
  try {
    const prompts = readJSONFile(promptsPath);
    let prompt = prompts.find(p => p.id === req.params.id);
    
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

// === NEW AUTH SYSTEM ENDPOINTS ===

// Submit prompt for admin approval (authenticated users only)
app.post('/api/prompts/submit', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      // Admin can create prompts directly
      const prompts = readJSONFile(promptsPath);
      const newPrompt = {
        id: require('crypto').randomUUID(),
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        rating: 0,
        reviews: []
      };
      prompts.push(newPrompt);
      fs.writeFileSync(promptsPath, JSON.stringify(prompts, null, 2));
      res.json({ success: true, prompt: newPrompt, published: true });
    } else {
      // Regular users submit for approval
      const pendingPrompts = readJSONFile(pendingPromptsPath);
      const submission = {
        id: require('crypto').randomUUID(),
        ...req.body,
        submittedBy: req.user.id,
        submittedByName: req.user.name,
        submittedAt: new Date().toISOString(),
        status: 'pending'
      };
      pendingPrompts.push(submission);
      fs.writeFileSync(pendingPromptsPath, JSON.stringify(pendingPrompts, null, 2));
      res.json({ success: true, submission, published: false });
    }
  } catch (error) {
    console.error('Submit prompt error:', error);
    res.status(500).json({ error: 'Failed to submit prompt' });
  }
});

// Submit review for admin approval (authenticated users only)
app.post('/api/prompts/:id/reviews/submit', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      // Admin can add reviews directly
      const prompts = readJSONFile(promptsPath);
      const promptIndex = prompts.findIndex(p => p.id === req.params.id);
      if (promptIndex === -1) {
        return res.status(404).json({ error: 'Prompt not found' });
      }
      
      const newReview = {
        id: require('crypto').randomUUID(),
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      prompts[promptIndex].reviews.push(newReview);
      
      // Update rating
      const reviews = prompts[promptIndex].reviews;
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      prompts[promptIndex].rating = avgRating;
      prompts[promptIndex].updatedAt = new Date().toISOString();
      
      fs.writeFileSync(promptsPath, JSON.stringify(prompts, null, 2));
      res.json({ success: true, review: newReview, published: true });
    } else {
      // Regular users submit for approval
      const pendingReviews = readJSONFile(pendingReviewsPath);
      const submission = {
        id: require('crypto').randomUUID(),
        promptId: req.params.id,
        ...req.body,
        submittedBy: req.user.id,
        submittedByName: req.user.name,
        submittedAt: new Date().toISOString(),
        status: 'pending'
      };
      pendingReviews.push(submission);
      fs.writeFileSync(pendingReviewsPath, JSON.stringify(pendingReviews, null, 2));
      res.json({ success: true, submission, published: false });
    }
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Admin-only: Get pending submissions
app.get('/api/admin/pending', authenticateToken, requireAdmin, (req, res) => {
  try {
    const pendingPrompts = readJSONFile(pendingPromptsPath);
    const pendingReviews = readJSONFile(pendingReviewsPath);
    
    res.json({
      prompts: pendingPrompts.filter(p => p.status === 'pending'),
      reviews: pendingReviews.filter(r => r.status === 'pending')
    });
  } catch (error) {
    console.error('Error fetching pending submissions:', error);
    res.status(500).json({ error: 'Failed to fetch pending submissions' });
  }
});

// Admin-only: Approve prompt
app.post('/api/admin/prompts/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  try {
    const pendingPrompts = readJSONFile(pendingPromptsPath);
    const prompts = readJSONFile(promptsPath);
    
    const submissionIndex = pendingPrompts.findIndex(p => p.id === req.params.id);
    if (submissionIndex === -1) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    const submission = pendingPrompts[submissionIndex];
    
    // Create approved prompt
    const newPrompt = {
      id: require('crypto').randomUUID(),
      title: submission.title,
      description: submission.description,
      prompt: submission.prompt,
      category: submission.category,
      tags: submission.tags || [],
      difficulty: submission.difficulty,
      estimatedTime: submission.estimatedTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      rating: 0,
      reviews: []
    };
    
    prompts.push(newPrompt);
    pendingPrompts[submissionIndex].status = 'approved';
    
    fs.writeFileSync(promptsPath, JSON.stringify(prompts, null, 2));
    fs.writeFileSync(pendingPromptsPath, JSON.stringify(pendingPrompts, null, 2));
    
    res.json({ success: true, prompt: newPrompt });
  } catch (error) {
    console.error('Error approving prompt:', error);
    res.status(500).json({ error: 'Failed to approve prompt' });
  }
});

// Admin-only: Approve review
app.post('/api/admin/reviews/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  try {
    const pendingReviews = readJSONFile(pendingReviewsPath);
    const prompts = readJSONFile(promptsPath);
    
    const submissionIndex = pendingReviews.findIndex(r => r.id === req.params.id);
    if (submissionIndex === -1) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    const submission = pendingReviews[submissionIndex];
    const promptIndex = prompts.findIndex(p => p.id === submission.promptId);
    
    if (promptIndex === -1) {
      return res.status(404).json({ error: 'Target prompt not found' });
    }
    
    // Create approved review
    const newReview = {
      id: require('crypto').randomUUID(),
      rating: submission.rating,
      comment: submission.comment,
      toolUsed: submission.toolUsed,
      department: submission.department,
      whatWorked: submission.whatWorked,
      whatDidntWork: submission.whatDidntWork,
      improvementSuggestions: submission.improvementSuggestions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    prompts[promptIndex].reviews.push(newReview);
    
    // Update rating
    const reviews = prompts[promptIndex].reviews;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    prompts[promptIndex].rating = avgRating;
    prompts[promptIndex].updatedAt = new Date().toISOString();
    
    pendingReviews[submissionIndex].status = 'approved';
    
    fs.writeFileSync(promptsPath, JSON.stringify(prompts, null, 2));
    fs.writeFileSync(pendingReviewsPath, JSON.stringify(pendingReviews, null, 2));
    
    res.json({ success: true, review: newReview });
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({ error: 'Failed to approve review' });
  }
});

// Admin-only: Reject submission
app.post('/api/admin/:type/:id/reject', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { type } = req.params;
    const filePath = type === 'prompts' ? pendingPromptsPath : pendingReviewsPath;
    const pending = readJSONFile(filePath);
    
    const submissionIndex = pending.findIndex(item => item.id === req.params.id);
    if (submissionIndex === -1) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    pending[submissionIndex].status = 'rejected';
    pending[submissionIndex].rejectedReason = req.body.reason || 'No reason provided';
    
    fs.writeFileSync(filePath, JSON.stringify(pending, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting submission:', error);
    res.status(500).json({ error: 'Failed to reject submission' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 JSON Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Data: JSON files`);
});

module.exports = app;