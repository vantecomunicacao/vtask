import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { MoreHorizontal, Calendar as CalendarIcon, Flag, Search, ChevronDown, ChevronRight, CheckCircle2, ArrowUpDown, List, Clock, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useTaskStore, type TaskWithAssignee } from '../store/taskStore';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TaskWithProject = TaskWithAssignee & {
    project?: { id: string; name: string; color: string | null } | null;
    category?: { id: string; name: string; color: string | null } | null;
};

type GroupBy = 'status' | 'project' | 'due_date';
type SortField = 'title' | 'due_date' | 'priority' | 'project';
type SortConfig = { field: SortField; direction: 'asc' | 'desc' };

// PRIORITY_LABELS removido pois não é usado nesta página no momento
function formatDueDate(due: string) {
    const date = new Date(due);
    if (isToday(date)) return { label: 'Hoje', className: 'text-red-600 font-semibold' };
    if (isTomorrow(date)) return { label: 'Amanhã', className: 'text-orange-500' };
    if (isPast(date)) return { label: format(date, "dd/MM", { locale: ptBR }), className: 'text-red-600 font-bold underline' };
    return { label: format(date, "dd/MM", { locale: ptBR }), className: 'text-gray-500' };
}

export default function Tarefas() {
    const { activeWorkspace } = useWorkspaceStore();
    const { toggleTaskCompletion, statuses, fetchStatuses } = useTaskStore();

    const [tasks, setTasks] = useState<TaskWithProject[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    // Filter states
    const [search, setSearch] = useState('');
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
    const [showCompleted, setShowCompleted] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    // ... existing enhancements ...
    const [groupBy, setGroupBy] = useState<GroupBy>('status');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'due_date', direction: 'asc' });
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (activeWorkspace) {
            fetchStatuses(activeWorkspace.id);
            loadMyTasks(activeWorkspace.id);
        }
    }, [activeWorkspace]);

    const loadMyTasks = async (workspaceId: string) => {
        setLoading(true);
        const { data: projectRows } = await supabase
            .from('projects')
            .select('id')
            .eq('workspace_id', workspaceId);

        const projectIds = projectRows?.map(p => p.id) || [];
        if (projectIds.length === 0) {
            setTasks([]);
            setLoading(false);
            return;
        }

        const { data } = await supabase
            .from('tasks')
            .select('*, project:projects(id, name, color), assignee:profiles(*), category:task_categories(id, name, color)')
            .in('project_id', projectIds)
            .order('due_date', { ascending: true, nullsFirst: false });

        const taskData = (data as TaskWithProject[]) || [];
        setTasks(taskData);

        if (statuses.length > 0 && data) {
            const lastStatusId = statuses[statuses.length - 1].id;
            const done = new Set(taskData.filter(t => t.status_id === lastStatusId).map(t => t.id));
            setCompletedIds(done);
        }

        if (statuses.length > 0 && expandedSections.size === 0) {
            setExpandedSections(new Set([...statuses.map(s => s.id), 'todo', 'overdue', 'today', 'tomorrow', 'future', 'none']));
        }

        setLoading(false);
    };

    const handleSort = (field: SortField) => {
        setSortConfig(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleSelectTask = (taskId: string) => {
        const newSelected = new Set(selectedTaskIds);
        if (newSelected.has(taskId)) {
            newSelected.delete(taskId);
        } else {
            newSelected.add(taskId);
        }
        setSelectedTaskIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0) {
            setSelectedTaskIds(new Set());
        } else {
            setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (!activeWorkspace || selectedTaskIds.size === 0) return;
        if (!window.confirm(`Excluir ${selectedTaskIds.size} tarefas?`)) return;

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .in('id', Array.from(selectedTaskIds));

            if (error) throw error;
            setSelectedTaskIds(new Set());
            if (activeWorkspace) loadMyTasks(activeWorkspace.id);
        } catch (error) {
            console.error('Error bulk deleting tasks:', error);
        }
    };



    const toggleSection = (sectionId: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(sectionId)) {
            newExpanded.delete(sectionId);
        } else {
            newExpanded.add(sectionId);
        }
        setExpandedSections(newExpanded);
    };

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase());
        const matchesProject = selectedProject === 'all' || task.project_id === selectedProject;
        const matchesAssignee = selectedAssignee === 'all' || task.assignee_id === selectedAssignee;
        const isLastStatus = statuses.length > 0 && task.status_id === statuses[statuses.length - 1].id;
        const matchesCompleted = showCompleted || !isLastStatus;
        return matchesSearch && matchesProject && matchesAssignee && matchesCompleted;
    }).sort((a, b) => {
        const { field, direction } = sortConfig;
        let compare = 0;
        if (field === 'title') compare = a.title.localeCompare(b.title);
        else if (field === 'due_date') {
            const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
            const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
            compare = dateA - dateB;
        } else if (field === 'priority') {
            const priorityMap: any = { urgent: 0, high: 1, medium: 2, low: 3 };
            compare = priorityMap[a.priority || 'medium'] - priorityMap[b.priority || 'medium'];
        } else if (field === 'project') {
            compare = (a.project?.name || '').localeCompare(b.project?.name || '');
        }
        return direction === 'asc' ? compare : -compare;
    });

    const counters = {
        total: tasks.filter(t => !statuses.length || t.status_id !== statuses[statuses.length - 1].id).length,
        today: tasks.filter(t => t.due_date && isToday(new Date(t.due_date)) && (!statuses.length || t.status_id !== statuses[statuses.length - 1].id)).length,
        overdue: tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && (!statuses.length || t.status_id !== statuses[statuses.length - 1].id)).length
    };

    const groupedTasks = (() => {
        if (groupBy === 'status') {
            const statusList = statuses.length > 0 ? statuses : [{ id: 'todo', name: 'A fazer', color: '#ccc' }];
            return statusList.map(status => ({
                id: status.id,
                name: status.name,
                color: status.color,
                tasks: filteredTasks.filter(t => t.status_id === status.id || (!t.status_id && status.id === 'todo'))
            }));
        } else if (groupBy === 'project') {
            const projectIds = Array.from(new Set(filteredTasks.map(t => t.project?.id).filter(Boolean)));
            const groups = projectIds.map(id => {
                const project = filteredTasks.find(t => t.project?.id === id)!.project!;
                return { id, name: project.name, color: project.color || '#ccc', tasks: filteredTasks.filter(t => t.project?.id === id) };
            });
            const noProject = filteredTasks.filter(t => !t.project);
            if (noProject.length > 0) groups.push({ id: 'none', name: 'Sem Projeto', color: '#94a3b8', tasks: noProject });
            return groups;
        } else {
            return [
                { id: 'overdue', name: 'Atrasadas', color: '#ef4444', tasks: filteredTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))) },
                { id: 'today', name: 'Hoje', color: '#3b82f6', tasks: filteredTasks.filter(t => t.due_date && isToday(new Date(t.due_date))) },
                { id: 'tomorrow', name: 'Amanhã', color: '#f59e0b', tasks: filteredTasks.filter(t => t.due_date && isTomorrow(new Date(t.due_date))) },
                { id: 'future', name: 'Próximas', color: '#10b981', tasks: filteredTasks.filter(t => t.due_date && new Date(t.due_date).getTime() > new Date(new Date().setHours(23, 59, 59, 999)).getTime()) },
                { id: 'none', name: 'Sem Prazo', color: '#94a3b8', tasks: filteredTasks.filter(t => !t.due_date) }
            ].filter(g => g.tasks.length > 0).map(g => ({ ...g, color: g.color || '#ccc' }));
        }
    })();

    const uniqueProjects = Array.from(new Set(tasks.map(t => t.project).filter(Boolean).map(p => JSON.stringify(p)))).map(s => JSON.parse(s));
    const uniqueAssignees = Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean).map(a => JSON.stringify(a)))).map(s => JSON.parse(s));

    const handleToggle = async (task: TaskWithProject) => {
        const isCurrentlyCompleted = completedIds.has(task.id);
        const newCompleted = new Set(completedIds);
        if (isCurrentlyCompleted) newCompleted.delete(task.id);
        else newCompleted.add(task.id);
        setCompletedIds(newCompleted);
        await toggleTaskCompletion(task.id, !isCurrentlyCompleted);
        if (activeWorkspace) loadMyTasks(activeWorkspace.id);
    };

    return (
        <div className="space-y-6 fade-in h-full flex flex-col">
            {/* Header de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                        <List size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total em Aberto</p>
                        <p className="text-xl font-bold text-gray-900">{counters.total}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Atrasadas</p>
                        <p className="text-xl font-bold text-red-600 tracking-tight">{counters.overdue}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Para Hoje</p>
                        <p className="text-xl font-bold text-blue-600 tracking-tight">{counters.today}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-border-subtle shadow-sm flex-1 flex flex-col overflow-hidden">
                {/* Filtros e Controles */}
                <div className="p-4 border-b border-border-subtle flex flex-wrap gap-4 items-center justify-between bg-gray-50/50 shrink-0">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar tarefas..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none w-64 transition-all"
                            />
                        </div>

                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all cursor-pointer"
                        >
                            <option value="all">Todos os Projetos</option>
                            {uniqueProjects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        <select
                            value={selectedAssignee}
                            onChange={(e) => setSelectedAssignee(e.target.value)}
                            className="px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all cursor-pointer"
                        >
                            <option value="all">Todos os Responsáveis</option>
                            {uniqueAssignees.map(a => (
                                <option key={a.id} value={a.id}>{a.email.split('@')[0]}</option>
                            ))}
                        </select>

                        <div className="h-6 w-px bg-gray-200 mx-1" />

                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {(['status', 'project', 'due_date'] as const).map(option => (
                                <button
                                    key={option}
                                    onClick={() => setGroupBy(option)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${groupBy === option ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {option === 'status' ? 'Status' : option === 'project' ? 'Projeto' : 'Prazo'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowCompleted(!showCompleted)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${showCompleted ? 'bg-brand text-white shadow-md' : 'bg-white border border-border-subtle text-gray-600 hover:bg-gray-50'}`}
                        >
                            {showCompleted ? 'Ocultar Concluídas' : 'Mostrar Concluídas'}
                        </button>
                        <Button onClick={() => setIsTaskModalOpen(true)}>Novo</Button>
                    </div>
                </div>

                {/* Tabela de Tarefas */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="px-4 py-2 grid grid-cols-12 gap-4 bg-gray-100/80 border-b border-border-subtle sticky top-0 z-10 shrink-0">
                        <div className="col-span-6 flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
                            />
                            <button onClick={() => handleSort('title')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 hover:text-gray-700">
                                Tarefa <ArrowUpDown size={10} />
                            </button>
                        </div>
                        <div className="col-span-2">
                            <button onClick={() => handleSort('project')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 hover:text-gray-700">
                                Projeto <ArrowUpDown size={10} />
                            </button>
                        </div>
                        <div className="col-span-2">
                            <button onClick={() => handleSort('due_date')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 hover:text-gray-700">
                                Prazo <ArrowUpDown size={10} />
                            </button>
                        </div>
                        <div className="col-span-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</div>
                        <div className="col-span-1"></div>
                    </div>

                    <div className="flex-1">
                        {loading ? (
                            <div className="flex items-center justify-center p-12">
                                <div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                            </div>
                        ) : filteredTasks.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <Flag size={40} className="mx-auto text-gray-300 mb-3" />
                                <p className="font-medium text-gray-700">Nenhuma tarefa encontrada</p>
                            </div>
                        ) : (
                            groupedTasks.map(group => (
                                <div key={group.id} className="flex flex-col">
                                    <div
                                        onClick={() => toggleSection(group.id as string)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-50/50 border-b border-border-subtle cursor-pointer hover:bg-gray-100/50"
                                    >
                                        {expandedSections.has(group.id as string) ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color || '#ccc' }} />
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{group.name}</span>
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-200/50 px-1.5 py-0.5 rounded-full ml-1">{group.tasks.length}</span>
                                    </div>

                                    {expandedSections.has(group.id as string) && (
                                        <div className="flex flex-col divide-y divide-border-subtle bg-white">
                                            {group.tasks.map(task => {
                                                const isCompleted = completedIds.has(task.id);
                                                const due = task.due_date ? formatDueDate(task.due_date) : null;
                                                const isTodayTask = task.due_date ? isToday(new Date(task.due_date)) : false;
                                                const isSelected = selectedTaskIds.has(task.id);

                                                return (
                                                    <div key={task.id} className={`px-4 py-2.5 grid grid-cols-12 gap-4 items-center group transition-colors ${isSelected ? 'bg-brand/5' : isTodayTask ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
                                                        <div className="col-span-6 flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectTask(task.id)}
                                                                className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
                                                            />
                                                            <div className="relative flex items-center justify-center shrink-0">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isCompleted}
                                                                    onChange={() => handleToggle(task)}
                                                                    className="w-5 h-5 rounded-full border-2 border-gray-300 text-brand/20 focus:ring-brand accent-brand cursor-pointer transition-all appearance-none checked:bg-brand checked:border-brand"
                                                                />
                                                                {isCompleted && <CheckCircle2 size={12} className="absolute text-white pointer-events-none" />}
                                                            </div>

                                                            <span
                                                                onClick={() => setSelectedTask(task)}
                                                                className={`text-sm font-medium transition-colors cursor-pointer truncate flex items-center gap-2 ${isCompleted ? 'line-through text-gray-400' : (task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))) ? 'text-red-700 font-bold' : 'text-gray-900 group-hover:text-brand'}`}
                                                            >
                                                                {task.category && task.category.color && (
                                                                    <span
                                                                        className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border"
                                                                        style={{ backgroundColor: `${task.category.color}15`, color: task.category.color, borderColor: `${task.category.color}30` }}
                                                                    >
                                                                        {task.category.name}
                                                                    </span>
                                                                )}
                                                                {task.title}
                                                            </span>
                                                        </div>

                                                        {/* Resto da linha clicável para abrir o modal */}
                                                        <div
                                                            onClick={() => setSelectedTask(task)}
                                                            className="col-span-5 grid grid-cols-5 gap-4 h-full items-center cursor-pointer"
                                                        >
                                                            <div className="col-span-2 flex items-center">
                                                                {task.project ? (
                                                                    <span className="text-[10px] font-bold text-gray-500 border-l-2 pl-2 truncate" style={{ borderLeftColor: task.project.color || '#ccc' }}>
                                                                        {task.project.name}
                                                                    </span>
                                                                ) : <span className="text-xs text-gray-300">—</span>}
                                                            </div>

                                                            <div className="col-span-2 flex items-center gap-2 text-[11px] font-bold">
                                                                {due ? <span className={`flex items-center gap-1.5 ${due.className}`}><CalendarIcon size={12} /> {due.label}</span> : <span className="text-gray-300">—</span>}
                                                            </div>

                                                            <div className="col-span-1 flex items-center">
                                                                {task.category && task.category.color ? (
                                                                    <span className="text-[9px] font-black uppercase tracking-widest truncate" style={{ color: task.category.color || '#64748b' }}>
                                                                        {task.category.name}
                                                                    </span>
                                                                ) : <span className="text-xs text-gray-300">—</span>}
                                                            </div>
                                                        </div>

                                                        <div className="col-span-1 flex justify-end">
                                                            <button onClick={() => setSelectedTask(task)} className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                                <MoreHorizontal size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Barra de Ações Flutuante */}
                {selectedTaskIds.size > 0 && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-6 animate-in slide-in-from-bottom-4 duration-300 border border-white/10 backdrop-blur-md">
                        <div className="flex items-center gap-2 border-r border-gray-700 pr-6">
                            <CheckCircle size={18} className="text-brand" />
                            <span className="text-sm font-black tracking-widest">{selectedTaskIds.size} SELECIONADAS</span>
                        </div>
                        <div className="flex items-center gap-5">
                            <button
                                onClick={async () => {
                                    if (!statuses.length) return;
                                    const { error } = await supabase.from('tasks').update({ status_id: statuses[statuses.length - 1].id }).in('id', Array.from(selectedTaskIds));
                                    if (!error) { setSelectedTaskIds(new Set()); if (activeWorkspace) loadMyTasks(activeWorkspace.id); }
                                }}
                                className="flex items-center gap-1.5 text-xs font-bold hover:text-brand transition-colors tracking-widest uppercase"
                            >
                                <CheckCircle2 size={16} /> Concluir
                            </button>
                            <button onClick={handleBulkDelete} className="flex items-center gap-1.5 text-xs font-bold hover:text-red-400 transition-colors tracking-widest uppercase">
                                <Trash2 size={16} /> Excluir
                            </button>
                            <button onClick={() => setSelectedTaskIds(new Set())} className="text-xs font-bold text-gray-500 hover:text-white transition-colors tracking-widest uppercase">
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {selectedTask && (
                <TaskDetailModal
                    isOpen={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    task={selectedTask}
                />
            )}

            <TaskFormModal
                isOpen={isTaskModalOpen}
                onClose={() => {
                    setIsTaskModalOpen(false);
                    if (activeWorkspace) loadMyTasks(activeWorkspace.id);
                }}
            />
        </div>
    );
}
