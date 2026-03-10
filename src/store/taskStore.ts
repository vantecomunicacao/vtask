import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { addDays, addWeeks, addMonths, format } from 'date-fns';

type Task = Database['public']['Tables']['tasks']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type CustomStatus = Database['public']['Tables']['custom_statuses']['Row'];
type TaskCategory = Database['public']['Tables']['task_categories']['Row'];

export type TaskWithAssignee = Task & {
    assignee?: Profile | null,
    category?: TaskCategory | null
};

interface TaskState {
    tasks: TaskWithAssignee[];
    statuses: CustomStatus[];
    taskCategories: TaskCategory[];
    loading: boolean;
    error: string | null;
    fetchTasks: (projectId: string) => Promise<void>;
    fetchStatuses: (workspaceId: string) => Promise<void>;
    fetchCategories: (workspaceId: string) => Promise<void>;
    addStatus: (workspaceId: string, name: string, color: string) => Promise<void>;
    updateStatus: (id: string, updates: Partial<CustomStatus>) => Promise<void>;
    deleteStatus: (id: string) => Promise<void>;
    updateStatusPositions: (orderedIds: string[]) => Promise<void>;
    addCategory: (workspaceId: string, name: string, color: string) => Promise<void>;
    updateCategory: (id: string, updates: Partial<TaskCategory>) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    moveTask: (taskId: string, newStatusId: string | null, newPosition: number) => Promise<void>;
    updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
    toggleTaskCompletion: (taskId: string, isCompleted: boolean) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
    tasks: [],
    statuses: [],
    taskCategories: [],
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

    fetchCategories: async (workspaceId: string) => {
        const { data, error } = await supabase
            .from('task_categories')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            set({ taskCategories: data });
        }
    },

    addStatus: async (workspaceId: string, name: string, color: string) => {
        const { statuses } = get();
        const nextPosition = statuses.length > 0
            ? Math.max(...statuses.map(s => s.position)) + 1
            : 1;

        const { data, error } = await supabase
            .from('custom_statuses')
            .insert({
                workspace_id: workspaceId,
                name,
                color,
                position: nextPosition
            })
            .select()
            .single();

        if (error) throw error;
        if (data) {
            set({ statuses: [...statuses, data] });
        }
    },

    updateStatus: async (id: string, updates: Partial<CustomStatus>) => {
        const { error } = await supabase
            .from('custom_statuses')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        set({
            statuses: get().statuses.map(s => s.id === id ? { ...s, ...updates } : s)
        });
    },

    deleteStatus: async (id: string) => {
        const { error } = await supabase
            .from('custom_statuses')
            .delete()
            .eq('id', id);

        if (error) throw error;
        set({
            statuses: get().statuses.filter(s => s.id !== id)
        });
    },

    updateStatusPositions: async (orderedIds: string[]) => {
        // Update local state first for instant feedback
        const updatedStatuses = [...get().statuses].sort((a, b) => {
            const indexA = orderedIds.indexOf(a.id);
            const indexB = orderedIds.indexOf(b.id);
            return indexA - indexB;
        }).map((s, idx) => ({ ...s, position: idx + 1 }));

        set({ statuses: updatedStatuses });

        // Update DB in parallel
        const promises = orderedIds.map((id, index) =>
            supabase
                .from('custom_statuses')
                .update({ position: index + 1 })
                .eq('id', id)
        );

        const results = await Promise.all(promises);
        const firstError = results.find(r => r.error);
        if (firstError) throw firstError.error;
    },

    addCategory: async (workspaceId: string, name: string, color: string) => {
        const { data, error } = await supabase
            .from('task_categories')
            .insert({
                workspace_id: workspaceId,
                name,
                color
            })
            .select()
            .single();

        if (error) throw error;
        if (data) {
            set({ taskCategories: [...get().taskCategories, data] });
        }
    },

    updateCategory: async (id: string, updates: Partial<TaskCategory>) => {
        const { error } = await supabase
            .from('task_categories')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        set({
            taskCategories: get().taskCategories.map(c => c.id === id ? { ...c, ...updates } : c)
        });
    },

    deleteCategory: async (id: string) => {
        const { error } = await supabase
            .from('task_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
        set({
            taskCategories: get().taskCategories.filter(c => c.id !== id)
        });
    },

    fetchTasks: async (projectId: string) => {
        set({ loading: true, error: null });

        const { data, error } = await supabase
            .from('tasks')
            .select(`
        *,
        assignee:profiles(*),
        category:task_categories(*)
      `)
            .eq('project_id', projectId)
            .order('position', { ascending: true });

        if (error) {
            set({ loading: false, error: error.message });
            return;
        }

        set({ tasks: (data as TaskWithAssignee[]) || [], loading: false });
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

    updateTask: async (taskId: string, updates: Partial<Task>) => {
        // Optimistic update
        const previousTasks = [...get().tasks];
        set({
            tasks: get().tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
        });

        const { error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', taskId);

        if (error) {
            set({ tasks: previousTasks, error: error.message });
            throw error;
        }
    },

    toggleTaskCompletion: async (taskId: string, isCompleted: boolean) => {
        const { statuses, tasks } = get();
        if (statuses.length === 0) return;

        // Último status = "Entregue/Concluído", primeiro = "A fazer"
        const doneStatus = statuses[statuses.length - 1];
        const todoStatus = statuses[0];

        const targetStatusId = isCompleted ? doneStatus.id : todoStatus.id;

        // Lógica de Recorrência
        if (isCompleted) {
            const task = tasks.find(t => t.id === taskId);
            if (task && task.recurrence && task.recurrence !== 'none' && task.due_date) {
                const currentDate = new Date(task.due_date);
                let nextDate: Date;

                switch (task.recurrence) {
                    case 'daily':
                        nextDate = addDays(currentDate, 1);
                        break;
                    case 'weekly':
                        nextDate = addWeeks(currentDate, 1);
                        break;
                    case 'monthly':
                        nextDate = addMonths(currentDate, 1);
                        break;
                    default:
                        nextDate = currentDate;
                }

                // Criar nova tarefa para o próximo período
                const { error: insertError } = await supabase.from('tasks').insert({
                    project_id: task.project_id,
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    status_id: todoStatus.id, // Volta para o início
                    assignee_id: task.assignee_id,
                    due_date: format(nextDate, 'yyyy-MM-dd'),
                    recurrence: task.recurrence,
                    position: 0
                });

                if (insertError) {
                    console.error('Erro ao criar tarefa recorrente:', insertError);
                } else {
                    // Recarregar tarefas para mostrar a nova
                    await get().fetchTasks(task.project_id);
                }
            }
        }

        await get().moveTask(taskId, targetStatusId, 0);
    },
}));
