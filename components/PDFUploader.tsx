import { useCallback, useState, useEffect } from 'react';
import { useFormStore } from '@/lib/store';
import * as pdfjsLib from 'pdfjs-dist';

export const PDFUploader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [manualPath, setManualPath] = useState('');
  const { selectedFolder, setSelectedFolder } = useFormStore();

  useEffect(() => {
    // Initialize PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }, []);

  const handleFolderSelect = useCallback(async () => {
    try {
      // @ts-ignore - window.showDirectoryPicker is not in the TypeScript types yet
      const handle = await window.showDirectoryPicker();
      
      // Try to get a more usable path
      // Note: Browser security restrictions prevent getting the full path
      // So we'll use a combination of the folder name and let the user specify the base path
      const folderName = handle.name;
      
      // For demo purposes, we'll use a common path pattern
      // In a real application, you might need to configure this differently
      const possiblePaths = [
        `C:\\Users\\${folderName}`,
        `C:\\Users\\dmnde\\${folderName}`,
        `C:\\Users\\dmnde\\Documents\\${folderName}`,
        `C:\\Users\\dmnde\\Desktop\\${folderName}`,
        `D:\\${folderName}`,
        folderName // fallback to just the folder name
      ];

      // Try each path and see if it exists (this is a simplified approach)
      for (const path of possiblePaths) {
        try {
          // We can't actually check if the path exists from the browser
          // So we'll use the first reasonable path and let the server handle it
          await setSelectedFolder(path);
          console.log(`Attempting to watch path: ${path}`);
          break;
        } catch (error) {
          console.log(`Path ${path} not accessible, trying next...`);
        }
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      alert('Error selecting folder');
    }
  }, [setSelectedFolder]);

  const handleManualPathSubmit = useCallback(async () => {
    if (manualPath.trim()) {
      await setSelectedFolder(manualPath.trim());
    }
  }, [manualPath, setSelectedFolder]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={handleFolderSelect}
          className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 transition-colors"
        >
          Select PDF Folder (Browser)
        </button>
        
        <div className="text-center text-sm text-gray-500">
          OR
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter full folder path (e.g., C:\\Users\\dmnde\\Documents\\PDFs)"
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            className="px-3 py-2 border rounded text-sm w-96"
          />
          <button
            onClick={handleManualPathSubmit}
            className="px-4 py-2 bg-green-500 text-white rounded cursor-pointer hover:bg-green-600 transition-colors"
          >
            Watch Path
          </button>
        </div>
      </div>
      
      {selectedFolder && (
        <div className="text-center">
          <span className="text-sm text-gray-600">
            Watching folder: {selectedFolder}
          </span>
          <div className="text-xs text-gray-400 mt-1">
            Make sure this path contains PDF files
          </div>
        </div>
      )}
      
      <p className="text-sm text-gray-500">
        PDFs in this folder will be automatically added to the template list
      </p>
    </div>
  );
};