import { useCallback, useState, useEffect } from 'react';
import { useFormStore } from '@/lib/store';
import * as pdfjsLib from 'pdfjs-dist';

export const PDFUploader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { selectedFolder, setSelectedFolder } = useFormStore();

  useEffect(() => {
    // Initialize PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }, []);

  const handleFolderSelect = useCallback(async () => {
    try {
      // @ts-ignore - window.showDirectoryPicker is not in the TypeScript types yet
      const handle = await window.showDirectoryPicker();
      const path = handle.name; // In a real app, you'd want to get the full path
      await setSelectedFolder(path);
    } catch (error) {
      console.error('Error selecting folder:', error);
      alert('Error selecting folder');
    }
  }, [setSelectedFolder]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
      <div className="flex items-center gap-4">
        <button
          onClick={handleFolderSelect}
          className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 transition-colors"
        >
          Select PDF Folder
        </button>
        {selectedFolder && (
          <span className="text-sm text-gray-600">
            Watching folder: {selectedFolder}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">
        PDFs in this folder will be automatically added to the template list
      </p>
    </div>
  );
};