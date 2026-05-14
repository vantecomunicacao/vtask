import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── localStorage mock ────────────────────────────────────────────
const store: Record<string, string> = {};
const localStorageMock = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};
vi.stubGlobal('localStorage', localStorageMock);

// Import after mocks
import { storage } from '../../lib/storage';

describe('storage', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.restoreAllMocks();
        // Restore stubbed implementations after restoreAllMocks
        vi.stubGlobal('localStorage', localStorageMock);
    });

    describe('get / set', () => {
        it('retorna null quando chave não existe', () => {
            expect(storage.get('inexistente')).toBeNull();
        });

        it('armazena e recupera string', () => {
            storage.set('key', 'valor');
            expect(storage.get('key')).toBe('valor');
        });

        it('retorna null quando getItem lança erro (modo privado)', () => {
            const throwing = { ...localStorageMock, getItem: () => { throw new Error('blocked'); } };
            vi.stubGlobal('localStorage', throwing);
            expect(storage.get('key')).toBeNull();
        });

        it('não lança quando setItem falha', () => {
            const throwing = { ...localStorageMock, setItem: () => { throw new Error('quota exceeded'); } };
            vi.stubGlobal('localStorage', throwing);
            expect(() => storage.set('key', 'val')).not.toThrow();
        });
    });

    describe('getJSON / setJSON', () => {
        it('retorna fallback quando chave não existe', () => {
            expect(storage.getJSON('vazio', { default: true })).toEqual({ default: true });
        });

        it('armazena e recupera objeto', () => {
            const obj = { a: 1, b: 'dois' };
            storage.setJSON('obj', obj);
            expect(storage.getJSON('obj', {})).toEqual(obj);
        });

        it('retorna fallback quando JSON é inválido', () => {
            localStorageMock.setItem('ruim', 'não é json{');
            expect(storage.getJSON('ruim', 42)).toBe(42);
        });

        it('não lança quando setJSON falha', () => {
            const throwing = { ...localStorageMock, setItem: () => { throw new Error('quota exceeded'); } };
            vi.stubGlobal('localStorage', throwing);
            expect(() => storage.setJSON('key', { x: 1 })).not.toThrow();
        });
    });
});
