import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────
const mockFetchTrashedTasks = vi.fn();
const mockFetchTrashedDocuments = vi.fn();

vi.mock('../../store/workspaceStore', () => ({
    useWorkspaceStore: () => ({
        activeWorkspace: { id: 'w1', name: 'Test WS' },
    }),
}));

vi.mock('../../store/taskStore', () => ({
    useTaskStore: () => ({
        fetchTrashedTasks: mockFetchTrashedTasks,
        restoreTask: vi.fn(),
        permanentDeleteTask: vi.fn(),
        fetchTasks: vi.fn(),
    }),
}));

vi.mock('../../store/documentStore', () => ({
    useDocumentStore: () => ({
        fetchTrashedDocuments: mockFetchTrashedDocuments,
        restoreDocument: vi.fn(),
        permanentDeleteDocument: vi.fn(),
    }),
}));

vi.mock('sonner', () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

import Lixeira from '../../pages/Lixeira';
import { toast } from 'sonner';

describe('Lixeira', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetchTrashedTasks.mockResolvedValue([]);
        mockFetchTrashedDocuments.mockResolvedValue([]);
    });

    it('renders empty state after loading', async () => {
        render(<Lixeira />);
        await waitFor(() => expect(screen.queryByText(/lixeira vazia/i)).toBeInTheDocument());
    });

    it('setLoading(false) is called even when Promise.all rejects', async () => {
        mockFetchTrashedTasks.mockRejectedValue(new Error('network error'));

        render(<Lixeira />);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Erro ao carregar lixeira');
        });

        // Spinner should not be present (loading = false)
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('shows task count when tasks exist', async () => {
        mockFetchTrashedTasks.mockResolvedValue([
            { id: 't1', title: 'Tarefa deletada', project_id: 'p1', deleted_at: new Date().toISOString(), project: { name: 'Proj' } },
        ]);

        render(<Lixeira />);

        await waitFor(() => expect(screen.getByText('Tarefa deletada')).toBeInTheDocument());
    });
});
