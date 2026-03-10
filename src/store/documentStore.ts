import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Document = Database['public']['Tables']['documents']['Row'];

interface DocumentState {
    documents: Document[];
    loading: boolean;
    error: string | null;
    fetchDocuments: (workspaceId: string) => Promise<void>;
    createDocument: (doc: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<Document | null>;
    updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
    deleteDocument: (id: string) => Promise<void>;
    uploadImage: (file: File) => Promise<string | null>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
    documents: [],
    loading: false,
    error: null,

    fetchDocuments: async (workspaceId: string) => {
        set({ loading: true, error: null });
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('updated_at', { ascending: false });

        if (error) {
            set({ error: error.message, loading: false });
        } else {
            set({ documents: data || [], loading: false });
        }
    },

    createDocument: async (doc) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('documents')
            .insert({ ...doc, created_by: user.id })
            .select()
            .single();

        if (error) {
            set({ error: error.message });
            return null;
        }

        if (data) {
            set({ documents: [data, ...get().documents] });
        }
        return data;
    },

    updateDocument: async (id, updates) => {
        const { error } = await supabase
            .from('documents')
            .update(updates)
            .eq('id', id);

        if (error) {
            set({ error: error.message });
        } else {
            set({
                documents: get().documents.map(doc => doc.id === id ? { ...doc, ...updates } : doc)
            });
        }
    },

    deleteDocument: async (id) => {
        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id);

        if (error) {
            set({ error: error.message });
        } else {
            set({
                documents: get().documents.filter(doc => doc.id !== id)
            });
        }
    },

    uploadImage: async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `documents/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('document-images')
            .upload(filePath, file);

        if (uploadError) {
            set({ error: uploadError.message });
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('document-images')
            .getPublicUrl(filePath);

        return publicUrl;
    }
}));
