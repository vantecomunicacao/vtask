import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { CustomStatus } from '../store/taskStore';
import type { TaskWithAssignee } from '../store/taskStore';

interface UseBulkActionsParams {
    statuses: CustomStatus[];
    filteredTasks: TaskWithAssignee[];
    workspaceId: string | undefined;
    onRefresh: () => void;
}

export function useBulkActions({ statuses, filteredTasks, workspaceId, onRefresh }: UseBulkActionsParams) {
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const toggleSelectTask = useCallback((taskId: string) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            next.has(taskId) ? next.delete(taskId) : next.add(taskId);
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback(() => {
        if (selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0) {
            setSelectedTaskIds(new Set());
        } else {
            setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
        }
    }, [selectedTaskIds.size, filteredTasks]);

    const clearSelection = useCallback(() => setSelectedTaskIds(new Set()), []);

    const handleBulkComplete = useCallback(async () => {
        if (!statuses.length) return;
        const { error } = await supabase
            .from('tasks')
            .update({ status_id: statuses[statuses.length - 1].id })
            .in('id', Array.from(selectedTaskIds));
        if (!error) { setSelectedTaskIds(new Set()); onRefresh(); }
    }, [statuses, selectedTaskIds, onRefresh]);

    const handleBulkDelete = useCallback(() => {
        if (!workspaceId || selectedTaskIds.size === 0) return;
        setConfirmDeleteOpen(true);
    }, [workspaceId, selectedTaskIds.size]);

    const executeBulkDelete = useCallback(async () => {
        if (!workspaceId || selectedTaskIds.size === 0) return;
        const { error } = await supabase
            .from('tasks')
            .update({ deleted_at: new Date().toISOString() })
            .in('id', Array.from(selectedTaskIds));
        if (error) {
            toast.error('Erro ao mover tarefas para a lixeira');
        } else {
            toast.success(`${selectedTaskIds.size} tarefas movidas para a lixeira`);
            setSelectedTaskIds(new Set());
            onRefresh();
        }
    }, [workspaceId, selectedTaskIds, onRefresh]);

    return {
        selectedTaskIds,
        confirmDeleteOpen,
        setConfirmDeleteOpen,
        toggleSelectTask,
        toggleSelectAll,
        clearSelection,
        handleBulkComplete,
        handleBulkDelete,
        executeBulkDelete,
    };
}
