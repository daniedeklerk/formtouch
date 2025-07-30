import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FormState {
  mode: 'admin' | 'assessor';
  forms: Array<{
    id: string;
    name: string;
    pages: string[];
    fields: Array<{
      id: string;
      type: string;
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
      label: string;
    }>;
  }>;
  setMode: (mode: 'admin' | 'assessor') => void;
  addForm: (form: any) => void;
  updateForm: (id: string, form: any) => void;
  deleteForm: (id: string) => void;
}

export const useFormStore = create<FormState>()(
  persist(
    (set) => ({
      mode: 'admin',
      forms: [],
      setMode: (mode) => set({ mode }),
      addForm: (form) => set((state) => ({ forms: [...state.forms, form] })),
      updateForm: (id, form) =>
        set((state) => ({
          forms: state.forms.map((f) => (f.id === id ? { ...f, ...form } : f)),
        })),
      deleteForm: (id) =>
        set((state) => ({
          forms: state.forms.filter((f) => f.id !== id),
        })),
    }),
    {
      name: 'form-storage',
    }
  )
);
