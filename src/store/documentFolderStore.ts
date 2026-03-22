import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { Database } from '../lib/database.types';

export type DocumentFolder = Database['public']['Tables']['document_folders']['Row'];

interface DocumentFolderState {
    folders: DocumentFolder[];
    loading: boolean;
    error: string | null;
    fetchFolders: (workspaceId: string) => Promise<void>;
    createFolder: (name: string, workspaceId: string, parentId?: string | null) => Promise<DocumentFolder | null>;
    renameFolder: (id: string, name: string) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
}

export const useDocumentFolderStore = create<DocumentFolderState>((set, get) => ({
    folders: [],
    loading: false,
    error: null,

    fetchFolders: async (workspaceId) => {
        set({ loading: true, error: null });
        const { data, error } = await supabase
            .from('document_folders')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('name', { ascending: true });
        if (error) {
            set({ loading: false, error: error.message });
            toast.error('Erro ao carregar pastas');
            return;
        }
        set({ folders: data || [], loading: false });
    },

    createFolder: async (name, workspaceId, parentId = null) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('document_folders')
            .insert({ name, workspace_id: workspaceId, parent_id: parentId, created_by: user.id })
            .select()
            .single();

        if (error || !data) return null;
        set({ folders: [...get().folders, data].sort((a, b) => a.name.localeCompare(b.name)) });
        return data;
    },

    renameFolder: async (id, name) => {
        const { error } = await supabase
            .from('document_folders')
            .update({ name })
            .eq('id', id);

        if (!error) {
            set({ folders: get().folders.map(f => f.id === id ? { ...f, name } : f) });
        }
    },

    deleteFolder: async (id) => {
        const { error } = await supabase
            .from('document_folders')
            .delete()
            .eq('id', id);

        if (!error) {
            set({ folders: get().folders.filter(f => f.id !== id) });
        }
    },
}));
