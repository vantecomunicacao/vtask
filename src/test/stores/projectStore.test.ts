import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Supabase ────────────────────────────────────────────────
const { mockFromImpl } = vi.hoisted(() => {
    const mockFromImpl = vi.fn();
    return { mockFromImpl };
});

vi.mock('../../lib/supabase', () => ({
    supabase: { from: mockFromImpl },
}));

// Import after mocks
import { useProjectStore } from '../../store/projectStore';

// ─── Helpers ──────────────────────────────────────────────────────
function resetStore() {
    useProjectStore.setState({
        projects: [],
        loading: false,
        error: null,
    });
}

function makeProject(overrides: Record<string, unknown> = {}) {
    return {
        id: 'p1',
        name: 'Projeto Teste',
        workspace_id: 'w1',
        status: 'active' as const,
        color: '#6366f1',
        icon: null,
        folder_id: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        description: null,
        client_id: null,
        start_date: null,
        due_date: null,
        deadline: null,
        client: null,
        ...overrides,
    };
}

function mockSuccessfulUpdate() {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFromImpl.mockReturnValue({ update: mockUpdate });
    return { mockEq, mockUpdate };
}

function mockFailedUpdate(message: string) {
    const mockEq = vi.fn().mockResolvedValue({ error: { message } });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFromImpl.mockReturnValue({ update: mockUpdate });
}

// ─── Tests ────────────────────────────────────────────────────────
describe('projectStore', () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
    });

    // ── updateProject ─────────────────────────────────────────────
    describe('updateProject', () => {
        it('atualiza projeto no estado local em caso de sucesso', async () => {
            useProjectStore.setState({ projects: [makeProject()] });
            mockSuccessfulUpdate();

            await useProjectStore.getState().updateProject('p1', { name: 'Novo Nome' });

            expect(useProjectStore.getState().projects[0].name).toBe('Novo Nome');
        });

        it('define error e lança exceção em caso de falha', async () => {
            useProjectStore.setState({ projects: [makeProject()] });
            mockFailedUpdate('update failed');

            await expect(
                useProjectStore.getState().updateProject('p1', { name: 'Novo' })
            ).rejects.toBeTruthy();

            expect(useProjectStore.getState().error).toBe('update failed');
        });
    });

    // ── archiveProject ────────────────────────────────────────────
    describe('archiveProject', () => {
        it('muda status para archived via updateProject', async () => {
            useProjectStore.setState({ projects: [makeProject({ status: 'active' })] });
            mockSuccessfulUpdate();

            await useProjectStore.getState().archiveProject('p1');

            expect(useProjectStore.getState().projects[0].status).toBe('archived');
        });
    });

    // ── completeProject ───────────────────────────────────────────
    describe('completeProject', () => {
        it('muda status para completed via updateProject', async () => {
            useProjectStore.setState({ projects: [makeProject({ status: 'active' })] });
            mockSuccessfulUpdate();

            await useProjectStore.getState().completeProject('p1');

            expect(useProjectStore.getState().projects[0].status).toBe('completed');
        });
    });

    // ── reactivateProject ─────────────────────────────────────────
    describe('reactivateProject', () => {
        it('muda status para active via updateProject', async () => {
            useProjectStore.setState({ projects: [makeProject({ status: 'archived' })] });
            mockSuccessfulUpdate();

            await useProjectStore.getState().reactivateProject('p1');

            expect(useProjectStore.getState().projects[0].status).toBe('active');
        });
    });

    // ── deleteProject ─────────────────────────────────────────────
    describe('deleteProject', () => {
        it('remove projeto do estado local em caso de sucesso', async () => {
            useProjectStore.setState({ projects: [makeProject()] });

            const mockEq = vi.fn().mockResolvedValue({ error: null });
            const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
            mockFromImpl.mockReturnValue({ delete: mockDelete });

            await useProjectStore.getState().deleteProject('p1');

            expect(useProjectStore.getState().projects).toHaveLength(0);
        });

        it('define error e lança exceção em caso de falha', async () => {
            useProjectStore.setState({ projects: [makeProject()] });

            const mockEq = vi.fn().mockResolvedValue({ error: { message: 'delete failed' } });
            const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
            mockFromImpl.mockReturnValue({ delete: mockDelete });

            await expect(
                useProjectStore.getState().deleteProject('p1')
            ).rejects.toBeTruthy();

            expect(useProjectStore.getState().projects).toHaveLength(1);
        });
    });

    // ── moveToFolder ──────────────────────────────────────────────
    describe('moveToFolder', () => {
        const FOLDER_UUID = 'f1000000-0000-4000-8000-000000000099';

        it('atualiza folder_id do projeto', async () => {
            useProjectStore.setState({ projects: [makeProject({ folder_id: null })] });
            mockSuccessfulUpdate();

            await useProjectStore.getState().moveToFolder('p1', FOLDER_UUID);

            expect(useProjectStore.getState().projects[0].folder_id).toBe(FOLDER_UUID);
        });

        it('remove projeto da pasta quando folderId é null', async () => {
            useProjectStore.setState({ projects: [makeProject({ folder_id: FOLDER_UUID })] });
            mockSuccessfulUpdate();

            await useProjectStore.getState().moveToFolder('p1', null);

            expect(useProjectStore.getState().projects[0].folder_id).toBeNull();
        });
    });
});
