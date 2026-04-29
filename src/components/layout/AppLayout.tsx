import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Monitor } from 'lucide-react';
import { CheckCircle, LayoutDashboard, Calendar as CalendarIcon, Settings, LogOut, Folder, FileText, Mail, Trash2, BookOpen, Shield, Search, Archive, Menu, X, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useThemeStore } from '../../store/themeStore';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useTaskStore } from '../../store/taskStore';
import { ProjectsSidebarSection } from './ProjectsSidebarSection';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { supabase } from '../../lib/supabase';
import { useNotificationStore } from '../../store/notificationStore';
import { NotificationPanel } from '../ui/NotificationPanel';
import { OnboardingModal } from '../onboarding/OnboardingModal';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors ${isActive
        ? 'text-brand bg-brand-light'
        : 'text-secondary hover:bg-surface-0'
    }`;

export default function AppLayout() {
    const { user, signOut } = useAuthStore();
    const { activeWorkspace, fetchWorkspaces, showOnboarding } = useWorkspaceStore();
    const { fetchProjects } = useProjectStore();
    const { fetchCategories, subscribeToWorkspace } = useTaskStore();
    const { subscribeToNotifications, unsubscribe } = useNotificationStore();
    const { darkMode, toggleDarkMode } = useThemeStore();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

    const MOBILE_ALLOWED = ['/dashboard', '/tarefas', '/documentos'];
    const isMobileAllowed = MOBILE_ALLOWED.some(p => pathname === p || pathname.startsWith(p + '/'));
    const [projectsExpanded, setProjectsExpanded] = useState(true);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    const MIN_WIDTH = 180;
    const MAX_WIDTH = 400;
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = localStorage.getItem('fd_sidebar_width');
        return saved ? parseInt(saved, 10) : 256;
    });
    const isDragging = useRef(false);

    const onResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMove = (ev: MouseEvent) => {
            if (!isDragging.current) return;
            const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, ev.clientX));
            setSidebarWidth(next);
        };

        const onUp = () => {
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            setSidebarWidth(w => { localStorage.setItem('fd_sidebar_width', String(w)); return w; });
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, []);

    useEffect(() => {
        if (!user) return;
        (async () => {
            const { data } = await supabase
                .from('profiles')
                .select('is_platform_admin')
                .eq('id', user.id)
                .single();
            setIsPlatformAdmin(data?.is_platform_admin ?? false);
        })();
    }, [user]);

    useKeyboardShortcuts();

    useEffect(() => {
        if (user) {
            subscribeToNotifications(user.id);
            return () => unsubscribe();
        }
    }, [user, subscribeToNotifications, unsubscribe]);

    useEffect(() => {
        fetchWorkspaces();
    }, [fetchWorkspaces]);

    useEffect(() => {
        if (activeWorkspace) {
            fetchProjects(activeWorkspace.id);
            fetchCategories(activeWorkspace.id);
        }
    }, [activeWorkspace, fetchProjects, fetchCategories]);

    useEffect(() => {
        if (!activeWorkspace) return;
        return subscribeToWorkspace(activeWorkspace.id);
    }, [activeWorkspace?.id, subscribeToWorkspace]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email ?? 'User')}&background=fdf3f2&color=db4035`;

    return (
        <div className="flex h-screen bg-surface-1 overflow-hidden">
            {/* Mobile backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 md:hidden"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <aside
                id="sidebar"
                aria-label="Menu de navegação"
                style={isMobile ? undefined : { width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth }}
                className={
                    isMobile
                        ? `bg-surface-1 border-r border-border-subtle flex flex-col w-72 fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
                        : 'bg-surface-1 border-r border-border-subtle flex flex-col relative fade-in'
                }
            >
                {/* Resize handle (desktop only) */}
                {!isMobile && (
                    <div
                        onMouseDown={onResizeStart}
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize z-10 group"
                    >
                        <div className="h-full w-px bg-transparent group-hover:bg-brand/40 transition-colors" />
                    </div>
                )}

                <div className="h-16 flex items-center px-6 border-b border-border-subtle cursor-pointer hover:bg-surface-0 transition-colors">
                    <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm">
                            {activeWorkspace?.name?.substring(0, 2)?.toUpperCase() || 'VT'}
                        </div>
                        <span className="font-bold text-primary truncate max-w-[140px]">{activeWorkspace?.name || 'VTask'}</span>
                    </div>
                    <button
                        onClick={closeSidebar}
                        aria-label="Fechar menu"
                        className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg text-secondary hover:bg-surface-0 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                    <nav aria-label="Menu principal" className="space-y-1">
                        <NavLink to="/dashboard" className={navLinkClass} onClick={closeSidebar}>
                            <LayoutDashboard size={18} />
                            Dashboard
                        </NavLink>
                        <NavLink to="/tarefas" className={navLinkClass} onClick={closeSidebar}>
                            <CheckCircle size={18} />
                            Tarefas
                        </NavLink>
                        <NavLink to="/documentos" className={navLinkClass} onClick={closeSidebar}>
                            <FileText size={18} />
                            Documentos
                        </NavLink>
                        <NavLink to="/projetos" className={navLinkClass} onClick={closeSidebar}>
                            <Folder size={18} />
                            Todos os Projetos
                        </NavLink>
                        <NavLink to="/agenda" className={navLinkClass} onClick={closeSidebar}>
                            <CalendarIcon size={18} />
                            <span className="flex-1">Agenda</span>
                            <span className="text-[9px] font-bold uppercase tracking-wide text-muted bg-surface-2 border border-border-subtle px-1.5 py-0.5 rounded-full">Em breve</span>
                        </NavLink>
                        <NavLink to="/gerador-email" className={navLinkClass} onClick={closeSidebar}>
                            <Mail size={18} />
                            <span className="flex-1">Gerador de E-mails</span>
                            <span className="text-[9px] font-bold uppercase tracking-wide text-muted bg-surface-2 border border-border-subtle px-1.5 py-0.5 rounded-full">Em breve</span>
                        </NavLink>
                    </nav>

                    <ProjectsSidebarSection
                        projectsExpanded={projectsExpanded}
                        setProjectsExpanded={setProjectsExpanded}
                    />
                </div>

                <div className="p-4 border-t border-border-subtle space-y-1">
                    <NavLink to="/arquivados" className={navLinkClass} onClick={closeSidebar}>
                        <Archive size={18} />
                        Arquivados
                    </NavLink>
                    <NavLink to="/lixeira" className={navLinkClass} onClick={closeSidebar}>
                        <Trash2 size={18} />
                        Lixeira
                    </NavLink>
                    {isPlatformAdmin && (
                        <NavLink to="/admin" className={navLinkClass} onClick={closeSidebar}>
                            <Shield size={18} />
                            Admin
                        </NavLink>
                    )}
                    <NavLink to="/configuracoes" className={navLinkClass} onClick={closeSidebar}>
                        <Settings size={18} />
                        Configurações
                    </NavLink>
                    <NavLink to="/documentacao" className={navLinkClass} onClick={closeSidebar}>
                        <BookOpen size={18} />
                        Documentação
                    </NavLink>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] text-secondary hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                        <LogOut size={18} />
                        Sair
                    </button>
                </div>
                <div className="px-4 pb-4 pt-2">
                    <span className="text-[10px] text-muted/50 select-none">v1.1</span>
                </div>
            </aside>


            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-surface-1 min-w-0">
                <header className="h-16 shrink-0 border-b border-border-subtle bg-surface-card/60 backdrop-blur-sm z-10 flex items-center px-4 md:px-8">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Abrir menu"
                        aria-expanded={sidebarOpen}
                        aria-controls="sidebar"
                        className="md:hidden w-11 h-11 -ml-2 mr-1 flex items-center justify-center rounded-lg text-secondary hover:bg-surface-0 transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                    <div className="flex-1" />
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
                            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-0 text-muted text-sm hover:border-brand/40 hover:text-secondary transition-colors"
                        >
                            <Search size={13} />
                            <span className="text-xs">Buscar...</span>
                            <kbd className="text-[10px] font-mono bg-surface-1 border border-border-subtle px-1 rounded ml-1">⌘K</kbd>
                        </button>
                        <button
                            onClick={toggleDarkMode}
                            aria-label={darkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                            title={darkMode ? 'Tema claro' : 'Tema escuro'}
                            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] text-muted hover:text-primary hover:bg-surface-0 transition-colors"
                        >
                            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <NotificationPanel />
                        <span className="text-sm text-muted hidden sm:block">{user?.email}</span>
                        <div className="w-8 h-8 rounded-full border border-border-subtle overflow-hidden">
                            <img src={avatarUrl} alt="Avatar" />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-4 md:p-8">
                    {isMobile && !isMobileAllowed ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6">
                            <div className="w-16 h-16 rounded-2xl bg-surface-0 border border-border-subtle flex items-center justify-center">
                                <Monitor size={28} className="text-muted" />
                            </div>
                            <div>
                                <p className="text-base font-bold text-primary">Esta página é melhor no computador</p>
                                <p className="text-sm text-muted mt-1">Acesse pelo desktop para usar esta funcionalidade.</p>
                            </div>
                            <div className="mt-2 px-4 py-3 rounded-xl bg-surface-card border border-border-subtle text-xs text-secondary space-y-1">
                                <p className="font-bold text-muted uppercase tracking-widest text-[10px] mb-2">Disponível no mobile</p>
                                <p>· Dashboard</p>
                                <p>· Tarefas</p>
                                <p>· Documentos</p>
                            </div>
                        </div>
                    ) : (
                        <Outlet />
                    )}
                </div>
            </main>

        {showOnboarding && <OnboardingModal />}
        </div>
    );
}
