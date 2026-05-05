import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColumnResize } from '../../hooks/useColumnResize';

// ─── Mock localStorage ────────────────────────────────────────────
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('useColumnResize', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it('retorna gridTemplate com larguras padrão na inicialização', () => {
        const { result } = renderHook(() => useColumnResize());
        expect(result.current.gridTemplate).toContain('280px'); // title default
        expect(result.current.gridTemplate).toContain('130px'); // project default
    });

    it('restaura larguras salvas do localStorage', () => {
        localStorageMock.setItem('fd_task_col_widths', JSON.stringify({ title: 400, project: 200 }));

        const { result } = renderHook(() => useColumnResize());
        expect(result.current.gridTemplate).toContain('400px');
        expect(result.current.gridTemplate).toContain('200px');
    });

    it('usa larguras padrão quando localStorage contém JSON inválido', () => {
        localStorageMock.setItem('fd_task_col_widths', 'invalid-json');

        const { result } = renderHook(() => useColumnResize());
        expect(result.current.gridTemplate).toContain('280px');
    });

    it('onColResizeStart retorna uma função handler', () => {
        const { result } = renderHook(() => useColumnResize());
        const handler = result.current.onColResizeStart('title');
        expect(typeof handler).toBe('function');
    });

    it('gridTemplate contém todas as 7 colunas', () => {
        const { result } = renderHook(() => useColumnResize());
        const cols = result.current.gridTemplate.split(' ');
        expect(cols).toHaveLength(7);
    });

    it('onColResizeStart previne comportamento padrão e configura cursor', () => {
        const { result } = renderHook(() => useColumnResize());
        const handler = result.current.onColResizeStart('title');

        const mockEvent = {
            preventDefault: vi.fn(),
            clientX: 100,
        } as unknown as React.MouseEvent;

        const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

        act(() => { handler(mockEvent); });

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(document.body.style.cursor).toBe('col-resize');
        expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

        // cleanup
        document.body.style.cursor = '';
        addEventListenerSpy.mockRestore();
    });
});
