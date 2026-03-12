import { useState, useEffect, useRef } from 'react';
import { Dialog } from '../ui/Dialog';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { MessageSquare, Paperclip, CheckSquare, Clock, List, Bold, Italic, Link as LinkIcon, Heading1, Heading2, ListOrdered, Table as TableIcon, Image as ImageIcon, Code, AlignLeft, AlignCenter, AlignRight, Minus, CheckCircle, Trash2, Tag, Timer, X } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore, type TaskWithAssignee } from '../../store/taskStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { SlashCommands, suggestionItems, renderItems } from '../documents/SlashCommands';
import { Select } from '../ui/Select';

type Task = Database['public']['Tables']['tasks']['Update'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type TaskAttachment = Database['public']['Tables']['task_attachments']['Row'];
type Comment = Database['public']['Tables']['comments']['Row'] & { user?: Profile | null };

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: TaskWithAssignee | null;
}

export function TaskDetailModal({ isOpen, onClose, task }: TaskDetailModalProps) {
    const { statuses, taskCategories, updateTask, toggleTaskCompletion, tasks } = useTaskStore();
    const { session } = useAuthStore();
    const { activeWorkspace } = useWorkspaceStore();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [subtasks, setSubtasks] = useState<TaskWithAssignee[]>([]);
    const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
    const [uploading, setUploading] = useState(false);
    const [members, setMembers] = useState<Profile[]>([]);

    // Edit states
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState(task?.title || '');
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        if (!isOpen || !task) return;
        const taskId = task.id;
        // Sincroniza o título local sempre que a tarefa mudar ou o modal abrir
        const liveTask = tasks.find(t => t.id === taskId);
        setTitleValue(liveTask?.title || task.title);

        (async () => {
            setLoadingComments(true);
            const queries = [
                supabase.from('comments').select('*, user:profiles(*)').eq('task_id', taskId).order('created_at', { ascending: true }),
                supabase.from('task_attachments').select('*').eq('task_id', taskId).order('created_at', { ascending: true }),
                supabase.from('tasks').select('*, assignee:profiles(*)').eq('parent_id', taskId).order('position', { ascending: true }),
            ];
            if (activeWorkspace) {
                queries.push(supabase.from('workspace_members').select('user_id, profiles(*)').eq('workspace_id', activeWorkspace.id));
            }
            const [commentsRes, attachmentsRes, subtasksRes, membersRes] = await Promise.all(queries);
            if (commentsRes.data) setComments(commentsRes.data as Comment[]);
            if (attachmentsRes.data) setAttachments(attachmentsRes.data as TaskAttachment[]);
            if (subtasksRes.data) setSubtasks(subtasksRes.data as TaskWithAssignee[]);
            if (membersRes?.data) {
                const profiles = (membersRes.data as any[])
                    .map((m: any) => (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles))
                    .filter(Boolean);
                setMembers(profiles as Profile[]);
            }
            setLoadingComments(false);
        })();
    }, [isOpen, task?.id, activeWorkspace?.id]);

    const reloadComments = async (taskId: string) => {
        setLoadingComments(true);
        const { data } = await supabase
            .from('comments')
            .select('*, user:profiles(*)')
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });
        if (data) setComments(data as Comment[]);
        setLoadingComments(false);
    };

    const reloadAttachments = async (taskId: string) => {
        const { data } = await supabase
            .from('task_attachments')
            .select('*')
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });
        if (data) setAttachments(data as TaskAttachment[]);
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !task || !session) return;

        const { error } = await supabase.from('comments').insert({
            task_id: task.id,
            user_id: session.user.id,
            content: newComment.trim()
        });

        if (!error) {
            setNewComment('');
            reloadComments(task.id);
        }
    };

    const handleAddTag = async () => {
        if (!tagInput.trim() || !task || !currentTask) return;
        const newTags = [...(currentTask.labels || []), tagInput.trim()];
        setTagInput('');
        await handleUpdateTask({ labels: newTags });
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        if (!task || !currentTask) return;
        const newTags = (currentTask.labels || []).filter(t => t !== tagToRemove);
        await handleUpdateTask({ labels: newTags });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !task || !session) return;
        const files = Array.from(e.target.files);
        setUploading(true);
        for (const file of files) {
            const timestamp = Date.now();
            const filePath = `${task.id}/${timestamp}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('task_attachments').upload(filePath, file);
            if (uploadError) {
                console.error('Upload error:', uploadError);
                continue;
            }
            const { error: insertError } = await supabase.from('task_attachments').insert({
                task_id: task.id,
                user_id: session.user.id,
                file_name: file.name,
                file_path: filePath,
                file_size: file.size,
                file_type: file.type
            });
            if (insertError) console.error('Insert attachment error:', insertError);
        }
        setUploading(false);
        reloadAttachments(task.id);
    };

    const handleUpdateTask = async (updates: Partial<TaskWithAssignee>) => {
        if (!task || !currentTask) return;

        // Audit log logic
        const changeLogs: string[] = [];
        if (updates.status_id && updates.status_id !== currentTask.status_id) {
            const newStatus = statuses.find(s => s.id === updates.status_id)?.name;
            changeLogs.push(`Alterou o status para **${newStatus}**`);
        }
        if (updates.assignee_id !== undefined && updates.assignee_id !== currentTask.assignee_id) {
            const newAssignee = members.find(m => m.id === updates.assignee_id)?.full_name || 'Ninguém';
            changeLogs.push(`Alterou o responsável para **${newAssignee}**`);
        }
        if (updates.priority && updates.priority !== currentTask.priority) {
            changeLogs.push(`Alterou a prioridade para **${updates.priority}**`);
        }

        setSaving(true);
        try {
            await updateTask(task.id, updates);

            // Insert system comments
            for (const log of changeLogs) {
                await supabase.from('comments').insert({
                    task_id: task.id,
                    user_id: session?.user.id,
                    content: `_SISTEMA_: ${log}`
                });
            }
            if (changeLogs.length > 0 && task) reloadComments(task.id);
        } catch (error) {
            console.error('Error updating task:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateSubtask = async (subtaskId: string, updates: Task) => {
        if (!task) return;
        try {
            await supabase.from('tasks').update(updates).eq('id', subtaskId);
            // Refresh subtasks list
            const { data } = await supabase.from('tasks').select('*, assignee:profiles(*)').eq('parent_id', task.id).order('position', { ascending: true });
            if (data) setSubtasks(data as TaskWithAssignee[]);
        } catch (error) {
            console.error('Error updating subtask:', error);
        }
    };

    const handleToggleSubtask = async (st: TaskWithAssignee) => {
        const isDone = st.status_id === statuses[statuses.length - 1]?.id;
        const targetStatusId = isDone ? statuses[0]?.id : statuses[statuses.length - 1]?.id;
        await handleUpdateSubtask(st.id, { status_id: targetStatusId });
    };

    if (!task) return null;

    // Always use the live version from the store so edits reflect immediately
    const currentTask = (tasks.find(t => t.id === task.id) as TaskWithAssignee | undefined) ?? task;

    const isCompleted = statuses.length > 0 && currentTask.status_id === statuses[statuses.length - 1]?.id;
    const hasRecurrence = currentTask.recurrence && currentTask.recurrence !== 'none';

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={
                isEditingTitle ? (
                    <input
                        autoFocus
                        value={titleValue}
                        onChange={(e) => setTitleValue(e.target.value)}
                        onBlur={() => {
                            if (titleValue !== currentTask.title) handleUpdateTask({ title: titleValue });
                            setIsEditingTitle(false);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                if (titleValue !== currentTask.title) handleUpdateTask({ title: titleValue });
                                setIsEditingTitle(false);
                            }
                        }}
                        className="bg-transparent border-none p-0 text-xl font-bold text-gray-900 focus:ring-0 w-full"
                    />
                ) : (
                    <div
                        onClick={() => setIsEditingTitle(true)}
                        className="cursor-text hover:text-brand transition-colors truncate pr-8"
                        title="Clique para editar"
                    >
                        {currentTask.title}
                    </div>
                )
            }
            maxWidth="max-w-5xl"
        >
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-gray-900">Descrição</h3>
                        </div>

                        <div className="relative group min-h-[100px]">
                            {isOpen && (
                                <TaskDescriptionSection
                                    task={currentTask}
                                    onUpdateTask={handleUpdateTask}
                                    isExpanded={isExpanded}
                                    setIsExpanded={setIsExpanded}
                                    isEditingDesc={isEditingDesc}
                                    setIsEditingDesc={setIsEditingDesc}
                                    saving={saving}
                                    reloadAttachments={() => reloadAttachments(currentTask.id)}
                                />
                            )}
                        </div>
                    </div>

                    {/* Subtasks */}
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
                                    <span>{subtasks.filter(s => s.status_id === statuses[statuses.length - 1]?.id).length}/{subtasks.length}</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                                    <div 
                                        className="h-full bg-brand transition-all duration-500" 
                                        style={{ width: `${(subtasks.filter(s => s.status_id === statuses[statuses.length - 1]?.id).length / subtasks.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {subtasks.length === 0 ? (
                            <div className="text-sm text-gray-500 italic bg-gray-50/50 border border-dashed border-border-subtle rounded-lg p-4 text-center">Nenhuma subtarefa ainda.</div>
                        ) : (
                            <div className="space-y-2">
                                {subtasks.map(st => {
                                    const isDone = st.status_id === statuses[statuses.length - 1]?.id;
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
                                                        value={st.assignee_id || ''} 
                                                        onChange={(e) => handleUpdateSubtask(st.id, { assignee_id: e.target.value || null })}
                                                        className="text-[10px] bg-transparent border-none p-0 text-gray-500 focus:ring-0 cursor-pointer hover:text-brand font-medium"
                                                    >
                                                        <option value="">Sem resp.</option>
                                                        {members.map(m => (
                                                            <option key={m.id} value={m.id}>{m.full_name?.split(' ')[0] || m.email.split('@')[0]}</option>
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
                                            <div className={`text-sm p-2.5 rounded-lg border inline-block ${c.content.startsWith('_SISTEMA_') ? 'bg-gray-100/50 border-gray-200 text-gray-400 italic text-[11px]' : 'bg-gray-50 border-border-subtle text-gray-700'}`}>
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

                    {/* Attachments */}
                    <div className="mt-6">
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Anexos</h3>
                        {attachments.length === 0 ? (
                            <div className="text-sm text-gray-500 italic">Nenhum anexo.</div>
                        ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {attachments.map((att) => {
                                const isImage = att.file_type?.startsWith('image/');
                                const publicUrl = supabase.storage.from('task_attachments').getPublicUrl(att.file_path).data.publicUrl;
                                
                                return (
                                    <div key={att.id} className="group relative flex flex-col bg-white border border-border-subtle rounded-xl overflow-hidden hover:shadow-md transition-all hover:border-brand/30">
                                        <div className="aspect-video bg-gray-50 flex items-center justify-center overflow-hidden border-b border-border-subtle">
                                            {isImage ? (
                                                <img 
                                                    src={publicUrl} 
                                                    alt={att.file_name} 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <Paperclip size={24} className="text-gray-300" />
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Arquivo</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <a
                                                href={publicUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block text-sm font-medium text-gray-900 truncate hover:text-brand transition-colors mb-0.5"
                                                title={att.file_name}
                                            >
                                                {att.file_name}
                                            </a>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-gray-500">{(att.file_size / 1024).toFixed(1)} KB</span>
                                                <button 
                                                    onClick={async () => {
                                                        if (confirm('Excluir anexo?')) {
                                                            await supabase.storage.from('task_attachments').remove([att.file_path]);
                                                            await supabase.from('task_attachments').delete().eq('id', att.id);
                                                            reloadAttachments(task.id);
                                                        }
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
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
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-full md:w-64 shrink-0 space-y-6">
                    <div>
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Detalhes</span>
                        <div className="space-y-4 bg-gray-50 rounded-lg p-3 border border-border-subtle">
                            <Select
                                label="Status"
                                value={currentTask.status_id || ''}
                                onChange={(e) => handleUpdateTask({ status_id: e.target.value })}
                                className="bg-white"
                                options={statuses.map(s => ({
                                    value: s.id,
                                    label: s.name,
                                    icon: <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: s.color }} />
                                }))}
                            />

                            <Select
                                label="Responsável"
                                value={currentTask.assignee_id || ''}
                                onChange={(e) => handleUpdateTask({ assignee_id: e.target.value || null })}
                                className="bg-white"
                                options={[
                                    { value: '', label: 'Não atribuído', icon: <div className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center text-[8px] text-gray-500 font-bold">--</div> },
                                    ...members.map(m => ({
                                        value: m.id,
                                        label: m.full_name || m.email,
                                        icon: m.avatar_url ? (
                                            <img src={m.avatar_url} alt="avatar" className="w-4 h-4 rounded object-cover" />
                                        ) : (
                                            <div className="w-4 h-4 rounded bg-brand-light text-brand flex items-center justify-center text-[8px] font-bold">
                                                {(m.full_name || m.email)[0].toUpperCase()}
                                            </div>
                                        )
                                    }))
                                ]}
                            />

                            <Select
                                label="Prioridade"
                                value={currentTask.priority || 'medium'}
                                onChange={(e) => handleUpdateTask({ priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                                className="bg-white"
                            >
                                <option value="low">Baixa</option>
                                <option value="medium">Média</option>
                                <option value="high">Alta</option>
                                <option value="urgent">Urgente</option>
                            </Select>

                            <div>
                                <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                    <Clock size={12} /> Prazo
                                </label>
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="date"
                                        value={currentTask.due_date || ''}
                                        onChange={(e) => handleUpdateTask({ due_date: e.target.value || null })}
                                        className="w-full bg-white border border-border-subtle px-3 py-2 rounded-lg text-sm transition-all focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none cursor-pointer"
                                    />
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => handleUpdateTask({ due_date: format(new Date(), 'yyyy-MM-dd') })}
                                            className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                                        >
                                            Hoje
                                        </button>
                                        <button
                                            onClick={() => handleUpdateTask({ due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd') })}
                                            className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                                        >
                                            Amanhã
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <Select
                                label="Recorrência"
                                value={currentTask.recurrence || 'none'}
                                onChange={(e) => handleUpdateTask({ recurrence: e.target.value as 'none' | 'daily' | 'weekly' | 'monthly' })}
                                className="bg-white"
                            >
                                <option value="none">Nenhuma</option>
                                <option value="daily">Diária</option>
                                <option value="weekly">Semanal</option>
                                <option value="monthly">Mensal</option>
                            </Select>

                            <Select
                                label="Tipo de Tarefa"
                                value={currentTask.category_id || ''}
                                onChange={(e) => {
                                    const categoryId = e.target.value || null;
                                    handleUpdateTask({ category_id: categoryId });
                                }}
                                className="bg-white"
                                options={[
                                    { value: '', label: 'Nenhum tipo selecionado' },
                                    ...taskCategories.map(c => ({
                                        value: c.id,
                                        label: c.name,
                                        icon: c.color ? <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: c.color }} /> : undefined
                                    }))
                                ]}
                            />

                            <div>
                                <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                    <Tag size={12} /> Tags
                                </label>
                                <div className="space-y-2">
                                    <div className="flex flex-wrap gap-1">
                                        {(currentTask.labels || []).map(tag => (
                                            <span 
                                                key={tag} 
                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-light text-brand text-[10px] font-bold rounded-md border border-brand/10 group/tag"
                                            >
                                                {tag}
                                                <button 
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="hover:text-red-500 transition-colors"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-1">
                                        <input 
                                            type="text" 
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                            placeholder="Nova tag..."
                                            className="flex-1 bg-white border border-border-subtle px-2 py-1 rounded text-[10px] focus:ring-1 focus:ring-brand focus:border-brand outline-none"
                                        />
                                        <button 
                                            onClick={handleAddTag}
                                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold hover:bg-gray-200"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                    <Timer size={12} /> Estimativa (Horas)
                                </label>
                                <input 
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={currentTask.time_estimate || ''}
                                    onChange={e => handleUpdateTask({ time_estimate: e.target.value ? parseFloat(e.target.value) : null })}
                                    className="w-full bg-white border border-border-subtle px-3 py-2 rounded-lg text-sm transition-all focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none"
                                    placeholder="Ex: 4.5"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Ações Rápidas</span>
                        <div className="space-y-1">
                            <button
                                onClick={async () => {
                                    setSaving(true);
                                    try {
                                        await toggleTaskCompletion(currentTask.id, !isCompleted);
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isCompleted
                                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                                }`}
                            >
                                <CheckCircle size={16} />
                                {isCompleted ? 'Reabrir Tarefa' : 'Concluir Tarefa'}
                            </button>
                            {!isCompleted && hasRecurrence && (
                                <p className="text-[10px] text-gray-400 px-1">
                                    Irá criar próxima ocorrência automaticamente
                                </p>
                            )}
                            <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2">
                                <Paperclip size={16} className="text-gray-400" /> Anexar arquivos
                            </button>
                            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .tiptap-editor-mini .ProseMirror:focus { outline: none; }
                .tiptap-editor-mini .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder); float: left; color: #adb5bd; pointer-events: none; height: 0;
                }
                .tiptap-editor-mini .ProseMirror p { margin-bottom: 0.5rem; }
                .tiptap-editor-mini ul[data-type="taskList"] { list-style: none; padding: 0; }
                .tiptap-editor-mini ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.25rem; }
                .tiptap-editor-mini ul[data-type="taskList"] input[type="checkbox"] { width: 1rem; height: 1rem; margin-top: 0.2rem; cursor: pointer; accent-color: #db4035; }
                .tiptap-editor-mini ul:not([data-type="taskList"]) { list-style-type: disc; padding-left: 1.25rem; }
                .tiptap-editor-mini ol { list-style-type: decimal; padding-left: 1.25rem; }
                .tiptap-editor-mini a { color: #db4035; text-decoration: underline; cursor: pointer; }
                .tiptap-editor-mini hr { border: none; border-top: 2px solid #e5e7eb; margin: 1.5rem 0; }
                .tiptap-editor-mini .ProseMirror h1 { font-size: 1.875rem; font-weight: 800; margin: 1.5rem 0 0.75rem; }
                .tiptap-editor-mini .ProseMirror h2 { font-size: 1.5rem; font-weight: 700; margin: 1.25rem 0 0.5rem; }
                .tiptap-editor-mini table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 1.5rem 0; }
                .tiptap-editor-mini table td, .tiptap-editor-mini table th { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
                .tiptap-editor-mini pre { background: #1f2937; color: #e5e7eb; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; overflow-x: auto; }
            `}} />
        </Dialog>
    );
}

// Subcomponent for the Editor to save RAM when modal is closed
interface TaskDescriptionSectionProps {
    task: TaskWithAssignee;
    onUpdateTask: (updates: Partial<TaskWithAssignee>) => Promise<void>;
    isExpanded: boolean;
    setIsExpanded: (val: boolean) => void;
    isEditingDesc: boolean;
    setIsEditingDesc: (val: boolean) => void;
    saving: boolean;
    reloadAttachments: () => void;
}

function TaskDescriptionSection({ task, onUpdateTask, isExpanded, setIsExpanded, isEditingDesc, setIsEditingDesc, saving, reloadAttachments }: TaskDescriptionSectionProps) {
    const { session } = useAuthStore();
    const [uploadingInternal, setUploadingInternal] = useState(false);

    // Refs to always have fresh values inside event handlers (Tiptap closures are stale)
    const taskRef = useRef(task);
    const onUpdateTaskRef = useRef(onUpdateTask);
    useEffect(() => { taskRef.current = task; });
    useEffect(() => { onUpdateTaskRef.current = onUpdateTask; });

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: 'Digite "/" para comandos...' }),
            Link.configure({ openOnClick: false }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Table.configure({ resizable: true }),
            TableRow, TableHeader, TableCell,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Image.configure({
                HTMLAttributes: { class: 'rounded-lg border border-border-subtle shadow-sm max-w-full h-auto my-4' },
            }),
            SlashCommands.configure({
                suggestion: {
                    items: ({ query }: { query: string }) => suggestionItems
                        .filter(item => item.title.toLowerCase().includes(query.toLowerCase()) || item.searchTerms.some(term => term.includes(query.toLowerCase())))
                        .slice(0, 10),
                    render: renderItems,
                },
            }),
        ],
        content: '',
        editorProps: {
            attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] text-gray-700 leading-relaxed' },
        },
    });

    // Attach blur handler via editor.on() so refs are always fresh
    useEffect(() => {
        if (!editor) return;
        const handleBlur = () => {
            const jsonStr = JSON.stringify(editor.getJSON());
            if (jsonStr !== taskRef.current.description) {
                onUpdateTaskRef.current({ description: jsonStr });
            }
        };
        editor.on('blur', handleBlur);
        return () => { editor.off('blur', handleBlur); };
    }, [editor]);

    useEffect(() => {
        if (task && editor) {
            let content = task.description || '';
            try {
                if (content.startsWith('{')) {
                    editor.commands.setContent(JSON.parse(content));
                } else {
                    editor.commands.setContent(content);
                }
            } catch (e) {
                editor.commands.setContent(content);
            }
        }
    }, [task.id, !!editor]);

    const handleEditorImageUpload = async (file: File) => {
        if (!editor || !task || !session) return;
        setUploadingInternal(true);
        const filePath = `${task.id}/${Date.now()}_${file.name}`;
        const { error: uploadError, data } = await supabase.storage.from('task_attachments').upload(filePath, file);

        if (!uploadError && data) {
            const url = supabase.storage.from('task_attachments').getPublicUrl(filePath).data.publicUrl;
            editor.chain().focus().setImage({ src: url }).run();
            await supabase.from('task_attachments').insert({
                task_id: task.id, user_id: session.user.id, file_name: file.name,
                file_path: filePath, file_size: file.size, file_type: file.type
            });
            reloadAttachments();
        }
        setUploadingInternal(false);
    };

    useEffect(() => {
        const handler = (e: any) => { if (e.detail?.file) handleEditorImageUpload(e.detail.file); };
        window.addEventListener('editor-upload-image', handler);
        return () => window.removeEventListener('editor-upload-image', handler);
    }, [!!editor, task.id]);

    // Auto-save logic
    useEffect(() => {
        if (!editor || !isEditingDesc) return;

        const timeoutId = setTimeout(() => {
            const jsonStr = JSON.stringify(editor.getJSON());
            if (jsonStr !== task.description) {
                onUpdateTask({ description: jsonStr });
            }
        }, 1000); // Save after 1 second of inactivity

        return () => clearTimeout(timeoutId);
    }, [editor?.getJSON(), isEditingDesc]);

    if (!editor) return null;

    const editorText = editor.getText() || '';
    const isLongDescription = editorText.length > 300 || editorText.split('\n').length > 6;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
                {isEditingDesc && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                        Salvamento automático ativo
                    </span>
                )}
                {isEditingDesc && (
                    <button
                        onClick={() => setIsEditingDesc(false)}
                        className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        Fechar Editor
                    </button>
                )}
            </div>

            {isEditingDesc && (
                <BubbleMenu editor={editor} className="flex items-center gap-1 bg-gray-900 text-white p-1 rounded-lg shadow-xl border border-white/10 z-50">
                    <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-white/10 ${editor.isActive('bold') ? 'text-brand' : ''}`}><Bold size={14} /></button>
                    <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-white/10 ${editor.isActive('italic') ? 'text-brand' : ''}`}><Italic size={14} /></button>
                    <div className="w-px h-4 bg-white/20 mx-0.5" />
                    <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded hover:bg-white/10 ${editor.isActive('bulletList') ? 'text-brand' : ''}`}><List size={14} /></button>
                    <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded hover:bg-white/10 ${editor.isActive('taskList') ? 'text-brand' : ''}`}><CheckSquare size={14} /></button>
                    <div className="w-px h-4 bg-white/20 mx-0.5" />
                    <button onClick={() => {
                        const url = window.prompt('URL:');
                        if (url) editor.chain().focus().setLink({ href: url }).run();
                    }} className={`p-1.5 rounded hover:bg-white/10 ${editor.isActive('link') ? 'text-brand' : ''}`}><LinkIcon size={14} /></button>
                </BubbleMenu>
            )}

            <div
                onClick={() => !isEditingDesc && setIsEditingDesc(true)}
                className={`bg-gray-50/50 rounded-lg border transition-all relative overflow-hidden flex flex-col ${saving ? 'border-brand/30 opacity-70' : 'border-border-subtle'} ${!isEditingDesc ? 'p-4 cursor-pointer hover:bg-gray-100/50' : 'bg-white border-brand shadow-sm'} ${!isExpanded && isLongDescription && !isEditingDesc ? 'max-h-[150px]' : 'max-h-none'}`}
            >
                {isEditingDesc && (
                    <div className="border-b border-gray-100 bg-gray-50 px-2 py-1.5 flex items-center gap-1 shrink-0 overflow-x-auto custom-scrollbar">
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('heading', { level: 1 }) ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><Heading1 size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('heading', { level: 2 }) ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><Heading2 size={16} /></button>
                        <div className="w-px h-5 bg-gray-200 mx-1" />
                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('bold') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><Bold size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('italic') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><Italic size={16} /></button>
                        <div className="w-px h-5 bg-gray-200 mx-1" />
                        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('bulletList') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><List size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('orderedList') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><ListOrdered size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('taskList') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><CheckSquare size={16} /></button>
                        <div className="w-px h-5 bg-gray-200 mx-1" />
                        <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="p-1.5 rounded hover:bg-white text-gray-500"><TableIcon size={16} /></button>
                        <button onClick={() => {
                            const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
                            input.onchange = async (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) handleEditorImageUpload(file); };
                            input.click();
                        }} className="p-1.5 rounded hover:bg-white text-gray-500"><ImageIcon size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('codeBlock') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><Code size={16} /></button>
                        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className="p-1.5 rounded hover:bg-white text-gray-500"><Minus size={16} /></button>
                        <div className="w-px h-5 bg-gray-200 mx-1" />
                        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive({ textAlign: 'left' }) ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><AlignLeft size={16} /></button>
                        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive({ textAlign: 'center' }) ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><AlignCenter size={16} /></button>
                        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive({ textAlign: 'right' }) ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><AlignRight size={16} /></button>
                    </div>
                )}

                <div className={`tiptap-editor-mini ${isEditingDesc ? 'p-4' : ''}`}>
                    <EditorContent editor={editor} />
                </div>

                {!isExpanded && isLongDescription && !isEditingDesc && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50/90 to-transparent pointer-events-none" />
                )}

                {(saving || uploadingInternal) && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-bold text-brand animate-pulse bg-white/80 px-2 py-1 rounded shadow-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" />
                        {uploadingInternal ? 'Enviando...' : 'Salvando...'}
                    </div>
                )}
            </div>

            {!isEditingDesc && isLongDescription && (
                <div className="flex justify-center -mt-4 relative z-10">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="text-[10px] font-black uppercase tracking-widest text-brand hover:text-brand-dark px-6 py-2 rounded-full bg-white border border-brand/20 shadow-md transition-all hover:scale-110 active:scale-95 flex items-center gap-2"
                    >
                        {isExpanded ? <span>Recolher</span> : <span>Expandir descrição</span>}
                    </button>
                </div>
            )}
        </div>
    );
}
