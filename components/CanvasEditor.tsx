import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image, Rect, Text } from 'react-konva';
import { useFormStore } from '@/lib/store';

interface CanvasEditorProps {
  formId: string;
}

export const CanvasEditor = ({ formId }: CanvasEditorProps) => {
  const stageRef = useRef(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [scale, setScale] = useState(0); // Start with 0 scale, will be set by fitToContainer
  const { forms, updateForm, addFormField } = useFormStore();
  const form = forms.find((f) => f.id.toString() === formId);
  const [selectedField, setSelectedField] = useState<number | null>(null);
  const [stageDimensions, setStageDimensions] = useState({ width: 794, height: 1123 }); // Will be updated based on orientation
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // A4 dimensions in pixels at 96 DPI for screen-friendly size while maintaining quality
  const A4_PORTRAIT = { width: 794, height: 1123 }; // 96 DPI (screen standard)
  const A4_LANDSCAPE = { width: 1123, height: 794 }; // 96 DPI (screen standard)

  // Function to detect page orientation from image dimensions
  const detectOrientation = (width: number, height: number): 'portrait' | 'landscape' => {
    const aspectRatio = width / height;
    // If width > height, it's landscape, otherwise portrait
    return aspectRatio > 1 ? 'landscape' : 'portrait';
  };

  // Get current A4 dimensions based on orientation
  const getCurrentA4Dimensions = () => {
    return pageOrientation === 'landscape' ? A4_LANDSCAPE : A4_PORTRAIT;
  };

  // Handle zoom in/out
  const handleZoom = (delta: number) => {
    setScale(s => {
      const newScale = s + delta;
      // Allow zoom from 10% to 500%
      return Math.min(Math.max(0.1, newScale), 5);
    });
  };

  // Fit to container function
  const fitToContainer = () => {
    if (!containerRef.current || images.length === 0 || currentPage >= images.length) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width - 40; // Account for padding
    const containerHeight = containerRect.height - 40; // Account for padding
    
    const currentA4Dimensions = getCurrentA4Dimensions();
    const scaleX = containerWidth / currentA4Dimensions.width;
    const scaleY = containerHeight / currentA4Dimensions.height;
    
    // Use the smaller scale to ensure the entire image fits without scrolling
    const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
    setScale(fitScale);
    
    console.log(`CanvasEditor: Fit to container - Container: ${containerWidth}x${containerHeight}, A4 (${pageOrientation}): ${currentA4Dimensions.width}x${currentA4Dimensions.height}, Scale: ${fitScale.toFixed(2)}`);
  };

  // Setup resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create resize observer to handle container size changes
    resizeObserverRef.current = new ResizeObserver(() => {
      if (images.length > 0) {
        fitToContainer();
      }
    });
    
    resizeObserverRef.current.observe(containerRef.current);
    
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [images, currentPage]);

  useEffect(() => {
    if (!form) return;
    
    console.log('CanvasEditor: Loading images for form:', form.id);
    console.log('CanvasEditor: Pages data:', form.pages);
    console.log('CanvasEditor: Page metadata:', form.pageMetadata);
    
    const loadImages = async () => {
      const loadedImages = await Promise.all(
        form.pages.map((pageUrl, index) => {
          console.log(`CanvasEditor: Loading page ${index + 1}:`, pageUrl);
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new window.Image();
            img.src = pageUrl;
            img.onload = () => {
              console.log(`CanvasEditor: Successfully loaded page ${index + 1}`);
              console.log(`CanvasEditor: Image dimensions: ${img.width}x${img.height}`);
              resolve(img);
            };
            img.onerror = (error) => {
              console.error(`CanvasEditor: Failed to load page ${index + 1}:`, error);
              console.error(`CanvasEditor: Failed URL:`, pageUrl);
              reject(error);
            };
          });
        })
      );
      console.log('CanvasEditor: All images loaded:', loadedImages.length);
      setImages(loadedImages);
      
      // Update stage dimensions based on the first page's rendered image
      if (loadedImages.length > 0) {
        const firstImage = loadedImages[0];
        console.log('CanvasEditor: First image dimensions:', { width: firstImage.width, height: firstImage.height });
        
        // Detect orientation from the first image
        const detectedOrientation = detectOrientation(firstImage.width, firstImage.height);
        setPageOrientation(detectedOrientation);
        
        const currentA4Dimensions = detectedOrientation === 'landscape' ? A4_LANDSCAPE : A4_PORTRAIT;
        
        // Use A4 dimensions at 96 DPI based on detected orientation (screen-friendly)
        setStageDimensions({
          width: currentA4Dimensions.width,
          height: currentA4Dimensions.height
        });
        
        console.log(`CanvasEditor: Stage dimensions set to A4 ${detectedOrientation}: ${currentA4Dimensions.width}x${currentA4Dimensions.height} pixels (96 DPI - screen friendly)`);
        
        // Auto-fit to container immediately to ensure it fits the viewport
        setTimeout(() => {
          fitToContainer();
        }, 50);
      } else {
        // Ultimate fallback
        setStageDimensions({ width: 794, height: 1123 });
        setPageOrientation('portrait');
        console.log('CanvasEditor: No images found, using A4 portrait fallback dimensions');
      }
    };

    loadImages().catch(error => {
      console.error('CanvasEditor: Error loading images:', error);
    });
  }, [form]);

  // Update stage dimensions when page changes
  useEffect(() => {
    if (images.length > 0 && currentPage < images.length && form) {
      const currentImage = images[currentPage];
      console.log(`CanvasEditor: Switching to page ${currentPage + 1}, image dimensions:`, { width: currentImage.width, height: currentImage.height });
      
      // Detect orientation for the current page
      const detectedOrientation = detectOrientation(currentImage.width, currentImage.height);
      setPageOrientation(detectedOrientation);
      
      const currentA4Dimensions = detectedOrientation === 'landscape' ? A4_LANDSCAPE : A4_PORTRAIT;
      
      // Use A4 dimensions at 96 DPI based on detected orientation (screen-friendly)
      setStageDimensions({
        width: currentA4Dimensions.width,
        height: currentA4Dimensions.height
      });
      
      console.log(`CanvasEditor: Stage dimensions updated to A4 ${detectedOrientation}: ${currentA4Dimensions.width}x${currentA4Dimensions.height} pixels (96 DPI - screen friendly)`);
      
      // Re-fit to container for the new page to ensure it fits the viewport
      setTimeout(() => {
        fitToContainer();
      }, 50);
    }
  }, [currentPage, images, form]);

  const handleFieldDragEnd = (e: { target: { x: () => number; y: () => number } }, fieldId: number) => {
    if (!form) return;
    
    const updatedFields = form.fields.map((field) => {
      if (field.id === fieldId) {
        return {
          ...field,
          page_number: currentPage,
          x: e.target.x(),
          y: e.target.y(),
        };
      }
      return field;
    });

    updateForm(Number(formId), { fields: updatedFields });
  };

  if (!form) {
    console.log('CanvasEditor: No form provided');
    return <div className="text-center p-4">No form selected</div>;
  }

  console.log('CanvasEditor: Rendering form', form.id, 'with', images.length, 'images loaded');

  if (images.length === 0) {
    return (
      <div className="text-center p-4">
        <div>Loading images...</div>
        <div className="text-sm text-gray-500">Form: {form.name}</div>
        <div className="text-sm text-gray-500">Pages: {form.pages.length}</div>
      </div>
    );
  }

  const currentImage = images[currentPage];

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 bg-white border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Previous Page
          </button>
          <span className="flex items-center">Page {currentPage + 1} of {images.length}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(images.length - 1, p + 1))}
            disabled={currentPage === images.length - 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Next Page
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(-0.1)}
            disabled={scale <= 0.1}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            -
          </button>
          <span className="min-w-[60px] text-center">{scale > 0 ? Math.round(scale * 100) : 'Fit'}%</span>
          <button
            onClick={() => handleZoom(0.1)}
            disabled={scale >= 5}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            +
          </button>
          <button
            onClick={fitToContainer}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Fit to Screen
          </button>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="bg-gray-50 rounded-lg shadow-inner flex-1"
        style={{ 
          width: '100%',
          height: '100%',
          minHeight: '600px',
          maxHeight: 'calc(100vh - 200px)', // Limit height to prevent excessive scrolling
          overflow: 'auto',
          padding: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          border: '1px solid #e5e7eb',
          boxSizing: 'border-box'
        }}
      >
        <Stage
          ref={stageRef}
          width={stageDimensions.width}
          height={stageDimensions.height}
          style={{ 
            transform: scale > 0 ? `scale(${scale})` : 'none',
            transformOrigin: 'center top',
            display: 'block',
            margin: '0 auto'
          }}
        >
          <Layer>
            {/* Scale the image to fit current A4 dimensions */}
            <Image
              image={currentImage}
              x={0}
              y={0}
              width={getCurrentA4Dimensions().width}
              height={getCurrentA4Dimensions().height}
            />
            {form.fields
              .filter((field) => field.page_number === currentPage)
              .map((field) => (
                <React.Fragment key={field.id}>
                  <Rect
                    x={field.x}
                    y={field.y}
                    width={field.width}
                    height={field.height}
                    fill="rgba(0, 0, 255, 0.1)"
                    stroke={selectedField === field.id ? '#00f' : '#999'}
                    strokeWidth={1}
                    draggable
                    onClick={() => setSelectedField(field.id)}
                    onDragEnd={(e) => handleFieldDragEnd(e, field.id)}
                  />
                  <Text
                    x={field.x}
                    y={field.y - 20}
                    text={field.label}
                    fontSize={12}
                    fill="#000"
                  />
                </React.Fragment>
              ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};
