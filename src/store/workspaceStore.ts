import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Workspace = Database['public']['Tables']['workspaces']['Row'];

interface WorkspaceState {
    workspaces: Workspace[];
    activeWorkspace: Workspace | null;
    loading: boolean;
    error: string | null;
    fetchWorkspaces: () => Promise<void>;
    setActiveWorkspace: (workspace: Workspace) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
    workspaces: [],
    activeWorkspace: null,
    loading: false,
    error: null,

    fetchWorkspaces: async () => {
        set({ loading: true, error: null });

        // Auth must be loaded before calling this
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            set({ loading: false, error: 'User not authenticated' });
            return;
        }

        // Get workspaces user is member of
        const { data: members, error: memberError } = await supabase
            .from('workspace_members')
            .select('workspace_id')
            .eq('user_id', session.user.id);

        if (memberError) {
            set({ loading: false, error: memberError.message });
            return;
        }

        if (!members || members.length === 0) {
            set({ loading: false, workspaces: [] });
            return;
        }

        const workspaceIds = members.map(m => m.workspace_id);

        const { data: workspaces, error: wsError } = await supabase
            .from('workspaces')
            .select('*')
            .in('id', workspaceIds);

        if (wsError) {
            set({ loading: false, error: wsError.message });
            return;
        }

        // Set first workspace as active by default if none selected
        set(state => ({
            workspaces: workspaces || [],
            activeWorkspace: state.activeWorkspace || (workspaces?.[0] ?? null),
            loading: false
        }));
    },

    setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
}));
