import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskDetailProvider, useTaskDetail } from '../../contexts/TaskDetailContext';
import type { TaskWithAssignee } from '../../store/taskStore';

function makeTask(overrides: Partial<TaskWithAssignee> = {}): TaskWithAssignee {
    return {
        id: 't1',
        title: 'Tarefa Teste',
        project_id: 'p1',
        status_id: 's1',
        position: 0,
        priority: null,
        due_date: null,
        recurrence: 'none',
        assignee_id: null,
        category_id: null,
        deleted_at: null,
        created_at: '2025-01-01T00:00:00Z',
        description: null,
        labels: [],
        workspace_id: 'w1',
        assignee: null,
        category: null,
        project: null,
        ...overrides,
    } as TaskWithAssignee;
}

function Consumer() {
    const { selectedTask, openTask, closeTask } = useTaskDetail();
    return (
        <div>
            <span data-testid="task-id">{selectedTask?.id ?? 'none'}</span>
            <button onClick={() => openTask(makeTask())}>Abrir</button>
            <button onClick={closeTask}>Fechar</button>
        </div>
    );
}

describe('TaskDetailContext', () => {
    it('começa com selectedTask null', () => {
        render(
            <TaskDetailProvider>
                <Consumer />
            </TaskDetailProvider>
        );
        expect(screen.getByTestId('task-id').textContent).toBe('none');
    });

    it('openTask define selectedTask', async () => {
        render(
            <TaskDetailProvider>
                <Consumer />
            </TaskDetailProvider>
        );
        await userEvent.click(screen.getByText('Abrir'));
        expect(screen.getByTestId('task-id').textContent).toBe('t1');
    });

    it('closeTask limpa selectedTask', async () => {
        render(
            <TaskDetailProvider>
                <Consumer />
            </TaskDetailProvider>
        );
        await userEvent.click(screen.getByText('Abrir'));
        await userEvent.click(screen.getByText('Fechar'));
        expect(screen.getByTestId('task-id').textContent).toBe('none');
    });

    it('chama callback onOpen ao abrir tarefa', async () => {
        const onOpen = vi.fn();
        render(
            <TaskDetailProvider onOpen={onOpen}>
                <Consumer />
            </TaskDetailProvider>
        );
        await userEvent.click(screen.getByText('Abrir'));
        expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
    });

    it('chama callback onClose ao fechar tarefa', async () => {
        const onClose = vi.fn();
        render(
            <TaskDetailProvider onClose={onClose}>
                <Consumer />
            </TaskDetailProvider>
        );
        await userEvent.click(screen.getByText('Abrir'));
        await userEvent.click(screen.getByText('Fechar'));
        expect(onClose).toHaveBeenCalled();
    });

    it('useTaskDetail retorna fallback no-op fora do provider', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        let result: ReturnType<typeof useTaskDetail> | null = null;
        function Consumer() { result = useTaskDetail(); return null; }
        render(<Consumer />);
        expect(result).not.toBeNull();
        expect(result!.selectedTask).toBeNull();
        expect(typeof result!.openTask).toBe('function');
        expect(typeof result!.closeTask).toBe('function');
        warnSpy.mockReset();
    });
});
