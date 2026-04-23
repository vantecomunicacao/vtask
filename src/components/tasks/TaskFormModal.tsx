import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog } from '../ui/Dialog';
import { FormActions } from '../ui/FormLayout';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { DatePicker } from '../ui/DatePicker';
import { MiniRichEditor } from '../ui/MiniRichEditor';
import { supabase } from '../../lib/supabase';
import { useTaskStore } from '../../store/taskStore';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { Database } from '../../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

const taskSchema = z.object({
    title: z.string().min(1, 'Título é obrigatório'),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    assignee_id: z.string().optional(),
    status_id: z.string().min(1, 'Status é obrigatório'),
    project_id: z.string().min(1, 'Projeto é obrigatório'),
    due_date: z.string().optional(),
    recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
    category_id: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId?: string;
    defaultDueDate?: string;
    onTaskCreated?: () => void;
}

export function TaskFormModal({ isOpen, onClose, projectId, defaultDueDate, onTaskCreated }: TaskFormModalProps) {
    const { fetchTasks, fetchWorkspaceTasks, statuses, taskCategories } = useTaskStore();
    const { activeWorkspace } = useWorkspaceStore();
    const { projects } = useProjectStore();
    const { session } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<Profile[]>([]);
    const [editorKey, setEditorKey] = useState(0);

    const { control, register, handleSubmit, formState: { errors }, reset, setValue } = useForm<TaskFormData>({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            priority: 'medium',
            status_id: statuses[0]?.id || '',
            project_id: projectId || '',
            recurrence: 'none',
        }
    });

    useEffect(() => {
        if (isOpen && activeWorkspace) {
            supabase
                .from('workspace_members')
                .select('*, profiles(*)')
                .eq('workspace_id', activeWorkspace.id)
                .then(({ data }) => {
                    if (data) {
                        setUsers(data.map(m => m.profiles as Profile).filter(Boolean));
                    }
                });
        }
    }, [isOpen, activeWorkspace]);

    // Atualiza status, projeto e data padrão quando modal abre
    useEffect(() => {
        if (isOpen) {
            if (statuses.length > 0) setValue('status_id', statuses[0].id);
            if (projectId) setValue('project_id', projectId);
            if (defaultDueDate) setValue('due_date', defaultDueDate);
        }
    }, [isOpen, statuses, projectId, defaultDueDate, setValue]);

    const onSubmit = async (data: TaskFormData) => {
        setLoading(true);
        try {
            const { data: inserted, error } = await supabase.from('tasks').insert({
                project_id: data.project_id,
                title: data.title,
                description: data.description,
                priority: data.priority,
                status_id: data.status_id,
                assignee_id: data.assignee_id || null,
                due_date: data.due_date || null,
                recurrence: data.recurrence || 'none',
                category_id: data.category_id || null,
                position: 0
            }).select('id').single();

            if (error) throw error;

            if (inserted?.id && session?.user.id) {
                await supabase.from('comments').insert({
                    task_id: inserted.id,
                    user_id: session.user.id,
                    content: '_SISTEMA_: criou a tarefa',
                });
            }

            toast.success('Tarefa criada com sucesso!');

            // Atualiza o estado da store
            if (projectId) {
                await fetchTasks(projectId);
            } else if (activeWorkspace) {
                await fetchWorkspaceTasks(activeWorkspace.id, true);
            }

            // Callback para páginas que precisam recarregar
            onTaskCreated?.();

            reset();
            setEditorKey(k => k + 1);
            onClose();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro ao criar tarefa';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Nova Tarefa" size="lg">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                <Input
                    placeholder="Título da tarefa..."
                    {...register('title')}
                    error={errors.title?.message}
                    className="text-lg font-bold border-transparent px-0 hover:border-gray-200 focus:border-brand shadow-none"
                />

                <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                        <MiniRichEditor
                            key={editorKey}
                            value={field.value ?? ''}
                            onChange={field.onChange}
                        />
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    {/* Seletor de projeto — só aparece quando não foi passado via prop */}
                    {!projectId && (
                        <div className="col-span-2">
                            <Controller
                                name="project_id"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        label="Projeto"
                                        value={field.value}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        error={errors.project_id?.message}
                                    >
                                        <option value="" disabled>Selecione um projeto</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </Select>
                                )}
                            />
                        </div>
                    )}

                    <Controller
                        name="status_id"
                        control={control}
                        render={({ field }) => (
                            <Select
                                label="Status"
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                error={errors.status_id?.message}
                            >
                                <option value="" disabled>Selecione um status</option>
                                {statuses.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </Select>
                        )}
                    />

                    <Controller
                        name="priority"
                        control={control}
                        render={({ field }) => (
                            <Select
                                label="Prioridade"
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                            >
                                <option value="low">Baixa</option>
                                <option value="medium">Média</option>
                                <option value="high">Alta</option>
                                <option value="urgent">Urgente</option>
                            </Select>
                        )}
                    />

                    <div className="col-span-2">
                        <Controller
                            name="assignee_id"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    label="Responsável"
                                    value={field.value || ''}
                                    onChange={(e) => field.onChange(e.target.value)}
                                >
                                    <option value="">Não atribuído</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                    ))}
                                </Select>
                            )}
                        />
                    </div>

                    <Controller
                        name="due_date"
                        control={control}
                        render={({ field }) => (
                            <DatePicker
                                label="Data de Vencimento"
                                value={field.value ?? null}
                                onChange={field.onChange}
                                error={errors.due_date?.message}
                            />
                        )}
                    />

                    <Controller
                        name="recurrence"
                        control={control}
                        render={({ field }) => (
                            <Select
                                label="Recorrência"
                                value={field.value || 'none'}
                                onChange={(e) => field.onChange(e.target.value)}
                            >
                                <option value="none">Nenhuma</option>
                                <option value="daily">Diária</option>
                                <option value="weekly">Semanal</option>
                                <option value="monthly">Mensal</option>
                            </Select>
                        )}
                    />

                    <div className="col-span-2">
                        <Controller
                            name="category_id"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    label="Tipo de Tarefa"
                                    value={field.value || ''}
                                    onChange={(e) => field.onChange(e.target.value)}
                                >
                                    <option value="">Nenhum tipo selecionado</option>
                                    {taskCategories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </Select>
                            )}
                        />
                    </div>
                </div>

                <FormActions className="mt-6">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" isLoading={loading}>
                        Criar Tarefa
                    </Button>
                </FormActions>

            </form>
        </Dialog>
    );
}
