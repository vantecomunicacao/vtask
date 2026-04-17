import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Draggable } from '@hello-pangea/dnd';
import { MoreHorizontal, Calendar as CalendarIcon, CheckCircle2, ExternalLink, Trash2 } from 'lucide-react';
import { isToday, isTomorrow, isPast, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import type { TaskWithAssignee, CustomStatus } from '../../store/taskStore';
import { useTaskStore } from '../../store/taskStore';
import type { GroupBy } from '../../hooks/useTaskFilters';
import { DatePickerPopover } from '../ui/DatePicker';
import { parseDueDate } from '../../lib/dateUtils';

const parseLocalDate = parseDueDate;

function formatDueDate(due: string) {
    const date = parseLocalDate(due);
    if (isToday(date)) return { label: 'Hoje', className: 'text-amber-600 font-semibold' };
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
    gridTemplate: string;
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
    gridTemplate,
    doneStatusId,
    statuses,
    onToggleSelect,
    onToggleStatusPopover,
    onOpenDetail,
}: TaskRowProps) {
    const updateTask = useTaskStore(s => s.updateTask);
    const deleteTask = useTaskStore(s => s.deleteTask);
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const dateBtnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuBtnRef = useRef<HTMLButtonElement>(null);

    const openMenu = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setMenuPos({ top: rect.bottom + 4, left: rect.right - 176 });
        setIsMenuOpen(v => !v);
    }, []);

    useEffect(() => {
        if (!isMenuOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target as Node) &&
                menuBtnRef.current && !menuBtnRef.current.contains(e.target as Node)
            ) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isMenuOpen]);

    // Keyboard shortcut: D opens date picker when this row is focused
    React.useEffect(() => {
        if (!isFocused) return;
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
            if (e.key === 'd' || e.key === 'D') { e.preventDefault(); setIsEditingDate(true); }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isFocused]);

    const isCompleted = task.status_id === doneStatusId;
    const isTodayTask = task.due_date ? isToday(parseLocalDate(task.due_date)) : false;
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
                        "task-row px-4 py-3 grid gap-3 items-center group",
                        snapshot.isDragging && "bg-surface-card shadow-card border border-brand/10 z-50 rounded-lg",
                        !snapshot.isDragging && isSelected && "bg-brand/5",
                        !snapshot.isDragging && isFocused && "bg-brand/[0.08] ring-1 ring-brand/20",
                        !snapshot.isDragging && !isSelected && !isFocused && isTodayTask && "bg-brand-light/30",
                        !snapshot.isDragging && !isSelected && !isFocused && !isTodayTask && "hover:bg-surface-2/80"
                    )}
                    style={{
                        ...provided.draggableProps.style,
                        gridTemplateColumns: gridTemplate,
                        borderLeft: !snapshot.isDragging ? `3px solid ${statusBorderColor}` : undefined
                    }}
                >
                    <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelect(task.id)}
                            aria-label={`Selecionar tarefa: ${task.title}`}
                            className={cn(
                                "w-4 h-4 rounded border-border-subtle text-brand focus:ring-brand cursor-pointer shrink-0 transition-opacity",
                                !isSelected && !anySelected && "opacity-30 group-hover:opacity-100"
                            )}
                        />
                        <div className="relative flex items-center justify-center shrink-0">
                            <button
                                onClick={(e) => onToggleStatusPopover(e, task.id)}
                                aria-label={isCompleted ? 'Marcar como pendente' : 'Mudar status'}
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
                                !isCompleted && task.due_date && isPast(parseLocalDate(task.due_date)) && !isToday(parseLocalDate(task.due_date)) && 'font-bold',
                                !isCompleted && 'text-primary group-hover:text-brand'
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

                    {/* Projeto */}
                    <div
                        onClick={() => onOpenDetail(task)}
                        className="flex items-center cursor-pointer overflow-hidden"
                    >
                        {task.project ? (
                            <span
                                className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border truncate max-w-full"
                                style={{
                                    backgroundColor: `${task.project.color || '#888'}18`,
                                    color: task.project.color || '#888',
                                    borderColor: `${task.project.color || '#888'}35`
                                }}
                            >
                                {task.project.name}
                            </span>
                        ) : <span className="text-xs text-muted">—</span>}
                    </div>

                    {/* Prazo */}
                    <div className="flex items-center gap-1.5 text-[11px] font-bold relative overflow-hidden">
                        {due ? (
                            <button
                                ref={dateBtnRef}
                                onClick={(e) => { e.stopPropagation(); setIsEditingDate(v => !v); }}
                                className={cn("flex items-center gap-1 hover:underline", due.className)}
                                title="Editar prazo (D)"
                            >
                                <CalendarIcon size={11} /> {due.label}
                            </button>
                        ) : (
                            <button
                                ref={dateBtnRef}
                                onClick={(e) => { e.stopPropagation(); setIsEditingDate(v => !v); }}
                                className="flex items-center gap-1 text-muted opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-brand transition-all"
                                title="Adicionar prazo (D)"
                            >
                                <CalendarIcon size={11} />
                                <span className="text-[10px]">Data</span>
                            </button>
                        )}
                        <DatePickerPopover
                            open={isEditingDate}
                            onClose={() => setIsEditingDate(false)}
                            value={task.due_date}
                            onChange={async (val) => { await updateTask(task.id, { due_date: val }); }}
                            anchorRef={dateBtnRef}
                        />
                    </div>

                    {/* Criação */}
                    <div className="flex items-center text-[11px] text-muted overflow-hidden">
                        {task.created_at
                            ? format(new Date(task.created_at), "dd/MM/yy", { locale: ptBR })
                            : '—'}
                    </div>

                    {/* Prioridade */}
                    <div className="flex items-center overflow-hidden">
                        {task.priority ? (
                            <span className="flex items-center gap-1.5 text-[11px] font-medium text-secondary">
                                <span className={cn(
                                    "w-2 h-2 rounded-full shrink-0",
                                    task.priority === 'urgent' ? 'bg-red-500' :
                                    task.priority === 'high' ? 'bg-orange-500' :
                                    task.priority === 'medium' ? 'bg-blue-400' : 'bg-slate-300'
                                )} />
                                <span className="truncate">
                                    {task.priority === 'low' ? 'Baixa' :
                                     task.priority === 'medium' ? 'Média' :
                                     task.priority === 'high' ? 'Alta' : 'Urgente'}
                                </span>
                            </span>
                        ) : <span className="text-xs text-muted">—</span>}
                    </div>

                    {/* Responsável */}
                    <div className="flex items-center overflow-hidden">
                        {task.assignee ? (
                            <div
                                className="w-6 h-6 rounded-full border-2 border-surface-card overflow-hidden shrink-0"
                                title={task.assignee.full_name || task.assignee.email || ''}
                            >
                                <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee.full_name || task.assignee.email || 'U')}&background=fdf3f2&color=db4035&size=48`}
                                    alt={task.assignee.full_name || task.assignee.email || ''}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <span className="text-xs text-muted opacity-0 group-hover:opacity-60">—</span>
                        )}
                    </div>

                    {/* Ações */}
                    <div className="flex justify-end items-center">
                        <button
                            ref={menuBtnRef}
                            onClick={openMenu}
                            className={cn(
                                "p-1.5 rounded-lg transition-all duration-200",
                                isMenuOpen
                                    ? "text-brand bg-brand/10 opacity-100"
                                    : "text-muted hover:text-brand hover:bg-brand/5 opacity-0 group-hover:opacity-100"
                            )}
                            aria-label="Mais opções"
                            title="Mais opções"
                        >
                            <MoreHorizontal size={14} />
                        </button>

                        {isMenuOpen && createPortal(
                            <div
                                ref={menuRef}
                                style={{ top: menuPos.top, left: menuPos.left }}
                                className="fixed w-44 bg-surface-card border border-border-subtle rounded-lg shadow-float z-[9999] py-1 popup-spring"
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onOpenDetail(task); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-secondary hover:bg-surface-2 hover:text-primary transition-colors"
                                >
                                    <ExternalLink size={13} className="text-muted" />
                                    Abrir detalhes
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); setIsEditingDate(true); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-secondary hover:bg-surface-2 hover:text-primary transition-colors"
                                >
                                    <CalendarIcon size={13} className="text-muted" />
                                    Editar prazo
                                </button>
                                <div className="my-1 border-t border-border-subtle" />
                                <button
                                    onClick={async (e) => { e.stopPropagation(); setIsMenuOpen(false); await deleteTask(task.id); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={13} />
                                    Mover para lixeira
                                </button>
                            </div>,
                            document.body
                        )}
                    </div>
                </div>
            )}
        </Draggable>
    );
});
