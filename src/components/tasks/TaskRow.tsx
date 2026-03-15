import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { MoreHorizontal, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { isToday, isTomorrow, isPast, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import type { TaskWithAssignee, CustomStatus } from '../../store/taskStore';
import type { GroupBy } from '../../hooks/useTaskFilters';

function formatDueDate(due: string) {
    const date = new Date(due);
    if (isToday(date)) return { label: 'Hoje', className: 'text-red-600 font-semibold' };
    if (isTomorrow(date)) return { label: 'Amanhã', className: 'text-orange-500' };
    if (isPast(date)) return { label: format(date, "dd/MM", { locale: ptBR }), className: 'text-red-600 font-bold underline' };
    return { label: format(date, "dd/MM", { locale: ptBR }), className: 'text-secondary' };
}

interface TaskRowProps {
    task: TaskWithAssignee;
    index: number;
    isFocused: boolean;
    isSelected: boolean;
    anySelected: boolean;
    groupBy: GroupBy;
    doneStatusId: string | undefined;
    statuses: CustomStatus[];
    onToggleSelect: (id: string) => void;
    onToggleStatusPopover: (e: React.MouseEvent, id: string) => void;
    onOpenDetail: (task: TaskWithAssignee) => void;
}

export const TaskRow = React.memo(function TaskRow({
    task,
    index,
    isFocused,
    isSelected,
    anySelected,
    groupBy,
    doneStatusId,
    statuses,
    onToggleSelect,
    onToggleStatusPopover,
    onOpenDetail,
}: TaskRowProps) {
    const isCompleted = task.status_id === doneStatusId;
    const isTodayTask = task.due_date ? isToday(new Date(task.due_date)) : false;
    const due = task.due_date ? formatDueDate(task.due_date) : null;
    const currentStatus = statuses.find(s => s.id === task.status_id);
    const statusBorderColor = isCompleted ? '#10b981' : (currentStatus?.color || 'transparent');

    return (
        <Draggable draggableId={task.id} index={index} isDragDisabled={groupBy !== 'status'}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    data-task-id={task.id}
                    className={cn(
                        "task-row px-4 py-3 grid grid-cols-12 gap-4 items-center group",
                        snapshot.isDragging && "bg-surface-card shadow-card border border-brand/10 z-50 rounded-lg",
                        !snapshot.isDragging && isSelected && "bg-brand/5",
                        !snapshot.isDragging && isFocused && "bg-brand/[0.08] ring-1 ring-brand/20",
                        !snapshot.isDragging && !isSelected && !isFocused && isTodayTask && "bg-brand-light/30",
                        !snapshot.isDragging && !isSelected && !isFocused && !isTodayTask && "hover:bg-surface-2/80"
                    )}
                    style={{
                        ...provided.draggableProps.style,
                        borderLeft: !snapshot.isDragging ? `3px solid ${statusBorderColor}` : undefined
                    }}
                >
                    <div className="col-span-6 flex items-center gap-3 min-w-0">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelect(task.id)}
                            className={cn(
                                "w-4 h-4 rounded border-border-subtle text-brand focus:ring-brand cursor-pointer shrink-0 transition-opacity",
                                !isSelected && !anySelected && "opacity-0 group-hover:opacity-100"
                            )}
                        />
                        <div className="relative flex items-center justify-center shrink-0">
                            <button
                                onClick={(e) => onToggleStatusPopover(e, task.id)}
                                className={cn(
                                    "w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
                                    isCompleted
                                        ? "bg-brand border-brand text-white scale-100 hover:scale-110"
                                        : "border-border-subtle hover:border-brand/50 hover:scale-110 text-transparent active:scale-90"
                                )}
                            >
                                {isCompleted
                                    ? <CheckCircle2 size={12} />
                                    : <div className="w-1.5 h-1.5 rounded-full bg-brand/0 group-hover:bg-brand/20 transition-colors" />
                                }
                            </button>
                        </div>

                        <span
                            onClick={() => onOpenDetail(task)}
                            className={cn(
                                "text-sm font-medium transition-colors duration-150 cursor-pointer truncate flex items-center gap-2 min-w-0",
                                isCompleted && 'line-through text-muted',
                                !isCompleted && task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && 'text-red-700 font-bold',
                                !isCompleted && !(task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))) && 'text-primary group-hover:text-brand'
                            )}
                        >
                            {task.category && task.category.color && (
                                <span
                                    className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border"
                                    style={{ backgroundColor: `${task.category.color}15`, color: task.category.color, borderColor: `${task.category.color}30` }}
                                >
                                    {task.category.name}
                                </span>
                            )}
                            <span className="truncate">{task.title}</span>
                        </span>
                    </div>

                    <div
                        onClick={() => onOpenDetail(task)}
                        className="col-span-4 grid grid-cols-4 gap-3 h-full items-center cursor-pointer"
                    >
                        <div className="col-span-2 flex items-center">
                            {task.project ? (
                                <span className="text-[10px] font-bold text-secondary border-l-2 pl-2 truncate" style={{ borderLeftColor: task.project.color || '#ccc' }}>
                                    {task.project.name}
                                </span>
                            ) : <span className="text-xs text-muted">—</span>}
                        </div>

                        <div className="col-span-2 flex items-center gap-1.5 text-[11px] font-bold">
                            {due
                                ? <span className={`flex items-center gap-1 ${due.className}`}><CalendarIcon size={11} /> {due.label}</span>
                                : <span className="text-muted">—</span>
                            }
                        </div>
                    </div>

                    <div className="col-span-1 flex items-center">
                        {task.priority ? (
                            <span className="flex items-center gap-1.5 text-[11px] font-medium text-secondary">
                                <span className={cn(
                                    "w-2 h-2 rounded-full shrink-0",
                                    task.priority === 'urgent' ? 'bg-red-500' :
                                    task.priority === 'high' ? 'bg-orange-500' :
                                    task.priority === 'medium' ? 'bg-blue-400' : 'bg-slate-300'
                                )} />
                                <span className="truncate hidden xl:block">
                                    {task.priority === 'low' ? 'Baixa' :
                                     task.priority === 'medium' ? 'Média' :
                                     task.priority === 'high' ? 'Alta' : 'Urgente'}
                                </span>
                            </span>
                        ) : <span className="text-xs text-muted">—</span>}
                    </div>

                    <div className="col-span-1 flex justify-end items-center gap-0.5">
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleStatusPopover(e, task.id); }}
                            className="p-1.5 text-muted hover:text-brand hover:bg-brand/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                            title="Mudar status"
                        >
                            <CheckCircle2 size={14} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onOpenDetail(task); }}
                            className="p-1.5 text-muted hover:text-brand hover:bg-brand/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                            title="Abrir detalhes"
                        >
                            <MoreHorizontal size={14} />
                        </button>
                    </div>
                </div>
            )}
        </Draggable>
    );
});
