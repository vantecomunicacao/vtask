import { useState, useCallback } from 'react';
import { storage } from '../lib/storage';

export const COL_IDS = ['title', 'project', 'due', 'created', 'priority', 'assignee', 'actions'] as const;
export type ColId = typeof COL_IDS[number];

const DEFAULT_COL_W: Record<ColId, number> = { title: 280, project: 130, due: 110, created: 100, assignee: 48, priority: 90, actions: 44 };
const MIN_COL_W: Record<ColId, number> = { title: 150, project: 80, due: 80, created: 80, assignee: 48, priority: 60, actions: 44 };
export const RESIZABLE_COLS = new Set<ColId>(['title', 'project', 'due', 'created', 'assignee', 'priority']);

const STORAGE_KEY = 'fd_task_col_widths';

export function useColumnResize() {
    const [colWidths, setColWidths] = useState<Record<ColId, number>>(() =>
        ({ ...DEFAULT_COL_W, ...storage.getJSON<Partial<Record<ColId, number>>>(STORAGE_KEY, {}) })
    );

    const gridTemplate = COL_IDS.map(id => `${colWidths[id]}px`).join(' ');

    const onColResizeStart = useCallback((colId: ColId) => (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = colWidths[colId];
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMove = (ev: MouseEvent) => {
            const next = Math.max(MIN_COL_W[colId], startWidth + (ev.clientX - startX));
            setColWidths(prev => ({ ...prev, [colId]: next }));
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            setColWidths(prev => { storage.setJSON(STORAGE_KEY, prev); return prev; });
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [colWidths]);

    return { colWidths, gridTemplate, onColResizeStart };
}
