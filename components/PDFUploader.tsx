import { useCallback, useState, useEffect } from 'react';
import { useFormStore } from '@/lib/store';
import * as pdfjsLib from 'pdfjs-dist';

export const PDFUploader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [manualPath, setManualPath] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');
const { selectedFolder, setSelectedFolder, setPdfList } = useFormStore();

  useEffect(() => {
    // Initialize PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }, []);

  const showStatusMessage = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setStatusMessage(message);
    setStatusType(type);
    // Clear message after 5 seconds
    setTimeout(() => setStatusMessage(''), 5000);
  }, []);

  const handleFolderSelect = useCallback(async () => {
    setIsLoading(true);
    showStatusMessage('Opening folder selector...', 'info');
    
    try {
      // Check if the File System Access API is available
      if (!('showDirectoryPicker' in window)) {
        showStatusMessage('Your browser does not support folder selection. Please use the manual path option below.', 'error');
        setIsLoading(false);
        return;
      }

      // @ts-ignore - window.showDirectoryPicker is not in the TypeScript types yet
      const handle = await window.showDirectoryPicker();
      const folderName = handle.name;
      
      showStatusMessage(`Selected folder: ${folderName}. Scanning for PDFs...`, 'info');
      
      // Scan the folder for PDF files
      const pdfFiles = [];
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
          try {
            const file = await entry.getFile();
            pdfFiles.push({
              name: file.name,
              size: file.size,
              lastModified: file.lastModified,
              path: file.name
            });
          } catch (error) {
            console.error(`Error processing file ${entry.name}:`, error);
          }
        }
      }

      showStatusMessage(`Found ${pdfFiles.length} PDF files in the folder.`, 'info');
      
      // Try to get the actual path from the directory handle
      // Note: This is a workaround as browser security restrictions prevent direct access to the full path
      let resolvedPath = '';
      
      // Try to resolve the path using a more systematic approach
      try {
        // First, try to get the path from the handle if available (experimental)
        if ('resolve' in handle) {
          const resolved = await handle.resolve();
          if (resolved && resolved.length > 0) {
            resolvedPath = resolved.join('\\');
          }
        }
      } catch (e) {
        console.log('Could not resolve path from handle:', e);
      }
      
      // If we couldn't resolve the path, try common locations
      if (!resolvedPath) {
        const possiblePaths = [
          `C:\\Users\\${folderName}`,
          `C:\\Users\\dmnde\\${folderName}`,
          `C:\\Users\\dmnde\\Documents\\${folderName}`,
          `C:\\Users\\dmnde\\Desktop\\${folderName}`,
          `D:\\${folderName}`,
          `C:\\Users\\${process.env.USERNAME || 'default'}\\Documents\\${folderName}`,
          `C:\\Users\\${process.env.USERNAME || 'default'}\\Desktop\\${folderName}`,
          folderName // fallback to just the folder name
        ];

        // Try each path and see if it works
        for (const path of possiblePaths) {
          try {
            await setSelectedFolder(path);
            resolvedPath = path;
            showStatusMessage(`Successfully set folder to: ${path}`, 'success');
            break;
          } catch (error) {
            console.log(`Path ${path} not accessible, trying next...`);
          }
        }
      } else {
        // Use the resolved path
        try {
          await setSelectedFolder(resolvedPath);
          setPdfList(pdfFiles);
          showStatusMessage(`Successfully set folder to: ${resolvedPath} with ${pdfFiles.length} PDFs`, 'success');
        } catch (error) {
          console.error('Error setting resolved path:', error);
          showStatusMessage('Error setting folder path. Please try the manual path option.', 'error');
        }
      }
      
      if (!resolvedPath) {
        showStatusMessage('Could not determine folder path. Please enter the path manually below.', 'error');
      }
    } catch (error: any) {
      console.error('Error selecting folder:', error);
      if (error.name === 'AbortError') {
        showStatusMessage('Folder selection was cancelled.', 'info');
      } else {
        showStatusMessage(`Error selecting folder: ${error.message || 'Unknown error'}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [setSelectedFolder, showStatusMessage]);

  const handleManualPathSubmit = useCallback(async () => {
    if (!manualPath.trim()) {
      showStatusMessage('Please enter a folder path.', 'error');
      return;
    }

    setIsLoading(true);
    showStatusMessage('Setting up folder watcher...', 'info');
    
    try {
      await setSelectedFolder(manualPath.trim());
      showStatusMessage(`Successfully set folder to: ${manualPath.trim()}`, 'success');
    } catch (error: any) {
      console.error('Error setting manual path:', error);
      showStatusMessage(`Error setting folder path: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [manualPath, setSelectedFolder, showStatusMessage]);

  const getStatusColor = useCallback(() => {
    switch (statusType) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  }, [statusType]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
      <button
        onClick={handleFolderSelect}
        disabled={isLoading}
        className={`px-4 py-2 text-white rounded cursor-pointer transition-colors flex items-center gap-2 ${
          isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          'Select PDF Folder'
        )}
      </button>
    </div>
  );
};
