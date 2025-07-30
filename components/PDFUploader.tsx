import { useCallback, useState, useEffect } from 'react';
import { useFormStore } from '@/lib/store';
import * as pdfjsLib from 'pdfjs-dist';

export const PDFUploader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { addForm } = useFormStore();

  useEffect(() => {
    // Initialize PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      // Read the PDF file
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
      
      const pageImages: string[] = [];
      
      // Convert each page to an image
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        
        // Use higher resolution for better quality
        const scale = 2.0; // Increased scale for better quality
        const viewport = page.getViewport({ scale });
        
        // Create a high-resolution canvas
        const canvas = document.createElement('canvas');
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = viewport.width * pixelRatio;
        canvas.height = viewport.height * pixelRatio;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        // Scale the context to handle the pixel ratio
        ctx.scale(pixelRatio, pixelRatio);

        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        // Render the PDF page to the canvas
        await page.render({
          canvasContext: ctx,
          viewport: viewport,
        }).promise;

        // Get the image data as base64
        pageImages.push(canvas.toDataURL('image/png'));
      }

      // Add new form to store
      addForm({
        id: Date.now().toString(),
        name: file.name,
        pages: pageImages,
        fields: [],
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert('Error processing PDF file');
    } finally {
      setIsLoading(false);
    }
  }, [addForm]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileUpload}
        disabled={isLoading}
        className="hidden"
        id="pdf-upload"
      />
      <label
        htmlFor="pdf-upload"
        className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 transition-colors"
      >
        {isLoading ? 'Processing...' : 'Upload PDF'}
      </label>
    </div>
  );
};