import { create } from 'zustand';
import { FolderWatcher } from './services/FolderWatcher';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error('API request failed');
  }
  return response.json();
}

interface Form {
  id: number;
  name: string;
  folder_path: string;
  last_modified: Date;
  pages: string[];
  fields: FormField[];
  isNew?: boolean;
}

interface FormField {
  id: number;
  label: string;
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FormStore {
  mode: 'admin' | 'assessor';
  forms: Form[];
  selectedFolder: string | null;
  searchQuery: string;
  setMode: (mode: 'admin' | 'assessor') => void;
  setSelectedFolder: (path: string | null) => Promise<void>;
  loadForms: () => Promise<void>;
  searchForms: (query: string) => Promise<void>;
  updateForm: (formId: number, updates: Partial<Form>) => Promise<void>;
  addFormField: (formId: number, field: Omit<FormField, 'id'> & { form_id: number }) => Promise<void>;
  cleanup: () => Promise<void>;
}

export const useFormStore = create<FormStore>((set, get) => ({
  mode: 'admin',
  forms: [],
  selectedFolder: null,
  searchQuery: '',

  setMode: (mode) => set({ mode }),

  setSelectedFolder: async (path) => {
    // Clean up existing watcher if any
    await get().cleanup();

    if (!path) return;

    const watcher = FolderWatcher.getInstance();
    
    // Set up callbacks before starting the watcher
    watcher.setCallbacks(
      // Handle new forms
      async (form: Form) => {
        try {
          const { pages } = await fetchApi<{ pages: Array<{ image_data: string }> }>(
            `/api/forms/pages?formId=${form.id}`
          );
          const { fields } = await fetchApi<{ fields: FormField[] }>(
            `/api/forms/fields?formId=${form.id}`
          );
          
          const formWithDetails = {
            ...form,
            pages: pages.map((p: { image_data: string }) => `data:image/png;base64,${p.image_data}`),
            fields: fields,
            isNew: true
          };
          
          set((state) => {
            // Check if form already exists by ID
            const existingIndex = state.forms.findIndex((f) => f.id === form.id);
            if (existingIndex >= 0) {
              // Update existing form
              const updatedForms = [...state.forms];
              updatedForms[existingIndex] = formWithDetails;
              return { forms: updatedForms };
            } else {
              // Add new form
              return { forms: [...state.forms, formWithDetails] };
            }
          });
        } catch (error) {
          console.error('Error processing new form:', error);
        }
      },
      // Handle updated forms
      async (form: Form) => {
        try {
          const { pages } = await fetchApi<{ pages: Array<{ image_data: string }> }>(
            `/api/forms/pages?formId=${form.id}`
          );
          const { fields } = await fetchApi<{ fields: FormField[] }>(
            `/api/forms/fields?formId=${form.id}`
          );
          
          const formWithDetails = {
            ...form,
            pages: pages.map((p: { image_data: string }) => `data:image/png;base64,${p.image_data}`),
            fields: fields,
            isNew: true
          };
          
          set((state) => ({
            forms: state.forms.map((f) => 
              f.id === form.id ? formWithDetails : f
            )
          }));
        } catch (error) {
          console.error('Error processing updated form:', error);
        }
      }
    );

    try {
      await watcher.startWatching(path);
      set({ selectedFolder: path });
      await get().loadForms();
    } catch (error) {
      console.error('Error starting form watcher:', error);
      set({ selectedFolder: null });
    }
  },

  loadForms: async () => {
    try {
      const { forms } = await fetchApi<{ forms: Form[] }>('/api/forms');
      const formsWithDetails = await Promise.all(
        forms.map(async (form: Form) => {
          const { pages } = await fetchApi<{ pages: Array<{ image_data: string }> }>(
            `/api/forms/pages?formId=${form.id}`
          );
          const { fields } = await fetchApi<{ fields: FormField[] }>(
            `/api/forms/fields?formId=${form.id}`
          );
          
          return {
            ...form,
            pages: pages.map((p: { image_data: string }) => `data:image/png;base64,${p.image_data}`),
            fields: fields,
            isNew: new Date().getTime() - new Date(form.last_modified).getTime() < 24 * 60 * 60 * 1000
          };
        })
      );
      
      set({ forms: formsWithDetails });
    } catch (error) {
      console.error('Error loading forms:', error);
    }
  },

  searchForms: async (query: string) => {
    try {
      set({ searchQuery: query });
      const { forms } = await fetchApi<{ forms: Form[] }>(`/api/forms?query=${encodeURIComponent(query)}`);
      const formsWithDetails = await Promise.all(
        forms.map(async (form: Form) => {
          const { pages } = await fetchApi<{ pages: Array<{ image_data: string }> }>(
            `/api/forms/pages?formId=${form.id}`
          );
          const { fields } = await fetchApi<{ fields: FormField[] }>(
            `/api/forms/fields?formId=${form.id}`
          );
          
          return {
            ...form,
            pages: pages.map((p: { image_data: string }) => `data:image/png;base64,${p.image_data}`),
            fields: fields,
            isNew: new Date().getTime() - new Date(form.last_modified).getTime() < 24 * 60 * 60 * 1000
          };
        })
      );
      
      set({ forms: formsWithDetails });
    } catch (error) {
      console.error('Error searching forms:', error);
    }
  },

  updateForm: async (formId: number, updates: Partial<Form>) => {
    try {
      await fetchApi('/api/forms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: formId, updates })
      });
      await get().loadForms();
    } catch (error) {
      console.error('Error updating form:', error);
    }
  },

  addFormField: async (formId: number, field: Omit<FormField, 'id'> & { form_id: number }) => {
    try {
      await fetchApi('/api/forms/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId, field })
      });
      await get().loadForms();
    } catch (error) {
      console.error('Error adding form field:', error);
    }
  },

  cleanup: async () => {
    const watcher = FolderWatcher.getInstance();
    await watcher.stopWatching();
    set({ selectedFolder: null, forms: [] });
  },
}));
