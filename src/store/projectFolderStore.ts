import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { Database } from '../lib/database.types';

export type ProjectFolder = Database['public']['Tables']['project_folders']['Row'];

interface ProjectFolderState {
    folders: ProjectFolder[];
    loading: boolean;
    fetchFolders: (workspaceId: string) => Promise<void>;
    createFolder: (name: string, workspaceId: string) => Promise<ProjectFolder | null>;
    renameFolder: (id: string, name: string) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
}

export const useProjectFolderStore = create<ProjectFolderState>((set, get) => ({
    folders: [],
    loading: false,

    fetchFolders: async (workspaceId) => {
        set({ loading: true });
        const { data, error } = await supabase
            .from('project_folders')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('position', { ascending: true });

        if (error) {
            toast.error('Erro ao carregar pastas de projetos');
            set({ loading: false });
            return;
        }
        set({ folders: data || [], loading: false });
    },

    createFolder: async (name, workspaceId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const position = get().folders.length;
        const { data, error } = await supabase
            .from('project_folders')
            .insert({ name, workspace_id: workspaceId, position, created_by: user.id })
            .select()
            .single();

        if (error || !data) {
            toast.error('Erro ao criar pasta');
            return null;
        }
        set({ folders: [...get().folders, data] });
        return data;
    },

    renameFolder: async (id, name) => {
        const { error } = await supabase
            .from('project_folders')
            .update({ name })
            .eq('id', id);

        if (!error) {
            set({ folders: get().folders.map(f => f.id === id ? { ...f, name } : f) });
        }
    },

    deleteFolder: async (id) => {
        // Projects inside folder get folder_id = null via ON DELETE SET NULL no banco
        const { error } = await supabase
            .from('project_folders')
            .delete()
            .eq('id', id);

        if (!error) {
            set({ folders: get().folders.filter(f => f.id !== id) });
        }
    },
}));
