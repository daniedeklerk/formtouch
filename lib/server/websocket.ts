import { WebSocketServer, WebSocket } from 'ws';
import type { FSWatcher } from 'chokidar';
import chokidar from 'chokidar';
import path from 'path';
import { db } from '@/lib/server/db';

class WebSocketManager {
  private static instance: WebSocketManager;
  private wsServer: WebSocketServer | null = null;
  private watchers: Map<string, FSWatcher>;

  private constructor() {
    this.watchers = new Map();
  }

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  initializeServer() {
    if (this.wsServer) return;

    this.wsServer = new WebSocketServer({ port: 3001 });

    this.wsServer.on('connection', (ws) => {
      console.log('Client connected');

      ws.on('message', async (rawMessage) => {
        try {
          const message = rawMessage.toString();
          const data = JSON.parse(message);

          if (data.type === 'watch') {
            await this.handleWatch(data.folderPath, ws);
          } else if (data.type === 'unwatch') {
            await this.handleUnwatch(data.folderPath);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
      });
    });
  }

  private async handleWatch(folderPath: string, ws: WebSocket) {
    if (!this.watchers.has(folderPath)) {
      const watcher = chokidar.watch(path.join(folderPath, '*.pdf'), {
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: true
      });

      watcher
        .on('add', async (filePath: string) => {
          const name = path.basename(filePath);
          try {
            const form = await db.createForm(name, folderPath);
            this.broadcastMessage({ type: 'add', form });
          } catch (error) {
            console.error(`Error adding form: ${name}`, error);
          }
        })
        .on('change', async (filePath: string) => {
          const name = path.basename(filePath);
          try {
            const forms = await db.searchForms(name);
            if (forms.length > 0) {
              const form = await db.updateForm(forms[0].id, {
                last_modified: new Date()
              });
              this.broadcastMessage({ type: 'update', form });
            }
          } catch (error) {
            console.error(`Error updating form: ${name}`, error);
          }
        });

      this.watchers.set(folderPath, watcher);
    }
  }

  private async handleUnwatch(folderPath: string) {
    const watcher = this.watchers.get(folderPath);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(folderPath);
    }
  }

  private broadcastMessage(message: any) {
    if (!this.wsServer) return;

    this.wsServer.clients.forEach((client) => {
      if (client.readyState === 1) {  // WebSocket.OPEN
        client.send(JSON.stringify(message));
      }
    });
  }
}

// Export the singleton instance
export const wsManager = WebSocketManager.getInstance();
