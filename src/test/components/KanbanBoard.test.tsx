import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ─── Mocks ────────────────────────────────────────────────────────
vi.mock('@hello-pangea/dnd', () => ({
    DragDropContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Droppable: ({ children }: { children: (p: unknown, s: unknown) => React.ReactNode }) =>
        children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, { isDraggingOver: false }),
    Draggable: ({ children }: { children: (p: unknown, s: unknown) => React.ReactNode }) =>
        children(
            { innerRef: () => {}, draggableProps: { style: {} }, dragHandleProps: {} },
            { isDragging: false }
        ),
}));

const mockMoveTask = vi.fn();
vi.mock('../../store/taskStore', () => ({
    useTaskStore: () => ({ moveTask: mockMoveTask }),
}));

vi.mock('../../lib/confetti', () => ({ celebrate: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn() } }));

// Import after mocks
import { KanbanBoard } from '../../components/kanban/KanbanBoard';

// ─── Helpers ──────────────────────────────────────────────────────
function makeStatus(id: string, name: string, position: number) {
    return { id, name, color: '#888888', position, workspace_id: 'w1', created_at: '' };
}

function makeTask(overrides: Record<string, unknown> = {}) {
    return {
        id: 't1',
        title: 'Tarefa Teste',
        project_id: 'p1',
        status_id: 's1',
        position: 0,
        priority: 'medium' as const,
        due_date: null,
        recurrence: 'none' as const,
        assignee_id: null,
        category_id: null,
        deleted_at: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        description: null,
        labels: [],
        workspace_id: 'w1',
        parent_id: null,
        start_date: null,
        time_estimate: null,
        assignee: null,
        category: null,
        project: null,
        comments_count: 0,
        ...overrides,
    };
}

// ─── Tests ────────────────────────────────────────────────────────
describe('KanbanBoard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── Statuses padrão ───────────────────────────────────────────
    describe('statuses padrão', () => {
        it('exibe 5 colunas padrão quando statuses está vazio', () => {
            render(<KanbanBoard tasks={[]} statuses={[]} onTaskClick={vi.fn()} />);

            expect(screen.getByText('A fazer')).toBeInTheDocument();
            expect(screen.getByText('Briefing')).toBeInTheDocument();
            expect(screen.getByText('Em produção')).toBeInTheDocument();
            expect(screen.getByText('Em aprovação')).toBeInTheDocument();
            expect(screen.getByText('Entregue')).toBeInTheDocument();
        });

        it('usa statuses fornecidos quando disponíveis', () => {
            const statuses = [
                makeStatus('s1', 'Backlog', 1),
                makeStatus('s2', 'Concluído', 2),
            ];

            render(<KanbanBoard tasks={[]} statuses={statuses} onTaskClick={vi.fn()} />);

            expect(screen.getByText('Backlog')).toBeInTheDocument();
            expect(screen.getByText('Concluído')).toBeInTheDocument();
            expect(screen.queryByText('A fazer')).not.toBeInTheDocument();
        });
    });

    // ── Agrupamento de tarefas por status ─────────────────────────
    describe('agrupamento por status', () => {
        const statuses = [makeStatus('s1', 'A fazer', 1), makeStatus('s2', 'Entregue', 2)];

        it('exibe tarefa na coluna correta pelo status_id', () => {
            const tasks = [makeTask({ id: 't1', title: 'Tarefa em A fazer', status_id: 's1' })];

            render(<KanbanBoard tasks={tasks} statuses={statuses} onTaskClick={vi.fn()} />);

            expect(screen.getByText('Tarefa em A fazer')).toBeInTheDocument();
        });

        it('exibe tarefas em diferentes colunas conforme status', () => {
            const tasks = [
                makeTask({ id: 't1', title: 'Tarefa 1', status_id: 's1' }),
                makeTask({ id: 't2', title: 'Tarefa 2', status_id: 's2' }),
            ];

            render(<KanbanBoard tasks={tasks} statuses={statuses} onTaskClick={vi.fn()} />);

            expect(screen.getByText('Tarefa 1')).toBeInTheDocument();
            expect(screen.getByText('Tarefa 2')).toBeInTheDocument();
        });

        it('coloca tarefa sem status_id no primeiro status padrão (todo)', () => {
            // Usando statuses padrão (primeiro é 'todo')
            const tasks = [makeTask({ id: 't1', title: 'Sem status', status_id: null })];

            render(<KanbanBoard tasks={tasks} statuses={[]} onTaskClick={vi.fn()} />);

            expect(screen.getByText('Sem status')).toBeInTheDocument();
        });
    });

    // ── Contagem de tarefas por coluna ────────────────────────────
    describe('contagem de tarefas', () => {
        it('exibe contador correto de tarefas por coluna', () => {
            const statuses = [makeStatus('s1', 'A fazer', 1), makeStatus('s2', 'Entregue', 2)];
            const tasks = [
                makeTask({ id: 't1', status_id: 's1' }),
                makeTask({ id: 't2', status_id: 's1' }),
                makeTask({ id: 't3', status_id: 's2' }),
            ];

            render(<KanbanBoard tasks={tasks} statuses={statuses} onTaskClick={vi.fn()} />);

            // Dois "2" e um "1" nos badges de contagem
            const counts = screen.getAllByText('2');
            expect(counts.length).toBeGreaterThanOrEqual(1);
        });
    });

    // ── Card: informações da tarefa ───────────────────────────────
    describe('KanbanCard — informações', () => {
        const statuses = [makeStatus('s1', 'A fazer', 1)];

        it('exibe categoria quando definida', () => {
            const tasks = [makeTask({
                category: { id: 'c1', name: 'Design', color: '#8b5cf6', workspace_id: 'w1', created_at: '' },
            })];

            render(<KanbanBoard tasks={tasks} statuses={statuses} onTaskClick={vi.fn()} />);

            expect(screen.getByText('Design')).toBeInTheDocument();
        });

        it('exibe ícone de recorrência quando recurrence !== none', () => {
            const tasks = [makeTask({ recurrence: 'weekly' })];

            render(<KanbanBoard tasks={tasks} statuses={statuses} onTaskClick={vi.fn()} />);

            // O ícone RefreshCw tem title com "Recorrência"
            expect(screen.getByTitle(/recorrência/i)).toBeInTheDocument();
        });

        it('exibe inicial do nome do assignee', () => {
            const tasks = [makeTask({
                assignee: { id: 'u1', full_name: 'Ana Lima', email: 'ana@ex.com', avatar_url: null, created_at: '' },
            })];

            render(<KanbanBoard tasks={tasks} statuses={statuses} onTaskClick={vi.fn()} />);

            expect(screen.getByText('A')).toBeInTheDocument();
        });

        it('chama onTaskClick ao clicar no card', async () => {
            const onTaskClick = vi.fn();
            const tasks = [makeTask({ id: 't1', title: 'Clique Aqui' })];

            render(<KanbanBoard tasks={tasks} statuses={statuses} onTaskClick={onTaskClick} />);

            screen.getByText('Clique Aqui').closest('[class*="cursor"]')?.dispatchEvent(
                new MouseEvent('click', { bubbles: true })
            );

            expect(onTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
        });
    });
});
