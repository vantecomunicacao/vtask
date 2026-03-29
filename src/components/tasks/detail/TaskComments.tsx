import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../lib/database.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '../../ui/Button';
import { MessageSquare, Pencil, Trash2, Check, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { createNotification } from '../../../store/notificationStore';
import { useTaskStore } from '../../../store/taskStore';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { toast } from 'sonner';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Comment = Database['public']['Tables']['comments']['Row'] & { user?: Profile | null };

interface TaskCommentsProps {
    taskId: string;
    session: Session | null;
}

export interface TaskCommentsRef {
    reload: () => void;
}

export const TaskComments = forwardRef<TaskCommentsRef, TaskCommentsProps>(
    ({ taskId, session }, ref) => {
        const [comments, setComments] = useState<Comment[]>([]);
        const [newComment, setNewComment] = useState('');
        const [loadingComments, setLoadingComments] = useState(false);
        const [submitting, setSubmitting] = useState(false);
        const [editingId, setEditingId] = useState<string | null>(null);
        const [editContent, setEditContent] = useState('');

        const reload = useCallback(async () => {
            setLoadingComments(true);
            const { data, error } = await supabase
                .from('comments')
                .select('*, user:profiles(*)')
                .eq('task_id', taskId)
                .order('created_at', { ascending: true });
            if (error) toast.error('Erro ao carregar atividades');
            else if (data) setComments(data as Comment[]);
            setLoadingComments(false);
        }, [taskId]);

        useImperativeHandle(ref, () => ({ reload }));

        useEffect(() => {
            reload();
        }, [reload]);

        const handleAddComment = async () => {
            if (!newComment.trim() || !session) return;
            setSubmitting(true);
            const { error } = await supabase.from('comments').insert({
                task_id: taskId,
                user_id: session.user.id,
                content: newComment.trim(),
            });
            setSubmitting(false);
            if (error) {
                toast.error('Erro ao enviar comentário');
                return;
            }
            setNewComment('');
            await reload();

            const task = useTaskStore.getState().tasks.find(t => t.id === taskId);
            const workspaceId = useWorkspaceStore.getState().activeWorkspace?.id;
            if (task?.assignee_id && workspaceId && task.assignee_id !== session.user.id) {
                await createNotification({
                    workspace_id: workspaceId,
                    user_id: task.assignee_id,
                    actor_id: session.user.id,
                    type: 'comment',
                    task_id: taskId,
                    task_title: task.title,
                });
            }
        };

        const handleStartEdit = (comment: Comment) => {
            setEditingId(comment.id);
            setEditContent(comment.content);
        };

        const handleCancelEdit = () => {
            setEditingId(null);
            setEditContent('');
        };

        const handleSaveEdit = async (commentId: string) => {
            if (!editContent.trim()) return;
            const { error } = await supabase
                .from('comments')
                .update({ content: editContent.trim() })
                .eq('id', commentId);
            if (error) {
                toast.error('Erro ao editar comentário');
                return;
            }
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editContent.trim() } : c));
            setEditingId(null);
            setEditContent('');
        };

        const handleDelete = async (commentId: string) => {
            const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId);
            if (error) {
                toast.error('Erro ao excluir comentário');
                return;
            }
            setComments(prev => prev.filter(c => c.id !== commentId));
        };

        return (
            <div>
                <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-4">
                    <MessageSquare size={16} className="text-brand" /> Atividades
                </h3>

                <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {loadingComments ? (
                        <div className="text-center text-sm text-muted py-4">Carregando...</div>
                    ) : comments.length === 0 ? (
                        <div className="text-sm text-muted italic text-center py-4">Sem atividades ainda.</div>
                    ) : (
                        comments.map(c => {
                            const isSystem = c.content.startsWith('_SISTEMA_');
                            const isOwn = session?.user.id === c.user_id;
                            const isEditing = editingId === c.id;

                            return (
                                <div key={c.id} className="flex gap-3 group">
                                    <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs shrink-0 mt-0.5">
                                        {c.user?.full_name?.substring(0, 1).toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="text-sm font-semibold text-primary">{c.user?.full_name || 'Usuário'}</span>
                                            <span className="text-[10px] text-muted">
                                                {format(new Date(c.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                            </span>
                                            {!isSystem && isOwn && !isEditing && (
                                                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleStartEdit(c)}
                                                        className="p-1 rounded hover:bg-surface-2 text-muted hover:text-secondary transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil size={11} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(c.id)}
                                                        className="p-1 rounded hover:bg-red-50 text-muted hover:text-red-500 transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={11} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {isEditing ? (
                                            <div className="flex flex-col gap-2">
                                                <textarea
                                                    value={editContent}
                                                    onChange={e => setEditContent(e.target.value)}
                                                    className="w-full px-3 py-2 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand resize-none min-h-[60px] bg-surface-card"
                                                    autoFocus
                                                />
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleSaveEdit(c.id)}
                                                        disabled={!editContent.trim()}
                                                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand text-white text-xs font-semibold hover:bg-brand/90 disabled:opacity-40 transition-colors"
                                                    >
                                                        <Check size={11} /> Salvar
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border-subtle text-xs text-secondary hover:bg-surface-2 transition-colors"
                                                    >
                                                        <X size={11} /> Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`text-sm px-2.5 py-2 rounded-lg border inline-block max-w-full break-words ${
                                                isSystem
                                                    ? 'bg-surface-0 border-border-subtle text-muted italic text-[11px]'
                                                    : 'bg-surface-2/50 border-border-subtle text-secondary'
                                            }`}>
                                                {c.content.replace('_SISTEMA_: ', '')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="flex gap-3 items-start mt-4 pt-4 border-t border-border-subtle">
                    <textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment();
                        }}
                        placeholder="Escreva um comentário... (Ctrl+Enter para enviar)"
                        className="flex-1 px-3 py-2 border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-brand resize-none min-h-[60px] bg-surface-card"
                    />
                    <Button onClick={handleAddComment} disabled={!newComment.trim() || submitting} isLoading={submitting}>
                        Enviar
                    </Button>
                </div>
            </div>
        );
    }
);

TaskComments.displayName = 'TaskComments';
