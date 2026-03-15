import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../lib/database.types';
import { CheckSquare } from 'lucide-react';
import type { TaskWithAssignee, CustomStatus } from '../../../store/taskStore';

type Task = Database['public']['Tables']['tasks']['Update'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type TaskCategory = Database['public']['Tables']['task_categories']['Row'];

interface TaskSubtasksProps {
    taskId: string;
    statuses: CustomStatus[];
    taskCategories: TaskCategory[];
    members: Profile[];
}

export function TaskSubtasks({ taskId, statuses, taskCategories, members }: TaskSubtasksProps) {
    const [subtasks, setSubtasks] = useState<TaskWithAssignee[]>([]);

    const reloadSubtasks = async () => {
        const { data } = await supabase
            .from('tasks')
            .select('*, assignee:profiles(*)')
            .eq('parent_id', taskId)
            .order('position', { ascending: true });
        if (data) setSubtasks(data as TaskWithAssignee[]);
    };

    useEffect(() => {
        reloadSubtasks();
    }, [taskId]);

    const handleUpdateSubtask = async (subtaskId: string, updates: Task) => {
        await supabase.from('tasks').update(updates).eq('id', subtaskId);
        reloadSubtasks();
    };

    const handleToggleSubtask = async (st: TaskWithAssignee) => {
        const isDone = st.status_id === statuses[statuses.length - 1]?.id;
        const targetStatusId = isDone ? statuses[0]?.id : statuses[statuses.length - 1]?.id;
        await handleUpdateSubtask(st.id, { status_id: targetStatusId });
    };

    const doneStatusId = statuses[statuses.length - 1]?.id;

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <CheckSquare size={16} className="text-brand" /> Subtarefas
                </h3>
                <button className="text-xs font-medium text-gray-500 hover:text-brand">Adicionar</button>
            </div>

            {subtasks.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1.5 font-bold uppercase tracking-wider">
                        <span>Progresso das subtarefas</span>
                        <span>{subtasks.filter(s => s.status_id === doneStatusId).length}/{subtasks.length}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                        <div
                            className="h-full bg-brand transition-all duration-500"
                            style={{ width: `${(subtasks.filter(s => s.status_id === doneStatusId).length / subtasks.length) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {subtasks.length === 0 ? (
                <div className="text-sm text-gray-500 italic bg-gray-50/50 border border-dashed border-border-subtle rounded-lg p-4 text-center">
                    Nenhuma subtarefa ainda.
                </div>
            ) : (
                <div className="space-y-2">
                    {subtasks.map(st => {
                        const isDone = st.status_id === doneStatusId;
                        return (
                            <div key={st.id} className="flex items-center gap-3 p-2.5 bg-white border border-border-subtle rounded-xl hover:border-brand/30 transition-all hover:shadow-sm group">
                                <input
                                    type="checkbox"
                                    checked={isDone}
                                    onChange={() => handleToggleSubtask(st)}
                                    className="rounded-full w-5 h-5 text-brand focus:ring-brand border-gray-300 cursor-pointer"
                                />
                                <div className="flex-1 flex items-center justify-between gap-4">
                                    <span className={`text-sm transition-all ${isDone ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                        {st.title}
                                    </span>
                                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <select
                                            value={st.category_id || ''}
                                            onChange={(e) => handleUpdateSubtask(st.id, { category_id: e.target.value || null })}
                                            className="text-[10px] bg-transparent border-none p-0 text-gray-500 focus:ring-0 cursor-pointer hover:text-brand font-medium max-w-[80px] truncate"
                                        >
                                            <option value="">Sem tipo</option>
                                            {taskCategories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={st.assignee_id || ''}
                                            onChange={(e) => handleUpdateSubtask(st.id, { assignee_id: e.target.value || null })}
                                            className="text-[10px] bg-transparent border-none p-0 text-gray-500 focus:ring-0 cursor-pointer hover:text-brand font-medium"
                                        >
                                            <option value="">Sem resp.</option>
                                            {members.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {m.full_name?.split(' ')[0] || m.email.split('@')[0]}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="date"
                                            value={st.due_date || ''}
                                            onChange={(e) => handleUpdateSubtask(st.id, { due_date: e.target.value || null })}
                                            className="text-[10px] bg-transparent border-none p-0 text-gray-400 focus:ring-0 w-20 cursor-pointer hover:text-brand font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
