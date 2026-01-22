const express = require('express');

const app = express();

// Simple test routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Prompt Library API - Minimal Version',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: 'minimal'
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint working',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server for local testing
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Minimal server running on port ${PORT}`);
  });
}

module.exports = app;