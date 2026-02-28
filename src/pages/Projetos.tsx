import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useProjectStore } from '../store/projectStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { Link } from 'react-router-dom';
import { Folder, MoreHorizontal, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProjectFormModal } from '../components/projects/ProjectFormModal';

export default function Projetos() {
    const { activeWorkspace } = useWorkspaceStore();
    const { projects, loading, fetchProjects } = useProjectStore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (activeWorkspace) {
            fetchProjects(activeWorkspace.id);
        }
    }, [activeWorkspace, fetchProjects]);

    return (
        <div className="space-y-6 fade-in h-full flex flex-col">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Projetos</h1>
                <Button size="sm" className="gap-2" onClick={() => setIsModalOpen(true)}>
                    <span className="text-lg leading-none">+</span> Novo Projeto
                </Button>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                </div>
            ) : projects.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-white bg-opacity-50">
                    <Folder className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">Nenhum projeto encontrado</h3>
                    <p className="text-sm text-gray-500 mb-6">Crie seu primeiro projeto para começar a gerenciar tarefas.</p>
                    <Button onClick={() => setIsModalOpen(true)}>Criar Projeto</Button>
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
                                            <p className="text-xs text-gray-500 mt-1">{project.client?.name || 'Agência'}</p>
                                        </div>
                                    </div>
                                    <button className="text-gray-400 hover:text-gray-900">
                                        <MoreHorizontal size={20} />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-end">
                                {project.due_date && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-4">
                                        <Calendar size={14} />
                                        Prazo: <span className="text-gray-900">{format(new Date(project.due_date), "dd 'de' MMM", { locale: ptBR })}</span>
                                    </div>
                                )}
                                <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                        <Users size={14} /> Equipe
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-600 uppercase tracking-wider">
                                        {project.status}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <ProjectFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
}
