import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useTaskStore } from '../store/taskStore';
import { useDocumentStore } from '../store/documentStore';
import {
    LayoutList, Flag, MoreHorizontal, RefreshCw,
    Calendar as CalendarIcon,
} from 'lucide-react';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { useWorkspaceStore } from '../store/workspaceStore';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { ProjectFormModal } from '../components/projects/ProjectFormModal';
import { ProjectDocSidebar } from '../components/projects/ProjectDocSidebar';
import { ProjectHeader } from '../components/projects/ProjectHeader';
import { DocumentEditor } from '../components/documents/DocumentEditor';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type TaskWithAssignee } from '../store/taskStore';

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
    const [rightPanel, setRightPanel] = useState<'tasks' | 'document'>('tasks');
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);

    const project = projects.find(p => p.id === id);
    const projectDocs = documents.filter(d => d.project_id === id);

    const openDoc = useCallback((docId: string) => {
        setSelectedDocId(docId);
        setRightPanel('document');
    }, []);

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

    // Abre documento inline quando vindo da sidebar via ?doc=:id
    // Remove o param logo após — no segundo disparo 'doc' já é null e o efeito para
    useEffect(() => {
        const docId = searchParams.get('doc');
        if (!docId) return;
        openDoc(docId);
        setSearchParams(prev => { prev.delete('doc'); return prev; }, { replace: true });
    }, [searchParams, openDoc, setSearchParams]);

    useEffect(() => { if (id) fetchTasks(id); }, [id, fetchTasks]);
    useEffect(() => { if (activeWorkspace) fetchStatuses(activeWorkspace.id); }, [activeWorkspace, fetchStatuses]);
    useEffect(() => { if (activeWorkspace) fetchDocuments(activeWorkspace.id); }, [activeWorkspace, fetchDocuments]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const el = document.activeElement as HTMLElement | null;
            if (!el) return;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
            if (el.getAttribute('contenteditable') === 'true') return;
            if (el.closest('[contenteditable="true"]')) return;
            if (el.closest('[role="dialog"]')) return;
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
        if (newDoc) openDoc(newDoc.id);
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

            <ProjectHeader
                project={project}
                view={view}
                rightPanel={rightPanel}
                onViewChange={setView}
                onEdit={() => setIsProjectModalOpen(true)}
                onDelete={handleDeleteProject}
                onBackToTasks={() => setRightPanel('tasks')}
                onNewTask={() => setIsTaskModalOpen(true)}
            />

            {/* ── Body: tasks + docs side by side ── */}
            <div className="flex-1 flex gap-4 overflow-hidden min-h-0">

                <ProjectDocSidebar
                    projectDocs={projectDocs}
                    selectedDocId={selectedDocId}
                    showCollapseButton={rightPanel === 'document'}
                    onSelectDoc={openDoc}
                    onCreateDoc={handleCreateDoc}
                    onCollapse={() => setRightPanel('tasks')}
                />

                {/* Right panel: document editor or tasks */}
                <div className="flex-1 overflow-hidden relative">
                    {rightPanel === 'document' && selectedDocId ? (
                        <div className="h-full bg-surface-card border border-border-subtle rounded-card overflow-hidden flex flex-col">
                            <DocumentEditor
                                documentId={selectedDocId}
                                onClose={() => setRightPanel('tasks')}
                                onAddSubPage={parentId => {
                                    createDocument({
                                        workspace_id: activeWorkspace!.id,
                                        title: 'Nova página',
                                        content: { type: 'doc', content: [] },
                                        project_id: id!,
                                        folder_id: null,
                                        parent_id: parentId,
                                    }).then(newDoc => { if (newDoc) openDoc(newDoc.id); });
                                }}
                            />
                        </div>
                    ) : loading ? (
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
