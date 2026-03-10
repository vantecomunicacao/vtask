import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useProjectStore, type ProjectWithClient } from '../../store/projectStore';
import { toast } from 'sonner';
import { useEffect } from 'react';

const projectSchema = z.object({
    name: z.string().min(1, 'Nome do projeto é obrigatório'),
    description: z.string().optional(),
    color: z.string().optional(),
    due_date: z.string().optional().nullable(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    project?: ProjectWithClient | null;
}

const COLORS = ['#db4035', '#299438', '#14aaf5', '#96c3eb', '#4073ff', '#884dff', '#af38eb', '#eb96eb', '#e05194', '#ff8d85', '#808080'];

export function ProjectFormModal({ isOpen, onClose, project }: ProjectFormModalProps) {
    const { activeWorkspace } = useWorkspaceStore();
    const { fetchProjects, updateProject } = useProjectStore();
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<ProjectFormData>({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            color: '#808080',
        }
    });

    useEffect(() => {
        if (project) {
            reset({
                name: project.name,
                description: project.description || '',
                color: project.color || '#808080',
                due_date: project.due_date || '',
            });
        } else {
            reset({
                name: '',
                description: '',
                color: '#808080',
                due_date: '',
            });
        }
    }, [project, reset, isOpen]);

    const selectedColor = watch('color');

    const onSubmit = async (data: ProjectFormData) => {
        if (!activeWorkspace) {
            toast.error('Workspace não encontrado. Recarregue a página e tente novamente.');
            return;
        }

        setLoading(true);
        try {
            if (project) {
                await updateProject(project.id, {
                    name: data.name,
                    description: data.description,
                    color: data.color,
                    due_date: data.due_date || null
                });
                toast.success('Projeto atualizado com sucesso!');
            } else {
                const { error } = await supabase.from('projects').insert({
                    workspace_id: activeWorkspace.id,
                    name: data.name,
                    description: data.description,
                    color: data.color || '#808080',
                    due_date: data.due_date || null
                });

                if (error) throw error;
                toast.success('Projeto criado com sucesso!');
            }

            if (activeWorkspace) {
                await fetchProjects(activeWorkspace.id);
            }
            reset();
            onClose();
        } catch (err: unknown) {
            const pgErr = err as { message?: string };
            const msg = pgErr?.message || 'Erro desconhecido ao criar projeto';
            console.error('Erro ao criar projeto:', err);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={project ? 'Editar Projeto' : 'Novo Projeto'} maxWidth="max-w-lg">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Nome do Projeto</label>
                    <Input
                        placeholder="Ex: Rebranding Vante"
                        {...register('name')}
                        error={errors.name?.message}
                    />
                </div>

                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Descrição</label>
                    <textarea
                        {...register('description')}
                        rows={3}
                        placeholder="Opcional. Breve descrição sobre o projeto."
                        className="w-full px-3 py-2 border border-border-subtle rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 sm:text-sm text-gray-900"
                    />
                </div>

                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Data de Vencimento</label>
                    <Input
                        type="date"
                        {...register('due_date')}
                        error={errors.due_date?.message}
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Cor do Projeto</label>
                    <div className="flex flex-wrap gap-2">
                        {COLORS.map(color => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setValue('color', color)}
                                className={`w-6 h-6 rounded-full border-2 transition-transform ${selectedColor === color ? 'scale-125 border-gray-900 shadow-sm' : 'border-transparent hover:scale-110'}`}
                                style={{ backgroundColor: color }}
                                aria-label={`Selecionar cor ${color}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-border-subtle">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" isLoading={loading}>
                        {project ? 'Salvar Alterações' : 'Criar Projeto'}
                    </Button>
                </div>

            </form>
        </Dialog>
    );
}
