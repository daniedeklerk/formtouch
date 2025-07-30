import { config } from 'dotenv';
import { wsManager } from './lib/server/websocket.js';

// Load environment variables
config();

// Initialize WebSocket server
console.log('Starting WebSocket server on port 3001...');
console.log('Database configuration:');
console.log(`Host: ${process.env.PG_HOST}`);
console.log(`Port: ${process.env.PG_PORT}`);
console.log(`Database: ${process.env.PG_DATABASE}`);
console.log(`User: ${process.env.PG_USER}`);

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
