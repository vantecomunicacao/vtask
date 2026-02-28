import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useTaskStore } from '../../store/taskStore';
import type { Database } from '../../lib/database.types';
import { Card, CardContent } from '../ui/Card';
import { CalendarIcon, Flag, MessageSquare } from 'lucide-react';

type Task = Database['public']['Tables']['tasks']['Row'] & { assignee?: any };
type Status = Database['public']['Tables']['custom_statuses']['Row'];

interface KanbanBoardProps {
    tasks: Task[];
    statuses: Status[];
    onTaskClick: (task: Task) => void;
}

export function KanbanBoard({ tasks, statuses, onTaskClick }: KanbanBoardProps) {
    const { moveTask } = useTaskStore();

    // Se não tem status de banco, gerar fluxo padrão mock
    const activeStatuses = statuses.length > 0 ? statuses : [
        { id: 'todo', name: 'A fazer', color: '#db4035', position: 1, workspace_id: '' },
        { id: 'briefing', name: 'Briefing', color: '#8b5cf6', position: 2, workspace_id: '' },
        { id: 'doing', name: 'Em produção', color: '#3b82f6', position: 3, workspace_id: '' },
        { id: 'review', name: 'Em aprovação', color: '#f59e0b', position: 4, workspace_id: '' },
        { id: 'done', name: 'Entregue', color: '#10b981', position: 5, workspace_id: '' }
    ] as Status[];

    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;

        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return;
        }

        moveTask(draggableId, destination.droppableId, destination.index);
    };

    return (
        <div className="h-full flex gap-6 overflow-x-auto pb-4 custom-scrollbar fade-in">
            <DragDropContext onDragEnd={onDragEnd}>
                {activeStatuses.map((status) => {
                    // Filtra tarefas se status for mock via ID, ou via status_id se for real
                    const columnTasks = tasks
                        .filter(t => (t.status_id === status.id) || (!t.status_id && status.id === 'todo'))
                        .sort((a, b) => a.position - b.position);

                    return (
                        <div key={status.id} className="flex flex-col w-80 shrink-0 bg-gray-50 rounded-xl">
                            <div className="px-4 py-3 flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color || '#db4035' }} />
                                    <h3 className="font-bold text-gray-900 text-sm">{status.name}</h3>
                                </div>
                                <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2.5 py-0.5 rounded-full">
                                    {columnTasks.length}
                                </span>
                            </div>

                            <Droppable droppableId={status.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex-1 px-3 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-gray-100/50 rounded-xl' : ''
                                            }`}
                                    >
                                        <div className="space-y-3 pb-3">
                                            {columnTasks.map((task, index) => (
                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            style={provided.draggableProps.style}
                                                        >
                                                            <Card
                                                                onClick={() => onTaskClick(task)}
                                                                className={`cursor-grab active:cursor-grabbing hover:border-gray-300 transition-all ${snapshot.isDragging ? 'shadow-xl scale-[1.02] border-brand/50 ring-2 ring-brand/20' : 'shadow-none'
                                                                    }`}
                                                            >
                                                                <CardContent className="p-4 flex flex-col gap-3">
                                                                    {task.labels && task.labels.length > 0 && (
                                                                        <div className="flex gap-1 flex-wrap">
                                                                            {task.labels.map(l => (
                                                                                <span key={l} className="px-2 py-0.5 rounded bg-brand-light text-brand text-[10px] font-bold uppercase tracking-wider">{l}</span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    <p className="text-sm font-medium text-gray-900 leading-snug">{task.title}</p>

                                                                    <div className="flex items-center justify-between mt-1 text-gray-500">
                                                                        <div className="flex items-center gap-3">
                                                                            {task.due_date && (
                                                                                <div className="flex items-center gap-1 text-[11px] font-medium text-red-600">
                                                                                    <CalendarIcon size={12} /> Limit
                                                                                </div>
                                                                            )}

                                                                            <div className="flex items-center gap-1 text-[11px] font-medium">
                                                                                <MessageSquare size={12} /> 2
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-2">
                                                                            {task.priority === 'urgent' && <Flag size={12} className="fill-brand text-brand" />}
                                                                            <div className="w-5 h-5 rounded-full border border-border-subtle bg-gray-100 flex items-center justify-center text-[10px] font-bold">
                                                                                {task.assignee?.full_name?.substring(0, 1) || '?'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>

                                        <button className="w-full py-2 flex items-center gap-2 justify-center text-gray-500 hover:text-brand hover:bg-brand-light rounded-lg transition-colors text-sm font-medium opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                                            <span className="text-lg leading-none">+</span> Adicionar
                                        </button>
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    );
                })}
            </DragDropContext>
        </div>
    );
}
