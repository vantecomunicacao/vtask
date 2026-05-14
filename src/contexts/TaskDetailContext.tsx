import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { TaskWithAssignee } from '../store/taskStore';

interface TaskDetailContextValue {
    selectedTask: TaskWithAssignee | null;
    openTask: (task: TaskWithAssignee) => void;
    closeTask: () => void;
}

const TaskDetailContext = createContext<TaskDetailContextValue | null>(null);

export function TaskDetailProvider({ children, onOpen, onClose }: {
    children: ReactNode;
    onOpen?: (task: TaskWithAssignee) => void;
    onClose?: () => void;
}) {
    const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);

    const openTask = useCallback((task: TaskWithAssignee) => {
        setSelectedTask(task);
        onOpen?.(task);
    }, [onOpen]);

    const closeTask = useCallback(() => {
        setSelectedTask(null);
        onClose?.();
    }, [onClose]);

    return (
        <TaskDetailContext.Provider value={{ selectedTask, openTask, closeTask }}>
            {children}
        </TaskDetailContext.Provider>
    );
}

const NOOP = () => {};
const FALLBACK: TaskDetailContextValue = { selectedTask: null, openTask: NOOP, closeTask: NOOP };

export function useTaskDetail(): TaskDetailContextValue {
    const ctx = useContext(TaskDetailContext);
    if (!ctx) {
        if (import.meta.env.DEV) console.warn('useTaskDetail called outside TaskDetailProvider — using no-op fallback');
        return FALLBACK;
    }
    return ctx;
}
