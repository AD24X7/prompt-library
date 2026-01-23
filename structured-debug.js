#!/usr/bin/env node

// Structured logging for Railway with forced output flushing
function log(message, level = 'info', data = {}) {
  const logEntry = {
    message,
    level,
    timestamp: new Date().toISOString(),
    ...data
  };
  console.log(JSON.stringify(logEntry));
  // Force flush
  process.stdout.write('');
}

function logError(message, error = null, data = {}) {
  const logEntry = {
    message,
    level: 'error',
    timestamp: new Date().toISOString(),
    error: error ? error.message : null,
    stack: error ? error.stack : null,
    ...data
  };
  console.error(JSON.stringify(logEntry));
  // Force flush
  process.stderr.write('');
}

// Immediate startup logging
log('STRUCTURED DEBUG SERVER STARTING', 'info', {
  nodeVersion: process.version,
  platform: process.platform,
  pid: process.pid,
  cwd: process.cwd()
});

const PORT = process.env.PORT || 3000;
log('Port configuration', 'info', {
  portFromEnv: process.env.PORT,
  parsedPort: PORT
});

try {
  log('Loading HTTP module', 'info');
  const http = require('http');
  log('HTTP module loaded successfully', 'info');

  log('Creating HTTP server', 'info');
  const server = http.createServer((req, res) => {
    log('HTTP request received', 'info', {
      method: req.method,
      url: req.url,
      remoteAddress: req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    });
    
    if (req.url === '/health') {
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        port: PORT,
        uptime: process.uptime(),
        platform: process.platform,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage()
      };
      
      log('Health check response', 'info', { healthData });
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      });
      res.end(JSON.stringify(healthData));
      
      log('Health check response sent', 'info');
    } else {
      const response = `Structured Debug Server\nPort: ${PORT}\nTime: ${new Date().toISOString()}`;
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(response);
    }
  });

  log('Binding server to port', 'info', { port: PORT });
  
  server.listen(PORT, '0.0.0.0', () => {
    log('SERVER LISTENING SUCCESSFULLY', 'info', {
      address: '0.0.0.0',
      port: PORT,
      healthEndpoint: `http://0.0.0.0:${PORT}/health`,
      startupComplete: true
    });
    
    // Periodic heartbeat
    setInterval(() => {
      log('Server heartbeat', 'info', {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      });
    }, 30000);
  });

  server.on('error', (error) => {
    logError('SERVER ERROR', error, {
      port: PORT,
      address: '0.0.0.0'
    });
    process.exit(1);
  });

  log('Server setup complete, waiting for listen event', 'info');

} catch (error) {
  logError('CRITICAL STARTUP ERROR', error);
  process.exit(1);
}