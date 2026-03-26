import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { AlertCircle, CheckCircle2, Clock, Folder, CalendarCheck, ArrowRight } from 'lucide-react';
import { format, isToday, isPast, isFuture, startOfDay, addDays } from 'date-fns';
import { parseDueDate } from '../lib/dateUtils';
import { ptBR } from 'date-fns/locale';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { useTaskStore, type TaskWithAssignee } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';

// ─── SVG Pie Chart ───────────────────────────────────────────────────────────

const PALETTE = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

interface PieSlice { label: string; value: number; color: string }

function PieChart({ data }: { data: PieSlice[] }) {
    const total = data.reduce((s, d) => s + d.value, 0);

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-muted text-sm gap-2">
                <CheckCircle2 size={32} className="text-muted" />
                <p>Nenhuma tarefa concluída ainda.</p>
            </div>
        );
    }

    const cx = 80;
    const cy = 80;
    const r = 65;
    const innerR = 36;

    let angle = -Math.PI / 2;
    const slices = data.map((d) => {
        const sweep = (d.value / total) * 2 * Math.PI;
        const start = angle;
        angle += sweep;
        return { ...d, start, sweep };
    });

    const describeArc = (startA: number, sweepA: number) => {
        const x1 = cx + r * Math.cos(startA);
        const y1 = cy + r * Math.sin(startA);
        const endA = startA + sweepA;
        const x2 = cx + r * Math.cos(endA);
        const y2 = cy + r * Math.sin(endA);
        const ix1 = cx + innerR * Math.cos(endA);
        const iy1 = cy + innerR * Math.sin(endA);
        const ix2 = cx + innerR * Math.cos(startA);
        const iy2 = cy + innerR * Math.sin(startA);
        const largeArc = sweepA > Math.PI ? 1 : 0;
        return [
            `M ${x1} ${y1}`,
            `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
            `L ${ix1} ${iy1}`,
            `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
            'Z',
        ].join(' ');
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <svg viewBox="0 0 160 160" width={160} height={160}>
                {slices.map((s, i) => (
                    <path
                        key={i}
                        d={describeArc(s.start, s.sweep)}
                        fill={s.color}
                        stroke="var(--surface-1)"
                        strokeWidth={2}
                    >
                        <title>{s.label}: {s.value}</title>
                    </path>
                ))}
                <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="bold" fill="var(--text-primary)">{total}</text>
                <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="var(--text-muted)">concluídas</text>
            </svg>

            <div className="w-full space-y-1.5">
                {slices.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                            <span className="text-secondary truncate">{s.label}</span>
                        </div>
                        <span className="font-bold text-primary ml-2 shrink-0">{s.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Task Item ────────────────────────────────────────────────────────────────

function TaskItem({ task, onClick }: { task: TaskWithAssignee; onClick: () => void }) {
    const overdue = task.due_date && isPast(addDays(parseDueDate(task.due_date), 1));

    return (
        <div
            onClick={onClick}
            className="p-3 hover:bg-surface-2 transition-colors flex items-start gap-3 cursor-pointer"
        >
            <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 ${overdue ? 'border-red-400' : 'border-border-subtle'}`} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted flex items-center gap-1">
                        <Folder size={10} /> {(task.project as { name: string } | null)?.name || 'Projeto'}
                    </span>
                    {task.due_date && (
                        <span className={`text-[11px] font-medium flex items-center gap-1 ${overdue ? 'text-red-500' : 'text-secondary'}`}>
                            <Clock size={10} />
                            {format(parseDueDate(task.due_date), "dd/MM", { locale: ptBR })}
                        </span>
                    )}
                </div>
            </div>
            {task.priority === 'urgent' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 shrink-0">URG</span>
            )}
        </div>
    );
}

// ─── Task Section ─────────────────────────────────────────────────────────────

const DASHBOARD_TASK_LIMIT = 10;

interface SectionProps {
    title: string;
    tasks: TaskWithAssignee[];
    totalCount?: number;
    emptyLabel: string;
    accent: string;
    icon: React.ReactNode;
    onSelect: (t: TaskWithAssignee) => void;
}

function TaskSection({ title, tasks, totalCount, emptyLabel, accent, icon, onSelect }: SectionProps) {
    const displayed = tasks.slice(0, DASHBOARD_TASK_LIMIT);
    const overflow = (totalCount ?? tasks.length) - displayed.length;

    return (
        <div>
            <div className={`flex items-center gap-2 mb-2 px-1`}>
                <span className={accent}>{icon}</span>
                <h3 className="text-sm font-bold text-primary">{title}</h3>
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${accent === 'text-red-500' ? 'bg-red-50 text-red-600' : accent === 'text-brand' ? 'bg-brand/10 text-brand' : 'bg-blue-50 text-blue-600'}`}>
                    {totalCount ?? tasks.length}
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
                        <a
                            href="/tarefas"
                            className="flex items-center justify-center gap-1.5 p-3 text-xs text-secondary hover:text-brand hover:bg-surface-2 transition-colors"
                        >
                            <ArrowRight size={12} />
                            Ver mais {overflow} {overflow === 1 ? 'tarefa' : 'tarefas'} em Minhas Tarefas
                        </a>
                    )}
                </div>
            </Card>
        </div>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
    const { activeWorkspace } = useWorkspaceStore();
    const { session } = useAuthStore();
    const { tasks, statuses, loading, fetchWorkspaceTasks, fetchStatuses, fetchCategories } = useTaskStore();
    const { projects, fetchProjects } = useProjectStore();

    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);

    const openTask = useCallback((task: TaskWithAssignee) => {
        setSelectedTask(task);
        setSearchParams(prev => { prev.set('task', task.id); return prev; }, { replace: true });
    }, [setSearchParams]);

    const closeTask = useCallback(() => {
        setSelectedTask(null);
        setSearchParams(prev => { prev.delete('task'); return prev; }, { replace: true });
    }, [setSearchParams]);

    useEffect(() => {
        const taskId = searchParams.get('task');
        if (!taskId || tasks.length === 0) return;
        const found = tasks.find(t => t.id === taskId);
        if (found) setSelectedTask(found);
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

    const myTasks = useMemo(
        () => tasks.filter(t => t.assignee_id === userId),
        [tasks, userId]
    );

    const overdueTasks = useMemo(
        () => myTasks
            .filter(t => t.due_date && parseDueDate(t.due_date) < today)
            .sort((a, b) => parseDueDate(a.due_date!).getTime() - parseDueDate(b.due_date!).getTime()),
        [myTasks, today]
    );

    const todayTasks = useMemo(
        () => myTasks.filter(t => t.due_date && isToday(parseDueDate(t.due_date))),
        [myTasks]
    );

    const upcomingTasks = useMemo(
        () => myTasks
            .filter(t => t.due_date && isFuture(parseDueDate(t.due_date)) && !isToday(parseDueDate(t.due_date)))
            .sort((a, b) => parseDueDate(a.due_date!).getTime() - parseDueDate(b.due_date!).getTime())
            .slice(0, 10),
        [myTasks]
    );

    const activeProjects = useMemo(
        () => projects.filter(p => p.status === 'active').length,
        [projects]
    );

    const pieData = useMemo((): PieSlice[] => {
        if (statuses.length === 0) return [];
        const doneStatusId = statuses[statuses.length - 1].id;
        const countByProject: Record<string, { name: string; color: string | null; count: number }> = {};
        for (const t of tasks) {
            if (t.status_id !== doneStatusId) continue;
            const proj = t.project as { id: string; name: string; color: string | null } | null;
            if (!proj) continue;
            if (!countByProject[proj.id]) {
                countByProject[proj.id] = { name: proj.name, color: proj.color, count: 0 };
            }
            countByProject[proj.id].count++;
        }
        return Object.entries(countByProject)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([, v], i) => ({
                label: v.name,
                value: v.count,
                color: v.color || PALETTE[i % PALETTE.length],
            }));
    }, [tasks, statuses]);

    const firstName = session?.user.user_metadata?.full_name?.split(' ')[0] || 'Bem-vindo';

    if (loading && tasks.length === 0) {
        return (
            <div className="space-y-6 fade-in h-full pb-10">
                <div className="h-8 w-48 skeleton-pulse rounded" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-card border border-border-subtle p-4 space-y-2">
                            <div className="skeleton-pulse h-3 w-20 rounded" />
                            <div className="skeleton-pulse h-10 w-12 rounded" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {[...Array(3)].map((_, i) => <div key={i} className="skeleton-pulse rounded-card h-32" />)}
                    </div>
                    <div className="skeleton-pulse rounded-card h-64" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in h-full pb-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-primary mb-1">Olá, {firstName}</h1>
                <p className="text-sm text-secondary">Aqui está o resumo do seu trabalho no FlowDesk hoje.</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-red-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-red-500 uppercase tracking-wider flex items-center justify-between">
                            Atrasadas
                            <AlertCircle size={15} className="text-red-400" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-red-600">{overdueTasks.length}</div>
                    </CardContent>
                </Card>

                <Card className="bg-brand text-white border-transparent">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-red-100 uppercase tracking-wider flex items-center justify-between">
                            Para hoje
                            <CalendarCheck size={15} className="text-red-200" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{todayTasks.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center justify-between">
                            Próximas
                            <Clock size={15} className="text-brand" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-primary">{upcomingTasks.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center justify-between">
                            Projetos ativos
                            <Folder size={15} className="text-brand" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-primary">{activeProjects}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Task lists */}
                <div className="lg:col-span-2 space-y-5">
                    <TaskSection
                        title="Tarefas atrasadas"
                        tasks={overdueTasks}
                        emptyLabel="Nenhuma tarefa atrasada. Ótimo trabalho!"
                        accent="text-red-500"
                        icon={<AlertCircle size={15} />}
                        onSelect={openTask}
                    />
                    <TaskSection
                        title="Tarefas para hoje"
                        tasks={todayTasks}
                        emptyLabel="Nenhuma tarefa para hoje."
                        accent="text-brand"
                        icon={<CalendarCheck size={15} />}
                        onSelect={openTask}
                    />
                    <TaskSection
                        title="Próximas tarefas"
                        tasks={upcomingTasks}
                        emptyLabel="Nenhuma tarefa futura com prazo definido."
                        accent="text-blue-500"
                        icon={<Clock size={15} />}
                        onSelect={openTask}
                    />
                </div>

                {/* Pie chart */}
                <div className="space-y-3">
                    <h2 className="text-sm font-bold text-primary px-1">Tarefas concluídas por projeto</h2>
                    <Card>
                        <CardContent className="pt-4">
                            <PieChart data={pieData} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {selectedTask && (
                <TaskDetailModal
                    isOpen={!!selectedTask}
                    onClose={closeTask}
                    task={selectedTask}
                />
            )}
        </div>
    );
}
