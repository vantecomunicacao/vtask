import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useProjectStore } from '../store/projectStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { Link } from 'react-router-dom';
import { Folder, Users, Calendar, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProjectFormModal } from '../components/projects/ProjectFormModal';
import { toast } from 'sonner';
import type { ProjectWithClient } from '../store/projectStore';

export default function Projetos() {
    const { activeWorkspace } = useWorkspaceStore();
    const { projects, loading, fetchProjects, deleteProject } = useProjectStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<ProjectWithClient | null>(null);

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
            ) : projects.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border-subtle rounded-[var(--radius-card)] bg-surface-card/50">
                    <Folder className="w-12 h-12 text-muted mb-4" />
                    <h3 className="text-lg font-bold text-primary">Nenhum projeto encontrado</h3>
                    <p className="text-sm text-secondary mb-6">Crie seu primeiro projeto para começar a gerenciar tarefas.</p>
                    <Button onClick={handleOpenCreate}>Criar Projeto</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(project => (
                        <Card key={project.id} className="group hover:border-gray-300 transition-colors flex flex-col">
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                                            style={{ backgroundColor: project.color || '#db4035' }}
                                        >
                                            <Folder size={20} />
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
                                            onClick={() => handleOpenEdit(project)}
                                            className="p-1.5 text-muted hover:text-brand hover:bg-brand-light rounded-md transition-colors"
                                            title="Editar Projeto"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(project.id)}
                                            className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Excluir Projeto"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-end">
                                {project.due_date && (
                                    <div className="flex items-center gap-2 text-xs text-muted font-medium mb-4">
                                        <Calendar size={14} />
                                        Prazo: <span className="text-primary">{format(new Date(project.due_date), "dd 'de' MMM", { locale: ptBR })}</span>
                                    </div>
                                )}
                                <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-muted font-medium">
                                        <Users size={14} /> Equipe
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 rounded-[var(--radius-xs)] bg-surface-0 text-secondary uppercase tracking-wider">
                                        {project.status}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
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
