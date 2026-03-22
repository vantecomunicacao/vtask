import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Supabase ────────────────────────────────────────────────
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: mockSelect,
        })),
        auth: {
            getUser: vi.fn(),
        },
    },
}));

vi.mock('sonner', () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

// Import after mocks
import { useDocumentFolderStore } from '../../store/documentFolderStore';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

describe('documentFolderStore — fetchFolders', () => {
    beforeEach(() => {
        // Reset store to initial state
        useDocumentFolderStore.setState({ folders: [], loading: false, error: null });
        vi.clearAllMocks();

        // Default chain
        mockOrder.mockResolvedValue({ data: [], error: null });
        mockEq.mockReturnValue({ order: mockOrder });
        mockSelect.mockReturnValue({ eq: mockEq });
    });

    it('sets folders on success', async () => {
        const folder = { id: '1', name: 'Design', workspace_id: 'w1', parent_id: null, created_by: null, created_at: '2025-01-01' };
        mockOrder.mockResolvedValue({ data: [folder], error: null });

        await useDocumentFolderStore.getState().fetchFolders('w1');

        const { folders, loading, error } = useDocumentFolderStore.getState();
        expect(folders).toEqual([folder]);
        expect(loading).toBe(false);
        expect(error).toBeNull();
    });

    it('sets error and calls toast.error on failure', async () => {
        mockOrder.mockResolvedValue({ data: null, error: { message: 'network error' } });

        await useDocumentFolderStore.getState().fetchFolders('w1');

        const { folders, loading, error } = useDocumentFolderStore.getState();
        expect(error).toBe('network error');
        expect(loading).toBe(false);
        expect(folders).toEqual([]); // unchanged
        expect(toast.error).toHaveBeenCalledWith('Erro ao carregar pastas');
    });

    it('sets loading to false even on error', async () => {
        mockOrder.mockResolvedValue({ data: null, error: { message: 'timeout' } });

        await useDocumentFolderStore.getState().fetchFolders('w1');

        expect(useDocumentFolderStore.getState().loading).toBe(false);
    });
});

// ─── createFolder ─────────────────────────────────────────────────
const folder = { id: 'f1', name: 'Design', workspace_id: 'w1', parent_id: null, created_by: 'u1', created_at: '2025-01-01' };

describe('documentFolderStore — createFolder', () => {
    beforeEach(() => {
        useDocumentFolderStore.setState({ folders: [], loading: false, error: null });
        vi.clearAllMocks();
    });

    it('cria pasta e adiciona ao estado', async () => {
        vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'u1' } } } as never);
        const mockSingle = vi.fn().mockResolvedValue({ data: folder, error: null });
        const mockSelectChain = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelectChain });
        vi.mocked(supabase.from).mockReturnValueOnce({ insert: mockInsert } as never);

        const result = await useDocumentFolderStore.getState().createFolder('Design', 'w1');

        expect(result).toEqual(folder);
        expect(useDocumentFolderStore.getState().folders).toContainEqual(folder);
    });

    it('retorna null quando usuário não está autenticado', async () => {
        vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null } } as never);

        const result = await useDocumentFolderStore.getState().createFolder('Design', 'w1');

        expect(result).toBeNull();
        expect(useDocumentFolderStore.getState().folders).toHaveLength(0);
    });

    it('retorna null quando insert falha', async () => {
        vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'u1' } } } as never);
        const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
        const mockSelectChain = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelectChain });
        vi.mocked(supabase.from).mockReturnValueOnce({ insert: mockInsert } as never);

        const result = await useDocumentFolderStore.getState().createFolder('Design', 'w1');

        expect(result).toBeNull();
    });

    it('ordena pastas alfabeticamente após criar', async () => {
        const existingFolder = { ...folder, id: 'f0', name: 'Zeta' };
        useDocumentFolderStore.setState({ folders: [existingFolder] });

        vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'u1' } } } as never);
        const mockSingle = vi.fn().mockResolvedValue({ data: folder, error: null });
        const mockSelectChain = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelectChain });
        vi.mocked(supabase.from).mockReturnValueOnce({ insert: mockInsert } as never);

        await useDocumentFolderStore.getState().createFolder('Design', 'w1');

        const names = useDocumentFolderStore.getState().folders.map(f => f.name);
        expect(names).toEqual(['Design', 'Zeta']); // alfabética
    });
});

// ─── renameFolder ─────────────────────────────────────────────────
describe('documentFolderStore — renameFolder', () => {
    beforeEach(() => {
        useDocumentFolderStore.setState({ folders: [folder], loading: false, error: null });
        vi.clearAllMocks();
    });

    it('atualiza nome da pasta no estado em caso de sucesso', async () => {
        const mockEqFn = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqFn });
        vi.mocked(supabase.from).mockReturnValueOnce({ update: mockUpdate } as never);

        await useDocumentFolderStore.getState().renameFolder('f1', 'Novo Nome');

        expect(useDocumentFolderStore.getState().folders[0].name).toBe('Novo Nome');
    });

    it('não altera estado quando DB retorna erro', async () => {
        const mockEqFn = vi.fn().mockResolvedValue({ error: { message: 'rename failed' } });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqFn });
        vi.mocked(supabase.from).mockReturnValueOnce({ update: mockUpdate } as never);

        await useDocumentFolderStore.getState().renameFolder('f1', 'Novo Nome');

        expect(useDocumentFolderStore.getState().folders[0].name).toBe('Design'); // inalterado
    });
});

// ─── deleteFolder ─────────────────────────────────────────────────
describe('documentFolderStore — deleteFolder', () => {
    beforeEach(() => {
        useDocumentFolderStore.setState({ folders: [folder], loading: false, error: null });
        vi.clearAllMocks();
    });

    it('remove pasta do estado em caso de sucesso', async () => {
        const mockEqFn = vi.fn().mockResolvedValue({ error: null });
        const mockDelete = vi.fn().mockReturnValue({ eq: mockEqFn });
        vi.mocked(supabase.from).mockReturnValueOnce({ delete: mockDelete } as never);

        await useDocumentFolderStore.getState().deleteFolder('f1');

        expect(useDocumentFolderStore.getState().folders).toHaveLength(0);
    });

    it('mantém pasta no estado quando DB retorna erro', async () => {
        const mockEqFn = vi.fn().mockResolvedValue({ error: { message: 'delete failed' } });
        const mockDelete = vi.fn().mockReturnValue({ eq: mockEqFn });
        vi.mocked(supabase.from).mockReturnValueOnce({ delete: mockDelete } as never);

        await useDocumentFolderStore.getState().deleteFolder('f1');

        expect(useDocumentFolderStore.getState().folders).toHaveLength(1);
    });
});
