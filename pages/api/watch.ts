import { NextApiResponse } from 'next';
import { NextRequest } from 'next/server';
import { wsManager } from '@/lib/server/websocket';

// Initialize WebSocket server when this route is accessed
wsManager.initializeServer();

export async function GET(request: NextRequest) {
  return new Response('WebSocket server is running', { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, folderPath } = body;

    if (type === 'watch') {
      // This is handled by the WebSocket server directly
      return new Response('Watch request received', { status: 200 });
    } else if (type === 'unwatch') {
      // This is handled by the WebSocket server directly
      return new Response('Unwatch request received', { status: 200 });
    }

    return new Response('Invalid request type', { status: 400 });
  } catch (error) {
    console.error('Error in watch API:', error);
    return new Response('Internal server error', { status: 500 });
  }
}