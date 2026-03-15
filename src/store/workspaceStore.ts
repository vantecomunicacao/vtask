import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
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

        const session = useAuthStore.getState().session;
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

        let currentWorkspaceIds = members ? members.map(m => m.workspace_id) : [];

        if (currentWorkspaceIds.length === 0) {
            if (import.meta.env.DEV) console.log('No workspaces found, starting auto-creation flow...');

            // 1. Ensure profile exists first (Foreign Key requirement)
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', session.user.id)
                .single();

            if (profileError || !profile) {
                if (import.meta.env.DEV) console.log('Profile missing, creating profile...');
                const { error: insertProfileError } = await supabase
                    .from('profiles')
                    .insert({
                        id: session.user.id,
                        email: session.user.email!,
                        full_name: session.user.user_metadata?.full_name || 'Usuário',
                        avatar_url: session.user.user_metadata?.avatar_url
                    });

                if (insertProfileError) {
                    console.error('Error creating profile:', insertProfileError);
                    set({ loading: false, error: 'Erro ao criar perfil de usuário.' });
                    return;
                }
            }

            // 2. Create workspace
            const userName = session.user.user_metadata?.full_name || 'Meu';
            const { data: newWorkspace, error: createError } = await supabase
                .from('workspaces')
                .insert({ name: `${userName} Workspace` })
                .select()
                .single();

            if (createError || !newWorkspace) {
                console.error('Error creating workspace:', createError);
                set({ loading: false, error: 'Erro ao criar workspace padrão.' });
                return;
            }

            // 3. Create membership
            const { error: memberInsertError } = await supabase
                .from('workspace_members')
                .insert({
                    workspace_id: newWorkspace.id,
                    user_id: session.user.id,
                    role: 'admin'
                });

            if (memberInsertError) {
                console.error('Error creating workspace member:', memberInsertError);
                set({ loading: false, error: 'Erro ao vincular você ao workspace.' });
                return;
            }

            currentWorkspaceIds = [newWorkspace.id];
            if (import.meta.env.DEV) console.log('Workspace auto-created successfully:', newWorkspace.id);
        }

        const workspaceIds = currentWorkspaceIds;

        const { data: workspaces, error: wsError } = await supabase
            .from('workspaces')
            .select('*')
            .in('id', workspaceIds);

        if (wsError) {
            set({ loading: false, error: wsError.message });
            return;
        }

        // Always refresh activeWorkspace with latest data from DB
        set(state => ({
            workspaces: workspaces || [],
            activeWorkspace: workspaces?.find(w => w.id === state.activeWorkspace?.id) ?? workspaces?.[0] ?? null,
            loading: false
        }));
    },

    setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
}));
