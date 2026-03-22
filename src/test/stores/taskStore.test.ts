import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Supabase ────────────────────────────────────────────────
// vi.hoisted garante que mockFromImpl existe antes do hoisting de vi.mock
const { mockFromImpl } = vi.hoisted(() => {
    const mockFromImpl = vi.fn();
    return { mockFromImpl };
});

vi.mock('../../lib/supabase', () => ({
    supabase: { from: mockFromImpl },
}));

vi.mock('sonner', () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

// Import after mocks
import { useTaskStore } from '../../store/taskStore';

// ─── Helpers ──────────────────────────────────────────────────────
function resetStore() {
    useTaskStore.setState({
        tasks: [],
        statuses: [],
        taskCategories: [],
        loading: false,
        error: null,
        tasksCache: null,
    });
}

function makeTask(overrides: Record<string, unknown> = {}) {
    return {
        id: 't1',
        title: 'Test Task',
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
        ...overrides,
    };
}

/** Mock a simple `.update().eq()` chain returning no error */
function mockSuccessfulUpdate() {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFromImpl.mockReturnValue({ update: mockUpdate });
    return { mockEq, mockUpdate };
}

/** Mock a simple `.update().eq()` chain returning an error */
function mockFailedUpdate(message: string) {
    const mockEq = vi.fn().mockResolvedValue({ error: { message } });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFromImpl.mockReturnValue({ update: mockUpdate });
}

// ─── Tests ────────────────────────────────────────────────────────
describe('taskStore', () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
    });

    // ── moveTask ──────────────────────────────────────────────────
    describe('moveTask', () => {
        it('aplica update otimista antes da resposta do DB', async () => {
            useTaskStore.setState({ tasks: [makeTask()] });
            mockSuccessfulUpdate();

            await useTaskStore.getState().moveTask('t1', 's2', 3);

            const { tasks } = useTaskStore.getState();
            expect(tasks[0].status_id).toBe('s2');
            expect(tasks[0].position).toBe(3);
        });

        it('faz rollback quando o DB retorna erro', async () => {
            useTaskStore.setState({ tasks: [makeTask()] });
            mockFailedUpdate('DB error');

            await useTaskStore.getState().moveTask('t1', 's2', 3);

            const { tasks, error } = useTaskStore.getState();
            expect(tasks[0].status_id).toBe('s1'); // revertido
            expect(error).toBe('DB error');
        });

        it('não altera outras tarefas durante o rollback', async () => {
            useTaskStore.setState({
                tasks: [makeTask({ id: 't1' }), makeTask({ id: 't2', status_id: 's9' })],
            });
            mockFailedUpdate('fail');

            await useTaskStore.getState().moveTask('t1', 's2', 0);

            expect(useTaskStore.getState().tasks[1].status_id).toBe('s9');
        });
    });

    // ── updateTask ────────────────────────────────────────────────
    describe('updateTask', () => {
        it('aplica update otimista de campos parciais', async () => {
            useTaskStore.setState({ tasks: [makeTask()] });
            mockSuccessfulUpdate();

            await useTaskStore.getState().updateTask('t1', { title: 'Novo Título' });

            expect(useTaskStore.getState().tasks[0].title).toBe('Novo Título');
        });

        it('faz rollback e lança exceção em caso de erro', async () => {
            useTaskStore.setState({ tasks: [makeTask()] });
            mockFailedUpdate('update failed');

            await expect(
                useTaskStore.getState().updateTask('t1', { title: 'Novo' })
            ).rejects.toBeTruthy();

            expect(useTaskStore.getState().tasks[0].title).toBe('Test Task');
        });
    });

    // ── deleteTask ────────────────────────────────────────────────
    describe('deleteTask', () => {
        it('remove tarefa do estado local em caso de sucesso', async () => {
            useTaskStore.setState({ tasks: [makeTask()] });
            mockSuccessfulUpdate();

            await useTaskStore.getState().deleteTask('t1');

            expect(useTaskStore.getState().tasks).toHaveLength(0);
        });

        it('mantém tarefa no estado e registra erro em caso de falha', async () => {
            useTaskStore.setState({ tasks: [makeTask()] });
            mockFailedUpdate('delete failed');

            await useTaskStore.getState().deleteTask('t1');

            expect(useTaskStore.getState().tasks).toHaveLength(1);
            expect(useTaskStore.getState().error).toBe('delete failed');
        });
    });

    // ── fetchWorkspaceTasks — cache ───────────────────────────────
    describe('fetchWorkspaceTasks — cache', () => {
        it('não busca no DB quando o cache ainda é válido', async () => {
            useTaskStore.setState({
                tasksCache: { workspaceId: 'w1', at: Date.now() },
            });

            await useTaskStore.getState().fetchWorkspaceTasks('w1');

            expect(mockFromImpl).not.toHaveBeenCalled();
        });

        it('busca quando force = true mesmo com cache válido', async () => {
            useTaskStore.setState({
                tasksCache: { workspaceId: 'w1', at: Date.now() },
            });

            // Projects query returns empty list
            mockFromImpl.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
            });

            await useTaskStore.getState().fetchWorkspaceTasks('w1', true);

            expect(mockFromImpl).toHaveBeenCalled();
        });

        it('define cache e tasks vazio quando não há projetos', async () => {
            mockFromImpl.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
            });

            await useTaskStore.getState().fetchWorkspaceTasks('w1');

            const { tasks, tasksCache, loading } = useTaskStore.getState();
            expect(tasks).toHaveLength(0);
            expect(tasksCache?.workspaceId).toBe('w1');
            expect(loading).toBe(false);
        });

        it('busca quando cache é de workspace diferente', async () => {
            useTaskStore.setState({
                tasksCache: { workspaceId: 'w-other', at: Date.now() },
            });

            mockFromImpl.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
            });

            await useTaskStore.getState().fetchWorkspaceTasks('w1');

            expect(mockFromImpl).toHaveBeenCalled();
        });
    });

    // ── toggleTaskCompletion ──────────────────────────────────────
    describe('toggleTaskCompletion', () => {
        const statuses = [
            { id: 's-todo', name: 'A fazer', color: '#db4035', position: 1, workspace_id: 'w1', created_at: '' },
            { id: 's-done', name: 'Entregue', color: '#10b981', position: 2, workspace_id: 'w1', created_at: '' },
        ];

        it('não faz nada se a lista de statuses estiver vazia', async () => {
            useTaskStore.setState({ statuses: [], tasks: [makeTask()] });

            await useTaskStore.getState().toggleTaskCompletion('t1', true);

            expect(mockFromImpl).not.toHaveBeenCalled();
        });

        it('move tarefa para o ÚLTIMO status ao concluir', async () => {
            useTaskStore.setState({
                statuses,
                tasks: [makeTask({ id: 't1', status_id: 's-todo', recurrence: 'none' })],
            });
            mockSuccessfulUpdate();

            await useTaskStore.getState().toggleTaskCompletion('t1', true);

            expect(useTaskStore.getState().tasks[0].status_id).toBe('s-done');
        });

        it('move tarefa para o PRIMEIRO status ao desmarcar', async () => {
            useTaskStore.setState({
                statuses,
                tasks: [makeTask({ id: 't1', status_id: 's-done' })],
            });
            mockSuccessfulUpdate();

            await useTaskStore.getState().toggleTaskCompletion('t1', false);

            expect(useTaskStore.getState().tasks[0].status_id).toBe('s-todo');
        });

        it('cria próxima ocorrência ao concluir tarefa recorrente diária', async () => {
            const recurringTask = makeTask({
                id: 't1',
                status_id: 's-todo',
                recurrence: 'daily',
                due_date: '2026-03-21',
                project_id: 'p1',
            });

            useTaskStore.setState({ statuses, tasks: [recurringTask] });

            const mockInsertFn = vi.fn().mockResolvedValue({ error: null });
            const mockEq = vi.fn().mockResolvedValue({ error: null });
            const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

            mockFromImpl.mockImplementation((table: string) => {
                if (table === 'tasks') {
                    return {
                        update: mockUpdate,
                        insert: mockInsertFn,
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                is: vi.fn().mockReturnValue({
                                    order: vi.fn().mockResolvedValue({ data: [recurringTask], error: null }),
                                }),
                            }),
                        }),
                    };
                }
                return {};
            });

            await useTaskStore.getState().toggleTaskCompletion('t1', true);

            expect(mockInsertFn).toHaveBeenCalledOnce();
            const insertArg = mockInsertFn.mock.calls[0][0];
            expect(insertArg.recurrence).toBe('daily');
            expect(insertArg.due_date).toBe('2026-03-22'); // +1 dia
        });

        it('não cria ocorrência ao desmarcar tarefa recorrente', async () => {
            const recurringTask = makeTask({
                id: 't1',
                status_id: 's-done',
                recurrence: 'weekly',
                due_date: '2026-03-21',
            });

            useTaskStore.setState({ statuses, tasks: [recurringTask] });
            mockSuccessfulUpdate();

            await useTaskStore.getState().toggleTaskCompletion('t1', false);

            // insert nunca deve ser chamado
            const allCalls = mockFromImpl.mock.results.map(r => r.value);
            const insertCalled = allCalls.some(chain => chain?.insert != null && chain.insert.mock?.calls?.length > 0);
            expect(insertCalled).toBe(false);
        });
    });

    // ── fetchStatuses — retry ─────────────────────────────────────
    describe('fetchStatuses — retry', () => {
        it('define statuses em caso de sucesso imediato', async () => {
            const statuses = [{ id: 's1', name: 'A fazer', color: '#db4035', position: 1, workspace_id: 'w1', created_at: '' }];

            mockFromImpl.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        order: vi.fn().mockResolvedValue({ data: statuses, error: null }),
                    }),
                }),
            });

            await useTaskStore.getState().fetchStatuses('w1');

            expect(useTaskStore.getState().statuses).toEqual(statuses);
        });

        it('tenta novamente após falha e define statuses na segunda tentativa', async () => {
            vi.useFakeTimers();

            const statuses = [{ id: 's1', name: 'A fazer', color: '#db4035', position: 1, workspace_id: 'w1', created_at: '' }];
            const mockOrder = vi.fn()
                .mockResolvedValueOnce({ data: null, error: { message: 'timeout' } })
                .mockResolvedValueOnce({ data: statuses, error: null });

            mockFromImpl.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({ order: mockOrder }),
                }),
            });

            const promise = useTaskStore.getState().fetchStatuses('w1');
            await vi.runAllTimersAsync();
            await promise;

            expect(mockOrder).toHaveBeenCalledTimes(2);
            expect(useTaskStore.getState().statuses).toEqual(statuses);

            vi.useRealTimers();
        });
    });

    // ── invalidateTasksCache ──────────────────────────────────────
    describe('invalidateTasksCache', () => {
        it('limpa o cache de tarefas', () => {
            useTaskStore.setState({ tasksCache: { workspaceId: 'w1', at: Date.now() } });

            useTaskStore.getState().invalidateTasksCache();

            expect(useTaskStore.getState().tasksCache).toBeNull();
        });
    });

    // ── restoreTask ───────────────────────────────────────────────
    describe('restoreTask', () => {
        it('não altera estado local em caso de sucesso (restoreTask só atualiza DB)', async () => {
            useTaskStore.setState({ tasks: [makeTask()] });
            mockSuccessfulUpdate();

            await useTaskStore.getState().restoreTask('t1');

            // Estado não muda — tarefa restaurada é recarregada pela página chamadora
            expect(useTaskStore.getState().tasks).toHaveLength(1);
            expect(useTaskStore.getState().error).toBeNull();
        });

        it('define error quando DB retorna erro', async () => {
            mockFailedUpdate('restore failed');

            await useTaskStore.getState().restoreTask('t1');

            expect(useTaskStore.getState().error).toBe('restore failed');
        });
    });

    // ── permanentDeleteTask ───────────────────────────────────────
    describe('permanentDeleteTask', () => {
        it('não altera estado local em caso de sucesso (página recarrega a lista)', async () => {
            useTaskStore.setState({ tasks: [makeTask()] });

            const mockEq = vi.fn().mockResolvedValue({ error: null });
            const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
            mockFromImpl.mockReturnValue({ delete: mockDelete });

            await useTaskStore.getState().permanentDeleteTask('t1');

            expect(useTaskStore.getState().error).toBeNull();
        });

        it('define error quando DB retorna erro', async () => {
            const mockEq = vi.fn().mockResolvedValue({ error: { message: 'permanent delete failed' } });
            const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
            mockFromImpl.mockReturnValue({ delete: mockDelete });

            await useTaskStore.getState().permanentDeleteTask('t1');

            expect(useTaskStore.getState().error).toBe('permanent delete failed');
        });
    });
});
