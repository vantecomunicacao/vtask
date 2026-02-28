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

        set({ projects: (data as any) || [], loading: false });
    },
}));
