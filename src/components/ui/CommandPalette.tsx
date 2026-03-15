import { useEffect, useState, useMemo } from 'react';
import { Command } from 'cmdk';
import {
    Search, PlusCircle, LayoutDashboard, Settings, Folder,
    CheckSquare, Calendar, Mail, FileText, ChevronRight, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore, type TaskWithAssignee } from '../../store/taskStore';
import { useProjectStore } from '../../store/projectStore';
import { TaskFormModal } from '../tasks/TaskFormModal';
import { TaskDetailModal } from '../tasks/TaskDetailModal';
import { cn } from '../../lib/utils';

const NAV_ITEMS = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Minhas Tarefas', path: '/tarefas', icon: CheckSquare },
    { label: 'Projetos', path: '/projetos', icon: Folder },
    { label: 'Agenda', path: '/agenda', icon: Calendar },
    { label: 'Documentos', path: '/documentos', icon: FileText },
    { label: 'Gerador de E-mails', path: '/gerador-email', icon: Mail },
    { label: 'Lixeira', path: '/lixeira', icon: Trash2 },
    { label: 'Configurações', path: '/configuracoes', icon: Settings },
];

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [newTaskOpen, setNewTaskOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);

    const navigate = useNavigate();
    const { tasks, statuses } = useTaskStore();
    const { projects } = useProjectStore();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen(prev => !prev);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const close = () => setOpen(false);

    const doneStatusId = statuses.length > 0 ? statuses[statuses.length - 1].id : null;

    const getStatusColor = (statusId: string | null | undefined) =>
        statuses.find(s => s.id === statusId)?.color ?? '#94a3b8';

    // Cap at 100 for rendering performance
    const displayTasks = useMemo(() => tasks.slice(0, 100), [tasks]);

    return (
        <>
            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/40 backdrop-blur-sm p-4 fade-in">
                    <div
                        className="w-full max-w-xl bg-surface-card rounded-card shadow-modal overflow-hidden border border-border-subtle"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Command label="Command Palette" className="flex flex-col bg-surface-card" shouldFilter>
                            {/* Input */}
                            <div className="flex items-center px-4 border-b border-border-subtle gap-3">
                                <Search className="w-4 h-4 text-muted shrink-0" />
                                <Command.Input
                                    autoFocus
                                    className="flex-1 h-14 bg-transparent outline-none text-sm text-primary placeholder:text-muted"
                                    placeholder="Buscar tarefas, projetos ou comandos..."
                                />
                                <kbd className="text-[10px] text-muted font-mono px-1.5 py-0.5 rounded border border-border-subtle bg-surface-0">ESC</kbd>
                            </div>

                            <Command.List className="max-h-[380px] overflow-y-auto p-2 custom-scrollbar">
                                <Command.Empty className="py-10 text-center text-secondary text-sm">
                                    Nenhum resultado encontrado.
                                </Command.Empty>

                                {/* Quick actions */}
                                <Command.Group>
                                    <div className="px-2 pt-2 pb-1 text-[10px] font-black text-muted uppercase tracking-widest">
                                        Ações Rápidas
                                    </div>
                                    <Command.Item
                                        value="criar nova tarefa"
                                        onSelect={() => { close(); setNewTaskOpen(true); }}
                                        className="flex items-center gap-3 px-3 py-2.5 mt-0.5 rounded-lg cursor-pointer aria-selected:bg-brand/10 aria-selected:text-brand text-sm text-secondary font-medium transition-colors"
                                    >
                                        <PlusCircle className="h-4 w-4 shrink-0" />
                                        <span className="flex-1">Criar Nova Tarefa</span>
                                        <kbd className="text-[10px] font-mono text-muted bg-surface-0 border border-border-subtle px-1.5 py-0.5 rounded">N</kbd>
                                    </Command.Item>
                                </Command.Group>

                                {/* Tasks */}
                                {displayTasks.length > 0 && (
                                    <Command.Group>
                                        <div className="px-2 pt-3 pb-1 text-[10px] font-black text-muted uppercase tracking-widest">
                                            Tarefas
                                        </div>
                                        {displayTasks.map(task => {
                                            const isDone = task.status_id === doneStatusId;
                                            const statusColor = getStatusColor(task.status_id);
                                            return (
                                                <Command.Item
                                                    key={task.id}
                                                    value={`${task.title} ${task.project?.name ?? ''}`}
                                                    onSelect={() => { close(); setSelectedTask(task); }}
                                                    className="flex items-center gap-3 px-3 py-2.5 mt-0.5 rounded-lg cursor-pointer aria-selected:bg-surface-0 text-sm transition-colors group"
                                                >
                                                    <div
                                                        className="w-2 h-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: statusColor }}
                                                    />
                                                    <span className={cn(
                                                        "flex-1 font-medium truncate",
                                                        isDone ? "line-through text-muted" : "text-primary"
                                                    )}>
                                                        {task.title}
                                                    </span>
                                                    {task.project && (
                                                        <span className="text-[10px] font-bold text-muted pl-2 border-l border-border-subtle shrink-0 truncate max-w-[120px]">
                                                            {task.project.name}
                                                        </span>
                                                    )}
                                                    <ChevronRight size={12} className="text-muted shrink-0 opacity-0 group-aria-selected:opacity-100 transition-opacity" />
                                                </Command.Item>
                                            );
                                        })}
                                    </Command.Group>
                                )}

                                {/* Projects */}
                                {projects.length > 0 && (
                                    <Command.Group>
                                        <div className="px-2 pt-3 pb-1 text-[10px] font-black text-muted uppercase tracking-widest">
                                            Projetos
                                        </div>
                                        {projects.map(project => (
                                            <Command.Item
                                                key={project.id}
                                                value={`projeto ${project.name} ${project.client?.name ?? ''}`}
                                                onSelect={() => { close(); navigate(`/projetos/${project.id}`); }}
                                                className="flex items-center gap-3 px-3 py-2.5 mt-0.5 rounded-lg cursor-pointer aria-selected:bg-surface-0 text-sm transition-colors group"
                                            >
                                                <div
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: project.color ?? '#94a3b8' }}
                                                />
                                                <span className="flex-1 font-medium text-primary truncate">{project.name}</span>
                                                {project.client && (
                                                    <span className="text-[10px] font-bold text-muted shrink-0">{project.client.name}</span>
                                                )}
                                                <ChevronRight size={12} className="text-muted shrink-0 opacity-0 group-aria-selected:opacity-100 transition-opacity" />
                                            </Command.Item>
                                        ))}
                                    </Command.Group>
                                )}

                                {/* Navigation */}
                                <Command.Group>
                                    <div className="px-2 pt-3 pb-1 text-[10px] font-black text-muted uppercase tracking-widest">
                                        Navegação
                                    </div>
                                    {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
                                        <Command.Item
                                            key={path}
                                            value={`ir para ${label} ${path.slice(1)}`}
                                            onSelect={() => { close(); navigate(path); }}
                                            className="flex items-center gap-3 px-3 py-2.5 mt-0.5 rounded-lg cursor-pointer aria-selected:bg-surface-0 text-sm text-secondary font-medium transition-colors"
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            <span>Ir para {label}</span>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            </Command.List>

                            {/* Footer */}
                            <div className="flex items-center gap-5 px-4 py-2 border-t border-border-subtle bg-surface-0/60 text-[10px] text-muted">
                                <span className="flex items-center gap-1.5">
                                    <kbd className="font-mono bg-surface-1 border border-border-subtle px-1 rounded">↑↓</kbd>
                                    navegar
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <kbd className="font-mono bg-surface-1 border border-border-subtle px-1 rounded">↵</kbd>
                                    selecionar
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <kbd className="font-mono bg-surface-1 border border-border-subtle px-1 rounded">Esc</kbd>
                                    fechar
                                </span>
                                <span className="ml-auto opacity-50">⌘K para abrir</span>
                            </div>
                        </Command>
                    </div>
                    <div className="fixed inset-0 -z-10" onClick={close} />
                </div>
            )}

            <TaskFormModal isOpen={newTaskOpen} onClose={() => setNewTaskOpen(false)} />
            {selectedTask && (
                <TaskDetailModal
                    isOpen={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    task={selectedTask}
                />
            )}
        </>
    );
}
