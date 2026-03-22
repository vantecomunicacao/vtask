import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useDocumentStore, type Document } from '../store/documentStore';
import { useTaskStore, type TaskWithAssignee } from '../store/taskStore';
import { Trash2, RotateCcw, FileText, CheckSquare, AlertTriangle, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

type Tab = 'tarefas' | 'documentos';

export default function Lixeira() {
    const { activeWorkspace } = useWorkspaceStore();
    const { fetchTrashedDocuments, restoreDocument, permanentDeleteDocument } = useDocumentStore();
    const { fetchTrashedTasks, restoreTask, permanentDeleteTask, fetchTasks } = useTaskStore();

    const [tab, setTab] = useState<Tab>('tarefas');
    const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        if (!activeWorkspace) return;
        setLoading(true);
        try {
            const [t, d] = await Promise.all([
                fetchTrashedTasks(activeWorkspace.id),
                fetchTrashedDocuments(activeWorkspace.id),
            ]);
            setTasks(t);
            setDocuments(d);
        } catch {
            toast.error('Erro ao carregar lixeira');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [activeWorkspace]);

    const handleRestoreTask = async (task: TaskWithAssignee) => {
        await restoreTask(task.id);
        await fetchTasks(task.project_id);
        setTasks(prev => prev.filter(t => t.id !== task.id));
        toast.success('Tarefa restaurada');
    };

    const handlePermanentDeleteTask = async (id: string) => {
        if (!confirm('Excluir permanentemente? Esta ação não pode ser desfeita.')) return;
        await permanentDeleteTask(id);
        setTasks(prev => prev.filter(t => t.id !== id));
        toast.success('Tarefa excluída permanentemente');
    };

    const handleRestoreDocument = async (id: string) => {
        await restoreDocument(id);
        setDocuments(prev => prev.filter(d => d.id !== id));
        toast.success('Documento restaurado');
    };

    const handlePermanentDeleteDocument = async (id: string) => {
        if (!confirm('Excluir permanentemente? Esta ação não pode ser desfeita.')) return;
        await permanentDeleteDocument(id);
        setDocuments(prev => prev.filter(d => d.id !== id));
        toast.success('Documento excluído permanentemente');
    };

    const handleEmptyTrash = async () => {
        const total = tasks.length + documents.length;
        if (total === 0) return;
        if (!confirm(`Excluir permanentemente todos os ${total} itens da lixeira?`)) return;

        await Promise.all([
            ...tasks.map(t => permanentDeleteTask(t.id)),
            ...documents.map(d => permanentDeleteDocument(d.id)),
        ]);
        setTasks([]);
        setDocuments([]);
        toast.success('Lixeira esvaziada');
    };

    const totalCount = tasks.length + documents.length;

    return (
        <div className="max-w-3xl mx-auto fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                        <Trash2 size={22} className="text-muted" />
                        Lixeira
                    </h1>
                    <p className="text-sm text-muted mt-0.5">
                        {totalCount > 0
                            ? `${totalCount} ${totalCount === 1 ? 'item' : 'itens'} na lixeira`
                            : 'Lixeira vazia'}
                    </p>
                </div>
                {totalCount > 0 && (
                    <button
                        onClick={handleEmptyTrash}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                    >
                        <Trash2 size={14} />
                        Esvaziar lixeira
                    </button>
                )}
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-sm text-amber-800">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>Itens na lixeira não aparecem no sistema. Restaure para recuperá-los ou exclua permanentemente.</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-surface-0 p-1 rounded-xl mb-4 border border-border-subtle w-fit">
                {(['tarefas', 'documentos'] as Tab[]).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                            tab === t
                                ? 'bg-surface-card text-primary shadow-sm border border-border-subtle'
                                : 'text-muted hover:text-secondary'
                        )}
                    >
                        {t === 'tarefas' ? <CheckSquare size={14} /> : <FileText size={14} />}
                        {t === 'tarefas' ? 'Tarefas' : 'Documentos'}
                        {t === 'tarefas' && tasks.length > 0 && (
                            <span className="text-[10px] bg-surface-0 text-muted px-1.5 py-0.5 rounded-full border border-border-subtle">{tasks.length}</span>
                        )}
                        {t === 'documentos' && documents.length > 0 && (
                            <span className="text-[10px] bg-surface-0 text-muted px-1.5 py-0.5 rounded-full border border-border-subtle">{documents.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton-pulse h-16 rounded-xl" />
                    ))}
                </div>
            ) : tab === 'tarefas' ? (
                tasks.length === 0 ? (
                    <EmptyTrash label="Nenhuma tarefa na lixeira" />
                ) : (
                    <div className="space-y-2">
                        {tasks.map(task => (
                            <TrashItem
                                key={task.id}
                                icon={<CheckSquare size={15} className="text-muted" />}
                                title={task.title}
                                subtitle={task.project?.name}
                                deletedAt={task.deleted_at!}
                                onRestore={() => handleRestoreTask(task)}
                                onDelete={() => handlePermanentDeleteTask(task.id)}
                            />
                        ))}
                    </div>
                )
            ) : (
                documents.length === 0 ? (
                    <EmptyTrash label="Nenhum documento na lixeira" />
                ) : (
                    <div className="space-y-2">
                        {documents.map(doc => (
                            <TrashItem
                                key={doc.id}
                                icon={<FileText size={15} className="text-muted" />}
                                title={doc.title || 'Sem título'}
                                deletedAt={doc.deleted_at!}
                                onRestore={() => handleRestoreDocument(doc.id)}
                                onDelete={() => handlePermanentDeleteDocument(doc.id)}
                            />
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────

function TrashItem({
    icon, title, subtitle, deletedAt, onRestore, onDelete,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string | null;
    deletedAt: string;
    onRestore: () => void;
    onDelete: () => void;
}) {
    const timeAgo = formatDistanceToNow(new Date(deletedAt), { addSuffix: true, locale: ptBR });

    return (
        <div className="flex items-center gap-3 p-3 bg-surface-card rounded-xl border border-border-subtle group hover:border-border-default transition-all shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-surface-0 flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">{title}</p>
                <p className="text-[11px] text-muted truncate">
                    {subtitle && <span className="mr-2">{subtitle}</span>}
                    Excluído {timeAgo}
                </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onRestore}
                    title="Restaurar"
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand/5 rounded-lg transition-colors border border-brand/20"
                >
                    <RotateCcw size={12} />
                    Restaurar
                </button>
                <button
                    onClick={onDelete}
                    title="Excluir permanentemente"
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                >
                    <Trash2 size={12} />
                    Excluir
                </button>
            </div>
        </div>
    );
}

function EmptyTrash({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-0 flex items-center justify-center">
                <Inbox size={26} className="text-muted" />
            </div>
            <p className="text-sm text-muted">{label}</p>
        </div>
    );
}
