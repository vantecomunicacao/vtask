import { useState, useRef, useCallback, useEffect } from 'react';
import { storage } from '../lib/storage';

const MIN_WIDTH = 180;
const MAX_WIDTH = 400;

export function useSidebarState() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(
        () => storage.get('fd_sidebar_collapsed') === 'true'
    );
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = storage.get('fd_sidebar_width');
        return saved ? parseInt(saved, 10) : 256;
    });
    const isDragging = useRef(false);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    const toggleCollapsed = useCallback(() => {
        setSidebarCollapsed(v => {
            storage.set('fd_sidebar_collapsed', String(!v));
            return !v;
        });
    }, []);

    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    const onResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMove = (ev: MouseEvent) => {
            if (!isDragging.current) return;
            setSidebarWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, ev.clientX)));
        };

        const onUp = () => {
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            setSidebarWidth(w => { storage.set('fd_sidebar_width', String(w)); return w; });
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, []);

    return {
        sidebarOpen, setSidebarOpen,
        isMobile,
        sidebarCollapsed,
        toggleCollapsed,
        closeSidebar,
        sidebarWidth,
        onResizeStart,
    };
}
