import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ArrowUp, ArrowDown, ArrowUpDown, Calendar as CalendarIcon, Clock, Inbox, List, Keyboard } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { supabase } from '../lib/supabase';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useTaskStore, type TaskWithAssignee } from '../store/taskStore';

import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { celebrate } from '../lib/confetti';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { StatusPopover } from '../components/tasks/StatusPopover';
import { TaskFiltersBar } from '../components/tasks/TaskFiltersBar';
import { TaskGroupSection } from '../components/tasks/TaskGroupSection';
import { BulkActionsBar } from '../components/tasks/BulkActionsBar';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useTaskFilters, type GroupBy, type SortField, type SortConfig } from '../hooks/useTaskFilters';

// ─── Column resize handle ──────────────────────
function ColResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
    return (
        <div
            onMouseDown={onMouseDown}
            className="absolute right-0 top-0 h-full w-3 cursor-col-resize z-10 flex items-center justify-center group/rh"
        >
            <div className="h-3/4 w-px bg-border-subtle group-hover/rh:w-0.5 group-hover/rh:bg-brand/50 transition-all duration-150" />
        </div>
    );
}

// ─── Column resize config ──────────────────────
const COL_IDS = ['title', 'project', 'due', 'created', 'priority', 'assignee', 'actions'] as const;
type ColId = typeof COL_IDS[number];
const DEFAULT_COL_W: Record<ColId, number> = { title: 280, project: 130, due: 110, created: 100, assignee: 48, priority: 90, actions: 44 };
const MIN_COL_W: Record<ColId, number> = { title: 150, project: 80, due: 80, created: 80, assignee: 48, priority: 60, actions: 44 };
const RESIZABLE_COLS = new Set<ColId>(['title', 'project', 'due', 'created', 'assignee', 'priority']);

// ─── Skeleton Component ────────────────────────
function TaskSkeleton({ gridTemplate, isMobile }: { gridTemplate: string; isMobile: boolean }) {
    if (isMobile) {
        return (
            <div className="px-3 flex flex-col divide-y divide-border-subtle">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="py-3 flex items-start gap-3 stagger-item" style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="skeleton-pulse w-5 h-5 rounded-full shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2">
                            <div className="skeleton-pulse h-4 rounded w-3/4" />
                            <div className="flex gap-2">
                                <div className="skeleton-pulse h-3 w-16 rounded" />
                                <div className="skeleton-pulse h-3 w-12 rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="px-4 flex flex-col divide-y divide-border-subtle">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="py-3 grid gap-3 items-center stagger-item" style={{ gridTemplateColumns: gridTemplate, animationDelay: `${i * 60}ms` }}>
                    <div className="flex items-center gap-3">
                        <div className="skeleton-pulse w-4 h-4 rounded shrink-0" />
                        <div className="skeleton-pulse w-5 h-5 rounded-full shrink-0" />
                        <div className="skeleton-pulse h-4 rounded flex-1" />
                    </div>
                    <div><div className="skeleton-pulse h-3 w-20 rounded" /></div>
                    <div><div className="skeleton-pulse h-3 w-16 rounded" /></div>
                    <div><div className="skeleton-pulse h-3 w-14 rounded" /></div>
                    <div />
                    <div><div className="skeleton-pulse h-3 w-12 rounded" /></div>
                    <div />
                </div>
            ))}
        </div>
    );
}

function TaskEmptyState({ groupName, hasFilters }: { groupName?: string; hasFilters: boolean }) {
    if (hasFilters) return (
        <EmptyState
            icon={Inbox}
            title="Nenhum resultado encontrado"
            description="Tente ajustar seus filtros ou termos de busca para encontrar o que procura."
        />
    );
    if (groupName) return (
        <EmptyState
            icon={Inbox}
            title={`Nenhuma tarefa em "${groupName}"`}
            description="Arraste tarefas de outros grupos para cá ou crie uma nova."
        />
    );
    return (
        <EmptyState
            icon={Inbox}
            title="Nenhuma tarefa criada ainda"
            description='Clique em "Novo" para criar sua primeira tarefa!'
        />
    );
}

export default function Tarefas() {
    const isMobile = useIsMobile();
    const { activeWorkspace } = useWorkspaceStore();
    const tasks = useTaskStore(s => s.tasks);
    const loading = useTaskStore(s => s.loading);
    const error = useTaskStore(s => s.error);
    const statuses = useTaskStore(s => s.statuses);
    const taskCategories = useTaskStore(s => s.taskCategories);
    const autoMovedCount = useTaskStore(s => s.autoMovedCount);
    const fetchWorkspaceTasks = useTaskStore(s => s.fetchWorkspaceTasks);
    const autoMovePastDueTasks = useTaskStore(s => s.autoMovePastDueTasks);
    const fetchCategories = useTaskStore(s => s.fetchCategories);
    const fetchStatuses = useTaskStore(s => s.fetchStatuses);
    const toggleTaskCompletion = useTaskStore(s => s.toggleTaskCompletion);
    const updateTask = useTaskStore(s => s.updateTask);

    // Column widths — resizable, persisted in localStorage
    const [colWidths, setColWidths] = useState<Record<ColId, number>>(() => {
        try {
            const saved = localStorage.getItem('fd_task_col_widths');
            return saved ? { ...DEFAULT_COL_W, ...JSON.parse(saved) } : { ...DEFAULT_COL_W };
        } catch { return { ...DEFAULT_COL_W }; }
    });
    const gridTemplate = COL_IDS.map(id => `${colWidths[id]}px`).join(' ');

    const onColResizeStart = useCallback((colId: ColId) => (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = colWidths[colId];
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        const onMove = (ev: MouseEvent) => {
            const next = Math.max(MIN_COL_W[colId], startWidth + (ev.clientX - startX));
            setColWidths(prev => ({ ...prev, [colId]: next }));
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            setColWidths(prev => { localStorage.setItem('fd_task_col_widths', JSON.stringify(prev)); return prev; });
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [colWidths]);

    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    const openTask = useCallback((task: TaskWithAssignee) => {
        setSelectedTask(task);
        setSearchParams(prev => { prev.set('task', task.id); return prev; }, { replace: true });
    }, [setSearchParams]);

    const closeTask = useCallback(() => {
        setSelectedTask(null);
        setSearchParams(prev => { prev.delete('task'); return prev; }, { replace: true });
    }, [setSearchParams]);

    // Filter states
    const [search, setSearch] = useState('');
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showCompleted, setShowCompleted] = useState(false);
    const [groupBy, setGroupBy] = useState<GroupBy>('status');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'due_date', direction: 'asc' });

    // UI states
    const [defaultExpanded, setDefaultExpanded] = useState<boolean>(() => {
        const saved = localStorage.getItem('tasks-default-expanded');
        return saved !== null ? saved === 'true' : true;
    });
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        () => defaultExpanded ? new Set(['todo', 'overdue', 'today', 'tomorrow', 'future', 'none']) : new Set()
    );
    const hasExpandedStatuses = useRef(false);
    const [animatingGroups, setAnimatingGroups] = useState<Map<string, 'enter' | 'exit'>>(new Map());
    const animationTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [statusPopover, setStatusPopover] = useState<{ taskId: string; position: { top: number; left: number } } | null>(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [focusedTaskIndex, setFocusedTaskIndex] = useState<number>(-1);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const taskListRef = useRef<HTMLDivElement>(null);
    const lastScrollY = useRef(0);
    const [filtersVisible, setFiltersVisible] = useState(true);

    const uniqueCategories = taskCategories;

    const { filteredTasks, groupedTasks, counters, uniqueProjects, uniqueAssignees, hasFilters, activeFilterCount } = useTaskFilters({
        tasks, statuses, search, selectedProject, selectedAssignee, selectedCategory, showCompleted, groupBy, sortConfig
    });

    const doneStatusId = statuses.length > 0 ? statuses[statuses.length - 1].id : undefined;

    useEffect(() => { if (error) toast.error(error); }, [error]);

    useEffect(() => {
        const taskId = searchParams.get('task');
        if (!taskId || tasks.length === 0) return;
        const found = tasks.find(t => t.id === taskId);
        if (found) setSelectedTask(found);
    }, [searchParams, tasks]);

    useEffect(() => {
        return () => { animationTimersRef.current.forEach(clearTimeout); animationTimersRef.current = []; };
    }, []);

    // Hide filters bar on scroll down, reveal on scroll up (mobile only)
    useEffect(() => {
        if (!isMobile) { setFiltersVisible(true); return; }
        const el = taskListRef.current;
        if (!el) return;
        const handleScroll = () => {
            const current = el.scrollTop;
            const diff = current - lastScrollY.current;
            if (diff > 10) setFiltersVisible(false);
            else if (diff < 0) setFiltersVisible(true);
            lastScrollY.current = current;
        };
        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el.removeEventListener('scroll', handleScroll);
    }, [isMobile]);

    useEffect(() => {
        if (statuses.length > 0 && !hasExpandedStatuses.current) {
            hasExpandedStatuses.current = true;
            if (defaultExpanded) {
                setExpandedSections(prev => new Set([...prev, ...statuses.map(s => s.id)]));
            }
        }
    }, [statuses, defaultExpanded]);

    useEffect(() => {
        if (!activeWorkspace) return;
        (async () => {
            await Promise.all([
                fetchStatuses(activeWorkspace.id),
                fetchWorkspaceTasks(activeWorkspace.id),
                fetchCategories(activeWorkspace.id),
            ]);
            await autoMovePastDueTasks();
        })();
    }, [activeWorkspace, fetchStatuses, fetchWorkspaceTasks, fetchCategories, autoMovePastDueTasks]);

    // Toast feedback when tasks are auto-moved
    const prevAutoMovedCount = useRef(0);
    useEffect(() => {
        if (autoMovedCount > 0 && autoMovedCount !== prevAutoMovedCount.current && statuses.length > 0) {
            prevAutoMovedCount.current = autoMovedCount;
            const firstName = statuses[0].name;
            toast.info(
                `${autoMovedCount} ${autoMovedCount === 1 ? 'tarefa movida' : 'tarefas movidas'} para "${firstName}" — prazo vencido`,
                { duration: 5000 }
            );
        }
    }, [autoMovedCount, statuses]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            switch (e.key) {
                case 'n': case 'N':
                    e.preventDefault(); setIsTaskModalOpen(true); break;
                case '/':
                    e.preventDefault(); searchInputRef.current?.focus(); break;
                case 'ArrowDown':
                    e.preventDefault(); setFocusedTaskIndex(prev => Math.min(prev + 1, filteredTasks.length - 1)); break;
                case 'ArrowUp':
                    e.preventDefault(); setFocusedTaskIndex(prev => Math.max(prev - 1, 0)); break;
                case 'Enter':
                    if (focusedTaskIndex >= 0 && focusedTaskIndex < filteredTasks.length) {
                        e.preventDefault(); openTask(filteredTasks[focusedTaskIndex]);
                    }
                    break;
                case ' ':
                    if (focusedTaskIndex >= 0 && focusedTaskIndex < filteredTasks.length) {
                        e.preventDefault();
                        const task = filteredTasks[focusedTaskIndex];
                        const taskEl = document.querySelector(`[data-task-id="${task.id}"]`);
                        if (taskEl) {
                            const rect = taskEl.getBoundingClientRect();
                            setStatusPopover({ taskId: task.id, position: { top: rect.top + window.scrollY, left: rect.left + rect.width + 10 } });
                        }
                    }
                    break;
                case 'Escape':
                    setFocusedTaskIndex(-1); setStatusPopover(null); break;
            }

            if (focusedTaskIndex >= 0 && /^[1-9]$/.test(e.key)) {
                const statusIndex = parseInt(e.key) - 1;
                if (statusIndex < statuses.length) {
                    e.preventDefault();
                    handleStatusSelect(filteredTasks[focusedTaskIndex].id, statuses[statusIndex].id);
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [focusedTaskIndex, statuses]);

    const isTaskDone = (task: TaskWithAssignee) => statuses.length > 0 && task.status_id === statuses[statuses.length - 1].id;

    const handleSort = (field: SortField) => {
        setSortConfig(prev => ({ field, direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortConfig.field !== field) return <ArrowUpDown size={10} className="text-muted" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={10} className="text-brand" />
            : <ArrowDown size={10} className="text-brand" />;
    };

    const toggleSelectTask = useCallback((taskId: string) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            next.has(taskId) ? next.delete(taskId) : next.add(taskId);
            return next;
        });
    }, []);

    const toggleSelectAll = () => {
        if (selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0) {
            setSelectedTaskIds(new Set());
        } else {
            setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
        }
    };

    const handleBulkComplete = async () => {
        if (!statuses.length) return;
        const { error } = await supabase.from('tasks').update({ status_id: statuses[statuses.length - 1].id }).in('id', Array.from(selectedTaskIds));
        if (!error) { setSelectedTaskIds(new Set()); if (activeWorkspace) fetchWorkspaceTasks(activeWorkspace.id, true); }
    };

    const handleBulkDelete = () => {
        if (!activeWorkspace || selectedTaskIds.size === 0) return;
        setConfirmDeleteOpen(true);
    };

    const executeBulkDelete = async () => {
        if (!activeWorkspace || selectedTaskIds.size === 0) return;
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ deleted_at: new Date().toISOString() })
                .in('id', Array.from(selectedTaskIds));
            if (error) throw error;
            toast.success(`${selectedTaskIds.size} tarefas movidas para a lixeira`);
            setSelectedTaskIds(new Set());
            fetchWorkspaceTasks(activeWorkspace.id, true);
        } catch (error) {
            console.error('Error bulk deleting tasks:', error);
            toast.error('Erro ao mover tarefas para a lixeira');
        }
    };

    const toggleSection = useCallback((sectionId: string) => {
        const isExpanded = expandedSections.has(sectionId);
        if (isExpanded) {
            setAnimatingGroups(prev => new Map(prev).set(sectionId, 'exit'));
            const t = setTimeout(() => {
                setExpandedSections(prev => { const n = new Set(prev); n.delete(sectionId); return n; });
                setAnimatingGroups(prev => { const n = new Map(prev); n.delete(sectionId); return n; });
            }, 200);
            animationTimersRef.current.push(t);
        } else {
            setExpandedSections(prev => new Set(prev).add(sectionId));
            setAnimatingGroups(prev => new Map(prev).set(sectionId, 'enter'));
            const t = setTimeout(() => {
                setAnimatingGroups(prev => { const n = new Map(prev); n.delete(sectionId); return n; });
            }, 300);
            animationTimersRef.current.push(t);
        }
    }, [expandedSections]);

    const expandAll = useCallback(() => {
        const allIds = groupedTasks.map(g => (g.id || 'todo') as string);
        setExpandedSections(new Set(allIds));
    }, [groupedTasks]);

    const collapseAll = useCallback(() => {
        setExpandedSections(new Set());
    }, []);

    const handleDefaultExpandedChange = useCallback((value: boolean) => {
        setDefaultExpanded(value);
        localStorage.setItem('tasks-default-expanded', String(value));
        // Only saves preference for next load — use expandAll/collapseAll for immediate action
    }, []);

    const handleStatusSelect = async (taskId: string, newStatusId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status_id === newStatusId) return;
        const previousStatusId = task.status_id;
        setStatusPopover(null);
        try {
            const isDoneStatus = doneStatusId === newStatusId;
            if (isDoneStatus) {
                await toggleTaskCompletion(taskId, true);
                celebrate();
                toast.success('Tarefa concluída! Parabéns! 🎉', {
                    duration: 5000,
                    action: { label: 'Desfazer', onClick: async () => { await toggleTaskCompletion(taskId, false); if (previousStatusId) await updateTask(taskId, { status_id: previousStatusId }); toast.info('Tarefa reaberta'); } }
                });
            } else {
                if (isTaskDone(task)) await toggleTaskCompletion(taskId, false);
                await updateTask(taskId, { status_id: newStatusId });
                toast.success('Status atualizado', {
                    action: { label: 'Desfazer', onClick: async () => { if (previousStatusId) await updateTask(taskId, { status_id: previousStatusId }); toast.info('Alteração de status desfeita'); } }
                });
            }
        } catch {
            toast.error('Erro ao atualizar status');
        }
    };

    const toggleStatusPopover = useCallback((e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        const el = e.currentTarget as HTMLElement | null;
        const rect = el?.getBoundingClientRect();
        const position = rect
            ? { top: rect.top + window.scrollY, left: rect.left + rect.width + 10 }
            : { top: 0, left: 0 };
        setStatusPopover(prev => prev?.taskId === taskId ? null : { taskId, position });
    }, []);

    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;
        if (groupBy !== 'status') return;

        const task = tasks.find(t => t.id === draggableId);
        const previousStatusId = task?.status_id;
        const newStatusId = destination.droppableId;
        const { moveTask } = useTaskStore.getState();
        await moveTask(draggableId, newStatusId, destination.index);

        const isDoneStatus = doneStatusId !== undefined && newStatusId === doneStatusId;
        if (isDoneStatus && previousStatusId !== newStatusId) {
            celebrate();
            toast.success('Tarefa concluída! 🎉', { duration: 5000, action: { label: 'Desfazer', onClick: async () => { await moveTask(draggableId, previousStatusId || null, source.index); toast.info('Movimentação desfeita'); } } });
        } else if (previousStatusId !== newStatusId) {
            toast.success('Tarefa movida', { duration: 4000, action: { label: 'Desfazer', onClick: async () => { await moveTask(draggableId, previousStatusId || null, source.index); toast.info('Movimentação desfeita'); } } });
        }
    };

    return (
        <div className="space-y-3 fade-in h-full flex flex-col">
            {/* Page Header */}
            <div className="flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                    <h1 className="text-2xl font-bold text-primary shrink-0">Minhas Tarefas</h1>
                    <div className="hidden sm:flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-card border border-border-subtle text-xs font-semibold text-secondary">
                            <List size={13} className="text-brand" />
                            <span className="font-bold text-primary">{counters.total}</span>
                            <span className="text-muted">em aberto</span>
                        </div>
                        {counters.overdue > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-100 text-xs font-semibold text-red-600">
                                <Clock size={13} />
                                <span className="font-bold">{counters.overdue}</span>
                                <span className="text-red-400">atrasadas</span>
                            </div>
                        )}
                        {counters.today > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand/5 border border-brand/15 text-xs font-semibold text-brand">
                                <CalendarIcon size={13} />
                                <span className="font-bold">{counters.today}</span>
                                <span className="text-brand/60">hoje</span>
                            </div>
                        )}
                    </div>
                </div>
                <Button size="sm" className="gap-2 shrink-0" onClick={() => setIsTaskModalOpen(true)}>
                    <span className="text-lg leading-none">+</span> Nova Tarefa
                </Button>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden">
                <div className={cn(
                    "shrink-0 overflow-hidden transition-[max-height] duration-300 ease-in-out",
                    isMobile ? (filtersVisible ? "max-h-[200px]" : "max-h-0") : "max-h-[200px]"
                )}>
                    <TaskFiltersBar
                        search={search} onSearchChange={setSearch} searchInputRef={searchInputRef}
                        groupBy={groupBy} onGroupByChange={setGroupBy}
                        selectedProject={selectedProject} onProjectChange={setSelectedProject}
                        selectedAssignee={selectedAssignee} onAssigneeChange={setSelectedAssignee}
                        selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory}
                        uniqueProjects={uniqueProjects} uniqueAssignees={uniqueAssignees}
                        uniqueCategories={uniqueCategories}
                        activeFilterCount={activeFilterCount}
                        showCompleted={showCompleted} onShowCompletedChange={setShowCompleted}
                        defaultExpanded={defaultExpanded} onDefaultExpandedChange={handleDefaultExpandedChange}
                        onExpandAll={expandAll} onCollapseAll={collapseAll}
                    />
                </div>

                {/* Table header — desktop only */}
                <div
                    className={cn("px-4 py-2 grid gap-3 bg-surface-0/80 border-b border-border-subtle sticky top-0 z-10 shrink-0 group/hrow", isMobile && "hidden")}
                    style={{ gridTemplateColumns: gridTemplate }}
                >
                    {/* Tarefa */}
                    <div className="flex items-center gap-3 relative overflow-hidden">
                        <input
                            type="checkbox"
                            checked={selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0}
                            onChange={toggleSelectAll}
                            className={cn("w-4 h-4 rounded border-border-subtle text-brand focus:ring-brand cursor-pointer transition-opacity shrink-0", selectedTaskIds.size === 0 && "opacity-30 group-hover/hrow:opacity-100")}
                        />
                        <button onClick={() => handleSort('title')} className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-secondary transition-colors truncate", sortConfig.field === 'title' ? 'text-brand' : 'text-muted')}>
                            Tarefa <SortIcon field="title" />
                        </button>
                        {RESIZABLE_COLS.has('title') && <ColResizeHandle onMouseDown={onColResizeStart('title')} />}
                    </div>
                    {/* Projeto */}
                    <div className="relative overflow-hidden">
                        <button onClick={() => handleSort('project')} className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-secondary transition-colors truncate", sortConfig.field === 'project' ? 'text-brand' : 'text-muted')}>
                            Projeto <SortIcon field="project" />
                        </button>
                        <ColResizeHandle onMouseDown={onColResizeStart('project')} />
                    </div>
                    {/* Prazo */}
                    <div className="relative overflow-hidden">
                        <button onClick={() => handleSort('due_date')} className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-secondary transition-colors truncate", sortConfig.field === 'due_date' ? 'text-brand' : 'text-muted')}>
                            Prazo <SortIcon field="due_date" />
                        </button>
                        <ColResizeHandle onMouseDown={onColResizeStart('due')} />
                    </div>
                    {/* Criação */}
                    <div className="relative overflow-hidden">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted truncate">Criação</span>
                        <ColResizeHandle onMouseDown={onColResizeStart('created')} />
                    </div>
                    {/* Prioridade */}
                    <div className="relative overflow-hidden">
                        <button onClick={() => handleSort('priority')} className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-secondary transition-colors truncate", sortConfig.field === 'priority' ? 'text-brand' : 'text-muted')}>
                            Prior. <SortIcon field="priority" />
                        </button>
                        <ColResizeHandle onMouseDown={onColResizeStart('priority')} />
                    </div>
                    {/* Resp. */}
                    <div className="relative overflow-hidden">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Resp.</span>
                        <ColResizeHandle onMouseDown={onColResizeStart('assignee')} />
                    </div>
                    <div />
                </div>

                {/* Task list */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col" ref={taskListRef}>
                    <div className="flex-1">
                        {loading ? (
                            <TaskSkeleton gridTemplate={gridTemplate} isMobile={isMobile} />
                        ) : filteredTasks.length === 0 ? (
                            <TaskEmptyState hasFilters={hasFilters} />
                        ) : (
                            <DragDropContext onDragEnd={onDragEnd}>
                                {groupedTasks.map(group => (
                                    <TaskGroupSection
                                        key={group.id}
                                        group={{ ...group, id: group.id || 'todo' }}
                                        isExpanded={expandedSections.has(group.id as string)}
                                        animating={animatingGroups.get(group.id as string)}
                                        groupBy={groupBy}
                                        gridTemplate={gridTemplate}
                                        doneStatusId={doneStatusId}
                                        filteredTasks={filteredTasks}
                                        focusedTaskIndex={focusedTaskIndex}
                                        selectedTaskIds={selectedTaskIds}
                                        statuses={statuses}
                                        isMobile={isMobile}
                                        onToggleSection={toggleSection}
                                        onToggleSelect={toggleSelectTask}
                                        onToggleStatusPopover={toggleStatusPopover}
                                        onOpenDetail={openTask}
                                    />
                                ))}
                            </DragDropContext>
                        )}
                    </div>
                </div>

                <BulkActionsBar
                    selectedCount={selectedTaskIds.size}
                    onCompleteAll={handleBulkComplete}
                    onDeleteAll={handleBulkDelete}
                    onCancel={() => setSelectedTaskIds(new Set())}
                />
            </Card>

            {/* Keyboard shortcuts button — desktop only */}
            <div className={cn("fixed bottom-4 right-4 z-30", isMobile && "hidden")}>
                {shortcutsOpen && (
                    <>
                        <div className="fixed inset-0" onClick={() => setShortcutsOpen(false)} />
                        <div className="absolute bottom-11 right-0 bg-surface-card border border-border-subtle px-4 py-3 rounded-card shadow-float text-[10px] space-y-1.5 w-48 popup-spring">
                            <p className="font-black text-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <Keyboard size={10} /> Atalhos
                            </p>
                            {[
                                ['N', 'Nova tarefa'],
                                ['/', 'Buscar'],
                                ['↑↓', 'Navegar'],
                                ['Enter', 'Abrir detalhes'],
                                ['Espaço', 'Mudar status'],
                                ['D', 'Editar prazo'],
                                ['1-9', 'Mover para status'],
                            ].map(([key, label]) => (
                                <p key={key} className="flex items-center justify-between gap-2">
                                    <kbd className="px-1.5 py-0.5 bg-surface-0 border border-border-subtle rounded text-[9px] font-mono shrink-0 text-secondary">{key}</kbd>
                                    <span className="text-secondary">{label}</span>
                                </p>
                            ))}
                        </div>
                    </>
                )}
                <button
                    onClick={() => setShortcutsOpen(v => !v)}
                    aria-label="Atalhos de teclado"
                    title="Atalhos de teclado"
                    className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shadow-float border transition-all duration-200",
                        shortcutsOpen
                            ? "bg-brand border-brand text-white"
                            : "bg-surface-card border-border-subtle text-muted hover:text-brand hover:border-brand/30"
                    )}
                >
                    <Keyboard size={14} />
                </button>
            </div>

            {selectedTask && (
                <TaskDetailModal isOpen={!!selectedTask} onClose={closeTask} task={selectedTask} />
            )}

            <TaskFormModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} />

            <ConfirmDialog
                isOpen={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                onConfirm={executeBulkDelete}
                title="Mover para lixeira"
                description={`Tem certeza que deseja mover ${selectedTaskIds.size} ${selectedTaskIds.size === 1 ? 'tarefa' : 'tarefas'} para a lixeira?`}
                confirmLabel="Mover para lixeira"
                variant="danger"
            />

            {statusPopover && (
                <StatusPopover
                    statusList={statuses}
                    currentStatusId={tasks.find(t => t.id === statusPopover.taskId)?.status_id || null}
                    position={statusPopover.position}
                    onSelect={(statusId) => handleStatusSelect(statusPopover.taskId, statusId)}
                    onClose={() => setStatusPopover(null)}
                />
            )}
        </div>
    );
}
