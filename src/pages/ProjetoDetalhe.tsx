import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useTaskStore } from '../store/taskStore';
import { useDocumentStore } from '../store/documentStore';
import { Button } from '../components/ui/Button';
import {
    LayoutList, Trello, Flag, MoreHorizontal, Edit2, Trash2, RefreshCw,
    FileText, Plus, Calendar as CalendarIcon, ChevronRight, ExternalLink,
} from 'lucide-react';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { useWorkspaceStore } from '../store/workspaceStore';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { ProjectFormModal } from '../components/projects/ProjectFormModal';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type TaskWithAssignee } from '../store/taskStore';
import { type Document } from '../store/documentStore';
import { cn } from '../lib/utils';

// ─── Doc tree ────────────────────────────────────────────────────────
function DocTreeNode({ doc, allDocs, depth, onNavigate }: {
    doc: Document; allDocs: Document[]; depth: number; onNavigate: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const children = allDocs.filter(d => d.parent_id === doc.id);
    const hasChildren = children.length > 0;

    return (
        <div>
            <div
                className="flex items-center gap-1.5 pr-3 py-2 hover:bg-surface-2 cursor-pointer group transition-colors rounded-md"
                style={{ paddingLeft: `${12 + depth * 14}px` }}
            >
                <button
                    className="w-3.5 h-3.5 flex items-center justify-center text-muted shrink-0"
                    onClick={e => { e.stopPropagation(); if (hasChildren) setExpanded(v => !v); }}
                >
                    {hasChildren && (
                        <ChevronRight size={11} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
                    )}
                </button>
                <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => onNavigate(doc.id)}>
                    <FileText size={13} className="text-muted group-hover:text-brand transition-colors shrink-0" />
                    <span className="text-xs font-medium text-secondary group-hover:text-brand transition-colors truncate">
                        {doc.title || 'Sem título'}
                    </span>
                </div>
                <button
                    onClick={() => onNavigate(doc.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted hover:text-brand transition-all shrink-0"
                    title="Abrir documento"
                >
                    <ExternalLink size={11} />
                </button>
            </div>
            {hasChildren && expanded && children.map(child => (
                <DocTreeNode key={child.id} doc={child} allDocs={allDocs} depth={depth + 1} onNavigate={onNavigate} />
            ))}
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────
const PRIORITY_LABELS: Record<string, { label: string; className: string }> = {
    urgent: { label: 'Urgente', className: 'text-red-600' },
    high: { label: 'Alta', className: 'text-orange-500' },
    medium: { label: 'Média', className: 'text-yellow-600' },
    low: { label: 'Baixa', className: 'text-muted' },
};

function formatDueDate(due: string) {
    const date = new Date(due);
    if (isToday(date)) return { label: 'Hoje', className: 'text-red-600' };
    if (isTomorrow(date)) return { label: 'Amanhã', className: 'text-orange-500' };
    if (isPast(date)) return { label: format(date, "dd/MM", { locale: ptBR }), className: 'text-red-600' };
    return { label: format(date, "dd/MM", { locale: ptBR }), className: 'text-secondary' };
}

// ─── Page ────────────────────────────────────────────────────────────
export default function ProjetoDetalhe() {
    const { id } = useParams<{ id: string }>();
    const { projects, deleteProject } = useProjectStore();
    const { fetchTasks, fetchStatuses, loading, error, tasks, statuses } = useTaskStore();
    const { activeWorkspace } = useWorkspaceStore();
    const { documents, fetchDocuments, createDocument } = useDocumentStore();
    const navigate = useNavigate();

    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);

    const project = projects.find(p => p.id === id);
    const projectDocs = documents.filter(d => d.project_id === id);
    const rootDocs = projectDocs.filter(d => !d.parent_id || !projectDocs.find(p => p.id === d.parent_id));

    const openTask = useCallback((task: TaskWithAssignee) => {
        setSelectedTask(task);
        setSearchParams(prev => { prev.set('task', task.id); return prev; }, { replace: true });
    }, [setSearchParams]);

    const closeTask = useCallback(() => {
        setSelectedTask(null);
        setSearchParams(prev => { prev.delete('task'); return prev; }, { replace: true });
    }, [setSearchParams]);

    useEffect(() => { if (error) toast.error(error); }, [error]);

    useEffect(() => {
        const taskId = searchParams.get('task');
        if (!taskId || tasks.length === 0) return;
        const found = tasks.find(t => t.id === taskId);
        if (found) setSelectedTask(found);
    }, [searchParams, tasks]);

    useEffect(() => { if (id) fetchTasks(id); }, [id, fetchTasks]);
    useEffect(() => { if (activeWorkspace) fetchStatuses(activeWorkspace.id); }, [activeWorkspace, fetchStatuses]);
    useEffect(() => { if (activeWorkspace) fetchDocuments(activeWorkspace.id); }, [activeWorkspace, fetchDocuments]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
            if (e.key.toLowerCase() === 'v') setView(prev => prev === 'list' ? 'kanban' : 'list');
            if (e.key.toLowerCase() === 'c') setIsTaskModalOpen(true);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleCreateDoc = async () => {
        if (!activeWorkspace || !id) return;
        const newDoc = await createDocument({
            workspace_id: activeWorkspace.id,
            title: 'Nova página',
            content: { type: 'doc', content: [] },
            project_id: id,
            folder_id: null,
            parent_id: null,
        });
        if (newDoc) navigate(`/documentos/${newDoc.id}`);
    };

    const handleDeleteProject = async () => {
        if (!project) return;
        if (window.confirm('Tem certeza que deseja excluir este projeto?')) {
            try {
                await deleteProject(project.id);
                toast.success('Projeto excluído com sucesso!');
                navigate('/projetos');
            } catch {
                toast.error('Erro ao excluir projeto.');
            }
        }
    };

    if (!project) {
        return <div className="p-8 text-center text-secondary">Projeto não encontrado ou carregando...</div>;
    }

    return (
        <div className="flex flex-col h-full fade-in">

            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold" style={project.color ? { color: project.color } : { color: '#9ca3af' }}>#</span>
                        <h1 className="text-2xl font-bold text-primary">{project.name}</h1>
                        <div className="flex items-center gap-1 ml-1">
                            <button onClick={() => setIsProjectModalOpen(true)} className="p-1 text-muted hover:text-brand hover:bg-brand-light rounded transition-colors" title="Editar">
                                <Edit2 size={15} />
                            </button>
                            <button onClick={handleDeleteProject} className="p-1 text-muted hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                                <Trash2 size={15} />
                            </button>
                        </div>
                    </div>
                    <p className="text-sm text-muted">{project.client?.name || 'Projeto Interno'}</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View toggle */}
                    <div className="flex bg-surface-0 p-1 rounded-lg border border-border-subtle">
                        <button
                            onClick={() => setView('kanban')}
                            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors', view === 'kanban' ? 'bg-surface-card shadow-sm text-brand' : 'text-secondary hover:text-primary')}
                        >
                            <Trello size={15} /> Kanban
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors', view === 'list' ? 'bg-surface-card shadow-sm text-brand' : 'text-secondary hover:text-primary')}
                        >
                            <LayoutList size={15} /> Lista
                        </button>
                    </div>

                    <Button size="sm" className="gap-2" onClick={() => setIsTaskModalOpen(true)}>
                        <span className="text-lg leading-none">+</span> Nova Tarefa
                    </Button>
                </div>
            </div>

            {/* ── Body: tasks + docs side by side ── */}
            <div className="flex-1 flex gap-4 overflow-hidden min-h-0">

                {/* ── Documents panel ── */}
                <div className="w-64 shrink-0 flex flex-col bg-surface-card border border-border-subtle rounded-card overflow-hidden">
                    {/* Panel header */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-subtle shrink-0">
                        <div className="flex items-center gap-2">
                            <FileText size={14} className="text-muted" />
                            <span className="text-xs font-black uppercase tracking-widest text-muted">Documentos</span>
                            {projectDocs.length > 0 && (
                                <span className="text-[10px] font-bold bg-surface-0 border border-border-subtle text-muted px-1.5 py-0.5 rounded-full">
                                    {projectDocs.length}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleCreateDoc}
                            title="Novo documento"
                            className="p-1 rounded text-muted hover:text-brand hover:bg-brand-light transition-colors"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {/* Doc list */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {projectDocs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                                <FileText size={24} className="text-muted" />
                                <p className="text-xs text-muted">Nenhum documento ainda</p>
                                <button
                                    onClick={handleCreateDoc}
                                    className="text-xs text-brand hover:underline"
                                >
                                    Criar primeiro
                                </button>
                            </div>
                        ) : rootDocs.map(doc => (
                            <DocTreeNode
                                key={doc.id}
                                doc={doc}
                                allDocs={projectDocs}
                                depth={0}
                                onNavigate={docId => navigate(`/documentos/${docId}`)}
                            />
                        ))}
                    </div>
                </div>

                {/* Tasks area */}
                <div className="flex-1 overflow-hidden relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                        </div>
                    ) : view === 'kanban' ? (
                        <KanbanBoard
                            tasks={tasks}
                            statuses={statuses}
                            onTaskClick={task => openTask(task as TaskWithAssignee)}
                        />
                    ) : (
                        /* List view */
                        <div className="bg-surface-card border border-border-subtle rounded-card overflow-hidden flex flex-col h-full">
                            <div className="bg-surface-0 border-b border-border-subtle px-4 py-2.5 grid grid-cols-12 gap-4 text-[10px] font-black text-muted uppercase tracking-widest shrink-0">
                                <div className="col-span-5">Tarefa</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-2">Prazo</div>
                                <div className="col-span-2">Prioridade</div>
                                <div className="col-span-1 text-right">Ações</div>
                            </div>
                            <div className="flex-1 overflow-y-auto divide-y divide-border-subtle custom-scrollbar">
                                {tasks.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <LayoutList size={36} className="mx-auto text-muted mb-3" />
                                        <p className="font-medium text-secondary text-sm">Nenhuma tarefa neste projeto</p>
                                        <p className="text-xs text-muted mt-1">Crie a primeira com o botão acima.</p>
                                    </div>
                                ) : (tasks as TaskWithAssignee[]).map(task => {
                                    const status = statuses.find(s => s.id === task.status_id);
                                    const priority = PRIORITY_LABELS[task.priority || 'medium'];
                                    const due = task.due_date ? formatDueDate(task.due_date) : null;
                                    return (
                                        <div
                                            key={task.id}
                                            className="px-4 py-3 grid grid-cols-12 gap-4 items-center group hover:bg-surface-2 transition-colors cursor-pointer"
                                            onClick={() => openTask(task)}
                                        >
                                            <div className="col-span-5 flex items-center gap-3">
                                                <div className="w-4 h-4 rounded-full border-2 border-border-subtle shrink-0" />
                                                <span className="text-sm font-medium text-primary group-hover:text-brand transition-colors truncate">{task.title}</span>
                                            </div>
                                            <div className="col-span-2">
                                                {status ? (
                                                    <span className="flex items-center gap-1.5 text-xs font-medium text-secondary">
                                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: status.color || '#ccc' }} />
                                                        {status.name}
                                                    </span>
                                                ) : <span className="text-xs text-muted">—</span>}
                                            </div>
                                            <div className="col-span-2">
                                                {due ? (
                                                    <span className={`flex items-center gap-1 text-xs font-medium ${due.className}`}>
                                                        {task.recurrence && task.recurrence !== 'none'
                                                            ? <RefreshCw size={11} className="text-brand shrink-0" />
                                                            : <CalendarIcon size={11} />}
                                                        {due.label}
                                                    </span>
                                                ) : <span className="text-xs text-muted">—</span>}
                                            </div>
                                            <div className="col-span-2">
                                                {priority ? (
                                                    <span className={`flex items-center gap-1 text-xs font-medium ${priority.className}`}>
                                                        <Flag size={11} className="fill-current" /> {priority.label}
                                                    </span>
                                                ) : <span className="text-xs text-muted">—</span>}
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                <button className="text-muted hover:text-secondary opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                    <MoreHorizontal size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

            </div>

            <TaskFormModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} projectId={project.id} />
            <TaskDetailModal isOpen={!!selectedTask} onClose={closeTask} task={selectedTask} />
            <ProjectFormModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} project={project} />
        </div>
    );
}
