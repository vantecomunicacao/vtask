import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../lib/database.types';
import { Paperclip, Trash2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

type TaskAttachment = Database['public']['Tables']['task_attachments']['Row'];

interface TaskAttachmentsProps {
    taskId: string;
    session: Session | null;
}

export interface TaskAttachmentsRef {
    triggerUpload: () => void;
    reload: () => void;
}

export const TaskAttachments = forwardRef<TaskAttachmentsRef, TaskAttachmentsProps>(
    ({ taskId, session }, ref) => {
        const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
        const [uploading, setUploading] = useState(false);
        const fileInputRef = useRef<HTMLInputElement>(null);

        const reload = async () => {
            const { data } = await supabase
                .from('task_attachments')
                .select('*')
                .eq('task_id', taskId)
                .order('created_at', { ascending: true });
            if (data) setAttachments(data as TaskAttachment[]);
        };

        const triggerUpload = () => fileInputRef.current?.click();

        useImperativeHandle(ref, () => ({ triggerUpload, reload }));

        useEffect(() => {
            reload();
        }, [taskId]);

        const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!e.target.files || !session) return;
            const files = Array.from(e.target.files);
            setUploading(true);
            for (const file of files) {
                const filePath = `${taskId}/${Date.now()}_${file.name}`;
                const { error: uploadError } = await supabase.storage.from('task_attachments').upload(filePath, file);
                if (uploadError) continue;
                await supabase.from('task_attachments').insert({
                    task_id: taskId,
                    user_id: session.user.id,
                    file_name: file.name,
                    file_path: filePath,
                    file_size: file.size,
                    file_type: file.type,
                });
            }
            setUploading(false);
            reload();
        };

        return (
            <div className="mt-6">
                <h3 className="text-sm font-bold text-primary mb-2">Anexos</h3>
                {attachments.length === 0 ? (
                    <div className="text-sm text-secondary italic">Nenhum anexo.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {attachments.map((att) => {
                            const isImage = att.file_type?.startsWith('image/');
                            const publicUrl = supabase.storage.from('task_attachments').getPublicUrl(att.file_path).data.publicUrl;
                            return (
                                <div key={att.id} className="group relative flex flex-col bg-surface-card border border-border-subtle rounded-[var(--radius-card)] overflow-hidden transition-all hover:border-brand/30">
                                    <div className="aspect-video bg-surface-0 flex items-center justify-center overflow-hidden border-b border-border-subtle">
                                        {isImage ? (
                                            <img
                                                src={publicUrl}
                                                alt={att.file_name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <Paperclip size={24} className="text-muted" />
                                                <span className="text-[10px] text-muted font-bold uppercase tracking-tighter">Arquivo</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <a
                                            href={publicUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block text-sm font-medium text-primary truncate hover:text-brand transition-colors mb-0.5"
                                            title={att.file_name}
                                        >
                                            {att.file_name}
                                        </a>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-muted">{(att.file_size / 1024).toFixed(1)} KB</span>
                                            <button
                                                onClick={async () => {
                                                    if (confirm('Excluir anexo?')) {
                                                        await supabase.storage.from('task_attachments').remove([att.file_path]);
                                                        await supabase.from('task_attachments').delete().eq('id', att.id);
                                                        reload();
                                                    }
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-brand transition-all"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                />
            </div>
        );
    }
);

TaskAttachments.displayName = 'TaskAttachments';
