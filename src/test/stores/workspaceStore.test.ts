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

// ─── Mock AuthStore ───────────────────────────────────────────────
const mockSession = {
    user: {
        id: 'user-1',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
    },
};

vi.mock('../../store/authStore', () => ({
    useAuthStore: {
        getState: vi.fn(() => ({ session: mockSession })),
    },
}));

// Import after mocks
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useAuthStore } from '../../store/authStore';

// ─── Helpers ──────────────────────────────────────────────────────
function resetStore() {
    useWorkspaceStore.setState({
        workspaces: [],
        activeWorkspace: null,
        loading: false,
        error: null,
    });
}

const ws1 = { id: 'ws-1', name: 'Test Workspace', created_at: '2025-01-01T00:00:00Z', owner_id: 'user-1' };

// ─── Tests ────────────────────────────────────────────────────────
describe('workspaceStore', () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
        // Restore session by default
        vi.mocked(useAuthStore.getState).mockReturnValue({ session: mockSession } as never);
    });

    // ── setActiveWorkspace ────────────────────────────────────────
    describe('setActiveWorkspace', () => {
        it('define o workspace ativo', () => {
            useWorkspaceStore.getState().setActiveWorkspace(ws1 as never);

            expect(useWorkspaceStore.getState().activeWorkspace).toEqual(ws1);
        });

        it('substitui workspace ativo anterior', () => {
            const ws2 = { ...ws1, id: 'ws-2', name: 'Outro WS' };
            useWorkspaceStore.getState().setActiveWorkspace(ws1 as never);
            useWorkspaceStore.getState().setActiveWorkspace(ws2 as never);

            expect(useWorkspaceStore.getState().activeWorkspace?.id).toBe('ws-2');
        });
    });

    // ── fetchWorkspaces — sem sessão ──────────────────────────────
    describe('fetchWorkspaces — sem sessão', () => {
        it('define erro quando usuário não está autenticado', async () => {
            vi.mocked(useAuthStore.getState).mockReturnValue({ session: null } as never);

            await useWorkspaceStore.getState().fetchWorkspaces();

            const { loading, error } = useWorkspaceStore.getState();
            expect(loading).toBe(false);
            expect(error).toBe('User not authenticated');
        });
    });

    // ── fetchWorkspaces — fluxo normal ────────────────────────────
    describe('fetchWorkspaces — fluxo normal', () => {
        it('carrega workspaces do usuário e define o primeiro como ativo', async () => {
            mockFromImpl.mockImplementation((table: string) => {
                if (table === 'workspace_members') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                data: [{ workspace_id: 'ws-1' }],
                                error: null,
                            }),
                        }),
                    };
                }
                if (table === 'workspaces') {
                    return {
                        select: vi.fn().mockReturnValue({
                            in: vi.fn().mockResolvedValue({
                                data: [ws1],
                                error: null,
                            }),
                        }),
                    };
                }
                return {};
            });

            await useWorkspaceStore.getState().fetchWorkspaces();

            const { workspaces, activeWorkspace, loading } = useWorkspaceStore.getState();
            expect(workspaces).toEqual([ws1]);
            expect(activeWorkspace?.id).toBe('ws-1');
            expect(loading).toBe(false);
        });

        it('mantém activeWorkspace existente se ainda estiver na lista', async () => {
            const ws2 = { ...ws1, id: 'ws-2', name: 'Workspace 2' };
            useWorkspaceStore.setState({ activeWorkspace: ws2 as never });

            mockFromImpl.mockImplementation((table: string) => {
                if (table === 'workspace_members') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({
                                data: [{ workspace_id: 'ws-1' }, { workspace_id: 'ws-2' }],
                                error: null,
                            }),
                        }),
                    };
                }
                if (table === 'workspaces') {
                    return {
                        select: vi.fn().mockReturnValue({
                            in: vi.fn().mockResolvedValue({
                                data: [ws1, ws2],
                                error: null,
                            }),
                        }),
                    };
                }
                return {};
            });

            await useWorkspaceStore.getState().fetchWorkspaces();

            expect(useWorkspaceStore.getState().activeWorkspace?.id).toBe('ws-2');
        });

        it('define erro quando workspace_members falha', async () => {
            mockFromImpl.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'network error' },
                    }),
                }),
            });

            await useWorkspaceStore.getState().fetchWorkspaces();

            expect(useWorkspaceStore.getState().error).toBe('network error');
            expect(useWorkspaceStore.getState().loading).toBe(false);
        });
    });

    // ── fetchWorkspaces — auto-criação ────────────────────────────
    describe('fetchWorkspaces — auto-criação', () => {
        it('cria workspace automaticamente quando usuário não tem nenhum', async () => {
            const newWorkspace = { id: 'ws-new', name: 'Test User Workspace', created_at: '2026-01-01', owner_id: 'user-1' };

            mockFromImpl.mockImplementation((table: string) => {
                if (table === 'workspace_members') {
                    // Primeira chamada (memberships) → vazio
                    // Segunda chamada (insert membership) → sucesso
                    const selectEq = vi.fn().mockResolvedValue({ data: [], error: null });
                    const insertFn = vi.fn().mockResolvedValue({ error: null });
                    return { select: vi.fn().mockReturnValue({ eq: selectEq }), insert: insertFn };
                }
                if (table === 'profiles') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
                            }),
                        }),
                    };
                }
                if (table === 'workspaces') {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: newWorkspace, error: null }),
                            }),
                        }),
                        select: vi.fn().mockReturnValue({
                            in: vi.fn().mockResolvedValue({ data: [newWorkspace], error: null }),
                        }),
                    };
                }
                return {};
            });

            await useWorkspaceStore.getState().fetchWorkspaces();

            const { workspaces, loading } = useWorkspaceStore.getState();
            expect(loading).toBe(false);
            expect(workspaces).toHaveLength(1);
            expect(workspaces[0].name).toBe('Test User Workspace');
        });

        it('define erro se criação de workspace falhar', async () => {
            mockFromImpl.mockImplementation((table: string) => {
                if (table === 'workspace_members') {
                    return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
                }
                if (table === 'profiles') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
                            }),
                        }),
                    };
                }
                if (table === 'workspaces') {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'creation failed' } }),
                            }),
                        }),
                    };
                }
                return {};
            });

            await useWorkspaceStore.getState().fetchWorkspaces();

            expect(useWorkspaceStore.getState().error).toBe('Erro ao criar workspace padrão.');
            expect(useWorkspaceStore.getState().loading).toBe(false);
        });

        it('cria perfil do usuário quando não existe antes de criar workspace', async () => {
            const newWorkspace = { id: 'ws-new', name: 'Test User Workspace', created_at: '2026-01-01', owner_id: 'user-1' };
            const mockInsertProfile = vi.fn().mockResolvedValue({ error: null });

            mockFromImpl.mockImplementation((table: string) => {
                if (table === 'workspace_members') {
                    return {
                        select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
                        insert: vi.fn().mockResolvedValue({ error: null }),
                    };
                }
                if (table === 'profiles') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
                            }),
                        }),
                        insert: mockInsertProfile,
                    };
                }
                if (table === 'workspaces') {
                    return {
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: newWorkspace, error: null }),
                            }),
                        }),
                        select: vi.fn().mockReturnValue({
                            in: vi.fn().mockResolvedValue({ data: [newWorkspace], error: null }),
                        }),
                    };
                }
                return {};
            });

            await useWorkspaceStore.getState().fetchWorkspaces();

            expect(mockInsertProfile).toHaveBeenCalledOnce();
            const profileArg = mockInsertProfile.mock.calls[0][0];
            expect(profileArg.id).toBe('user-1');
            expect(profileArg.email).toBe('test@example.com');
        });
    });
});
