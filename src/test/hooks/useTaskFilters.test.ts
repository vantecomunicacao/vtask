import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import type { TaskWithAssignee, CustomStatus } from '../../store/taskStore';

// ─── Helpers ──────────────────────────────────────────────────────
const STATUSES: CustomStatus[] = [
    { id: 's-todo', name: 'A fazer', color: '#94a3b8', position: 1, workspace_id: 'w1', created_at: '2025-01-01T00:00:00Z' },
    { id: 's-doing', name: 'Em andamento', color: '#3b82f6', position: 2, workspace_id: 'w1', created_at: '2025-01-01T00:00:00Z' },
    { id: 's-done', name: 'Concluído', color: '#10b981', position: 3, workspace_id: 'w1', created_at: '2025-01-01T00:00:00Z' },
];

function makeTask(overrides: Partial<TaskWithAssignee> = {}): TaskWithAssignee {
    return {
        id: `task-${Math.random()}`,
        title: 'Tarefa de Teste',
        status_id: 's-todo',
        project_id: 'p1',
        assignee_id: null,
        priority: 'medium',
        due_date: null,
        description: null,
        position: 0,
        recurrence: null,
        category_id: null,
        labels: null,
        created_at: '2025-01-01T00:00:00Z',
        deleted_at: null,
        parent_id: null,
        ...overrides,
    } as TaskWithAssignee;
}

const defaultParams = {
    statuses: STATUSES,
    search: '',
    selectedProject: 'all',
    selectedAssignee: 'all',
    showCompleted: false,
    groupBy: 'status' as const,
    sortConfig: { field: 'due_date' as const, direction: 'asc' as const },
};

// ─── Tests ────────────────────────────────────────────────────────
describe('useTaskFilters', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('returns all incomplete tasks when no filters are active', () => {
        const tasks = [
            makeTask({ id: 't1', title: 'Alpha', status_id: 's-todo' }),
            makeTask({ id: 't2', title: 'Beta', status_id: 's-doing' }),
            makeTask({ id: 't3', title: 'Gamma', status_id: 's-done' }), // done — excluded
        ];

        const { result } = renderHook(() =>
            useTaskFilters({ ...defaultParams, tasks })
        );

        expect(result.current.filteredTasks).toHaveLength(2);
        expect(result.current.filteredTasks.map(t => t.title)).toEqual(['Alpha', 'Beta']);
    });

    it('includes completed tasks when showCompleted is true', () => {
        const tasks = [
            makeTask({ status_id: 's-todo' }),
            makeTask({ status_id: 's-done' }),
        ];

        const { result } = renderHook(() =>
            useTaskFilters({ ...defaultParams, tasks, showCompleted: true })
        );

        expect(result.current.filteredTasks).toHaveLength(2);
    });

    it('filters by search term after debounce', () => {
        const tasks = [
            makeTask({ title: 'Deploy frontend' }),
            makeTask({ title: 'Revisar PR' }),
            makeTask({ title: 'Atualizar deploy docs' }),
        ];

        // Initial value is used directly (no debounce on first render)
        const { result } = renderHook(() =>
            useTaskFilters({ ...defaultParams, tasks, search: 'deploy' })
        );

        act(() => vi.advanceTimersByTime(300));

        expect(result.current.filteredTasks).toHaveLength(2);
        expect(result.current.filteredTasks.every(t => t.title.toLowerCase().includes('deploy'))).toBe(true);
    });

    it('filters by project', () => {
        const tasks = [
            makeTask({ id: 't1', project_id: 'p-alpha' }),
            makeTask({ id: 't2', project_id: 'p-beta' }),
            makeTask({ id: 't3', project_id: 'p-alpha' }),
        ];

        const { result } = renderHook(() =>
            useTaskFilters({ ...defaultParams, tasks, selectedProject: 'p-alpha' })
        );

        expect(result.current.filteredTasks).toHaveLength(2);
        expect(result.current.filteredTasks.every(t => t.project_id === 'p-alpha')).toBe(true);
    });

    it('filters by assignee', () => {
        const tasks = [
            makeTask({ assignee_id: 'user-1' }),
            makeTask({ assignee_id: 'user-2' }),
            makeTask({ assignee_id: 'user-1' }),
        ];

        const { result } = renderHook(() =>
            useTaskFilters({ ...defaultParams, tasks, selectedAssignee: 'user-1' })
        );

        expect(result.current.filteredTasks).toHaveLength(2);
    });

    it('groups tasks by status', () => {
        const tasks = [
            makeTask({ status_id: 's-todo' }),
            makeTask({ status_id: 's-todo' }),
            makeTask({ status_id: 's-doing' }),
        ];

        const { result } = renderHook(() =>
            useTaskFilters({ ...defaultParams, tasks })
        );

        const groups = result.current.groupedTasks;
        expect(groups.find(g => g.id === 's-todo')?.tasks).toHaveLength(2);
        expect(groups.find(g => g.id === 's-doing')?.tasks).toHaveLength(1);
    });

    it('counts overdue and today tasks correctly', () => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const today = toLocalDateStr(now);
        const yesterday = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

        const tasks = [
            makeTask({ due_date: today, status_id: 's-todo' }),
            makeTask({ due_date: yesterday, status_id: 's-todo' }),
            makeTask({ due_date: null, status_id: 's-todo' }),
        ];

        const { result } = renderHook(() =>
            useTaskFilters({ ...defaultParams, tasks })
        );

        expect(result.current.counters.today).toBe(1);
        expect(result.current.counters.overdue).toBe(1);
        expect(result.current.counters.total).toBe(3);
    });

    it('reports hasFilters correctly', () => {
        const tasks = [makeTask()];

        const { result: noFilter } = renderHook(() =>
            useTaskFilters({ ...defaultParams, tasks })
        );
        expect(noFilter.current.hasFilters).toBe(false);

        const { result: withProject } = renderHook(() =>
            useTaskFilters({ ...defaultParams, tasks, selectedProject: 'p1' })
        );
        expect(withProject.current.hasFilters).toBe(true);
    });

    it('sorts by priority descending', () => {
        const tasks = [
            makeTask({ id: 't1', title: 'Low', priority: 'low' }),
            makeTask({ id: 't2', title: 'Urgent', priority: 'urgent' }),
            makeTask({ id: 't3', title: 'High', priority: 'high' }),
        ];

        const { result } = renderHook(() =>
            useTaskFilters({
                ...defaultParams,
                tasks,
                sortConfig: { field: 'priority', direction: 'asc' },
            })
        );

        expect(result.current.filteredTasks[0].priority).toBe('urgent');
        expect(result.current.filteredTasks[2].priority).toBe('low');
    });
});
