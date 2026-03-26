import { useMemo, useEffect, useState, useRef } from 'react';
import type { TaskWithAssignee, CustomStatus } from '../store/taskStore';
import { isToday, isTomorrow, isPast } from 'date-fns';
import { parseDueDate } from '../lib/dateUtils';

export type GroupBy = 'status' | 'project' | 'due_date';
export type SortField = 'title' | 'due_date' | 'priority' | 'project';
export type SortConfig = { field: SortField; direction: 'asc' | 'desc' };

export function useDebouncedValue<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => {
        timerRef.current = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timerRef.current);
    }, [value, delay]);
    return debounced;
}

interface UseTaskFiltersParams {
    tasks: TaskWithAssignee[];
    statuses: CustomStatus[];
    search: string;
    selectedProject: string;
    selectedAssignee: string;
    selectedCategory: string;
    showCompleted: boolean;
    groupBy: GroupBy;
    sortConfig: SortConfig;
}

export function useTaskFilters({
    tasks,
    statuses,
    search,
    selectedProject,
    selectedAssignee,
    selectedCategory,
    showCompleted,
    groupBy,
    sortConfig,
}: UseTaskFiltersParams) {
    const debouncedSearch = useDebouncedValue(search, 200);
    const lastStatusId = statuses.length > 0 ? statuses[statuses.length - 1].id : null;

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(debouncedSearch.toLowerCase());
            const matchesProject = selectedProject === 'all' || task.project_id === selectedProject;
            const matchesAssignee = selectedAssignee === 'all' || task.assignee_id === selectedAssignee;
            const matchesCategory = selectedCategory === 'all' || task.category?.id === selectedCategory;
            const isLastStatus = lastStatusId !== null && task.status_id === lastStatusId;
            const matchesCompleted = showCompleted || !isLastStatus;
            return matchesSearch && matchesProject && matchesAssignee && matchesCategory && matchesCompleted;
        }).sort((a, b) => {
            const { field, direction } = sortConfig;
            let compare = 0;
            if (field === 'title') compare = a.title.localeCompare(b.title);
            else if (field === 'due_date') {
                const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
                const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
                compare = dateA - dateB;
            } else if (field === 'priority') {
                const priorityMap: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
                compare = priorityMap[a.priority || 'medium'] - priorityMap[b.priority || 'medium'];
            } else if (field === 'project') {
                compare = (a.project?.name || '').localeCompare(b.project?.name || '');
            }
            return direction === 'asc' ? compare : -compare;
        });
    }, [tasks, debouncedSearch, selectedProject, selectedAssignee, selectedCategory, showCompleted, sortConfig, lastStatusId]);

    const groupedTasks = useMemo(() => {
        if (groupBy === 'status') {
            const statusList = statuses.length > 0 ? statuses : [{ id: 'todo', name: 'A fazer', color: '#ccc' }];
            return statusList.map(status => ({
                id: status.id,
                name: status.name,
                color: status.color,
                tasks: filteredTasks.filter(t => t.status_id === status.id || (!t.status_id && status.id === 'todo'))
            }));
        } else if (groupBy === 'project') {
            const projectIds = Array.from(new Set(filteredTasks.map(t => t.project?.id).filter(Boolean)));
            const groups = projectIds.map(id => {
                const project = filteredTasks.find(t => t.project?.id === id)!.project!;
                return { id, name: project.name, color: project.color || '#ccc', tasks: filteredTasks.filter(t => t.project?.id === id) };
            });
            const noProject = filteredTasks.filter(t => !t.project);
            if (noProject.length > 0) groups.push({ id: 'none', name: 'Sem Projeto', color: '#94a3b8', tasks: noProject });
            return groups;
        } else {
            const parseLocalDate = parseDueDate;
            return [
                { id: 'overdue', name: 'Atrasadas', color: '#ef4444', tasks: filteredTasks.filter(t => t.due_date && isPast(parseLocalDate(t.due_date)) && !isToday(parseLocalDate(t.due_date))) },
                { id: 'today', name: 'Hoje', color: '#3b82f6', tasks: filteredTasks.filter(t => t.due_date && isToday(parseLocalDate(t.due_date))) },
                { id: 'tomorrow', name: 'Amanhã', color: '#f59e0b', tasks: filteredTasks.filter(t => t.due_date && isTomorrow(parseLocalDate(t.due_date))) },
                { id: 'future', name: 'Próximas', color: '#10b981', tasks: filteredTasks.filter(t => t.due_date && parseLocalDate(t.due_date).getTime() > new Date(new Date().setHours(23, 59, 59, 999)).getTime()) },
                { id: 'none', name: 'Sem Prazo', color: '#94a3b8', tasks: filteredTasks.filter(t => !t.due_date) }
            ].filter(g => g.tasks.length > 0).map(g => ({ ...g, color: g.color || '#ccc' }));
        }
    }, [filteredTasks, groupBy, statuses]);

    const counters = useMemo(() => {
        // Append T00:00:00 so date-only strings are parsed as local time (not UTC midnight)
        const parseLocalDate = parseDueDate;
        const active = tasks.filter(t => !lastStatusId || t.status_id !== lastStatusId);
        return {
            total: active.length,
            today: active.filter(t => t.due_date && isToday(parseLocalDate(t.due_date))).length,
            overdue: active.filter(t => t.due_date && isPast(parseLocalDate(t.due_date)) && !isToday(parseLocalDate(t.due_date))).length,
        };
    }, [tasks, lastStatusId]);

    const uniqueProjects = useMemo(() =>
        Array.from(new Set(tasks.map(t => t.project).filter(Boolean).map(p => JSON.stringify(p)))).map(s => JSON.parse(s)),
        [tasks]
    );

    const uniqueAssignees = useMemo(() =>
        Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean).map(a => JSON.stringify(a)))).map(s => JSON.parse(s)),
        [tasks]
    );

    const hasFilters = debouncedSearch !== '' || selectedProject !== 'all' || selectedAssignee !== 'all' || selectedCategory !== 'all';
    const activeFilterCount = (selectedProject !== 'all' ? 1 : 0) + (selectedAssignee !== 'all' ? 1 : 0) + (selectedCategory !== 'all' ? 1 : 0);

    return { filteredTasks, groupedTasks, counters, uniqueProjects, uniqueAssignees, hasFilters, activeFilterCount };
}
