const { wsManager } = require('./lib/server/websocket.js');

// Initialize WebSocket server
console.log('Starting WebSocket server on port 3001...');
wsManager.initializeServer();

console.log('WebSocket server is running and ready to accept connections');

// Keep the process running
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down WebSocket server...');
  process.exit(0);
});
