import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ChevronLeft, ChevronRight, Plus, X, CalendarDays, CalendarRange, Filter, Check } from 'lucide-react';
import {
    format, addMonths, subMonths, addWeeks, subWeeks,
    startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTaskStore, type TaskWithAssignee } from '../store/taskStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { TaskFormModal } from '../components/tasks/TaskFormModal';

const MAX_CHIPS_MONTH = 3;

// Handles both 'YYYY-MM-DD' and full ISO timestamps safely in local timezone
function toLocalDateKey(dateStr: string): string {
    if (dateStr.includes('T') || dateStr.endsWith('Z')) {
        return format(new Date(dateStr), 'yyyy-MM-dd');
    }
    return dateStr.slice(0, 10);
}

function getProjectsFromTasks(tasks: TaskWithAssignee[]) {
    const map = new Map<string, { id: string; name: string; color: string | null }>();
    for (const t of tasks) {
        if (t.project && !map.has(t.project.id)) map.set(t.project.id, t.project);
    }
    return Array.from(map.values());
}

export default function Agenda() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [formDate, setFormDate] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [overflowDay, setOverflowDay] = useState<{ key: string; rect: DOMRect } | null>(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterPos, setFilterPos] = useState<{ top: number; left: number } | null>(null);
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const filterBtnRef = useRef<HTMLButtonElement>(null);

    const { tasks, statuses, loading, fetchWorkspaceTasks, fetchStatuses, updateTask } = useTaskStore();
    const { activeWorkspace } = useWorkspaceStore();

    useEffect(() => {
        if (activeWorkspace) {
            fetchWorkspaceTasks(activeWorkspace.id);
            fetchStatuses(activeWorkspace.id);
        }
    }, [activeWorkspace, fetchWorkspaceTasks, fetchStatuses]);

    // Derives selected task from store — stays fresh after edits
    const selectedTask = useMemo(
        () => tasks.find(t => t.id === selectedTaskId) ?? null,
        [tasks, selectedTaskId],
    );

    const doneStatusId = statuses[statuses.length - 1]?.id;
    const projects = useMemo(() => getProjectsFromTasks(tasks), [tasks]);

    const filteredTasks = useMemo(() => {
        if (selectedProjectIds.length === 0) return tasks;
        return tasks.filter(t => t.project_id && selectedProjectIds.includes(t.project_id));
    }, [tasks, selectedProjectIds]);

    const tasksByDay = useMemo(() => {
        const map: Record<string, TaskWithAssignee[]> = {};
        for (const task of filteredTasks) {
            if (!task.due_date) continue;
            const key = toLocalDateKey(task.due_date);
            if (!map[key]) map[key] = [];
            map[key].push(task);
        }
        return map;
    }, [filteredTasks]);

    const noDueDateTasks = useMemo(() => filteredTasks.filter(t => !t.due_date), [filteredTasks]);

    const calendarDays = useMemo(() => {
        if (viewMode === 'week') {
            const start = startOfWeek(currentDate, { weekStartsOn: 0 });
            return eachDayOfInterval({ start, end: endOfWeek(currentDate, { weekStartsOn: 0 }) });
        }
        const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
        const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
        return eachDayOfInterval({ start, end });
    }, [currentDate, viewMode]);

    const goNext = () => setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
    const goPrev = () => setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
    const goToday = () => setCurrentDate(new Date());

    const openNewTask = (date?: string) => {
        setFormDate(date ?? format(new Date(), 'yyyy-MM-dd'));
        setFormOpen(true);
    };

    const openOverflow = (e: React.MouseEvent, key: string) => {
        e.stopPropagation();
        setOverflowDay({ key, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() });
    };

    const openFilter = () => {
        const rect = filterBtnRef.current?.getBoundingClientRect();
        if (rect) {
            setFilterPos({ top: rect.bottom + 6, left: rect.right - 224 });
            setFilterOpen(true);
        }
    };

    const toggleProject = (id: string) =>
        setSelectedProjectIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const { draggableId, source, destination } = result;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;
        updateTask(draggableId, { due_date: destination.droppableId });
    };

    const periodLabel = viewMode === 'month'
        ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
        : (() => {
            const s = startOfWeek(currentDate, { weekStartsOn: 0 });
            const e = endOfWeek(currentDate, { weekStartsOn: 0 });
            return `${format(s, "d MMM", { locale: ptBR })} – ${format(e, "d MMM yyyy", { locale: ptBR })}`;
        })();

    return (
        <div className="space-y-6 fade-in h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-primary">Agenda</h1>
                <div className="flex items-center gap-2">
                    {/* Project filter */}
                    <button
                        ref={filterBtnRef}
                        onClick={openFilter}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-sm border transition-colors ${
                            selectedProjectIds.length > 0
                                ? 'bg-brand-light border-brand/20 text-brand'
                                : 'bg-surface-card border-border-subtle text-secondary hover:text-primary hover:bg-surface-0'
                        }`}
                    >
                        <Filter size={13} />
                        {selectedProjectIds.length > 0
                            ? `${selectedProjectIds.length} projeto${selectedProjectIds.length > 1 ? 's' : ''}`
                            : 'Filtrar'}
                    </button>

                    {/* View toggle */}
                    <div className="flex items-center bg-surface-card border border-border-subtle rounded-[var(--radius-md)] p-0.5">
                        <button
                            onClick={() => setViewMode('month')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                viewMode === 'month' ? 'bg-surface-0 text-primary' : 'text-muted hover:text-secondary'
                            }`}
                        >
                            <CalendarRange size={13} /> Mês
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                viewMode === 'week' ? 'bg-surface-0 text-primary' : 'text-muted hover:text-secondary'
                            }`}
                        >
                            <CalendarDays size={13} /> Semana
                        </button>
                    </div>

                    <Button
                        variant="ghost"
                        className="gap-2 bg-surface-card border border-border-subtle text-muted font-medium cursor-not-allowed opacity-60"
                        disabled
                        title="Integração em desenvolvimento"
                    >
                        <img
                            src="https://www.google.com/images/branding/product/2x/calendar_48dp.png"
                            alt=""
                            className="w-4 h-4 grayscale"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        Google Calendar
                    </Button>

                    <Button size="sm" className="gap-1.5" onClick={() => openNewTask()}>
                        <Plus size={14} /> Nova Tarefa
                    </Button>
                </div>
            </div>

            {/* Calendar card */}
            <Card className="flex-1 flex flex-col overflow-hidden bg-surface-card min-h-0">
                {/* Nav bar */}
                <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-0 shrink-0">
                    <h2 className="text-lg font-bold text-primary capitalize">{periodLabel}</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={goPrev} className="bg-surface-card">
                            <ChevronLeft size={18} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={goToday} className="bg-surface-card">
                            Hoje
                        </Button>
                        <Button variant="ghost" size="icon" onClick={goNext} className="bg-surface-card">
                            <ChevronRight size={18} />
                        </Button>
                    </div>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 border-b border-border-subtle bg-surface-0 shrink-0">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                        <div key={day} className="py-2 text-center text-[11px] font-bold text-secondary uppercase tracking-widest border-r border-border-subtle last:border-0">
                            {day}
                        </div>
                    ))}
                </div>

                {loading && (
                    <div className="flex-1 flex items-center justify-center text-sm text-muted">
                        Carregando tarefas…
                    </div>
                )}

                {!loading && (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div
                            className="flex-1 grid grid-cols-7 overflow-auto"
                            style={{ gap: '1px', backgroundColor: 'var(--color-border-subtle)' }}
                        >
                            {calendarDays.map((date) => {
                                const key = format(date, 'yyyy-MM-dd');
                                const dayTasks = tasksByDay[key] ?? [];
                                const inMonth = viewMode === 'week' || isSameMonth(date, currentDate);
                                const visible = viewMode === 'week' ? dayTasks : dayTasks.slice(0, MAX_CHIPS_MONTH);
                                const overflow = viewMode === 'week' ? 0 : Math.max(0, dayTasks.length - MAX_CHIPS_MONTH);

                                return (
                                    <Droppable droppableId={key} key={key}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`bg-surface-card p-2 flex flex-col group transition-colors ${
                                                    viewMode === 'week' ? 'min-h-[200px]' : 'min-h-[90px]'
                                                } ${inMonth ? '' : 'opacity-40'} ${
                                                    snapshot.isDraggingOver ? '!bg-brand/5' : ''
                                                }`}
                                            >
                                                {/* Day header */}
                                                <div className="flex items-start justify-between mb-1 shrink-0">
                                                    {viewMode === 'week' ? (
                                                        <div className="flex flex-col items-center gap-0.5 mb-1">
                                                            <span className={`text-xl font-bold w-9 h-9 flex items-center justify-center rounded-full ${
                                                                isToday(date) ? 'bg-brand text-white' : 'text-primary'
                                                            }`}>
                                                                {format(date, 'd')}
                                                            </span>
                                                            <span className="text-[9px] font-semibold text-muted uppercase tracking-wide">
                                                                {format(date, 'MMM', { locale: ptBR })}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                                                            isToday(date) ? 'bg-brand text-white' : 'text-primary'
                                                        }`}>
                                                            {format(date, 'd')}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => openNewTask(key)}
                                                        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-muted hover:text-brand hover:bg-surface-0 transition-all"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>

                                                {/* Task chips */}
                                                <div className="flex flex-col gap-0.5 flex-1">
                                                    {visible.map((task, i) => (
                                                        <Draggable key={task.id} draggableId={task.id} index={i}>
                                                            {(dragProvided, dragSnapshot) => (
                                                                <div
                                                                    ref={dragProvided.innerRef}
                                                                    {...dragProvided.draggableProps}
                                                                    {...dragProvided.dragHandleProps}
                                                                    style={dragProvided.draggableProps.style}
                                                                >
                                                                    <TaskChip
                                                                        task={task}
                                                                        isCompleted={task.status_id === doneStatusId}
                                                                        isDragging={dragSnapshot.isDragging}
                                                                        onClick={() => setSelectedTaskId(task.id)}
                                                                    />
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                    {overflow > 0 && (
                                                        <button
                                                            onClick={(e) => openOverflow(e, key)}
                                                            className="text-[10px] text-muted hover:text-primary text-left pl-1 leading-tight transition-colors"
                                                        >
                                                            +{overflow} mais
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </Droppable>
                                );
                            })}
                        </div>
                    </DragDropContext>
                )}
            </Card>

            {/* No due date */}
            {!loading && noDueDateTasks.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-secondary mb-2">
                        Sem prazo definido ({noDueDateTasks.length})
                    </h2>
                    <div className="bg-surface-card border border-border-subtle rounded-[var(--radius-card)] overflow-hidden">
                        {noDueDateTasks.slice(0, 20).map((task) => (
                            <button
                                key={task.id}
                                onClick={() => setSelectedTaskId(task.id)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-0 border-b border-border-subtle last:border-0 transition-colors"
                            >
                                <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: task.project?.color ?? '#6b6860' }}
                                />
                                <span className={`text-sm text-primary truncate flex-1 ${task.status_id === doneStatusId ? 'line-through text-muted' : ''}`}>
                                    {task.title}
                                </span>
                                {task.project && (
                                    <span className="text-xs text-muted shrink-0">{task.project.name}</span>
                                )}
                            </button>
                        ))}
                        {noDueDateTasks.length > 20 && (
                            <div className="px-4 py-2 text-xs text-muted text-center">
                                +{noDueDateTasks.length - 20} tarefas sem prazo
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Portals ── */}

            {/* Overflow popover */}
            {overflowDay && createPortal(
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setOverflowDay(null)} />
                    <div
                        className="fixed z-[9999] bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float w-64 p-2"
                        style={{ top: overflowDay.rect.bottom + 6, left: overflowDay.rect.left }}
                    >
                        <div className="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-border-subtle">
                            <span className="text-xs font-semibold text-secondary">
                                {format(new Date(overflowDay.key + 'T12:00:00'), "d 'de' MMMM", { locale: ptBR })}
                            </span>
                            <button onClick={() => setOverflowDay(null)} className="text-muted hover:text-primary transition-colors">
                                <X size={13} />
                            </button>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            {(tasksByDay[overflowDay.key] ?? []).map((task) => (
                                <TaskChip
                                    key={task.id}
                                    task={task}
                                    isCompleted={task.status_id === doneStatusId}
                                    isDragging={false}
                                    onClick={() => { setSelectedTaskId(task.id); setOverflowDay(null); }}
                                />
                            ))}
                        </div>
                    </div>
                </>,
                document.body,
            )}

            {/* Filter popover */}
            {filterOpen && filterPos && createPortal(
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setFilterOpen(false)} />
                    <div
                        className="fixed z-[9999] bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float w-56 p-1.5"
                        style={{ top: filterPos.top, left: filterPos.left }}
                    >
                        <div className="px-2 py-1.5 text-[10px] font-bold text-muted uppercase tracking-widest">
                            Projetos
                        </div>
                        {projects.length === 0 && (
                            <div className="px-2 py-2 text-xs text-muted">Nenhum projeto carregado</div>
                        )}
                        {projects.map(p => {
                            const active = selectedProjectIds.includes(p.id);
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => toggleProject(p.id)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-surface-0 transition-colors"
                                >
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color ?? '#6b6860' }} />
                                    <span className="text-sm text-primary flex-1 truncate text-left">{p.name}</span>
                                    {active && <Check size={13} className="text-brand shrink-0" />}
                                </button>
                            );
                        })}
                        {selectedProjectIds.length > 0 && (
                            <button
                                onClick={() => setSelectedProjectIds([])}
                                className="w-full mt-1 pt-1.5 border-t border-border-subtle text-xs text-muted hover:text-brand transition-colors text-center"
                            >
                                Limpar filtro
                            </button>
                        )}
                    </div>
                </>,
                document.body,
            )}

            {/* Modals */}
            <TaskDetailModal
                isOpen={!!selectedTask}
                onClose={() => setSelectedTaskId(null)}
                task={selectedTask}
            />
            <TaskFormModal
                isOpen={formOpen}
                onClose={() => { setFormOpen(false); setFormDate(null); }}
                defaultDueDate={formDate ?? undefined}
            />
        </div>
    );
}

// ─── Task Chip ────────────────────────────────────────────────────────────────

function TaskChip({
    task,
    isCompleted,
    isDragging,
    onClick,
}: {
    task: TaskWithAssignee;
    isCompleted: boolean;
    isDragging: boolean;
    onClick: () => void;
}) {
    const color = task.project?.color ?? '#6b6860';

    return (
        <button
            onClick={onClick}
            title={task.title}
            className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium leading-snug truncate transition-opacity hover:opacity-75 ${
                isCompleted ? 'line-through opacity-50' : ''
            } ${isDragging ? 'shadow-float' : ''}`}
            style={{
                backgroundColor: color + '22',
                color,
                borderLeft: `2px solid ${color}`,
            }}
        >
            {task.title}
        </button>
    );
}
