import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { CheckCircle, Folder, Clock, CalendarIcon } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { useTaskStore, type TaskWithAssignee } from '../store/taskStore';

export default function Dashboard() {
    const { activeWorkspace } = useWorkspaceStore();
    const { session } = useAuthStore();
    const { fetchCategories } = useTaskStore();
    const [stats, setStats] = useState({
        tasksToday: 0,
        myTasks: 0,
        activeProjects: 0
    });
    const [recentTasks, setRecentTasks] = useState<TaskWithAssignee[]>([]);
    const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);

    useEffect(() => {
        if (!activeWorkspace || !session?.user.id) return;
        const workspaceId = activeWorkspace.id;
        const userId = session.user.id;

        fetchCategories(workspaceId);

        (async () => {
            const { count: projectsCount } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .eq('workspace_id', workspaceId)
                .eq('status', 'active');

            const { data: projectRows } = await supabase
                .from('projects')
                .select('id')
                .eq('workspace_id', workspaceId);

            const projectIds = projectRows?.map(p => p.id) || [];

            const { data: myTasksData } = await supabase
                .from('tasks')
                .select('*, project:projects(id, name, color), assignee:profiles(*), category:task_categories(*)')
                .in('project_id', projectIds)
                .eq('assignee_id', userId);

            let myTasksCount = 0;
            let todayTasksCount = 0;

            if (myTasksData) {
                myTasksCount = myTasksData.length;
                todayTasksCount = myTasksData.filter(t => t.due_date && isToday(new Date(t.due_date))).length;
            }

            setStats({
                activeProjects: projectsCount || 0,
                myTasks: myTasksCount,
                tasksToday: todayTasksCount
            });

            if (myTasksData && myTasksData.length > 0) {
                const pending = (myTasksData as TaskWithAssignee[])
                    .sort((a, b) => {
                        if (a.due_date && b.due_date) {
                            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                        }
                        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    })
                    .slice(0, 5);
                setRecentTasks(pending);
            }
        })();
    }, [activeWorkspace, session, fetchCategories]);

    return (
        <div className="space-y-6 fade-in h-full pb-10">
            <div>
                <h1 className="text-2xl font-bold text-primary mb-1">Olá, {session?.user.user_metadata?.full_name?.split(' ')[0] || 'Bem-vindo'}</h1>
                <p className="text-sm text-secondary">Aqui está o resumo do seu trabalho no FlowDesk hoje.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-brand text-white border-transparent">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-100 uppercase tracking-wider flex items-center justify-between">
                            Tarefas para hoje
                            <CalendarIcon size={16} className="text-red-200" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{stats.tasksToday}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-secondary uppercase tracking-wider flex items-center justify-between">
                            Minhas Tarefas (Total)
                            <CheckCircle size={16} className="text-brand" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-primary">{stats.myTasks}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-secondary uppercase tracking-wider flex items-center justify-between">
                            Projetos Ativos
                            <Folder size={16} className="text-brand" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-primary">{stats.activeProjects}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-bold text-primary">Suas próximas tarefas</h2>
                    <Card>
                        <div className="divide-y divide-border-subtle">
                            {recentTasks.length === 0 ? (
                                <div className="p-8 text-center text-muted text-sm">Nenhuma tarefa pendente associada a você.</div>
                            ) : (
                                recentTasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => setSelectedTask(task)}
                                        className="p-4 hover:bg-surface-2 transition-colors flex items-start gap-4 cursor-pointer group"
                                    >
                                        <div className="w-5 h-5 rounded-full border-2 border-border-subtle mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-primary truncate">{task.title}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-muted flex items-center gap-1">
                                                    <Folder size={12} /> {task.project?.name || 'Projeto'}
                                                </span>
                                                {task.due_date && (
                                                    <span className={`text-xs font-medium flex items-center gap-1 ${new Date(task.due_date) < new Date() ? 'text-red-600' : 'text-secondary'}`}>
                                                        <Clock size={12} />
                                                        {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-[var(--radius-xs)] text-[10px] font-bold uppercase tracking-wide ${task.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-surface-0 text-secondary'}`}>
                                            {task.priority || 'Normal'}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-primary">Atividade Recente</h2>
                    <Card>
                        <div className="p-6 text-center">
                            <Clock size={32} className="mx-auto text-muted mb-2" />
                            <p className="text-sm text-muted">Log de atividades do workspace em breve.</p>
                        </div>
                    </Card>
                </div>
            </div>

            {selectedTask && (
                <TaskDetailModal
                    isOpen={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    task={selectedTask}
                />
            )}
        </div>
    );
}
