import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { addDays, addWeeks, addMonths, format } from 'date-fns';
import { parseDueDate, todayLocalISO } from '../lib/dateUtils';
import { createNotification } from './notificationStore';
import { useWorkspaceStore } from './workspaceStore';
import { UpdateTaskSchema } from '../lib/validation';

async function withRetry<T>(fn: () => Promise<{ data: T | null; error: unknown }>, maxAttempts = 3): Promise<{ data: T | null; error: unknown }> {
    let attempt = 0;
    let last: { data: T | null; error: unknown } = { data: null, error: null };
    while (attempt < maxAttempts) {
        last = await fn();
        if (!last.error) return last;
        attempt++;
        if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 500 * 2 ** (attempt - 1)));
    }
    return last;
}

type Task = Database['public']['Tables']['tasks']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
export type CustomStatus = Database['public']['Tables']['custom_statuses']['Row'];
type TaskCategory = Database['public']['Tables']['task_categories']['Row'];

export type TaskWithAssignee = Task & {
    assignee?: Profile | null,
    category?: TaskCategory | null,
    project?: { id: string; name: string; color: string | null } | null;
    comments_count?: number;
};

const CACHE_TTL_MS = 30_000;

// Module-level channel ref — kept outside Zustand so it doesn't trigger re-renders
let _realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

// Debounced batch fetcher for realtime events — prevents N+1 queries on burst updates
const _pendingUpserts = new Set<string>();
const _pendingDeletes = new Set<string>();
let _batchTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRealtimeBatch(store: () => { tasks: TaskWithAssignee[]; set: (s: Partial<{ tasks: TaskWithAssignee[] }>) => void }) {
    if (_batchTimer) clearTimeout(_batchTimer);
    _batchTimer = setTimeout(async () => {
        _batchTimer = null;
        const upsertIds = Array.from(_pendingUpserts);
        const deleteIds = Array.from(_pendingDeletes);
        _pendingUpserts.clear();
        _pendingDeletes.clear();

        const { tasks, set } = store();

        // Handle deletes first
        if (deleteIds.length > 0) {
            set({ tasks: tasks.filter(t => !deleteIds.includes(t.id)) });
        }

        // Batch fetch all upserts in a single query
        if (upsertIds.length > 0) {
            const { data } = await supabase
                .from('tasks')
                .select(TASK_JOIN)
                .in('id', upsertIds)
                .is('deleted_at', null);
            if (data) {
                const fetched = data as TaskWithAssignee[];
                const fetchedIds = new Set(fetched.map(t => t.id));
                const { tasks: currentTasks } = store();
                set({
                    tasks: [
                        ...currentTasks.filter(t => !fetchedIds.has(t.id)),
                        ...fetched,
                    ],
                });
            }
        }
    }, 300);
}

const TASK_JOIN = '*, project:projects(id, name, color), assignee:profiles(*), category:task_categories(id, name, color)';

const PAGE_SIZE = 150;

interface TaskState {
    tasks: TaskWithAssignee[];
    statuses: CustomStatus[];
    taskCategories: TaskCategory[];
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    error: string | null;
    tasksCache: { workspaceId: string; at: number } | null;
    autoMovedCount: number;
    fetchTasks: (projectId: string) => Promise<void>;
    fetchStatuses: (workspaceId: string) => Promise<void>;
    fetchCategories: (workspaceId: string) => Promise<void>;
    fetchWorkspaceTasks: (workspaceId: string, force?: boolean) => Promise<void>;
    fetchMoreTasks: (workspaceId: string) => Promise<void>;
    autoMovePastDueTasks: () => Promise<void>;
    invalidateTasksCache: () => void;
    addStatus: (workspaceId: string, name: string, color: string) => Promise<void>;
    updateStatus: (id: string, updates: Partial<CustomStatus>) => Promise<void>;
    deleteStatus: (id: string) => Promise<void>;
    updateStatusPositions: (orderedIds: string[]) => Promise<void>;
    addCategory: (workspaceId: string, name: string, color: string) => Promise<void>;
    updateCategory: (id: string, updates: Partial<TaskCategory>) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    moveTask: (taskId: string, newStatusId: string | null, newPosition: number) => Promise<void>;
    updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
    restoreTask: (taskId: string) => Promise<void>;
    permanentDeleteTask: (taskId: string) => Promise<void>;
    fetchTrashedTasks: (workspaceId: string) => Promise<TaskWithAssignee[]>;
    toggleTaskCompletion: (taskId: string, isCompleted: boolean) => Promise<void>;
    subscribeToWorkspace: (workspaceId: string) => () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
    tasks: [],
    statuses: [],
    taskCategories: [],
    loading: false,
    loadingMore: false,
    hasMore: false,
    error: null,
    tasksCache: null,
    autoMovedCount: 0,

    invalidateTasksCache: () => set({ tasksCache: null }),

    fetchStatuses: async (workspaceId: string) => {
        const { data, error } = await withRetry(async () => supabase
            .from('custom_statuses')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('position', { ascending: true })
        );
        if (!error && data) set({ statuses: data });
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

        // Update DB in a single upsert
        const { error } = await supabase
            .from('custom_statuses')
            .upsert(orderedIds.map((id, index) => ({ id, position: index + 1 })));

        if (error) throw error;
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
            .is('deleted_at', null)
            .order('position', { ascending: true });

        if (error) {
            set({ loading: false, error: error.message });
            return;
        }

        set({ tasks: (data as TaskWithAssignee[]) || [], loading: false });
    },

    fetchWorkspaceTasks: async (workspaceId: string, force = false) => {
        const { tasksCache } = get();
        if (!force && tasksCache?.workspaceId === workspaceId && Date.now() - tasksCache.at < CACHE_TTL_MS) {
            return; // serve from cache
        }

        set({ loading: true, error: null });

        const { data: projects } = await supabase
            .from('projects')
            .select('id')
            .eq('workspace_id', workspaceId);

        const projectIds = projects?.map(p => p.id) || [];

        if (projectIds.length === 0) {
            set({ tasks: [], loading: false, tasksCache: { workspaceId, at: Date.now() } });
            return;
        }

        const run = () => supabase
            .from('tasks')
            .select(`
                *,
                project:projects(id, name, color),
                assignee:profiles(*),
                category:task_categories(id, name, color)
            `)
            .in('project_id', projectIds)
            .is('deleted_at', null)
            .order('due_date', { ascending: true, nullsFirst: false })
            .range(0, PAGE_SIZE - 1);

        let { data, error } = await run();
        if (error) {
            await new Promise(r => setTimeout(r, 1000));
            ({ data, error } = await run());
        }

        if (error) {
            set({ loading: false, error: error.message });
            return;
        }

        const loadedTasks = (data as TaskWithAssignee[]) || [];
        set({
            tasks: loadedTasks,
            loading: false,
            hasMore: loadedTasks.length === PAGE_SIZE,
            tasksCache: { workspaceId, at: Date.now() },
        });
    },

    fetchMoreTasks: async (workspaceId: string) => {
        const { tasks, hasMore, loadingMore } = get();
        if (!hasMore || loadingMore) return;

        set({ loadingMore: true });

        const { data: projects } = await supabase
            .from('projects')
            .select('id')
            .eq('workspace_id', workspaceId);

        const projectIds = projects?.map(p => p.id) ?? [];
        if (projectIds.length === 0) { set({ loadingMore: false }); return; }

        const offset = tasks.length;
        const { data, error } = await supabase
            .from('tasks')
            .select(`
                *,
                project:projects(id, name, color),
                assignee:profiles(*),
                category:task_categories(id, name, color)
            `)
            .in('project_id', projectIds)
            .is('deleted_at', null)
            .order('due_date', { ascending: true, nullsFirst: false })
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) { set({ loadingMore: false, error: error.message }); return; }

        const newTasks = (data as TaskWithAssignee[]) || [];
        set({
            tasks: [...tasks, ...newTasks],
            loadingMore: false,
            hasMore: newTasks.length === PAGE_SIZE,
        });
    },

    autoMovePastDueTasks: async () => {
        const { tasks, statuses } = get();
        if (tasks.length === 0 || statuses.length === 0) return;

        const firstStatus = statuses[0];
        const doneStatus = statuses[statuses.length - 1];
        const today = todayLocalISO();

        const idsToMove = tasks
            .filter(t =>
                t.due_date != null &&
                t.due_date.substring(0, 10) <= today &&
                t.status_id !== firstStatus.id &&
                t.status_id !== doneStatus.id
            )
            .map(t => t.id);

        if (idsToMove.length === 0) {
            set({ autoMovedCount: 0 });
            return;
        }

        const { error: moveError } = await supabase
            .from('tasks')
            .update({ status_id: firstStatus.id })
            .in('id', idsToMove);

        if (!moveError) {
            set({
                autoMovedCount: idsToMove.length,
                tasks: get().tasks.map(t =>
                    idsToMove.includes(t.id) ? { ...t, status_id: firstStatus.id } : t
                ),
            });
        }
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
        const validated = UpdateTaskSchema.parse(updates);
        const previousTasks = [...get().tasks];
        const previousTask = get().tasks.find(t => t.id === taskId);

        // Optimistic update
        set({
            tasks: get().tasks.map(t => t.id === taskId ? { ...t, ...validated } : t)
        });

        const { error } = await supabase
            .from('tasks')
            .update(validated)
            .eq('id', taskId);

        if (error) {
            set({ tasks: previousTasks, error: error.message });
            throw error;
        }

        // Notificar quando o responsável muda
        if (
            updates.assignee_id !== undefined &&
            updates.assignee_id !== null &&
            updates.assignee_id !== previousTask?.assignee_id
        ) {
            const workspaceId = useWorkspaceStore.getState().activeWorkspace?.id;
            const { data: { user } } = await supabase.auth.getUser();
            if (workspaceId && user) {
                await createNotification({
                    workspace_id: workspaceId,
                    user_id: updates.assignee_id,
                    actor_id: user.id,
                    type: 'task_assigned',
                    task_id: taskId,
                    task_title: previousTask?.title ?? '',
                });
            }
        }
    },

    deleteTask: async (taskId: string) => {
        const now = new Date().toISOString();
        const { error } = await supabase
            .from('tasks')
            .update({ deleted_at: now })
            .eq('id', taskId);

        if (error) {
            set({ error: error.message });
        } else {
            set({ tasks: get().tasks.filter(t => t.id !== taskId) });
        }
    },

    restoreTask: async (taskId: string) => {
        const { error } = await supabase
            .from('tasks')
            .update({ deleted_at: null })
            .eq('id', taskId);

        if (error) set({ error: error.message });
    },

    permanentDeleteTask: async (taskId: string) => {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) set({ error: error.message });
    },

    fetchTrashedTasks: async (workspaceId: string) => {
        const { data: projects } = await supabase
            .from('projects')
            .select('id')
            .eq('workspace_id', workspaceId);

        const projectIds = projects?.map(p => p.id) || [];
        if (projectIds.length === 0) return [];

        const { data, error } = await supabase
            .from('tasks')
            .select('*, project:projects(id, name, color), assignee:profiles(*)')
            .in('project_id', projectIds)
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false });

        if (error) { set({ error: error.message }); return []; }
        return (data as TaskWithAssignee[]) || [];
    },

    subscribeToWorkspace: (workspaceId: string) => {
        // Tear down any existing channel and discard pending events from previous workspace
        if (_realtimeChannel) {
            supabase.removeChannel(_realtimeChannel);
            _realtimeChannel = null;
        }
        if (_batchTimer) { clearTimeout(_batchTimer); _batchTimer = null; }
        _pendingUpserts.clear();
        _pendingDeletes.clear();

        const storeRef = () => ({ tasks: get().tasks, set });

        const channel = supabase
            .channel(`tasks:ws:${workspaceId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'tasks' },
                (payload) => {
                    const raw = payload.new as Task;
                    if (raw.deleted_at) return;
                    _pendingUpserts.add(raw.id);
                    scheduleRealtimeBatch(storeRef);
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'tasks' },
                (payload) => {
                    const raw = payload.new as Task;
                    if (raw.deleted_at) {
                        _pendingDeletes.add(raw.id);
                    } else {
                        _pendingUpserts.add(raw.id);
                    }
                    scheduleRealtimeBatch(storeRef);
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'tasks' },
                (payload) => {
                    const raw = payload.old as Task;
                    _pendingDeletes.add(raw.id);
                    scheduleRealtimeBatch(storeRef);
                }
            )
            .subscribe();

        _realtimeChannel = channel;

        return () => {
            supabase.removeChannel(channel);
            _realtimeChannel = null;
        };
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
                const currentDate = parseDueDate(task.due_date);
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
                    category_id: task.category_id,
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
