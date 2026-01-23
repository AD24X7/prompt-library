#!/usr/bin/env node

// Absolute minimal test - log immediately before anything else
console.log('=== PROCESS STARTED ===');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Args:', process.argv);
console.log('CWD:', process.cwd());

// Test if we can write to stdout/stderr
process.stdout.write('STDOUT TEST\n');
process.stderr.write('STDERR TEST\n');

console.log('Environment variables:');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Keep process alive
setInterval(() => {
  console.log('Still alive:', new Date().toISOString());
}, 5000);