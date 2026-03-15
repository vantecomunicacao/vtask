import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../lib/database.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '../../ui/Button';
import { MessageSquare } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

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

        const reload = async () => {
            setLoadingComments(true);
            const { data } = await supabase
                .from('comments')
                .select('*, user:profiles(*)')
                .eq('task_id', taskId)
                .order('created_at', { ascending: true });
            if (data) setComments(data as Comment[]);
            setLoadingComments(false);
        };

        useImperativeHandle(ref, () => ({ reload }));

        useEffect(() => {
            reload();
        }, [taskId]);

        const handleAddComment = async () => {
            if (!newComment.trim() || !session) return;
            const { error } = await supabase.from('comments').insert({
                task_id: taskId,
                user_id: session.user.id,
                content: newComment.trim(),
            });
            if (!error) {
                setNewComment('');
                reload();
            }
        };

        return (
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
                                    <div className={`text-sm p-2.5 rounded-lg border inline-block ${
                                        c.content.startsWith('_SISTEMA_')
                                            ? 'bg-gray-100/50 border-gray-200 text-gray-400 italic text-[11px]'
                                            : 'bg-gray-50 border-border-subtle text-gray-700'
                                    }`}>
                                        {c.content.replace('_SISTEMA_: ', '')}
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
                        placeholder="Escreva um comentário..."
                        className="flex-1 px-3 py-2 border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-brand resize-none min-h-[60px]"
                    />
                    <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                        Enviar
                    </Button>
                </div>
            </div>
        );
    }
);

TaskComments.displayName = 'TaskComments';
