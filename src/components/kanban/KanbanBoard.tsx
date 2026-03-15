import React, { useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useTaskStore, type TaskWithAssignee } from '../../store/taskStore';
import type { Database } from '../../lib/database.types';
import { Card, CardContent } from '../ui/Card';
import { CalendarIcon, Flag, MessageSquare, RefreshCw } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { celebrate } from '../../lib/confetti';
import { toast } from 'sonner';

type Status = Database['public']['Tables']['custom_statuses']['Row'];

interface KanbanBoardProps {
    tasks: TaskWithAssignee[];
    statuses: Status[];
    onTaskClick: (task: TaskWithAssignee) => void;
}

function formatCardDate(due: string) {
    const date = new Date(due);
    const isOverdue = isPast(date) && !isToday(date);
    return {
        label: format(date, "dd MMM", { locale: ptBR }),
        className: isOverdue ? 'text-red-600' : 'text-secondary'
    };
}

// ─── Memoized Kanban Card ──────────────────────
interface KanbanCardProps {
    task: TaskWithAssignee;
    index: number;
    onTaskClick: (task: TaskWithAssignee) => void;
}

const KanbanCard = React.memo(function KanbanCard({ task, index, onTaskClick }: KanbanCardProps) {
    const due = task.due_date ? formatCardDate(task.due_date) : null;

    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={provided.draggableProps.style}
                >
                    <Card
                        onClick={() => onTaskClick(task)}
                        className={`cursor-grab active:cursor-grabbing transition-all ${
                            snapshot.isDragging ? 'shadow-float scale-[1.02] ring-2 ring-brand/20' : 'shadow-card hover:shadow-float'
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
                            <div className="flex flex-col gap-1.5">
                                {task.category && (
                                    <span
                                        className="inline-block self-start px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                        style={{
                                            backgroundColor: `${task.category.color}20`,
                                            color: task.category.color || '#64748b',
                                            border: `1px solid ${task.category.color}40`
                                        }}
                                    >
                                        {task.category.name}
                                    </span>
                                )}
                                <p className="text-sm font-medium text-primary leading-snug">{task.title}</p>
                            </div>

                            <div className="flex items-center justify-between mt-1 text-muted">
                                <div className="flex items-center gap-3">
                                    {due && (
                                        <div className={`flex items-center gap-1 text-[11px] font-medium ${due.className}`}>
                                            <CalendarIcon size={12} /> {due.label}
                                        </div>
                                    )}
                                    {task.recurrence && task.recurrence !== 'none' && (
                                        <div className="flex items-center gap-1 text-[11px] font-medium text-brand" title={`Recorrência: ${task.recurrence}`}>
                                            <RefreshCw size={12} />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 text-[11px] font-medium">
                                        <MessageSquare size={12} /> 2
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {task.priority === 'urgent' && <Flag size={12} className="fill-brand text-brand" />}
                                    <div className="w-5 h-5 rounded-full border border-border-subtle bg-surface-0 flex items-center justify-center text-[10px] font-bold text-secondary">
                                        {task.assignee?.full_name?.substring(0, 1) || '?'}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </Draggable>
    );
});

// ─── KanbanBoard ──────────────────────────────
export function KanbanBoard({ tasks, statuses, onTaskClick }: KanbanBoardProps) {
    const { moveTask } = useTaskStore();

    const activeStatuses = useMemo(() => statuses.length > 0 ? statuses : [
        { id: 'todo', name: 'A fazer', color: '#db4035', position: 1, workspace_id: '' },
        { id: 'briefing', name: 'Briefing', color: '#8b5cf6', position: 2, workspace_id: '' },
        { id: 'doing', name: 'Em produção', color: '#3b82f6', position: 3, workspace_id: '' },
        { id: 'review', name: 'Em aprovação', color: '#f59e0b', position: 4, workspace_id: '' },
        { id: 'done', name: 'Entregue', color: '#10b981', position: 5, workspace_id: '' }
    ] as Status[], [statuses]);

    const tasksByStatus = useMemo(() => {
        const map: Record<string, TaskWithAssignee[]> = {};
        for (const status of activeStatuses) {
            map[status.id] = tasks
                .filter(t => t.status_id === status.id || (!t.status_id && status.id === 'todo'))
                .sort((a, b) => a.position - b.position);
        }
        return map;
    }, [tasks, activeStatuses]);

    const onDragEnd = useCallback((result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const task = tasks.find(t => t.id === draggableId);
        const previousStatusId = task?.status_id;

        moveTask(draggableId, destination.droppableId, destination.index);

        if (activeStatuses.length > 0 && destination.droppableId === activeStatuses[activeStatuses.length - 1].id && previousStatusId !== destination.droppableId) {
            celebrate();
            toast.success('Tarefa entregue! 🎉', {
                duration: 5000,
                action: {
                    label: 'Desfazer',
                    onClick: async () => {
                        await moveTask(draggableId, previousStatusId || null, 0);
                        toast.info('Movimentação desfeita');
                    }
                }
            });
        }
    }, [tasks, activeStatuses, moveTask]);

    return (
        <div className="h-full flex gap-6 overflow-x-auto pb-4 custom-scrollbar fade-in">
            <DragDropContext onDragEnd={onDragEnd}>
                {activeStatuses.map((status) => {
                    const columnTasks = tasksByStatus[status.id] || [];
                    return (
                        <div key={status.id} className="flex flex-col w-80 shrink-0 bg-surface-0 rounded-[var(--radius-card)]">
                            <div className="px-4 py-3 flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color || '#db4035' }} />
                                    <h3 className="font-bold text-primary text-sm">{status.name}</h3>
                                </div>
                                <span className="text-xs font-medium text-muted bg-surface-1 px-2.5 py-0.5 rounded-pill">
                                    {columnTasks.length}
                                </span>
                            </div>

                            <Droppable droppableId={status.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex-1 px-3 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-surface-1/80 rounded-[var(--radius-card)]' : ''}`}
                                    >
                                        <div className="space-y-3 pb-3">
                                            {columnTasks.map((task, index) => (
                                                <KanbanCard
                                                    key={task.id}
                                                    task={task}
                                                    index={index}
                                                    onTaskClick={onTaskClick}
                                                />
                                            ))}
                                            {provided.placeholder}
                                        </div>

                                        <button className="w-full py-2 flex items-center gap-2 justify-center text-muted hover:text-brand hover:bg-brand-light rounded-[var(--radius-md)] transition-colors text-sm font-medium opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
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
