#!/usr/bin/env node

// Debug server for Railway with immediate logging and health endpoint
console.log('=== DEBUG SERVER STARTING ===');
console.log('Timestamp:', new Date().toISOString());
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('CWD:', process.cwd());

const PORT = process.env.PORT || 3000;
console.log('PORT from env:', process.env.PORT);
console.log('Parsed PORT:', PORT);

// Test stdout/stderr
process.stdout.write('STDOUT TEST - SERVER STARTING\n');
process.stderr.write('STDERR TEST - SERVER STARTING\n');

try {
  console.log('Attempting to require http...');
  const http = require('http');
  console.log('✅ http module loaded successfully');

  console.log('Creating HTTP server...');
  const server = http.createServer((req, res) => {
    console.log(`📥 ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
    
    // Handle health check
    if (req.url === '/health') {
      const response = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        port: PORT,
        uptime: process.uptime(),
        platform: process.platform,
        nodeVersion: process.version
      };
      
      console.log('🏥 Health check requested, responding with:', JSON.stringify(response));
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      });
      res.end(JSON.stringify(response));
      
      console.log('✅ Health check response sent successfully');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`Debug server running on port ${PORT}\nTime: ${new Date().toISOString()}`);
    }
  });

  console.log(`Binding server to 0.0.0.0:${PORT}...`);
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log('🎉 ===== SERVER LISTENING SUCCESSFULLY =====');
    console.log(`🌐 Server bound to: 0.0.0.0:${PORT}`);
    console.log(`🏥 Health endpoint: http://0.0.0.0:${PORT}/health`);
    console.log(`⏱️  Start time: ${new Date().toISOString()}`);
    console.log('=======================================');
    
    // Log periodic heartbeats
    setInterval(() => {
      console.log(`💓 Server heartbeat: ${new Date().toISOString()}`);
    }, 30000);
  });

  server.on('error', (error) => {
    console.error('❌ SERVER ERROR:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    process.exit(1);
  });

} catch (error) {
  console.error('❌ CRITICAL ERROR DURING STARTUP:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}