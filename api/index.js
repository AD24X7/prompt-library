export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Route handling
  if (req.url === '/' || req.url === '/api') {
    return res.json({ 
      message: 'Prompt Library API',
      status: 'running',
      timestamp: new Date().toISOString()
    });
  }

  if (req.url === '/health' || req.url === '/api/health') {
    return res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: 'serverless'
    });
  }

  if (req.url === '/test' || req.url === '/api/test') {
    return res.json({ 
      message: 'Test endpoint working',
      method: req.method,
      url: req.url,
      environment: process.env.NODE_ENV || 'development'
    });
  }

  // 404 for other routes
  return res.status(404).json({ error: 'Not found', url: req.url });
}