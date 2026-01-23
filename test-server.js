// Ultra-simple test server for Railway debugging
console.log('🚀 STARTING TEST SERVER...');

const PORT = process.env.PORT || 3001;
console.log(`📍 PORT: ${PORT}`);

// Test if basic requirements work
try {
  console.log('📦 Testing require...');
  const http = require('http');
  console.log('✅ http module loaded');
  
  console.log('🌐 Creating server...');
  const server = http.createServer((req, res) => {
    console.log(`📥 ${req.method} ${req.url}`);
    
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        port: PORT 
      }));
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Test server running');
    }
  });
  
  console.log('🎯 Binding to port...');
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ TEST SERVER RUNNING ON 0.0.0.0:${PORT}`);
    console.log(`🌐 Health: http://0.0.0.0:${PORT}/health`);
  });
  
  server.on('error', (error) => {
    console.error('❌ SERVER ERROR:', error);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ STARTUP ERROR:', error);
  process.exit(1);
}