// Client-side WebSocket implementation for folder watching
class FolderWatcher {
  private static instance: FolderWatcher;
  private callbacks: {
    onFormAdded: (form: any) => Promise<void>;
    onFormUpdated: (form: any) => Promise<void>;
  } | null = null;
  private isWatching = false;
  private watchPath: string | null = null;
  private ws: WebSocket | null = null;

  private constructor() {}

  static getInstance(): FolderWatcher {
    if (!FolderWatcher.instance) {
      FolderWatcher.instance = new FolderWatcher();
    }
    return FolderWatcher.instance;
  }

  setCallbacks(
    onFormAdded: (form: any) => Promise<void>,
    onFormUpdated: (form: any) => Promise<void>
  ) {
    this.callbacks = { onFormAdded, onFormUpdated };
  }

  async startWatching(path: string): Promise<void> {
    if (this.isWatching) {
      await this.stopWatching();
    }

    this.watchPath = path;
    
    try {
      // Connect to WebSocket server
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`Connected to WebSocket server at ${wsUrl}`);
        // Send watch message to server
        this.ws?.send(JSON.stringify({
          type: 'watch',
          folderPath: path
        }));
        this.isWatching = true;
        console.log(`Started watching folder: ${path}`);
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'add' && this.callbacks?.onFormAdded) {
            await this.callbacks.onFormAdded(data.form);
          } else if (data.type === 'update' && this.callbacks?.onFormUpdated) {
            await this.callbacks.onFormUpdated(data.form);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.isWatching = false;
        this.ws = null;
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isWatching = false;
      };

    } catch (error) {
      console.error('Error connecting to WebSocket server:', error);
      throw error;
    }
  }

  async stopWatching(): Promise<void> {
    if (this.ws && this.isWatching) {
      try {
        // Send unwatch message before closing
        if (this.watchPath) {
          this.ws.send(JSON.stringify({
            type: 'unwatch',
            folderPath: this.watchPath
          }));
        }
        
        this.ws.close();
        this.ws = null;
        this.isWatching = false;
        this.watchPath = null;
        console.log('Stopped watching folder');
      } catch (error) {
        console.error('Error stopping watcher:', error);
      }
    }
  }
}

export { FolderWatcher };
