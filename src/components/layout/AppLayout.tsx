import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { CheckCircle, LayoutDashboard, Calendar as CalendarIcon, Settings, LogOut, Folder } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
        ? 'text-brand bg-brand-light'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

export default function AppLayout() {
    const { user, signOut } = useAuthStore();
    const { activeWorkspace, fetchWorkspaces } = useWorkspaceStore();
    const { projects, fetchProjects } = useProjectStore();
    const navigate = useNavigate();

    useKeyboardShortcuts();

    useEffect(() => {
        fetchWorkspaces();
    }, [fetchWorkspaces]);

    useEffect(() => {
        if (activeWorkspace) {
            fetchProjects(activeWorkspace.id);
        }
    }, [activeWorkspace, fetchProjects]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email ?? 'User')}&background=fdf3f2&color=db4035`;

    return (
        <div className="flex h-screen bg-bg-main overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-bg-sidebar border-r border-border-subtle flex flex-col fade-in">
                <div className="h-16 flex items-center px-6 border-b border-border-subtle cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm">
                            {activeWorkspace?.name?.substring(0, 2)?.toUpperCase() || 'FD'}
                        </div>
                        <span className="font-bold text-gray-900 truncate max-w-[140px]">{activeWorkspace?.name || 'FlowDesk'}</span>
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
                            Minhas Tarefas
                        </NavLink>
                        <NavLink to="/configuracoes" className={navLinkClass}>
                            <Settings size={18} />
                            Configurações
                        </NavLink>
                        <NavLink to="/projetos" className={navLinkClass}>
                            <Folder size={18} />
                            Todos os Projetos
                        </NavLink>
                        <NavLink to="/agenda" className={navLinkClass}>
                            <CalendarIcon size={18} />
                            Agenda
                        </NavLink>
                    </nav>

                    {projects.length > 0 && (
                        <div className="mt-8">
                            <h4 className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Seus Projetos</h4>
                            <div className="space-y-1">
                                {projects.map(p => (
                                    <NavLink key={p.id} to={`/projetos/${p.id}`} className={({ isActive }) => `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'text-brand' : 'text-gray-600 hover:bg-gray-100'}`}>
                                        <span className={p.color ? '' : 'text-gray-400 font-bold'} style={p.color ? { color: p.color } : {}}>#</span>
                                        <span className="truncate">{p.name}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-border-subtle space-y-1">
                    <NavLink to="/configuracoes" className={navLinkClass}>
                        <Settings size={18} />
                        Configurações
                    </NavLink>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                        <LogOut size={18} />
                        Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-bg-main relative">
                <header className="h-16 border-b border-border-subtle bg-white/50 backdrop-blur-sm sticky top-0 z-10 flex items-center px-8">
                    <div className="flex-1" />
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
                        <div className="w-8 h-8 rounded-full border border-border-subtle overflow-hidden">
                            <img src={avatarUrl} alt="Avatar" />
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
