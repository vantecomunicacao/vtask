import { useState, useEffect, useRef } from 'react';
import { Dialog } from '../ui/Dialog';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore, type TaskWithAssignee } from '../../store/taskStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useDocumentStore } from '../../store/documentStore';
import { celebrate } from '../../lib/confetti';
import { toast } from 'sonner';

import { DescriptionEditor } from './detail/DescriptionEditor';
import { TaskComments, type TaskCommentsRef } from './detail/TaskComments';
import { TaskAttachments, type TaskAttachmentsRef } from './detail/TaskAttachments';
import { TaskSubtasks } from './detail/TaskSubtasks';
import { TaskDetailSidebar } from './detail/TaskDetailSidebar';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: TaskWithAssignee | null;
}

export function TaskDetailModal({ isOpen, onClose, task }: TaskDetailModalProps) {
    const { statuses, taskCategories, updateTask, deleteTask, toggleTaskCompletion, tasks } = useTaskStore();
    const { session } = useAuthStore();
    const { activeWorkspace } = useWorkspaceStore();
    const { documents, fetchDocuments } = useDocumentStore();

    const [members, setMembers] = useState<Profile[]>([]);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState(task?.title || '');
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const commentsRef = useRef<TaskCommentsRef>(null);
    const attachmentsRef = useRef<TaskAttachmentsRef>(null);

    // Load documents for mention support
    useEffect(() => {
        if (!isOpen || !activeWorkspace || documents.length > 0) return;
        fetchDocuments(activeWorkspace.id);
    }, [isOpen, activeWorkspace, documents.length, fetchDocuments]);

    // Load members + sync title when modal opens or task changes
    useEffect(() => {
        if (!isOpen || !task) return;
        const liveTask = tasks.find(t => t.id === task.id);
        setTitleValue(liveTask?.title || task.title);

        if (!activeWorkspace) return;
        (async () => {
            const { data } = await supabase
                .from('workspace_members')
                .select('user_id, profiles(*)')
                .eq('workspace_id', activeWorkspace.id);
            if (data) {
                const profiles = (data as Array<{ profiles: Profile | Profile[] | null }>)
                    .map(m => (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles))
                    .filter(Boolean) as Profile[];
                setMembers(profiles);
            }
        })();
    }, [isOpen, task?.id, activeWorkspace?.id]);

    const handleUpdateTask = async (updates: Partial<TaskWithAssignee>) => {
        if (!task) return;
        const currentTask = (tasks.find(t => t.id === task.id) as TaskWithAssignee | undefined) ?? task;

        // Build audit log entries
        const changeLogs: string[] = [];
        if (updates.status_id && updates.status_id !== currentTask.status_id) {
            const newStatus = statuses.find(s => s.id === updates.status_id)?.name ?? 'desconhecido';
            changeLogs.push(`Alterou o status para **${newStatus}**`);
        }
        if (updates.assignee_id !== undefined && updates.assignee_id !== currentTask.assignee_id) {
            const newAssignee = members.find(m => m.id === updates.assignee_id)?.full_name || 'Ninguém';
            changeLogs.push(`Alterou o responsável para **${newAssignee}**`);
        }
        if (updates.priority && updates.priority !== currentTask.priority) {
            const labels: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente' };
            changeLogs.push(`Alterou a prioridade para **${labels[updates.priority] ?? updates.priority}**`);
        }
        if (updates.title && updates.title !== currentTask.title) {
            changeLogs.push(`Alterou o título para **${updates.title}**`);
        }
        if (updates.due_date !== undefined && updates.due_date !== currentTask.due_date) {
            const label = updates.due_date
                ? `**${updates.due_date.substring(0, 10)}**`
                : '**sem prazo**';
            changeLogs.push(`Alterou o prazo para ${label}`);
        }

        setSaving(true);
        try {
            const previousStatusId = currentTask.status_id;
            const doneStatusId = statuses.length > 0 ? statuses[statuses.length - 1].id : null;

            if (updates.status_id && updates.status_id === doneStatusId) {
                await toggleTaskCompletion(task.id, true);
                celebrate();
                toast.success('Tarefa concluída! 🎉', {
                    duration: 5000,
                    action: {
                        label: 'Desfazer',
                        onClick: async () => {
                            await toggleTaskCompletion(task.id, false);
                            if (previousStatusId) await updateTask(task.id, { status_id: previousStatusId });
                            toast.info('Status restaurado');
                        },
                    },
                });
            } else {
                const wasCompleted = previousStatusId === doneStatusId;
                if (wasCompleted && updates.status_id) {
                    await toggleTaskCompletion(task.id, false);
                }
                await updateTask(task.id, updates);

                if (updates.status_id) {
                    toast.success('Status atualizado', {
                        action: {
                            label: 'Desfazer',
                            onClick: async () => {
                                await updateTask(task.id, { status_id: previousStatusId });
                                toast.info('Alteração de status desfeita');
                            },
                        },
                    });
                }
            }

            // Insert system audit comments
            for (const log of changeLogs) {
                await supabase.from('comments').insert({
                    task_id: task.id,
                    user_id: session?.user.id,
                    content: `_SISTEMA_: ${log}`,
                });
            }
            if (changeLogs.length > 0) commentsRef.current?.reload();
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error updating task:', error);
            toast.error('Erro ao atualizar tarefa');
        } finally {
            setSaving(false);
        }
    };

    if (!task) return null;

    const currentTask = (tasks.find(t => t.id === task.id) as TaskWithAssignee | undefined) ?? task;

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            size="full"
            sheet
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
                        className="bg-transparent border-none p-0 text-xl font-bold text-primary focus:ring-0 w-full"
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
            headerActions={
                <button
                    onClick={async () => {
                        if (confirm('Mover esta tarefa para a lixeira?')) {
                            await deleteTask(currentTask.id);
                            onClose();
                        }
                    }}
                    className="p-1.5 rounded-[var(--radius-sm)] text-muted hover:text-brand hover:bg-brand-light transition-colors"
                    title="Mover para lixeira"
                    aria-label="Mover tarefa para a lixeira"
                >
                    <Trash2 size={16} />
                </button>
            }
        >
            <div className="flex flex-col md:flex-row gap-6">
                {/* Main content */}
                <div className="flex-1 space-y-6">
                    {/* Description */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-primary">Descrição</h3>
                        </div>
                        <div className="relative group min-h-[100px]">
                            {isOpen && (
                                <DescriptionEditor
                                    task={currentTask}
                                    onUpdateTask={handleUpdateTask}
                                    isExpanded={isExpanded}
                                    setIsExpanded={setIsExpanded}
                                    isEditingDesc={isEditingDesc}
                                    setIsEditingDesc={setIsEditingDesc}
                                    saving={saving}
                                    reloadAttachments={() => attachmentsRef.current?.reload()}
                                />
                            )}
                        </div>
                    </div>

                    <TaskSubtasks
                        taskId={currentTask.id}
                        statuses={statuses}
                        taskCategories={taskCategories}
                        members={members}
                    />

                    <TaskComments
                        ref={commentsRef}
                        taskId={currentTask.id}
                        session={session}
                    />

                    <TaskAttachments
                        ref={attachmentsRef}
                        taskId={currentTask.id}
                        session={session}
                    />
                </div>

                {/* Sidebar */}
                <TaskDetailSidebar
                    currentTask={currentTask}
                    statuses={statuses}
                    members={members}
                    taskCategories={taskCategories}
                    documents={documents}
                    onUpdateTask={handleUpdateTask}
                    onTriggerUpload={() => attachmentsRef.current?.triggerUpload()}
                    saving={saving}
                    onClose={onClose}
                />
            </div>
        </Dialog>
    );
}
