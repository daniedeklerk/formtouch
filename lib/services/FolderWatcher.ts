interface Form {
  id: number;
  name: string;
  folder_path: string;
  last_modified: Date;
}

export class FolderWatcher {
  private ws: WebSocket | null = null;
  private static instance: FolderWatcher;
  private folderPath: string | null = null;

  private constructor() {}

  static getInstance(): FolderWatcher {
    if (!FolderWatcher.instance) {
      FolderWatcher.instance = new FolderWatcher();
    }
    return FolderWatcher.instance;
  }

  async startWatching(folderPath: string): Promise<void> {
    if (this.ws) {
      await this.stopWatching();
    }

    this.folderPath = folderPath;
    this.ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001');

    this.ws.onopen = () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'watch', folderPath }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'add') {
          console.log(`Added new form: ${data.form.name}`);
        } else if (data.type === 'update') {
          console.log(`Updated form: ${data.form.name}`);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  async stopWatching(): Promise<void> {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN && this.folderPath) {
        this.ws.send(JSON.stringify({ type: 'unwatch', folderPath: this.folderPath }));
      }
      this.ws.close();
      this.ws = null;
      this.folderPath = null;
    }
  }
}
