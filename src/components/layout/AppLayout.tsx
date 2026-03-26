import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { CheckCircle, LayoutDashboard, Calendar as CalendarIcon, Settings, LogOut, Folder, FileText, Mail, Layers, Trash2, BookOpen } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useTaskStore } from '../../store/taskStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors ${isActive
        ? 'text-brand bg-brand-light'
        : 'text-secondary hover:bg-surface-0'
    }`;

export default function AppLayout() {
    const { user, signOut } = useAuthStore();
    const { activeWorkspace, fetchWorkspaces } = useWorkspaceStore();
    const { projects, fetchProjects } = useProjectStore();
    const { fetchCategories } = useTaskStore();
    const navigate = useNavigate();

    useKeyboardShortcuts();

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

                    {projects.length > 0 && (
                        <div className="mt-8">
                            <h4 className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Seus Projetos</h4>
                            <div className="space-y-1">
                                {projects.map(p => (
                                    <NavLink key={p.id} to={`/projetos/${p.id}`} className={({ isActive }) => `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors ${isActive ? 'text-brand' : 'text-secondary hover:bg-surface-0'}`}>
                                        <span className={p.color ? '' : 'text-gray-400 font-bold'} style={p.color ? { color: p.color } : {}}>#</span>
                                        <span className="truncate">{p.name}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-border-subtle space-y-1">
                    <NavLink to="/lixeira" className={navLinkClass}>
                        <Trash2 size={18} />
                        Lixeira
                    </NavLink>
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
        </div>
    );
}
