import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Task = Database['public']['Tables']['tasks']['Row'];
type CustomStatus = Database['public']['Tables']['custom_statuses']['Row'];

interface TaskState {
    tasks: Task[];
    statuses: CustomStatus[];
    loading: boolean;
    error: string | null;
    fetchTasks: (projectId: string) => Promise<void>;
    fetchStatuses: (workspaceId: string) => Promise<void>;
    moveTask: (taskId: string, newStatusId: string | null, newPosition: number) => Promise<void>;
    toggleTaskCompletion: (taskId: string, isCompleted: boolean) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
    tasks: [],
    statuses: [],
    loading: false,
    error: null,

    fetchStatuses: async (workspaceId: string) => {
        const { data, error } = await supabase
            .from('custom_statuses')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('position', { ascending: true });

        if (!error && data) {
            set({ statuses: data });
        }
    },

    fetchTasks: async (projectId: string) => {
        set({ loading: true, error: null });

        const { data, error } = await supabase
            .from('tasks')
            .select(`
        *,
        assignee:profiles(*)
      `)
            .eq('project_id', projectId)
            .order('position', { ascending: true });

        if (error) {
            set({ loading: false, error: error.message });
            return;
        }

        set({ tasks: (data as any) || [], loading: false });
    },

    moveTask: async (taskId: string, newStatusId: string | null, newPosition: number) => {
        // Optimistic update
        const previousTasks = [...get().tasks];
        set({
            tasks: get().tasks.map(t =>
                t.id === taskId
                    ? { ...t, status_id: newStatusId, position: newPosition }
                    : t
            )
        });

        const { error } = await supabase
            .from('tasks')
            .update({ status_id: newStatusId, position: newPosition })
            .eq('id', taskId);

        if (error) {
            // Rollback on error
            set({ tasks: previousTasks, error: error.message });
        }
    },

    toggleTaskCompletion: async (taskId: string, isCompleted: boolean) => {
        // A simplificação aqui depende da estrutura de status.
        // Numa view list, finalizar tarefa pode significa move-la para um status_id específico de "Concluído".
        // Por agora, vamos permitir implementação UI futuramente.
    }
}));
