import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useTaskStore } from '../store/taskStore';
import { useDocumentStore } from '../store/documentStore';
import { Button } from '../components/ui/Button';
import { LayoutList, Trello, Calendar as CalendarIcon, Flag, MoreHorizontal, Edit2, Trash2, RefreshCw, FileText, Plus } from 'lucide-react';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { useWorkspaceStore } from '../store/workspaceStore';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { ProjectFormModal } from '../components/projects/ProjectFormModal';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { type TaskWithAssignee } from '../store/taskStore';
import { type Document } from '../store/documentStore';

function DocTreeNode({
    doc,
    allDocs,
    depth,
    onNavigate,
}: {
    doc: Document;
    allDocs: Document[];
    depth: number;
    onNavigate: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const children = allDocs.filter(d => d.parent_id === doc.id);
    const hasChildren = children.length > 0;

    return (
        <div>
            <div
                className="flex items-center gap-2 pr-5 py-2.5 hover:bg-surface-2 cursor-pointer group transition-colors"
                style={{ paddingLeft: `${20 + depth * 20}px` }}
            >
                <button
                    className="w-4 h-4 flex items-center justify-center text-muted shrink-0"
                    onClick={(e) => { e.stopPropagation(); if (hasChildren) setExpanded(v => !v); }}
                >
                    {hasChildren ? (
                        <svg
                            className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
                            viewBox="0 0 12 12" fill="currentColor"
                        >
                            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    ) : null}
                </button>
                <div
                    className="flex items-center gap-2.5 flex-1 min-w-0"
                    onClick={() => onNavigate(doc.id)}
                >
                    <FileText size={14} className="text-muted group-hover:text-brand transition-colors shrink-0" />
                    <span className="text-sm font-medium text-primary group-hover:text-brand transition-colors truncate">
                        {doc.title || 'Sem título'}
                    </span>
                    <span className="text-xs text-muted ml-auto shrink-0">
                        {new Date(doc.updated_at).toLocaleDateString('pt-BR')}
                    </span>
                </div>
            </div>
            {hasChildren && expanded && children.map(child => (
                <DocTreeNode
                    key={child.id}
                    doc={child}
                    allDocs={allDocs}
                    depth={depth + 1}
                    onNavigate={onNavigate}
                />
            ))}
        </div>
    );
}

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

export default function ProjetoDetalhe() {
    const { id } = useParams<{ id: string }>();
    const { projects } = useProjectStore();
    const { fetchTasks, fetchStatuses, loading, error, tasks, statuses } = useTaskStore();
    const { activeWorkspace } = useWorkspaceStore();
    const [view, setView] = useState<'list' | 'kanban' | 'docs'>('kanban');
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);

    const openTask = useCallback((task: TaskWithAssignee) => {
        setSelectedTask(task);
        setSearchParams(prev => { prev.set('task', task.id); return prev; }, { replace: true });
    }, [setSearchParams]);

    const closeTask = useCallback(() => {
        setSelectedTask(null);
        setSearchParams(prev => { prev.delete('task'); return prev; }, { replace: true });
    }, [setSearchParams]);
    const { deleteProject } = useProjectStore();
    const { documents, fetchDocuments, createDocument } = useDocumentStore();
    const navigate = useNavigate();

    const project = projects.find(p => p.id === id);

    useEffect(() => { if (error) toast.error(error); }, [error]);

    useEffect(() => {
        const taskId = searchParams.get('task');
        if (!taskId || tasks.length === 0) return;
        const found = tasks.find(t => t.id === taskId);
        if (found) setSelectedTask(found);
    }, [searchParams, tasks]);

    useEffect(() => {
        if (id) {
            fetchTasks(id);
        }
    }, [id, fetchTasks]);

    useEffect(() => {
        if (activeWorkspace) {
            fetchStatuses(activeWorkspace.id);
        }
    }, [activeWorkspace, fetchStatuses]);

    useEffect(() => {
        if (activeWorkspace && view === 'docs' && documents.length === 0) {
            fetchDocuments(activeWorkspace.id);
        }
    }, [activeWorkspace, view, documents.length, fetchDocuments]);

    const projectDocs = documents.filter(d => d.project_id === id);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            if (e.key.toLowerCase() === 'v') {
                setView(prev => prev === 'list' ? 'kanban' : 'list');
            }
            if (e.key.toLowerCase() === 'c') {
                setIsTaskModalOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleDeleteProject = async () => {
        if (!project) return;
        if (window.confirm('Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.')) {
            try {
                await deleteProject(project.id);
                toast.success('Projeto excluído com sucesso!');
                navigate('/projetos');
            } catch (err) {
                console.error('Erro ao excluir projeto:', err);
                toast.error('Erro ao excluir projeto.');
            }
        }
    };

    if (!project) {
        return <div className="p-8 text-center text-secondary">Projeto não encontrado ou carregando...</div>;
    }

    return (
        <div className="flex flex-col h-full fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-muted" style={project.color ? { color: project.color } : {}}>#</span>
                        <h1 className="text-2xl font-bold text-primary">{project.name}</h1>
                        <div className="flex items-center gap-1 ml-2">
                            <button
                                onClick={() => setIsProjectModalOpen(true)}
                                className="p-1 text-muted hover:text-brand hover:bg-brand-light rounded transition-colors"
                                title="Editar Projeto"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={handleDeleteProject}
                                className="p-1 text-muted hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Excluir Projeto"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                    <p className="text-sm text-secondary">{project.client?.name || 'Projeto Interno'}</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-surface-0 p-1 rounded-lg border border-border-subtle">
                        <button
                            onClick={() => setView('kanban')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'kanban' ? 'bg-white shadow-sm text-brand' : 'text-secondary hover:text-primary'}`}
                        >
                            <Trello size={16} /> Kanban
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-brand' : 'text-secondary hover:text-primary'}`}
                        >
                            <LayoutList size={16} /> Lista
                        </button>
                        <button
                            onClick={() => setView('docs')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'docs' ? 'bg-white shadow-sm text-brand' : 'text-secondary hover:text-primary'}`}
                        >
                            <FileText size={16} /> Documentos
                        </button>
                    </div>

                    {view !== 'docs' ? (
                        <Button size="sm" className="gap-2" onClick={() => setIsTaskModalOpen(true)}>
                            <span className="text-lg leading-none">+</span> Nova Tarefa (C)
                        </Button>
                    ) : (
                        <Button size="sm" className="gap-2" onClick={async () => {
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
                        }}>
                            <Plus size={14} /> Novo Documento
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                    </div>
                ) : view === 'kanban' ? (
                    <KanbanBoard
                        tasks={tasks}
                        statuses={statuses}
                        onTaskClick={(task) => openTask(task as TaskWithAssignee)}
                    />
                ) : view === 'docs' ? (
                    <div className="bg-white border border-border-subtle rounded-card overflow-hidden flex flex-col h-full">
                        {projectDocs.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
                                <div className="w-14 h-14 rounded-card bg-surface-0 flex items-center justify-center">
                                    <FileText size={28} className="text-muted" />
                                </div>
                                <p className="text-secondary font-medium text-sm">Nenhum documento neste projeto</p>
                                <button
                                    className="text-xs text-brand hover:underline"
                                    onClick={async () => {
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
                                    }}
                                >
                                    Criar primeiro documento
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto">
                                {projectDocs
                                    .filter(d => !d.parent_id || !projectDocs.find(p => p.id === d.parent_id))
                                    .map(doc => (
                                        <DocTreeNode
                                            key={doc.id}
                                            doc={doc}
                                            allDocs={projectDocs}
                                            depth={0}
                                            onNavigate={(docId) => navigate(`/documentos/${docId}`)}
                                        />
                                    ))
                                }
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white border border-border-subtle rounded-card overflow-hidden flex flex-col h-full">
                        {/* Header */}
                        <div className="bg-bg-main border-b border-border-subtle px-4 py-3 grid grid-cols-12 gap-4 text-xs font-bold text-secondary uppercase tracking-widest shrink-0">
                            <div className="col-span-5">Tarefa</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-2">Prazo</div>
                            <div className="col-span-2">Prioridade</div>
                            <div className="col-span-1 text-right">Ações</div>
                        </div>

                        {/* Rows */}
                        <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">
                            {tasks.length === 0 ? (
                                <div className="p-12 text-center text-secondary text-sm">
                                    <LayoutList size={40} className="mx-auto text-muted mb-3" />
                                    <p className="font-medium text-secondary">Nenhuma tarefa neste projeto</p>
                                    <p className="text-xs mt-1">Crie a primeira tarefa com o botão acima.</p>
                                </div>
                            ) : (
                                (tasks as TaskWithAssignee[]).map(task => {
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
                                                <span className="text-sm font-medium text-primary group-hover:text-brand transition-colors truncate">
                                                    {task.title}
                                                </span>
                                            </div>

                                            <div className="col-span-2">
                                                {status ? (
                                                    <span className="flex items-center gap-1.5 text-xs font-medium text-secondary">
                                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: status.color || '#ccc' }} />
                                                        {status.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted">—</span>
                                                )}
                                            </div>

                                            <div className="col-span-2">
                                                {due ? (
                                                    <span className={`flex items-center gap-1 text-xs font-medium ${due.className}`}>
                                                        {task.recurrence && task.recurrence !== 'none'
                                                            ? <RefreshCw size={12} className="text-brand shrink-0" />
                                                            : <CalendarIcon size={12} />
                                                        }
                                                        {due.label}
                                                        {task.recurrence && task.recurrence !== 'none' && (
                                                            <span className="ml-0.5 text-[10px] font-semibold text-brand bg-brand/10 px-1 py-0.5 rounded">
                                                                {task.recurrence === 'daily' ? 'Diária' : task.recurrence === 'weekly' ? 'Semanal' : 'Mensal'}
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : task.recurrence && task.recurrence !== 'none' ? (
                                                    <span className="flex items-center gap-1 text-xs font-medium text-brand">
                                                        <RefreshCw size={12} />
                                                        <span className="text-[10px] font-semibold bg-brand/10 px-1 py-0.5 rounded">
                                                            {task.recurrence === 'daily' ? 'Diária' : task.recurrence === 'weekly' ? 'Semanal' : 'Mensal'}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted">—</span>
                                                )}
                                            </div>

                                            <div className="col-span-2">
                                                {priority ? (
                                                    <span className={`flex items-center gap-1 text-xs font-medium ${priority.className}`}>
                                                        <Flag size={12} className="fill-current" /> {priority.label}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted">—</span>
                                                )}
                                            </div>

                                            <div className="col-span-1 flex justify-end">
                                                <button
                                                    className="text-muted hover:text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            <TaskFormModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                projectId={project.id}
            />

            <TaskDetailModal
                isOpen={!!selectedTask}
                onClose={closeTask}
                task={selectedTask}
            />

            <ProjectFormModal
                isOpen={isProjectModalOpen}
                onClose={() => setIsProjectModalOpen(false)}
                project={project}
            />
        </div>
    );
}
