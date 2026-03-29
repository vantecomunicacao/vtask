import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { CheckCircle, LayoutDashboard, Calendar as CalendarIcon, Settings, LogOut, Folder, FileText, Mail, Layers, Trash2, BookOpen, Shield, Search, Archive, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useEffect, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useTaskStore } from '../../store/taskStore';
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
    const { projects, fetchProjects } = useProjectStore();
    const { fetchCategories } = useTaskStore();
    const { subscribeToNotifications, unsubscribe } = useNotificationStore();
    const navigate = useNavigate();
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
    const [projectsExpanded, setProjectsExpanded] = useState(true);

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

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email ?? 'User')}&background=fdf3f2&color=db4035`;

    return (
        <div className="flex h-screen bg-surface-1 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-surface-1 border-r border-border-subtle flex flex-col fade-in">
                <div className="h-16 flex items-center px-6 border-b border-border-subtle cursor-pointer hover:bg-surface-0 transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm">
                            {activeWorkspace?.name?.substring(0, 2)?.toUpperCase() || 'FD'}
                        </div>
                        <span className="font-bold text-primary truncate max-w-[140px]">{activeWorkspace?.name || 'FlowDesk'}</span>
                    </div>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                    <nav className="space-y-1">
                        <NavLink to="/dashboard" className={navLinkClass}>
                            <LayoutDashboard size={18} />
                            Dashboard
                        </NavLink>
                        <NavLink to="/tarefas" className={navLinkClass}>
                            <CheckCircle size={18} />
                            Tarefas
                        </NavLink>
                        <NavLink to="/documentos" className={navLinkClass}>
                            <FileText size={18} />
                            Documentos
                        </NavLink>
                        <NavLink to="/projetos" className={navLinkClass}>
                            <Folder size={18} />
                            Todos os Projetos
                        </NavLink>
                        <NavLink to="/agenda" className={navLinkClass}>
                            <CalendarIcon size={18} />
                            <span className="flex-1">Agenda</span>
                            <span className="text-[9px] font-bold uppercase tracking-wide text-muted bg-surface-2 border border-border-subtle px-1.5 py-0.5 rounded-full">Em breve</span>
                        </NavLink>
                        <NavLink to="/gerador-email" className={navLinkClass}>
                            <Mail size={18} />
                            <span className="flex-1">Gerador de E-mails</span>
                            <span className="text-[9px] font-bold uppercase tracking-wide text-muted bg-surface-2 border border-border-subtle px-1.5 py-0.5 rounded-full">Em breve</span>
                        </NavLink>
                        <NavLink to="/design-system" className={navLinkClass}>
                            <Layers size={18} />
                            Design System
                        </NavLink>
                    </nav>

                    {(() => {
                        const activeProjects = projects.filter(p => p.status === 'active');
                        const archivedCount = projects.filter(p => p.status === 'archived' || p.status === 'completed').length;
                        return (
                            <div className="mt-6">
                                <button
                                    onClick={() => setProjectsExpanded(v => !v)}
                                    className="w-full flex items-center gap-1 px-3 mb-1 group"
                                >
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex-1 text-left">Projetos Ativos</span>
                                    {projectsExpanded ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
                                </button>
                                {projectsExpanded && (
                                    <div className="space-y-0.5">
                                        {activeProjects.length === 0 ? (
                                            <p className="px-3 py-2 text-xs text-muted">Nenhum projeto ativo.</p>
                                        ) : activeProjects.map(p => (
                                            <NavLink key={p.id} to={`/projetos/${p.id}`} className={({ isActive }) => `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors ${isActive ? 'text-brand bg-brand-light' : 'text-secondary hover:bg-surface-0'}`}>
                                                <span style={p.color ? { color: p.color } : { color: '#9ca3af' }} className="font-bold">#</span>
                                                <span className="truncate">{p.name}</span>
                                            </NavLink>
                                        ))}
                                        {archivedCount > 0 && (
                                            <NavLink to="/arquivados" className={({ isActive }) => `flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] transition-colors mt-1 ${isActive ? 'text-brand bg-brand-light' : 'text-muted hover:bg-surface-0 hover:text-secondary'}`}>
                                                <Archive size={12} />
                                                <span>{archivedCount} arquivado{archivedCount !== 1 ? 's' : ''}</span>
                                            </NavLink>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                <div className="p-4 border-t border-border-subtle space-y-1">
                    <NavLink to="/arquivados" className={navLinkClass}>
                        <Archive size={18} />
                        Arquivados
                    </NavLink>
                    <NavLink to="/lixeira" className={navLinkClass}>
                        <Trash2 size={18} />
                        Lixeira
                    </NavLink>
                    {isPlatformAdmin && (
                        <NavLink to="/admin" className={navLinkClass}>
                            <Shield size={18} />
                            Admin
                        </NavLink>
                    )}
                    <NavLink to="/configuracoes" className={navLinkClass}>
                        <Settings size={18} />
                        Configurações
                    </NavLink>
                    <NavLink to="/documentacao" className={navLinkClass}>
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
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-surface-1">
                <header className="h-16 shrink-0 border-b border-border-subtle bg-surface-card/60 backdrop-blur-sm z-10 flex items-center px-8">
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
                        <NotificationPanel />
                        <span className="text-sm text-muted hidden sm:block">{user?.email}</span>
                        <div className="w-8 h-8 rounded-full border border-border-subtle overflow-hidden">
                            <img src={avatarUrl} alt="Avatar" />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8">
                    <Outlet />
                </div>
            </main>

        {showOnboarding && <OnboardingModal />}
        </div>
    );
}
