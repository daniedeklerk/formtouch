import pdfjsLib from 'pdfjs-dist';
import { db } from './db.js';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.min.js';

// Standard paper sizes in points (1/72 inch)
const PAPER_SIZES = {
  'A0': { width: 2384, height: 3370 },
  'A1': { width: 1684, height: 2384 },
  'A2': { width: 1191, height: 1684 },
  'A3': { width: 842, height: 1191 },
  'A4': { width: 595, height: 842 },
  'A5': { width: 420, height: 595 },
  'A6': { width: 298, height: 420 },
  'LETTER': { width: 612, height: 792 },
  'LEGAL': { width: 612, height: 1008 },
  'TABLOID': { width: 792, height: 1224 },
  'EXECUTIVE': { width: 522, height: 756 }
};

function detectPaperSize(width, height) {
  const tolerance = 10; // points tolerance for matching
  
  for (const [name, dimensions] of Object.entries(PAPER_SIZES)) {
    // Check both orientations
    if ((Math.abs(width - dimensions.width) < tolerance && Math.abs(height - dimensions.height) < tolerance) ||
        (Math.abs(width - dimensions.height) < tolerance && Math.abs(height - dimensions.width) < tolerance)) {
      return name;
    }
  }
  
  // Check if it's a custom size
  if (width > height) {
    return `CUSTOM_LANDSCAPE_${Math.round(width)}x${Math.round(height)}`;
  } else {
    return `CUSTOM_PORTRAIT_${Math.round(width)}x${Math.round(height)}`;
  }
}

function getOrientation(width, height) {
  return width > height ? 'landscape' : 'portrait';
}

function calculateOptimalScale(viewport, targetDPI = 300) {
  // Standard PDF is 72 DPI, calculate scale needed for target DPI
  const baseScale = targetDPI / 72;
  
  // For very large pages, reduce scale to prevent memory issues
  const maxPixels = 4000; // Maximum dimension in pixels
  const widthScale = maxPixels / viewport.width;
  const heightScale = maxPixels / viewport.height;
  const sizeLimitScale = Math.min(widthScale, heightScale);
  
  // Use the smaller of the two scales
  return Math.min(baseScale, sizeLimitScale);
}

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
    const pdfData = new Uint8Array(pdfBuffer.length);
    for (let i = 0; i < pdfBuffer.length; i++) {
      pdfData[i] = pdfBuffer[i];
    }
    
    // Load the PDF document with enhanced options
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      cMapUrl: 'pdfjs-dist/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'pdfjs-dist/standard_fonts/',
      disableRange: true, // Better for precise rendering
      disableStream: true
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
        
        // Get page dimensions at 1.0 scale (72 DPI)
        const originalViewport = page.getViewport({ scale: 1.0 });
        console.log(`Page ${pageNum} original dimensions: ${originalViewport.width} x ${originalViewport.height} points`);
        
        // Detect paper size and orientation
        const paperSize = detectPaperSize(originalViewport.width, originalViewport.height);
        const orientation = getOrientation(originalViewport.width, originalViewport.height);
        
        console.log(`Page ${pageNum} detected: ${paperSize} (${orientation})`);
        
        // Calculate optimal scale for high-quality rendering
        const scale = calculateOptimalScale(originalViewport, 300);
        const highQualityViewport = page.getViewport({ scale });
        
        console.log(`Rendering page ${pageNum} at ${scale.toFixed(2)}x scale (${Math.round(scale * 72)} DPI)`);
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
        context.textRenderingOptimization = 'optimizeQuality'; // Better text rendering
        
        // Render PDF page to canvas with high quality
        const renderContext = {
          canvasContext: context,
          viewport: highQualityViewport,
          intent: 'print', // High-quality rendering intent
          enableWebGL: false, // Use CPU rendering for consistency
          renderInteractiveForms: true,
          background: 'white' // Ensure white background
        };
        
        await page.render(renderContext).promise;
        
        // Convert to high-quality PNG with compression settings
        const imageData = canvas.toBuffer('image/png', {
          compressionLevel: 6, // Balance between quality and size
          filters: canvas.PNG_ALL_FILTERS,
          resolution: 300 // DPI metadata
        });
        
        console.log(`Page ${pageNum} rendered successfully, image size: ${Math.round(imageData.length / 1024)}KB`);
        
        // Store page metadata along with image data
        const pageMetadata = {
          original_width: Math.round(originalViewport.width),
          original_height: Math.round(originalViewport.height),
          rendered_width: Math.round(highQualityViewport.width),
          rendered_height: Math.round(highQualityViewport.height),
          paper_size: paperSize,
          orientation: orientation,
          scale: scale,
          dpi: Math.round(scale * 72)
        };
        
        // Save page to database with metadata
        await db.createFormPage(formId, pageNum, imageData, pageMetadata);
        
        console.log(`✅ Saved page ${pageNum} to database for form ID: ${formId}`);
        console.log(`📄 Metadata: ${JSON.stringify(pageMetadata)}`);
        
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
