import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ─── Mocks ────────────────────────────────────────────────────────
vi.mock('@hello-pangea/dnd', () => ({
    Draggable: ({ children }: { children: (p: unknown, s: unknown) => React.ReactNode }) =>
        children(
            { innerRef: () => {}, draggableProps: { style: {} }, dragHandleProps: {} },
            { isDragging: false }
        ),
}));

const mockUpdateTask = vi.fn();
vi.mock('../../store/taskStore', () => ({
    useTaskStore: () => ({ updateTask: mockUpdateTask }),
}));

vi.mock('../../components/ui/DatePicker', () => ({
    DatePickerPopover: ({ open }: { open: boolean }) =>
        open ? <div data-testid="date-picker" /> : null,
}));

// Import after mocks
import { TaskRow } from '../../components/tasks/TaskRow';

// ─── Helpers ──────────────────────────────────────────────────────
const STATUS_TODO = { id: 's-todo', name: 'A fazer', color: '#db4035', position: 1, workspace_id: 'w1', created_at: '' };
const STATUS_DONE = { id: 's-done', name: 'Entregue', color: '#10b981', position: 2, workspace_id: 'w1', created_at: '' };

function makeTask(overrides: Record<string, unknown> = {}) {
    return {
        id: 't1',
        title: 'Minha Tarefa',
        project_id: 'p1',
        status_id: 's-todo',
        position: 0,
        priority: 'medium' as const,
        due_date: null,
        recurrence: 'none' as const,
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
    };
}

function renderTaskRow(overrides: Record<string, unknown> = {}) {
    const props = {
        task: makeTask(overrides) as never,
        index: 0,
        isFocused: false,
        isSelected: false,
        anySelected: false,
        groupBy: 'status' as const,
        gridTemplate: '280px 130px 110px 100px 90px 48px 44px',
        doneStatusId: STATUS_DONE.id,
        statuses: [STATUS_TODO, STATUS_DONE],
        onToggleSelect: vi.fn(),
        onToggleStatusPopover: vi.fn(),
        onOpenDetail: vi.fn(),
    };
    return { ...render(<TaskRow {...props} />), props };
}

// ─── Tests ────────────────────────────────────────────────────────
describe('TaskRow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── Renderização básica ───────────────────────────────────────
    describe('renderização básica', () => {
        it('exibe o título da tarefa', () => {
            renderTaskRow();
            expect(screen.getByText('Minha Tarefa')).toBeInTheDocument();
        });

        it('exibe badge de projeto quando task.project está definido', () => {
            renderTaskRow({ project: { id: 'p1', name: 'FlowDesk', color: '#3b82f6' } });
            expect(screen.getByText('FlowDesk')).toBeInTheDocument();
        });

        it('exibe "—" quando task.project é null', () => {
            renderTaskRow({ project: null });
            expect(screen.getAllByText('—').length).toBeGreaterThan(0);
        });

        it('exibe badge de categoria quando definida', () => {
            renderTaskRow({
                category: { id: 'c1', name: 'Design', color: '#8b5cf6', workspace_id: 'w1', created_at: '' },
            });
            expect(screen.getByText('Design')).toBeInTheDocument();
        });

        it('exibe prioridade urgente como "Urgente"', () => {
            renderTaskRow({ priority: 'urgent' });
            // Texto só aparece em xl, mas o span é renderizado
            expect(screen.getByText('Urgente')).toBeInTheDocument();
        });
    });

    // ── Tarefa concluída ──────────────────────────────────────────
    describe('tarefa concluída', () => {
        it('aplica line-through quando tarefa está no status "done"', () => {
            renderTaskRow({ status_id: STATUS_DONE.id });
            // getByText retorna o <span class="truncate"> interno; o pai tem a classe
            const titleEl = screen.getByText('Minha Tarefa').parentElement;
            expect(titleEl).toHaveClass('line-through');
        });

        it('não aplica line-through quando tarefa está em andamento', () => {
            renderTaskRow({ status_id: STATUS_TODO.id });
            const titleEl = screen.getByText('Minha Tarefa');
            expect(titleEl).not.toHaveClass('line-through');
        });
    });

    // ── Due date ──────────────────────────────────────────────────
    describe('due date', () => {
        function localDateStr(date: Date) {
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
        }

        it('exibe "Hoje" quando due_date é hoje', () => {
            renderTaskRow({ due_date: localDateStr(new Date()) });
            expect(screen.getByText('Hoje')).toBeInTheDocument();
        });

        it('exibe "Amanhã" quando due_date é amanhã', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            renderTaskRow({ due_date: localDateStr(tomorrow) });
            expect(screen.getByText('Amanhã')).toBeInTheDocument();
        });

        it('abre DatePickerPopover ao clicar no botão de data', async () => {
            renderTaskRow({ due_date: localDateStr(new Date()) });

            const dateBtn = screen.getByTitle('Editar prazo (D)');
            await userEvent.click(dateBtn);

            expect(screen.getByTestId('date-picker')).toBeInTheDocument();
        });
    });

    // ── Callbacks ─────────────────────────────────────────────────
    describe('callbacks', () => {
        it('chama onOpenDetail ao clicar no título', async () => {
            const { props } = renderTaskRow();
            await userEvent.click(screen.getByText('Minha Tarefa'));
            expect(props.onOpenDetail).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
        });

        it('chama onToggleSelect ao clicar no checkbox', async () => {
            const { props } = renderTaskRow();
            const checkbox = screen.getByRole('checkbox');
            await userEvent.click(checkbox);
            expect(props.onToggleSelect).toHaveBeenCalledWith('t1');
        });
    });

    // ── Atalho de teclado D ───────────────────────────────────────
    describe('atalho de teclado', () => {
        it('abre DatePickerPopover ao pressionar D quando isFocused = true', () => {
            const props = {
                task: makeTask() as never,
                index: 0,
                isFocused: true,
                isSelected: false,
                anySelected: false,
                groupBy: 'status' as const,
                gridTemplate: '280px 130px 110px 100px 90px 48px 44px',
                doneStatusId: STATUS_DONE.id,
                statuses: [STATUS_TODO, STATUS_DONE],
                onToggleSelect: vi.fn(),
                onToggleStatusPopover: vi.fn(),
                onOpenDetail: vi.fn(),
            };
            render(<TaskRow {...props} />);

            fireEvent.keyDown(document, { key: 'D' });

            expect(screen.getByTestId('date-picker')).toBeInTheDocument();
        });

        it('não abre DatePickerPopover ao pressionar D quando isFocused = false', () => {
            renderTaskRow();

            fireEvent.keyDown(document, { key: 'D' });

            expect(screen.queryByTestId('date-picker')).not.toBeInTheDocument();
        });
    });
});
