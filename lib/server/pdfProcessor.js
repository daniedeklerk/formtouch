import pdfjsLib from 'pdfjs-dist';
import { db } from './db.js';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.min.js';

export async function processPdfFile(filePath, formId) {
  try {
    console.log(`Processing PDF: ${filePath} for form ID: ${formId}`);
    
    // Import fs dynamically since we're using ES modules
    const fs = await import('fs');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the PDF file as Buffer and convert to Uint8Array properly
    const pdfBuffer = fs.readFileSync(filePath);
    
    // Convert Buffer to Uint8Array correctly for pdfjs-dist v3
    // Create a new Uint8Array with the same length as the buffer
    const pdfData = new Uint8Array(pdfBuffer.length);
    
    // Copy the buffer data into the Uint8Array
    for (let i = 0; i < pdfBuffer.length; i++) {
      pdfData[i] = pdfBuffer[i];
    }
    
    // Load the PDF document with enhanced options
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData, // Use Uint8Array directly for pdfjs-dist v3
      cMapUrl: 'pdfjs-dist/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'pdfjs-dist/standard_fonts/'
    });
    
    const pdf = await loadingTask.promise;
    
    console.log(`PDF loaded successfully with ${pdf.numPages} pages`);
    
    // Safely access PDF info with fallbacks
    const pdfInfo = pdf.info || {};
    console.log(`PDF info:`, {
      title: pdfInfo.Title || 'Untitled',
      author: pdfInfo.Author || 'Unknown',
      creator: pdfInfo.Creator || 'Unknown',
      pages: pdf.numPages
    });
    
    // Process each page with high-quality rendering
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        console.log(`Processing page ${pageNum} of ${pdf.numPages}`);
        
        const page = await pdf.getPage(pageNum);
        
        // Get page dimensions
        const viewport = page.getViewport({ scale: 1.0 });
        console.log(`Page ${pageNum} dimensions: ${viewport.width} x ${viewport.height} points`);
        
        // Calculate high-quality scale (300 DPI equivalent)
        // Standard PDF is 72 DPI, so scale = 300 / 72 ≈ 4.17
        const scale = Math.min(4.0, Math.max(2.0, 300 / 72)); // Cap at 4.0 for performance
        const highQualityViewport = page.getViewport({ scale });
        
        console.log(`Rendering page ${pageNum} at ${scale}x scale (${Math.round(scale * 72)} DPI)`);
        console.log(`Output dimensions: ${Math.round(highQualityViewport.width)} x ${Math.round(highQualityViewport.height)} pixels`);
        
        // Import canvas dynamically
        const { createCanvas } = await import('canvas');
        const canvas = createCanvas(
          Math.round(highQualityViewport.width),
          Math.round(highQualityViewport.height)
        );
        
        const context = canvas.getContext('2d', {
          alpha: false, // No transparency for better quality
          willReadFrequently: false // Better performance for rendering
        });
        
        // Set white background
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Enable high-quality rendering settings
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.textBaseline = 'top';
        
        // Render PDF page to canvas with high quality
        const renderContext = {
          canvasContext: context,
          viewport: highQualityViewport,
          intent: 'print', // High-quality rendering intent
          enableWebGL: false, // Use CPU rendering for consistency
          renderInteractiveForms: true
        };
        
        await page.render(renderContext).promise;
        
        // Convert to high-quality PNG with compression settings
        const imageData = canvas.toBuffer('image/png', {
          compressionLevel: 6, // Balance between quality and size
          filters: canvas.PNG_ALL_FILTERS,
          resolution: 300 // DPI metadata
        }).toString('base64');
        
        console.log(`Page ${pageNum} rendered successfully, image size: ${Math.round(imageData.length / 1024)}KB`);
        
        // Save page to database
        await db.createFormPage(formId, pageNum, imageData);
        
        console.log(`✅ Saved page ${pageNum} to database for form ID: ${formId}`);
        
      } catch (pageError) {
        console.error(`❌ Error processing page ${pageNum}:`, pageError);
        // Continue with other pages even if one fails
      }
    }
    
    console.log(`🎉 Successfully processed all ${pdf.numPages} pages from PDF: ${filePath}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Fatal error processing PDF ${filePath}:`, error);
    return false;
  }
}
