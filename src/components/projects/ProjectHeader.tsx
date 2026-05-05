import { LayoutList, Trello, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import type { ProjectWithClient } from '../../store/projectStore';

interface ProjectHeaderProps {
    project: ProjectWithClient;
    view: 'kanban' | 'list';
    rightPanel: 'tasks' | 'document';
    onViewChange: (v: 'kanban' | 'list') => void;
    onEdit: () => void;
    onDelete: () => void;
    onBackToTasks: () => void;
    onNewTask: () => void;
}

export function ProjectHeader({
    project, view, rightPanel,
    onViewChange, onEdit, onDelete, onBackToTasks, onNewTask,
}: ProjectHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold" style={project.color ? { color: project.color } : { color: '#9ca3af' }}>#</span>
                    <h1 className="text-2xl font-bold text-primary">{project.name}</h1>
                    <div className="flex items-center gap-1 ml-1">
                        <button onClick={onEdit} className="p-1 text-muted hover:text-brand hover:bg-brand-light rounded transition-colors" title="Editar">
                            <Edit2 size={15} />
                        </button>
                        <button onClick={onDelete} className="p-1 text-muted hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                            <Trash2 size={15} />
                        </button>
                    </div>
                </div>
                <p className="text-sm text-muted">{project.client?.name || 'Projeto Interno'}</p>
            </div>

            <div className="flex items-center gap-3">
                {rightPanel === 'tasks' && (
                    <div className="flex bg-surface-0 p-1 rounded-lg border border-border-subtle">
                        <button
                            onClick={() => onViewChange('kanban')}
                            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors', view === 'kanban' ? 'bg-surface-card border border-border-subtle text-brand' : 'text-secondary hover:text-primary')}
                        >
                            <Trello size={15} /> Kanban
                        </button>
                        <button
                            onClick={() => onViewChange('list')}
                            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors', view === 'list' ? 'bg-surface-card border border-border-subtle text-brand' : 'text-secondary hover:text-primary')}
                        >
                            <LayoutList size={15} /> Lista
                        </button>
                    </div>
                )}

                {rightPanel === 'document' && (
                    <button
                        onClick={onBackToTasks}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-secondary hover:text-primary bg-surface-0 border border-border-subtle rounded-lg transition-colors"
                    >
                        <ArrowLeft size={15} /> Voltar às Tarefas
                    </button>
                )}

                <Button size="sm" className="gap-2" onClick={onNewTask}>
                    <span className="text-lg leading-none">+</span> Nova Tarefa
                </Button>
            </div>
        </div>
    );
}
