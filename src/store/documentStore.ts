import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type Document = Database['public']['Tables']['documents']['Row'];

interface DocumentState {
    documents: Document[];
    loading: boolean;
    error: string | null;
    fetchDocuments: (workspaceId: string) => Promise<void>;
    createDocument: (doc: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'deleted_at'>) => Promise<Document | null>;
    createSubDocument: (parentId: string, workspaceId: string) => Promise<Document | null>;
    updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
    deleteDocument: (id: string) => Promise<void>;
    restoreDocument: (id: string) => Promise<void>;
    permanentDeleteDocument: (id: string) => Promise<void>;
    fetchTrashedDocuments: (workspaceId: string) => Promise<Document[]>;
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
            .is('deleted_at', null)
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

        if (error) { set({ error: error.message }); return null; }
        if (data) set({ documents: [data, ...get().documents] });
        return data;
    },

    createSubDocument: async (parentId, workspaceId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const parent = get().documents.find(d => d.id === parentId);

        const { data, error } = await supabase
            .from('documents')
            .insert({
                workspace_id: workspaceId,
                parent_id: parentId,
                project_id: parent?.project_id ?? null,
                folder_id: parent?.folder_id ?? null,
                title: 'Nova página',
                content: { type: 'doc', content: [] },
                created_by: user.id,
            })
            .select()
            .single();

        if (error) { set({ error: error.message }); return null; }
        if (data) set({ documents: [data, ...get().documents] });
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
            set({ documents: get().documents.map(doc => doc.id === id ? { ...doc, ...updates } : doc) });
        }
    },

    // Soft delete — move para a lixeira (e todos os filhos)
    deleteDocument: async (id) => {
        const now = new Date().toISOString();

        // Coleta o doc e todos os filhos recursivamente
        const toDelete: string[] = [];
        const collect = (parentId: string) => {
            toDelete.push(parentId);
            get().documents.filter(d => d.parent_id === parentId).forEach(d => collect(d.id));
        };
        collect(id);

        const { error } = await supabase
            .from('documents')
            .update({ deleted_at: now })
            .in('id', toDelete);

        if (error) {
            set({ error: error.message });
        } else {
            set({ documents: get().documents.filter(d => !toDelete.includes(d.id)) });
        }
    },

    restoreDocument: async (id) => {
        const { error } = await supabase
            .from('documents')
            .update({ deleted_at: null })
            .eq('id', id);

        if (error) set({ error: error.message });
    },

    permanentDeleteDocument: async (id) => {
        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id);

        if (error) set({ error: error.message });
    },

    fetchTrashedDocuments: async (workspaceId) => {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('workspace_id', workspaceId)
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false });

        if (error) { set({ error: error.message }); return []; }
        return data || [];
    },

    uploadImage: async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `documents/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('document-images')
            .upload(filePath, file);

        if (uploadError) { set({ error: uploadError.message }); return null; }

        const { data: { publicUrl } } = supabase.storage
            .from('document-images')
            .getPublicUrl(filePath);

        return publicUrl;
    },
}));
