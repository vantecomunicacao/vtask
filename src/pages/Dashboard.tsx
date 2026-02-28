import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { CheckCircle, Folder, Clock, CalendarIcon } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
    const { activeWorkspace } = useWorkspaceStore();
    const { session } = useAuthStore();
    const [stats, setStats] = useState({
        tasksToday: 0,
        myTasks: 0,
        activeProjects: 0
    });
    const [recentTasks, setRecentTasks] = useState<any[]>([]);

    useEffect(() => {
        if (activeWorkspace && session?.user.id) {
            fetchDashboardData(activeWorkspace.id, session.user.id);
        }
    }, [activeWorkspace, session]);

    const fetchDashboardData = async (workspaceId: string, userId: string) => {
        // Fetch Projects Count
        const { count: projectsCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .eq('status', 'active');

        // Fetch user tasks
        // Simulating a join through workspace_id since task belongs to project which belongs to workspace
        const { data: myTasksData } = await supabase
            .from('tasks')
            .select('*, project:projects!inner(workspace_id)')
            .eq('assignee_id', userId)
            .eq('projects.workspace_id', workspaceId);

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

        // Fetch recent pending tasks
        if (myTasksData) {
            const pending = myTasksData
                .filter(t => t.status_id !== 'done') // Assuming done is a known state, strictly we should use custom_statuses logic
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .slice(0, 5);
            setRecentTasks(pending);
        }
    };

    return (
        <div className="space-y-6 fade-in h-full pb-10">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Olá, {session?.user.user_metadata?.full_name?.split(' ')[0] || 'Bem-vindo'}</h1>
                <p className="text-sm text-gray-500">Aqui está o resumo do seu trabalho no FlowDesk hoje.</p>
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
                        <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center justify-between">
                            Minhas Tarefas (Total)
                            <CheckCircle size={16} className="text-brand" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-gray-900">{stats.myTasks}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center justify-between">
                            Projetos Ativos
                            <Folder size={16} className="text-brand" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-gray-900">{stats.activeProjects}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">Suas próximas tarefas</h2>
                    <Card>
                        <div className="divide-y divide-border-subtle">
                            {recentTasks.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">Nenhuma tarefa pendente associada a você.</div>
                            ) : (
                                recentTasks.map(task => (
                                    <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4 cursor-pointer">
                                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{task.title}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Folder size={12} /> Projeto {task.project_id.substring(0, 4)} {/* Temporary */}
                                                </span>
                                                {task.due_date && (
                                                    <span className={`text-xs font-medium flex items-center gap-1 ${new Date(task.due_date) < new Date() ? 'text-red-600' : 'text-gray-500'}`}>
                                                        <Clock size={12} />
                                                        {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${task.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {task.priority || 'Normal'}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">Atividade Recente</h2>
                    <Card>
                        <div className="p-6 text-center">
                            <Clock size={32} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">Log de atividades do workspace em breve.</p>
                        </div>
                    </Card>
                </div>
            </div>

        </div>
    );
}
