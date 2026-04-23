import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { useProjectStore } from '../store/projectStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useNavigate } from 'react-router-dom';
import { Folder, Calendar, Edit2, Trash2, Archive, CheckCircle2 } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProjectFormModal } from '../components/projects/ProjectFormModal';
import { toast } from 'sonner';
import type { ProjectWithClient } from '../store/projectStore';

export default function Projetos() {
    const { activeWorkspace } = useWorkspaceStore();
    const { projects, loading, error, fetchProjects, deleteProject, archiveProject, completeProject } = useProjectStore();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<ProjectWithClient | null>(null);

    useEffect(() => { if (error) toast.error(error); }, [error]);

    useEffect(() => {
        if (activeWorkspace) {
            fetchProjects(activeWorkspace.id);
        }
    }, [activeWorkspace, fetchProjects]);

    const handleOpenCreate = () => {
        setProjectToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (project: ProjectWithClient) => {
        setProjectToEdit(project);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.')) {
            try {
                await deleteProject(id);
                toast.success('Projeto excluído com sucesso!');
            } catch (err) {
                console.error('Erro ao excluir projeto:', err);
                toast.error('Erro ao excluir projeto.');
            }
        }
    };

    const handleArchive = async (id: string) => {
        try {
            await archiveProject(id);
            toast.success('Projeto arquivado.');
        } catch {
            toast.error('Erro ao arquivar projeto.');
        }
    };

    const handleComplete = async (id: string) => {
        try {
            await completeProject(id);
            toast.success('Projeto marcado como concluído!');
        } catch {
            toast.error('Erro ao concluir projeto.');
        }
    };

    const activeProjects = projects.filter(p => p.status === 'active');

    return (
        <div className="space-y-6 fade-in h-full flex flex-col">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-primary">Projetos</h1>
                <Button size="sm" className="gap-2" onClick={handleOpenCreate}>
                    <span className="text-lg leading-none">+</span> Novo Projeto
                </Button>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                </div>
            ) : activeProjects.length === 0 ? (
                <EmptyState
                    variant="bordered"
                    icon={Folder}
                    title="Nenhum projeto ativo"
                    description="Crie seu primeiro projeto para começar a gerenciar tarefas."
                    action={{ label: 'Criar Projeto', onClick: handleOpenCreate }}
                />
            ) : (
                <div className="bg-surface-card border border-border-subtle rounded-[var(--radius-card)] overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-surface-0 border-b border-border-subtle text-[10px] font-black text-muted uppercase tracking-widest">
                        <div className="col-span-5">Projeto</div>
                        <div className="col-span-3">Cliente</div>
                        <div className="col-span-3">Prazo</div>
                        <div className="col-span-1" />
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-border-subtle">
                        {activeProjects.map(project => {
                            const due = project.due_date ? new Date(project.due_date) : null;
                            const dueClass = due
                                ? isToday(due) || isPast(due) ? 'text-brand' : 'text-secondary'
                                : '';
                            return (
                                <div
                                    key={project.id}
                                    className="group grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-surface-0 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/projetos/${project.id}`)}
                                >
                                    {/* Nome */}
                                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                                        <div
                                            className="w-2 h-8 rounded-full shrink-0"
                                            style={{ backgroundColor: project.color || '#db4035' }}
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-primary group-hover:text-brand transition-colors truncate">
                                                {project.name}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Cliente */}
                                    <div className="col-span-3 text-sm text-secondary truncate">
                                        {project.client?.name || <span className="text-muted">—</span>}
                                    </div>

                                    {/* Prazo */}
                                    <div className="col-span-3">
                                        {due ? (
                                            <span className={`flex items-center gap-1.5 text-sm font-medium ${dueClass}`}>
                                                <Calendar size={13} />
                                                {format(due, "dd 'de' MMM", { locale: ptBR })}
                                            </span>
                                        ) : (
                                            <span className="text-muted text-sm">—</span>
                                        )}
                                    </div>

                                    {/* Ações */}
                                    <div className="col-span-1 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={e => { e.stopPropagation(); handleOpenEdit(project); }}
                                            className="p-1.5 text-muted hover:text-brand hover:bg-brand-light rounded-md transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleComplete(project.id); }}
                                            className="p-1.5 text-muted hover:text-brand hover:bg-brand-light rounded-md transition-colors"
                                            title="Concluir"
                                        >
                                            <CheckCircle2 size={14} />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleArchive(project.id); }}
                                            className="p-1.5 text-muted hover:text-brand hover:bg-brand-light rounded-md transition-colors"
                                            title="Arquivar"
                                        >
                                            <Archive size={14} />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDelete(project.id); }}
                                            className="p-1.5 text-muted hover:text-brand hover:bg-brand-light rounded-md transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <ProjectFormModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setProjectToEdit(null);
                }}
                project={projectToEdit}
            />
        </div>
    );
}
