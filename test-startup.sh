#!/bin/bash

echo "=== SHELL SCRIPT STARTING ==="
echo "Date: $(date)"
echo "PWD: $(pwd)"
echo "USER: $(whoami)"
echo "PATH: $PATH"
echo "PORT: $PORT"

echo "=== LISTING FILES ==="
ls -la

echo "=== NODE VERSION CHECK ==="
which node
node --version || echo "Node not found"

echo "=== TESTING NODE EXECUTION ==="
echo 'console.log("Direct Node test");' | node || echo "Node execution failed"

echo "=== ATTEMPTING DEBUG SERVER ==="
node debug-server.js &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

sleep 5
echo "=== CHECKING IF SERVER IS RUNNING ==="
ps aux | grep node

echo "=== TESTING LOCAL HEALTH CHECK ==="
curl -v http://localhost:$PORT/health || echo "Health check failed"

echo "=== KEEPING PROCESS ALIVE ==="
wait $SERVER_PID