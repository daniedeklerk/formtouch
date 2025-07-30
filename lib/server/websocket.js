import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { processPdfFile } from './pdfProcessor.js';
import { db } from './db.js';

class WebSocketManager {
  constructor() {
    this.wsServer = null;
    this.watchers = new Map();
  }

  static getInstance() {
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

    console.log('WebSocket server initialized on port 3001');
  }

  async handleWatch(folderPath, ws) {
    console.log(`Received watch request for folder: ${folderPath}`);
    
    // Clean up the folder path - remove any trailing *.pdf or slashes
    let cleanPath = folderPath.trim();
    if (cleanPath.endsWith('*.pdf')) {
      cleanPath = cleanPath.slice(0, -5).trim();
    }
    cleanPath = cleanPath.replace(/[\/\\]+$/, ''); // Remove trailing slashes
    
    console.log(`Cleaned folder path: ${cleanPath}`);
    
    // Check if the folder exists and list its contents
    try {
      if (fs.existsSync(cleanPath)) {
        console.log(`Folder exists: ${cleanPath}`);
        const files = fs.readdirSync(cleanPath);
        console.log(`Files in folder: ${files.length} items`);
        const pdfFiles = [];
        
        files.forEach(file => {
          const fullPath = path.join(cleanPath, file);
          const stats = fs.statSync(fullPath);
          console.log(`  - ${file} (${stats.isDirectory() ? 'DIR' : 'FILE'}) ${stats.size} bytes`);
          
          // If it's a PDF file, add it to our list
          if (!stats.isDirectory() && file.toLowerCase().endsWith('.pdf')) {
            pdfFiles.push({ file, fullPath, stats });
          }
        });
        
        console.log(`Found ${pdfFiles.length} PDF files in root folder`);
        
        // Process existing PDF files immediately
        for (const { file, fullPath } of pdfFiles) {
          console.log(`Processing existing PDF: ${fullPath}`);
          try {
            // Check if form already exists
            const existingForms = await db.searchForms(file);
            if (existingForms.length === 0) {
              const form = await db.createForm(file, cleanPath);
              console.log(`Created form in database:`, form);
              
              // Process the PDF file to extract pages as images
              try {
                const success = await processPdfFile(fullPath, form.id);
                if (success) {
                  console.log(`✅ Successfully processed PDF: ${file}`);
                } else {
                  console.error(`❌ Failed to process PDF: ${file}`);
                  // Create a placeholder page as fallback
                  await db.createFormPage(form.id, 1, 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==');
                }
              } catch (processError) {
                console.error(`Error processing PDF file ${fullPath}:`, processError);
                // Create a placeholder page as fallback
                await db.createFormPage(form.id, 1, 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==');
              }
              
              this.broadcastMessage({ type: 'add', form });
            } else {
              console.log(`Form already exists: ${file} (ID: ${existingForms[0].id})`);
              // Optionally broadcast existing form to client
              this.broadcastMessage({ type: 'add', form: existingForms[0] });
            }
          } catch (error) {
            console.error(`Error adding form: ${file}`, error);
          }
        }
        
      } else {
        console.log(`Folder does not exist: ${cleanPath}`);
        return;
      }
    } catch (error) {
      console.error(`Error checking folder: ${error}`);
      return;
    }
    
    if (!this.watchers.has(cleanPath)) {
      console.log(`Creating new watcher for: ${cleanPath}`);
      
      // Watch for PDF files recursively in subfolders
      const watchPattern = path.join(cleanPath, '**', '*.pdf');
      console.log(`Watch pattern: ${watchPattern}`);
      
      const watcher = chokidar.watch(watchPattern, {
        persistent: true,
        ignoreInitial: false, // This should trigger 'add' events for existing files
        awaitWriteFinish: true,
        // Also watch the folder itself for new subfolders
        ignored: /(^|[\/\\])\../  // ignore dotfiles
      });

      watcher
        .on('add', async (filePath) => {
          const name = path.basename(filePath);
          console.log(`File added: ${filePath} (name: ${name})`);
          try {
            const form = await db.createForm(name, cleanPath);
            console.log(`Created form in database:`, form);
            
            // Process the PDF file to extract pages as images
            try {
              const success = await processPdfFile(filePath, form.id);
              if (success) {
                console.log(`✅ Successfully processed PDF: ${name}`);
              } else {
                console.error(`❌ Failed to process PDF: ${name}`);
                // Create a placeholder page as fallback
                await db.createFormPage(form.id, 1, 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==');
              }
            } catch (processError) {
              console.error(`Error processing PDF file ${filePath}:`, processError);
              // Create a placeholder page as fallback
              await db.createFormPage(form.id, 1, 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==');
            }
            
            this.broadcastMessage({ type: 'add', form });
          } catch (error) {
            console.error(`Error adding form: ${name}`, error);
          }
        })
        .on('change', async (filePath) => {
          const name = path.basename(filePath);
          console.log(`File changed: ${filePath} (name: ${name})`);
          try {
            const forms = await db.searchForms(name);
            if (forms.length > 0) {
              const form = await db.updateForm(forms[0].id, {
                last_modified: new Date()
              });
              console.log(`Updated form in database:`, form);
              this.broadcastMessage({ type: 'update', form });
            }
          } catch (error) {
            console.error(`Error updating form: ${name}`, error);
          }
        })
        .on('error', (error) => {
          console.error(`Watcher error for ${cleanPath}:`, error);
        })
        .on('ready', () => {
          console.log(`Watcher ready for ${cleanPath}. Initial scan complete.`);
        })
        .on('all', (event, filePath) => {
          console.log(`Watcher event: ${event} for ${filePath}`);
        });

      this.watchers.set(cleanPath, watcher);
      console.log(`Started watching folder: ${cleanPath}`);
    } else {
      console.log(`Folder ${cleanPath} is already being watched`);
    }
  }

  async handleUnwatch(folderPath) {
    const watcher = this.watchers.get(folderPath);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(folderPath);
      console.log(`Stopped watching folder: ${folderPath}`);
    }
  }

  broadcastMessage(message) {
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
