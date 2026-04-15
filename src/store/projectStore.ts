import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Project = Database['public']['Tables']['projects']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

export type ProjectWithClient = Project & { client?: Client | null };

interface ProjectState {
    projects: ProjectWithClient[];
    loading: boolean;
    error: string | null;
    fetchProjects: (workspaceId: string) => Promise<void>;
    updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    archiveProject: (id: string) => Promise<void>;
    completeProject: (id: string) => Promise<void>;
    reactivateProject: (id: string) => Promise<void>;
    moveToFolder: (projectId: string, folderId: string | null) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
    projects: [],
    loading: false,
    error: null,

    fetchProjects: async (workspaceId: string) => {
        set({ loading: true, error: null });

        const { data, error } = await supabase
            .from('projects')
            .select(`
        *,
        client:clients(*)
      `)
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

        if (error) {
            set({ loading: false, error: error.message });
            return;
        }

        set({ projects: (data as ProjectWithClient[]) || [], loading: false });
    },

    updateProject: async (id, updates) => {
        set({ loading: true, error: null });
        const { error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', id);

        if (error) {
            set({ loading: false, error: error.message });
            throw error;
        }

        // We don't need to re-fetch everything, just update the local state if we want, 
        // but for safety and client relationships, re-fetching is easier for now.
        // The component will likely call fetchProjects anyway or we can manually update:
        set(state => ({
            projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p),
            loading: false
        }));
    },

    archiveProject: async (id) => {
        const store = useProjectStore.getState();
        await store.updateProject(id, { status: 'archived' });
    },

    completeProject: async (id) => {
        const store = useProjectStore.getState();
        await store.updateProject(id, { status: 'completed' });
    },

    reactivateProject: async (id) => {
        const store = useProjectStore.getState();
        await store.updateProject(id, { status: 'active' });
    },

    moveToFolder: async (projectId, folderId) => {
        const store = useProjectStore.getState();
        await store.updateProject(projectId, { folder_id: folderId });
    },

    deleteProject: async (id) => {
        set({ loading: true, error: null });
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) {
            set({ loading: false, error: error.message });
            throw error;
        }

        set(state => ({
            projects: state.projects.filter(p => p.id !== id),
            loading: false
        }));
    },
}));
