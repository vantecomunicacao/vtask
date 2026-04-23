import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import {
    AlertCircle, CheckCircle2, Clock, Folder,
    CalendarCheck, ArrowRight, Activity,
} from 'lucide-react';
import { format, isToday, isPast, isFuture, startOfDay, addDays, formatDistanceToNow } from 'date-fns';
import { parseDueDate } from '../lib/dateUtils';
import { CHART_PALETTE } from '../lib/designTokens';
import { ptBR } from 'date-fns/locale';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { useTaskStore, type TaskWithAssignee } from '../store/taskStore';
import { useProjectStore, type ProjectWithClient } from '../store/projectStore';

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: string;        // CSS color value
    highlight?: boolean;  // show value in accent color
}

function StatCard({ label, value, icon, color, highlight }: StatCardProps) {
    return (
        <Card className="overflow-hidden">
            <div className="p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-secondary uppercase tracking-wider">{label}</span>
                    <span style={{ color }} className="opacity-80">{icon}</span>
                </div>
                <div
                    className="text-4xl font-bold leading-none"
                    style={{ color: highlight ? color : 'var(--color-text-primary)' }}
                >
                    {value}
                </div>
            </div>
            {/* accent bar at bottom */}
            <div className="h-[3px]" style={{ backgroundColor: color, opacity: highlight ? 1 : 0.25 }} />
        </Card>
    );
}

// ─── Horizontal Bar Chart ─────────────────────────────────────────────────────

interface BarItem { label: string; value: number; color: string }

function HorizontalBarChart({ data }: { data: BarItem[] }) {
    const max = Math.max(...data.map(d => d.value), 1);

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-muted text-sm gap-2">
                <CheckCircle2 size={28} className="opacity-40" />
                <p>Nenhuma tarefa concluída ainda.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {data.map((item, i) => {
                const pct = (item.value / max) * 100;
                return (
                    <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-xs text-secondary truncate">{item.label}</span>
                            </div>
                            <span className="text-xs font-bold text-primary ml-2 shrink-0">{item.value}</span>
                        </div>
                        <div className="h-1.5 bg-surface-0 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: item.color }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Project Progress Card ────────────────────────────────────────────────────

interface ProjectProgressProps {
    project: ProjectWithClient;
    done: number;
    total: number;
}

function ProjectProgressCard({ project, done, total }: ProjectProgressProps) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const color = project.color ?? '#6b6860';

    return (
        <div className="flex items-center gap-3">
            <div
                className="w-1 self-stretch rounded-full shrink-0"
                style={{ backgroundColor: color }}
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-primary truncate">{project.name}</span>
                    <span className="text-[10px] text-muted shrink-0 ml-2">{done}/{total}</span>
                </div>
                <div className="h-1 bg-surface-0 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                </div>
            </div>
            <span className="text-[10px] font-bold text-secondary w-7 text-right shrink-0">{pct}%</span>
        </div>
    );
}

// ─── Task Item ────────────────────────────────────────────────────────────────

function TaskItem({ task, onClick }: { task: TaskWithAssignee; onClick: () => void }) {
    const overdue = task.due_date && isPast(addDays(parseDueDate(task.due_date), 1));

    return (
        <div
            onClick={onClick}
            className="p-3 hover:bg-surface-0 transition-colors flex items-start gap-3 cursor-pointer"
        >
            <div
                className="w-3.5 h-3.5 rounded-full border-2 mt-0.5 shrink-0"
                style={{ borderColor: overdue ? 'var(--color-brand)' : 'var(--color-border-subtle)' }}
            />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted flex items-center gap-1">
                        <Folder size={10} /> {task.project?.name ?? 'Projeto'}
                    </span>
                    {task.due_date && (
                        <span
                            className="text-[11px] font-medium flex items-center gap-1"
                            style={{ color: overdue ? 'var(--color-brand)' : 'var(--color-text-secondary)' }}
                        >
                            <Clock size={10} />
                            {format(parseDueDate(task.due_date), 'dd/MM', { locale: ptBR })}
                        </span>
                    )}
                </div>
            </div>
            {task.priority === 'urgent' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-light text-brand shrink-0">
                    URG
                </span>
            )}
        </div>
    );
}

// ─── Task Section ─────────────────────────────────────────────────────────────

const DASHBOARD_TASK_LIMIT = 8;

interface SectionProps {
    title: string;
    tasks: TaskWithAssignee[];
    emptyLabel: string;
    icon: React.ReactNode;
    iconColor: string;
    onSelect: (t: TaskWithAssignee) => void;
}

function TaskSection({ title, tasks, emptyLabel, icon, iconColor, onSelect }: SectionProps) {
    const displayed = tasks.slice(0, DASHBOARD_TASK_LIMIT);
    const overflow = tasks.length - displayed.length;

    return (
        <div>
            <div className="flex items-center gap-2 mb-2 px-0.5">
                <span style={{ color: iconColor }}>{icon}</span>
                <h3 className="text-sm font-bold text-primary">{title}</h3>
                <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-surface-0 text-secondary">
                    {tasks.length}
                </span>
            </div>
            <Card>
                <div className="divide-y divide-border-subtle">
                    {displayed.length === 0 ? (
                        <p className="p-4 text-center text-sm text-muted">{emptyLabel}</p>
                    ) : (
                        displayed.map(t => (
                            <TaskItem key={t.id} task={t} onClick={() => onSelect(t)} />
                        ))
                    )}
                    {overflow > 0 && (
                        <Link
                            to="/tarefas"
                            className="flex items-center justify-center gap-1.5 p-3 text-xs text-muted hover:text-brand hover:bg-surface-0 transition-colors"
                        >
                            <ArrowRight size={12} />
                            Ver mais {overflow} {overflow === 1 ? 'tarefa' : 'tarefas'}
                        </Link>
                    )}
                </div>
            </Card>
        </div>
    );
}

// ─── Recent Activity Item ─────────────────────────────────────────────────────

function ActivityItem({ task, onClick }: { task: TaskWithAssignee; onClick: () => void }) {
    const color = task.project?.color ?? '#6b6860';
    const timeAgo = formatDistanceToNow(new Date(task.updated_at!), { locale: ptBR, addSuffix: true });

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-0 border-b border-border-subtle last:border-0 transition-colors"
        >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-sm text-primary truncate flex-1">{task.title}</span>
            {task.project && (
                <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                    style={{ backgroundColor: color + '20', color }}
                >
                    {task.project.name}
                </span>
            )}
            <span className="text-[10px] text-muted shrink-0 whitespace-nowrap">{timeAgo}</span>
        </button>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

const PALETTE = CHART_PALETTE;

export default function Dashboard() {
    const { activeWorkspace } = useWorkspaceStore();
    const { session } = useAuthStore();
    const { tasks, statuses, loading, fetchWorkspaceTasks, fetchStatuses, fetchCategories } = useTaskStore();
    const { projects, fetchProjects } = useProjectStore();

    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    const selectedTask = useMemo(
        () => tasks.find(t => t.id === selectedTaskId) ?? null,
        [tasks, selectedTaskId],
    );

    const openTask = useCallback((task: TaskWithAssignee) => {
        setSelectedTaskId(task.id);
        setSearchParams(prev => { prev.set('task', task.id); return prev; }, { replace: true });
    }, [setSearchParams]);

    const closeTask = useCallback(() => {
        setSelectedTaskId(null);
        setSearchParams(prev => { prev.delete('task'); return prev; }, { replace: true });
    }, [setSearchParams]);

    useEffect(() => {
        const taskId = searchParams.get('task');
        if (!taskId || tasks.length === 0) return;
        const found = tasks.find(t => t.id === taskId);
        if (found) setSelectedTaskId(found.id);
    }, [searchParams, tasks]);

    useEffect(() => {
        if (!activeWorkspace) return;
        const wid = activeWorkspace.id;
        fetchWorkspaceTasks(wid);
        fetchStatuses(wid);
        fetchCategories(wid);
        fetchProjects(wid);
    }, [activeWorkspace, fetchWorkspaceTasks, fetchStatuses, fetchCategories, fetchProjects]);

    const userId = session?.user.id;
    const today = useMemo(() => startOfDay(new Date()), []);
    const doneStatusId = statuses[statuses.length - 1]?.id;

    const myTasks = useMemo(
        () => tasks.filter(t => t.assignee_id === userId),
        [tasks, userId],
    );

    const overdueTasks = useMemo(
        () => myTasks
            .filter(t => t.due_date && parseDueDate(t.due_date) < today)
            .sort((a, b) => parseDueDate(a.due_date!).getTime() - parseDueDate(b.due_date!).getTime()),
        [myTasks, today],
    );

    const todayTasks = useMemo(
        () => myTasks.filter(t => t.due_date && isToday(parseDueDate(t.due_date))),
        [myTasks],
    );

    const upcomingTasks = useMemo(
        () => myTasks
            .filter(t =>
                t.due_date &&
                isFuture(parseDueDate(t.due_date)) &&
                !isToday(parseDueDate(t.due_date))
            )
            .sort((a, b) => parseDueDate(a.due_date!).getTime() - parseDueDate(b.due_date!).getTime())
            .slice(0, 10),
        [myTasks],
    );

    const activeProjects = useMemo(
        () => projects.filter(p => p.status === 'active'),
        [projects],
    );

    // Bar chart data — completed tasks by project
    const barData = useMemo((): BarItem[] => {
        if (statuses.length === 0) return [];
        const countByProject: Record<string, { name: string; color: string | null; count: number }> = {};
        for (const t of tasks) {
            if (t.status_id !== doneStatusId) continue;
            if (!t.project) continue;
            if (!countByProject[t.project.id]) {
                countByProject[t.project.id] = { name: t.project.name, color: t.project.color, count: 0 };
            }
            countByProject[t.project.id].count++;
        }
        return Object.entries(countByProject)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 8)
            .map(([, v], i) => ({
                label: v.name,
                value: v.count,
                color: v.color || PALETTE[i % PALETTE.length],
            }));
    }, [tasks, statuses, doneStatusId]);

    // Project progress — active projects with task counts
    const projectProgress = useMemo(() => {
        return activeProjects.map(p => {
            const projectTasks = tasks.filter(t => t.project_id === p.id);
            const done = projectTasks.filter(t => t.status_id === doneStatusId).length;
            return { project: p, done, total: projectTasks.length };
        }).sort((a, b) => {
            const pctA = a.total > 0 ? a.done / a.total : 0;
            const pctB = b.total > 0 ? b.done / b.total : 0;
            return pctB - pctA;
        });
    }, [activeProjects, tasks, doneStatusId]);

    // Recent activity — all workspace tasks sorted by updated_at desc
    const recentActivity = useMemo(
        () => [...tasks]
            .filter(t => t.updated_at)
            .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime())
            .slice(0, 8),
        [tasks],
    );

    const firstName = session?.user.user_metadata?.full_name?.split(' ')[0] ?? 'Bem-vindo';
    const dateLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

    // ── Skeleton ──
    if (loading && tasks.length === 0) {
        return (
            <div className="space-y-6 fade-in pb-10">
                <div className="h-8 w-48 skeleton-pulse rounded" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-card border border-border-subtle p-5 space-y-3">
                            <div className="skeleton-pulse h-3 w-20 rounded" />
                            <div className="skeleton-pulse h-9 w-12 rounded" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {[...Array(3)].map((_, i) => <div key={i} className="skeleton-pulse rounded-card h-32" />)}
                    </div>
                    <div className="space-y-4">
                        <div className="skeleton-pulse rounded-card h-48" />
                        <div className="skeleton-pulse rounded-card h-48" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in pb-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-primary mb-0.5">Olá, {firstName}</h1>
                <p className="text-sm text-secondary capitalize">{dateLabel}</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Atrasadas"
                    value={overdueTasks.length}
                    icon={<AlertCircle size={16} />}
                    color="var(--color-brand)"
                    highlight={overdueTasks.length > 0}
                />
                <StatCard
                    label="Para hoje"
                    value={todayTasks.length}
                    icon={<CalendarCheck size={16} />}
                    color="var(--color-brand)"
                    highlight={todayTasks.length > 0}
                />
                <StatCard
                    label="Próximas"
                    value={upcomingTasks.length}
                    icon={<Clock size={16} />}
                    color="#6366f1"
                />
                <StatCard
                    label="Projetos ativos"
                    value={activeProjects.length}
                    icon={<Folder size={16} />}
                    color="#10b981"
                />
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Task lists */}
                <div className="lg:col-span-2 space-y-5">
                    <TaskSection
                        title="Tarefas atrasadas"
                        tasks={overdueTasks}
                        emptyLabel="Nenhuma tarefa atrasada. Ótimo trabalho!"
                        icon={<AlertCircle size={14} />}
                        iconColor="var(--color-brand)"
                        onSelect={openTask}
                    />
                    <TaskSection
                        title="Tarefas para hoje"
                        tasks={todayTasks}
                        emptyLabel="Nenhuma tarefa para hoje."
                        icon={<CalendarCheck size={14} />}
                        iconColor="var(--color-brand)"
                        onSelect={openTask}
                    />
                    <TaskSection
                        title="Próximas tarefas"
                        tasks={upcomingTasks}
                        emptyLabel="Nenhuma tarefa futura com prazo definido."
                        icon={<Clock size={14} />}
                        iconColor="#6366f1"
                        onSelect={openTask}
                    />
                </div>

                {/* Right column */}
                <div className="space-y-5">
                    {/* Bar chart */}
                    <div>
                        <h2 className="text-sm font-bold text-primary mb-2 px-0.5">Concluídas por projeto</h2>
                        <Card>
                            <CardContent className="pt-5">
                                <HorizontalBarChart data={barData} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Project progress */}
                    {projectProgress.length > 0 && (
                        <div>
                            <h2 className="text-sm font-bold text-primary mb-2 px-0.5">Progresso dos projetos</h2>
                            <Card>
                                <CardContent className="pt-5 space-y-4">
                                    {projectProgress.slice(0, 6).map(({ project, done, total }) => (
                                        <ProjectProgressCard
                                            key={project.id}
                                            project={project}
                                            done={done}
                                            total={total}
                                        />
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent activity */}
            {recentActivity.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2 px-0.5">
                        <Activity size={14} className="text-secondary" />
                        <h2 className="text-sm font-bold text-primary">Atividade recente</h2>
                    </div>
                    <Card>
                        <div className="divide-y divide-border-subtle">
                            {recentActivity.map(task => (
                                <ActivityItem
                                    key={task.id}
                                    task={task}
                                    onClick={() => openTask(task)}
                                />
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            <TaskDetailModal
                isOpen={!!selectedTask}
                onClose={closeTask}
                task={selectedTask}
            />
        </div>
    );
}
