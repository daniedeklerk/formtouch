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
  const [scale, setScale] = useState(0.8);
  const { forms, updateForm, addFormField } = useFormStore();
  const form = forms.find((f) => f.id.toString() === formId);
  const [selectedField, setSelectedField] = useState<number | null>(null);

  // Handle zoom in/out
  const handleZoom = (delta: number) => {
    setScale(s => Math.min(Math.max(0.2, s + delta), 3));
  };

  useEffect(() => {
    if (!form) return;
    
    console.log('CanvasEditor: Loading images for form:', form.id);
    console.log('CanvasEditor: Pages data:', form.pages);
    
    const loadImages = async () => {
      const loadedImages = await Promise.all(
        form.pages.map((pageUrl, index) => {
          console.log(`CanvasEditor: Loading page ${index + 1}:`, pageUrl);
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new window.Image();
            img.src = pageUrl;
            img.onload = () => {
              console.log(`CanvasEditor: Successfully loaded page ${index + 1}`);
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
    };

    loadImages().catch(error => {
      console.error('CanvasEditor: Error loading images:', error);
    });
  }, [form]);

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
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
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
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            -
          </button>
          <span className="min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => handleZoom(0.1)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            +
          </button>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="bg-white rounded-lg shadow"
        style={{ 
          maxWidth: '100%',
          height: '800px',
          overflow: 'auto',
          padding: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start'
        }}
      >
        <Stage
          ref={stageRef}
          width={595}
          height={842}
          style={{ 
            transform: `scale(${scale})`,
            transformOrigin: 'center top'
          }}
        >
          <Layer>
            <Image
              image={currentImage}
              width={595}
              height={842}
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
