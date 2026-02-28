import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useTaskStore } from '../../store/taskStore';
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
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

export function TaskFormModal({ isOpen, onClose, projectId }: TaskFormModalProps) {
    const { fetchTasks, statuses } = useTaskStore();
    const { activeWorkspace } = useWorkspaceStore();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<Profile[]>([]);

    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<TaskFormData>({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            priority: 'medium',
            status_id: statuses[0]?.id || ''
        }
    });

    useEffect(() => {
        if (isOpen && activeWorkspace) {
            // Find users in this workspace
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

    // Set default status when modal opens
    useEffect(() => {
        if (isOpen && statuses.length > 0) {
            setValue('status_id', statuses[0].id);
        }
    }, [isOpen, statuses, setValue]);

    const onSubmit = async (data: TaskFormData) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('tasks').insert({
                project_id: projectId,
                title: data.title,
                description: data.description,
                priority: data.priority,
                status_id: data.status_id,
                assignee_id: data.assignee_id || null,
                position: 0 // Simplification for new tasks
            });

            if (error) throw error;

            toast.success('Tarefa criada com sucesso!');
            await fetchTasks(projectId);
            reset();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao criar tarefa');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Nova Tarefa" maxWidth="max-w-2xl">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                <Input
                    placeholder="Título da tarefa..."
                    {...register('title')}
                    error={errors.title?.message}
                    className="text-lg font-bold border-transparent px-0 hover:border-gray-200 focus:border-brand shadow-none"
                />

                <div className="space-y-1">
                    <textarea
                        {...register('description')}
                        rows={4}
                        placeholder="Adicione uma descrição detalhada..."
                        className="w-full px-3 py-2 border border-border-subtle rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 sm:text-sm text-gray-900 resize-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Status</label>
                        <select
                            {...register('status_id')}
                            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-white"
                        >
                            <option value="" disabled>Selecione um status</option>
                            {statuses.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        {errors.status_id && <span className="text-red-500 text-xs">{errors.status_id.message}</span>}
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Prioridade</label>
                        <select
                            {...register('priority')}
                            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-white"
                        >
                            <option value="low">Baixa</option>
                            <option value="medium">Média</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </div>

                    <div className="space-y-1 col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Responsável</label>
                        <select
                            {...register('assignee_id')}
                            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-white"
                        >
                            <option value="">Não atribuído</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-border-subtle mt-6">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" isLoading={loading}>
                        Criar Tarefa
                    </Button>
                </div>

            </form>
        </Dialog>
    );
}
