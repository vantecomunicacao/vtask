import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useProjectStore } from '../store/projectStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { Link } from 'react-router-dom';
import { Archive, CheckCircle2, Folder, RotateCcw, Trash2 } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { ProjectWithClient } from '../store/projectStore';

const STATUS_LABEL: Record<string, string> = {
    archived: 'Arquivado',
    completed: 'Concluído',
};

const STATUS_STYLE: Record<string, string> = {
    archived: 'bg-amber-50 text-amber-700 border border-amber-200',
    completed: 'bg-green-50 text-green-700 border border-green-200',
};

export default function Arquivados() {
    const { activeWorkspace } = useWorkspaceStore();
    const { projects, loading, error, fetchProjects, reactivateProject, deleteProject } = useProjectStore();
    const [filter, setFilter] = useState<'all' | 'archived' | 'completed'>('all');

    useEffect(() => { if (error) toast.error(error); }, [error]);

    useEffect(() => {
        if (activeWorkspace) fetchProjects(activeWorkspace.id);
    }, [activeWorkspace, fetchProjects]);

    const inactiveProjects = projects.filter(p => p.status === 'archived' || p.status === 'completed');
    const filtered: ProjectWithClient[] = filter === 'all'
        ? inactiveProjects
        : inactiveProjects.filter(p => p.status === filter);

    const handleReactivate = async (id: string) => {
        try {
            await reactivateProject(id);
            toast.success('Projeto reativado!');
        } catch {
            toast.error('Erro ao reativar projeto.');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Excluir permanentemente? Esta ação não pode ser desfeita.')) {
            try {
                await deleteProject(id);
                toast.success('Projeto excluído.');
            } catch {
                toast.error('Erro ao excluir projeto.');
            }
        }
    };

    return (
        <div className="space-y-6 fade-in h-full flex flex-col">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary">Arquivados</h1>
                    <p className="text-sm text-secondary mt-1">Projetos concluídos ou fora de uso temporariamente.</p>
                </div>
            </div>

            {/* Filtro */}
            <div className="flex items-center gap-2">
                {(['all', 'archived', 'completed'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-[var(--radius-md)] transition-colors ${
                            filter === f
                                ? 'bg-brand text-white'
                                : 'bg-surface-0 text-secondary hover:bg-surface-1 border border-border-subtle'
                        }`}
                    >
                        {f === 'all' ? 'Todos' : STATUS_LABEL[f]}
                    </button>
                ))}
                <span className="ml-auto text-xs text-muted">{filtered.length} projeto{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    variant="bordered"
                    icon={Archive}
                    title="Nenhum projeto arquivado"
                    description="Projetos arquivados ou concluídos aparecem aqui."
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(project => (
                        <Card key={project.id} className="group hover:border-border transition-colors flex flex-col opacity-80 hover:opacity-100">
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white grayscale group-hover:grayscale-0 transition-all"
                                            style={{ backgroundColor: project.color || '#db4035' }}
                                        >
                                            {project.status === 'completed'
                                                ? <CheckCircle2 size={20} />
                                                : <Folder size={20} />
                                            }
                                        </div>
                                        <div>
                                            <Link to={`/projetos/${project.id}`}>
                                                <CardTitle className="text-lg hover:text-brand transition-colors cursor-pointer">{project.name}</CardTitle>
                                            </Link>
                                            <p className="text-xs text-muted mt-1">{project.client?.name || 'Agência'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleReactivate(project.id)}
                                            className="p-1.5 text-muted hover:text-brand hover:bg-brand-light rounded-md transition-colors"
                                            title="Reativar Projeto"
                                        >
                                            <RotateCcw size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(project.id)}
                                            className="p-1.5 text-muted hover:text-brand hover:bg-brand-light rounded-md transition-colors"
                                            title="Excluir Permanentemente"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-end">
                                {project.due_date && (
                                    <div className="text-xs text-muted font-medium mb-4">
                                        Prazo: <span className="text-primary">{format(new Date(project.due_date), "dd 'de' MMM", { locale: ptBR })}</span>
                                    </div>
                                )}
                                <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                                    <p className="text-xs text-muted truncate max-w-[60%]">{project.description || '—'}</p>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-[var(--radius-xs)] uppercase tracking-wider ${STATUS_STYLE[project.status] ?? ''}`}>
                                        {STATUS_LABEL[project.status] ?? project.status}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
