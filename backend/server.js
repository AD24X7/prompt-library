const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');

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