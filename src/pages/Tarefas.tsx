import { useEffect, useState, useRef, useCallback } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ArrowUpDown, Calendar as CalendarIcon, Clock, Inbox, List, Zap } from 'lucide-react';
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
import { useTaskFilters, type GroupBy, type SortField, type SortConfig } from '../hooks/useTaskFilters';

// ─── Skeleton Component ────────────────────────
function TaskSkeleton() {
    return (
        <div className="px-4 flex flex-col divide-y divide-border-subtle">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="py-3 grid grid-cols-12 gap-4 items-center stagger-item" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="col-span-6 flex items-center gap-3">
                        <div className="skeleton-pulse w-4 h-4 rounded" />
                        <div className="skeleton-pulse w-5 h-5 rounded-full" />
                        <div className="skeleton-pulse h-4 rounded flex-1" style={{ maxWidth: `${180 + Math.random() * 120}px` }} />
                    </div>
                    <div className="col-span-2"><div className="skeleton-pulse h-3 w-20 rounded" /></div>
                    <div className="col-span-2"><div className="skeleton-pulse h-3 w-16 rounded" /></div>
                    <div className="col-span-1"><div className="skeleton-pulse h-3 w-12 rounded" /></div>
                    <div className="col-span-1" />
                </div>
            ))}
        </div>
    );
}

function EmptyState({ groupName, hasFilters }: { groupName?: string; hasFilters: boolean }) {
    return (
        <div className="py-12 flex flex-col items-center justify-center gap-3 fade-in">
            <div className="w-14 h-14 rounded-card bg-surface-0 flex items-center justify-center">
                <Inbox size={24} className="text-muted" />
            </div>
            {hasFilters ? (
                <>
                    <p className="text-sm font-semibold text-secondary">Nenhum resultado encontrado</p>
                    <p className="text-xs text-muted max-w-xs text-center">Tente ajustar seus filtros ou termos de busca para encontrar o que procura.</p>
                </>
            ) : groupName ? (
                <>
                    <p className="text-sm font-semibold text-secondary">Nenhuma tarefa em "{groupName}"</p>
                    <p className="text-xs text-muted">Arraste tarefas de outros grupos para cá ou crie uma nova.</p>
                </>
            ) : (
                <>
                    <p className="text-sm font-semibold text-secondary">Nenhuma tarefa criada ainda</p>
                    <p className="text-xs text-muted">Clique em "Novo" para criar sua primeira tarefa! 🚀</p>
                </>
            )}
        </div>
    );
}

export default function Tarefas() {
    const { activeWorkspace } = useWorkspaceStore();
    const { tasks, loading, fetchWorkspaceTasks, fetchCategories, toggleTaskCompletion, statuses, fetchStatuses, updateTask } = useTaskStore();

    const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    // Filter states
    const [search, setSearch] = useState('');
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
    const [showCompleted, setShowCompleted] = useState(false);
    const [groupBy, setGroupBy] = useState<GroupBy>('status');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'due_date', direction: 'asc' });

    // UI states
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [animatingGroups, setAnimatingGroups] = useState<Map<string, 'enter' | 'exit'>>(new Map());
    const animationTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [statusPopover, setStatusPopover] = useState<{ taskId: string; position: { top: number; left: number } } | null>(null);
    const [focusedTaskIndex, setFocusedTaskIndex] = useState<number>(-1);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const taskListRef = useRef<HTMLDivElement>(null);

    const { filteredTasks, groupedTasks, counters, uniqueProjects, uniqueAssignees, hasFilters, activeFilterCount } = useTaskFilters({
        tasks, statuses, search, selectedProject, selectedAssignee, showCompleted, groupBy, sortConfig
    });

    const doneStatusId = statuses.length > 0 ? statuses[statuses.length - 1].id : undefined;

    useEffect(() => {
        return () => { animationTimersRef.current.forEach(clearTimeout); };
    }, []);

    useEffect(() => {
        if (activeWorkspace) {
            fetchStatuses(activeWorkspace.id);
            fetchCategories(activeWorkspace.id);
            fetchWorkspaceTasks(activeWorkspace.id).then(() => {
                if (expandedSections.size === 0 && statuses.length > 0) {
                    setExpandedSections(new Set([...statuses.map(s => s.id), 'todo', 'overdue', 'today', 'tomorrow', 'future', 'none']));
                }
            });
        }
    }, [activeWorkspace, fetchStatuses, fetchWorkspaceTasks]);

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
                        e.preventDefault(); setSelectedTask(filteredTasks[focusedTaskIndex]);
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

    const handleBulkDelete = async () => {
        if (!activeWorkspace || selectedTaskIds.size === 0) return;
        if (!window.confirm(`Excluir ${selectedTaskIds.size} tarefas?`)) return;
        try {
            const { error } = await supabase.from('tasks').delete().in('id', Array.from(selectedTaskIds));
            if (error) throw error;
            setSelectedTaskIds(new Set());
            if (activeWorkspace) fetchWorkspaceTasks(activeWorkspace.id, true);
        } catch (error) {
            console.error('Error bulk deleting tasks:', error);
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

    const allTasksPerGroup = (groupId: string) =>
        tasks.filter(t => t.status_id === groupId || (!t.status_id && groupId === 'todo')).length;

    return (
        <div className="space-y-6 fade-in h-full flex flex-col">
            {/* Page Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-primary">Minhas Tarefas</h1>
                    <p className="text-sm text-secondary">Gerencie e acompanhe todas as suas tarefas.</p>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setIsTaskModalOpen(true)}>
                    <span className="text-lg leading-none">+</span> Nova Tarefa
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                <Card className="p-4 flex items-center gap-4 transition-all hover:shadow-float">
                    <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand"><List size={20} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Total em Aberto</p>
                        <p className="text-xl font-bold text-primary">{counters.total}</p>
                    </div>
                </Card>
                <Card className="p-4 flex items-center gap-4 transition-all hover:shadow-float">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600"><Clock size={20} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Atrasadas</p>
                        <p className="text-xl font-bold text-red-600 tracking-tight">{counters.overdue}</p>
                    </div>
                </Card>
                <Card className="p-4 flex items-center gap-4 transition-all hover:shadow-float">
                    <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center text-brand"><CalendarIcon size={20} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Para Hoje</p>
                        <p className="text-xl font-bold text-brand tracking-tight">{counters.today}</p>
                    </div>
                </Card>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden">
                <TaskFiltersBar
                    search={search} onSearchChange={setSearch} searchInputRef={searchInputRef}
                    groupBy={groupBy} onGroupByChange={setGroupBy}
                    selectedProject={selectedProject} onProjectChange={setSelectedProject}
                    selectedAssignee={selectedAssignee} onAssigneeChange={setSelectedAssignee}
                    uniqueProjects={uniqueProjects} uniqueAssignees={uniqueAssignees}
                    activeFilterCount={activeFilterCount}
                    showCompleted={showCompleted} onShowCompletedChange={setShowCompleted}
                />

                {/* Table header */}
                <div className="px-4 py-2 grid grid-cols-12 gap-4 bg-surface-0/80 border-b border-border-subtle sticky top-0 z-10 shrink-0 group/hrow">
                    <div className="col-span-6 flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0}
                            onChange={toggleSelectAll}
                            className={cn("w-4 h-4 rounded border-border-subtle text-brand focus:ring-brand cursor-pointer transition-opacity shrink-0", selectedTaskIds.size === 0 && "opacity-0 group-hover/hrow:opacity-100")}
                        />
                        <button onClick={() => handleSort('title')} className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-1 hover:text-secondary transition-colors">
                            Tarefa <ArrowUpDown size={10} />
                        </button>
                    </div>
                    <div className="col-span-2">
                        <button onClick={() => handleSort('project')} className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-1 hover:text-secondary transition-colors">
                            Projeto <ArrowUpDown size={10} />
                        </button>
                    </div>
                    <div className="col-span-2">
                        <button onClick={() => handleSort('due_date')} className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-1 hover:text-secondary transition-colors">
                            Prazo <ArrowUpDown size={10} />
                        </button>
                    </div>
                    <div className="col-span-1">
                        <button onClick={() => handleSort('priority')} className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-1 hover:text-secondary transition-colors">
                            Prioridade <ArrowUpDown size={10} />
                        </button>
                    </div>
                    <div className="col-span-1" />
                </div>

                {/* Task list */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col" ref={taskListRef}>
                    <div className="flex-1">
                        {loading ? (
                            <TaskSkeleton />
                        ) : filteredTasks.length === 0 ? (
                            <EmptyState hasFilters={hasFilters} />
                        ) : (
                            <DragDropContext onDragEnd={onDragEnd}>
                                {groupedTasks.map(group => (
                                    <TaskGroupSection
                                        key={group.id}
                                        group={group}
                                        isExpanded={expandedSections.has(group.id as string)}
                                        animating={animatingGroups.get(group.id as string)}
                                        groupBy={groupBy}
                                        totalTasksInGroup={allTasksPerGroup(group.id as string)}
                                        doneStatusId={doneStatusId}
                                        filteredTasks={filteredTasks}
                                        focusedTaskIndex={focusedTaskIndex}
                                        selectedTaskIds={selectedTaskIds}
                                        statuses={statuses}
                                        onToggleSection={toggleSection}
                                        onToggleSelect={toggleSelectTask}
                                        onToggleStatusPopover={toggleStatusPopover}
                                        onOpenDetail={setSelectedTask}
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

            {/* Keyboard shortcuts hint */}
            <div className="fixed bottom-4 right-4 z-30 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <div className="bg-gray-900/90 backdrop-blur-sm text-white px-4 py-3 rounded-card shadow-float text-[10px] space-y-1">
                    <p className="font-bold text-muted uppercase tracking-widest mb-1.5 flex items-center gap-1"><Zap size={10} /> Atalhos</p>
                    <p><kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[9px] font-mono">N</kbd> Nova tarefa</p>
                    <p><kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[9px] font-mono">/</kbd> Buscar</p>
                    <p><kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[9px] font-mono">↑↓</kbd> Navegar</p>
                    <p><kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[9px] font-mono">Enter</kbd> Abrir</p>
                    <p><kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[9px] font-mono">Espaço</kbd> Status</p>
                    <p><kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[9px] font-mono">1-9</kbd> Mover rápido</p>
                </div>
            </div>

            {selectedTask && (
                <TaskDetailModal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} task={selectedTask} />
            )}

            <TaskFormModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} />

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
