'use client';

import { useEffect, useState } from 'react';
import { CanvasEditor } from '@/components/CanvasEditor';
import { PDFUploader } from '@/components/PDFUploader';
import { useFormStore } from '@/lib/store';
import { registerServiceWorker } from '@/lib/registerSW';

export default function Home() {
  const { mode, setMode, forms, searchForms } = useFormStore();
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    // Register service worker
    registerServiceWorker();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow w-full">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
          <h1 className="text-2xl font-bold text-gray-900">FormTouch</h1>
          <div className="flex items-center gap-4 flex-wrap">
            {isOffline && (
              <span className="text-red-500 text-sm">Offline Mode</span>
            )}
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'admin' | 'assessor')}
              className="px-3 py-2 border rounded text-sm"
            >
              <option value="admin">Admin Mode</option>
              <option value="assessor">Assessor Mode</option>
            </select>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6 w-full">
        {/* Two columns at the top */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left column - PDFUploader */}
          <div className="bg-white p-4 rounded shadow">
            {mode === 'admin' && <PDFUploader />}
          </div>
          
          {/* Right column - Forms list */}
          <div className="bg-white p-4 rounded shadow h-fit max-h-[400px] overflow-y-auto">
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Search templates..."
                  className="w-full px-3 py-2 border rounded text-sm"
                  onChange={(e) => searchForms(e.target.value)}
                />
              </div>
              
              <div>
                <h2 className="text-lg font-semibold mb-4">Forms</h2>
                <div className="space-y-2">
                  {forms.map((form) => (
                    <button
                      key={form.id}
                      onClick={() => setSelectedFormId(form.id.toString())}
                      className={`w-full text-left px-3 py-2 rounded flex items-center justify-between text-sm ${
                        selectedFormId === form.id.toString()
                          ? 'bg-blue-500 text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <span className="truncate max-w-[70%]">{form.name}</span>
                      {form.isNew && (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded whitespace-nowrap">
                          Updated
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas and stage in full width below */}
        <div className="bg-white p-4 rounded shadow flex flex-col h-[calc(100vh-300px)]">
          {selectedFormId && forms.find((f) => f.id.toString() === selectedFormId) ? (
            <div className="flex-grow">
              <CanvasEditor formId={selectedFormId} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              {forms.length > 0
                ? 'Select a form to edit'
                : mode === 'admin'
                  ? 'Select a folder to watch for PDFs'
                  : 'No forms available'}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
