import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useTaskStore } from '../store/taskStore';
import { Button } from '../components/ui/Button';
import { LayoutList, Trello } from 'lucide-react';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { useWorkspaceStore } from '../store/workspaceStore';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import type { Database } from '../lib/database.types';

type Task = Database['public']['Tables']['tasks']['Row'] & { assignee?: any };

export default function ProjetoDetalhe() {
    const { id } = useParams<{ id: string }>();
    const { projects } = useProjectStore();
    const { fetchTasks, fetchStatuses, loading, tasks, statuses } = useTaskStore();
    const { activeWorkspace } = useWorkspaceStore();
    const [view, setView] = useState<'list' | 'kanban'>('kanban');
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const project = projects.find(p => p.id === id);

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
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            if (e.key.toLowerCase() === 'v') {
                setView(prev => prev === 'list' ? 'kanban' : 'list');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!project) {
        return <div className="p-8 text-center text-gray-500">Projeto não encontrado ou carregando...</div>;
    }

    return (
        <div className="flex flex-col h-full fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-400" style={project.color ? { color: project.color } : {}}>#</span>
                        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                    </div>
                    <p className="text-sm text-gray-500">{project.client?.name || 'Projeto Interno'}</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-lg border border-border-subtle">
                        <button
                            onClick={() => setView('kanban')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'kanban' ? 'bg-white shadow-sm text-brand' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <Trello size={16} /> Kanban
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-brand' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <LayoutList size={16} /> Lista
                        </button>
                    </div>

                    <Button size="sm" className="gap-2" onClick={() => setIsTaskModalOpen(true)}>
                        <span className="text-lg leading-none">+</span> Nova Tarefa (C)
                    </Button>
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
                        onTaskClick={(task) => setSelectedTask(task)}
                    />
                ) : (
                    <div className="bg-white border border-border-subtle rounded-xl p-8 text-center text-gray-500 h-full flex flex-col items-center justify-center">
                        <LayoutList size={48} className="text-gray-300 mb-4" />
                        <p className="font-medium text-gray-900">Modo lista em construção</p>
                        <p className="text-sm mt-1">Navegue pelas tarefas no Kanban</p>
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
                onClose={() => setSelectedTask(null)}
                task={selectedTask}
            />
        </div>
    );
}
