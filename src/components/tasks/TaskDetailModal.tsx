import { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { MessageSquare, Paperclip, GitMerge, CheckSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '../ui/Button';

type Task = Database['public']['Tables']['tasks']['Row'] & { assignee?: any };
type Comment = Database['public']['Tables']['comments']['Row'] & { user?: any };

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
}

export function TaskDetailModal({ isOpen, onClose, task }: TaskDetailModalProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [subtasks, setSubtasks] = useState<Task[]>([]);

    useEffect(() => {
        if (isOpen && task) {
            loadComments(task.id);
            loadSubtasks(task.id);
        }
    }, [isOpen, task]);

    const loadComments = async (taskId: string) => {
        setLoadingComments(true);
        const { data } = await supabase
            .from('comments')
            .select('*, user:profiles(*)')
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });

        if (data) setComments(data as Comment[]);
        setLoadingComments(false);
    };

    const loadSubtasks = async (taskId: string) => {
        const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('parent_id', taskId)
            .order('position', { ascending: true });

        if (data) setSubtasks(data as Task[]);
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !task) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { error } = await supabase.from('comments').insert({
            task_id: task.id,
            user_id: session.user.id,
            content: newComment.trim()
        });

        if (!error) {
            setNewComment('');
            loadComments(task.id);
        }
    };

    if (!task) return null;

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={task.title} maxWidth="max-w-3xl">
            <div className="flex flex-col md:flex-row gap-6">

                {/* Main Content: Info, Subtasks, Comments */}
                <div className="flex-1 space-y-6">
                    {/* Description */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Descrição</h3>
                        <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 min-h-[100px] border border-border-subtle">
                            {task.description || 'Nenhuma descrição adicionada.'}
                        </div>
                    </div>

                    {/* Subtasks */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <CheckSquare size={16} className="text-brand" /> Subtarefas
                            </h3>
                            <button className="text-xs font-medium text-gray-500 hover:text-brand">Adicionar</button>
                        </div>

                        {subtasks.length === 0 ? (
                            <div className="text-sm text-gray-500 italic">Nenhuma subtarefa.</div>
                        ) : (
                            <div className="space-y-2">
                                {subtasks.map(st => (
                                    <div key={st.id} className="flex items-center gap-3 p-2 bg-white border border-border-subtle rounded-md">
                                        <input type="checkbox" className="rounded text-brand focus:ring-brand border-gray-300" />
                                        <span className="text-sm text-gray-700">{st.title}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Activity / Comments */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                            <MessageSquare size={16} className="text-brand" /> Atividades
                        </h3>

                        <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {loadingComments ? (
                                <div className="text-center text-sm text-gray-500">Carregando comentários...</div>
                            ) : comments.length === 0 ? (
                                <div className="text-sm text-gray-500 italic text-center py-4">Sem comentários ainda.</div>
                            ) : (
                                comments.map(c => (
                                    <div key={c.id} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-brand font-bold text-xs shrink-0">
                                            {c.user?.full_name?.substring(0, 1) || '?'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="text-sm font-bold text-gray-900">{c.user?.full_name || 'Usuário'}</span>
                                                <span className="text-[10px] text-gray-500">
                                                    {format(new Date(c.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-border-subtle inline-block">
                                                {c.content}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex gap-3 items-start mt-4 pt-4 border-t border-border-subtle">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Escreva um comentário. Use @ para mencionar alguém..."
                                className="flex-1 px-3 py-2 border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-brand resize-none min-h-[60px]"
                            />
                            <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                                Enviar
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Attributes */}
                <div className="w-full md:w-64 shrink-0 space-y-6">
                    <div>
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Detalhes</span>
                        <div className="space-y-3 bg-gray-50 rounded-lg p-3 border border-border-subtle">

                            <div>
                                <label className="text-[11px] text-gray-500 font-medium">Status</label>
                                <div className="text-sm font-bold text-gray-900 capitalize">
                                    {/* TODO: Translate status_id to name visually. A hack for now: */}
                                    Em andamento
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] text-gray-500 font-medium">Responsável</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center text-[10px] text-white font-bold">
                                        {task.assignee?.full_name?.substring(0, 1) || '?'}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">{task.assignee?.full_name || 'Não atribuído'}</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] text-gray-500 font-medium">Prioridade</label>
                                <div className="text-sm font-medium text-gray-900 capitalize flex items-center gap-1.5 mt-0.5">
                                    <div className={`w-2 h-2 rounded-full ${task.priority === 'urgent' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-500' : task.priority === 'low' ? 'bg-gray-400' : 'bg-blue-500'}`} />
                                    {task.priority}
                                </div>
                            </div>

                            {task.due_date && (
                                <div>
                                    <label className="text-[11px] text-gray-500 font-medium">Prazo</label>
                                    <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5 mt-0.5">
                                        <Clock size={14} className="text-gray-400" />
                                        {format(new Date(task.due_date), "dd/MM/yyyy")}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    <div>
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Ações Rápidas</span>
                        <div className="space-y-1">
                            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2">
                                <Paperclip size={16} className="text-gray-400" /> Anexar arquivos
                            </button>
                            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2">
                                <GitMerge size={16} className="text-gray-400" /> Converter em Subtarefa
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </Dialog>
    );
}
