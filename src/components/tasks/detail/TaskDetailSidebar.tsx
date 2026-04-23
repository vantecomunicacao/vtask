import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../lib/database.types';
import type { TaskWithAssignee, CustomStatus } from '../../../store/taskStore';
import type { Document } from '../../../store/documentStore';
import { Select } from '../../ui/Select';
import { DatePicker } from '../../ui/DatePicker';
import { StatusPopover } from '../StatusPopover';
import {
    Clock, Tag, Timer, FileText, Search, Plus, X,
    ChevronRight, CheckCircle, Paperclip,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { celebrate } from '../../../lib/confetti';
import { toast } from 'sonner';

type Profile = Database['public']['Tables']['profiles']['Row'];
type TaskCategory = Database['public']['Tables']['task_categories']['Row'];

interface TaskDetailSidebarProps {
    currentTask: TaskWithAssignee;
    statuses: CustomStatus[];
    members: Profile[];
    taskCategories: TaskCategory[];
    documents: Document[];
    onUpdateTask: (updates: Partial<TaskWithAssignee>) => Promise<void>;
    onTriggerUpload: () => void;
    saving: boolean;
    onClose: () => void;
}

export function TaskDetailSidebar({
    currentTask, statuses, members, taskCategories, documents,
    onUpdateTask, onTriggerUpload, saving, onClose,
}: TaskDetailSidebarProps) {
    const navigate = useNavigate();
    const [tagInput, setTagInput] = useState('');
    const [linkedDocuments, setLinkedDocuments] = useState<Array<{ id: string; document_id: string; title: string }>>([]);
    const [docSearchOpen, setDocSearchOpen] = useState(false);
    const [docSearchQuery, setDocSearchQuery] = useState('');
    const [statusPopover, setStatusPopover] = useState<{ position: { top: number; left: number } } | null>(null);

    const isCompleted = statuses.length > 0 && currentTask.status_id === statuses[statuses.length - 1]?.id;
    const hasRecurrence = currentTask.recurrence && currentTask.recurrence !== 'none';

    const toggleStatusPopover = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (statusPopover) {
            setStatusPopover(null);
        } else {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setStatusPopover({
                position: { top: rect.top + window.scrollY, left: rect.left + rect.width + 10 },
            });
        }
    };

    const handleAddTag = async () => {
        if (!tagInput.trim()) return;
        const newTags = [...(currentTask.labels || []), tagInput.trim()];
        setTagInput('');
        await onUpdateTask({ labels: newTags });
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        const newTags = (currentTask.labels || []).filter(t => t !== tagToRemove);
        await onUpdateTask({ labels: newTags });
    };

    // Load linked documents on mount / task change
    useState(() => {
        (async () => {
            const { data } = await supabase
                .from('task_documents')
                .select('id, document_id, documents(title)')
                .eq('task_id', currentTask.id);
            if (data) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setLinkedDocuments((data as any[]).map((d: any) => ({
                    id: d.id,
                    document_id: d.document_id,
                    title: (Array.isArray(d.documents) ? d.documents[0]?.title : d.documents?.title) || 'Documento sem título',
                })));
            }
        })();
    });

    return (
        <div className="w-full md:w-64 shrink-0 space-y-6">
            {/* Details panel */}
            <div>
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Detalhes</span>
                <div className="space-y-4 bg-gray-50 rounded-lg p-3 border border-border-subtle">
                    {/* Status */}
                    <div>
                        <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                            Status
                        </label>
                        <button
                            onClick={toggleStatusPopover}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-surface-card border border-border-subtle rounded-[var(--radius-md)] text-sm hover:border-brand/50 transition-all group"
                        >
                            <div className="flex items-center gap-2 truncate">
                                <div
                                    className="w-2 h-2 rounded-full shrink-0 bg-[var(--dot-color)]"
                                    style={{ '--dot-color': statuses.find(s => s.id === currentTask.status_id)?.color || '#ccc' } as React.CSSProperties}
                                />
                                <span className="truncate font-medium">
                                    {statuses.find(s => s.id === currentTask.status_id)?.name || 'Selecionar status'}
                                </span>
                            </div>
                            <ChevronRight size={14} className="text-muted group-hover:text-brand transition-colors" />
                        </button>
                    </div>

                    <Select
                        label="Responsável"
                        value={currentTask.assignee_id || ''}
                        onChange={(e) => onUpdateTask({ assignee_id: e.target.value || null })}
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
                                ),
                            })),
                        ]}
                    />

                    <Select
                        label="Prioridade"
                        value={currentTask.priority || 'medium'}
                        onChange={(e) => onUpdateTask({ priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
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
                        <DatePicker
                            value={currentTask.due_date ?? null}
                            onChange={(v) => onUpdateTask({ due_date: v })}
                        />
                    </div>

                    <Select
                        label="Recorrência"
                        value={currentTask.recurrence || 'none'}
                        onChange={(e) => onUpdateTask({ recurrence: e.target.value as 'none' | 'daily' | 'weekly' | 'monthly' })}
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
                        onChange={(e) => onUpdateTask({ category_id: e.target.value || null })}
                        className="bg-white"
                        options={[
                            { value: '', label: 'Nenhum tipo selecionado' },
                            ...taskCategories.map(c => ({
                                value: c.id,
                                label: c.name,
                                icon: c.color ? <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: c.color }} /> : undefined,
                            })),
                        ]}
                    />

                    {/* Tags */}
                    <div>
                        <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                            <Tag size={12} /> Tags
                        </label>
                        <div className="space-y-2">
                            <div className="flex flex-wrap gap-1">
                                {(currentTask.labels || []).map(tag => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-light text-brand text-[10px] font-bold rounded-md border border-brand/10"
                                    >
                                        {tag}
                                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 transition-colors">
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

                    {/* Time estimate */}
                    <div>
                        <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                            <Timer size={12} /> Estimativa (Horas)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={currentTask.time_estimate || ''}
                            onChange={e => onUpdateTask({ time_estimate: e.target.value ? parseFloat(e.target.value) : null })}
                            className="w-full bg-white border border-border-subtle px-3 py-2 rounded-lg text-sm transition-all focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none"
                            placeholder="Ex: 4.5"
                        />
                    </div>

                    {/* Linked documents */}
                    <div>
                        <label className="text-[11px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                            <FileText size={12} /> Documentos
                        </label>
                        <div className="space-y-1.5">
                            {linkedDocuments.map(doc => (
                                <div
                                    key={doc.id}
                                    className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-border-subtle rounded-lg group/doc hover:border-brand/30 transition-all"
                                >
                                    <FileText size={12} className="text-brand shrink-0" />
                                    <button
                                        onClick={() => { onClose(); navigate(`/documentos/${doc.document_id}`); }}
                                        className="text-xs font-medium text-gray-700 hover:text-brand transition-colors truncate flex-1 text-left"
                                    >
                                        {doc.title}
                                    </button>
                                    <button
                                        onClick={async () => {
                                            await supabase.from('task_documents').delete().eq('id', doc.id);
                                            setLinkedDocuments(prev => prev.filter(d => d.id !== doc.id));
                                        }}
                                        className="opacity-0 group-hover/doc:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}

                            {docSearchOpen ? (
                                <div className="relative">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-brand/30 rounded-lg">
                                        <Search size={12} className="text-gray-400 shrink-0" />
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Buscar documento..."
                                            value={docSearchQuery}
                                            onChange={e => setDocSearchQuery(e.target.value)}
                                            onKeyDown={e => e.key === 'Escape' && setDocSearchOpen(false)}
                                            className="flex-1 outline-none text-xs bg-transparent"
                                        />
                                    </div>
                                    <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float max-h-40 overflow-y-auto popover-enter">
                                        {documents
                                            .filter(d => d.title.toLowerCase().includes(docSearchQuery.toLowerCase()))
                                            .filter(d => !linkedDocuments.some(ld => ld.document_id === d.id))
                                            .slice(0, 8)
                                            .map((doc, i) => (
                                                <button
                                                    key={doc.id}
                                                    onClick={async () => {
                                                        const { data, error } = await supabase
                                                            .from('task_documents')
                                                            .insert({ task_id: currentTask.id, document_id: doc.id })
                                                            .select('id, document_id')
                                                            .single();
                                                        if (data && !error) {
                                                            setLinkedDocuments(prev => [...prev, { id: data.id, document_id: data.document_id, title: doc.title }]);
                                                        }
                                                        setDocSearchOpen(false);
                                                        setDocSearchQuery('');
                                                    }}
                                                    className="stagger-item w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left"
                                                    style={{ animationDelay: `${i * 30}ms` }}
                                                >
                                                    <FileText size={12} className="text-gray-400" />
                                                    <span className="truncate">{doc.title}</span>
                                                </button>
                                            ))}
                                        {documents
                                            .filter(d => d.title.toLowerCase().includes(docSearchQuery.toLowerCase()))
                                            .filter(d => !linkedDocuments.some(ld => ld.document_id === d.id))
                                            .length === 0 && (
                                            <div className="px-3 py-3 text-xs text-gray-400 text-center italic">
                                                Nenhum documento encontrado
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setDocSearchOpen(true)}
                                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-brand hover:bg-brand/5 border border-dashed border-gray-200 hover:border-brand/30 rounded-lg transition-all"
                                >
                                    <Plus size={12} /> Vincular documento
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick actions */}
            <div>
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Ações Rápidas</span>
                <div className="space-y-1">
                    <button
                        onClick={toggleStatusPopover}
                        disabled={saving}
                        className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                            isCompleted
                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                        )}
                    >
                        <CheckCircle size={16} />
                        {isCompleted ? 'Alterar Status' : 'Concluir Tarefa'}
                    </button>

                    {!isCompleted && hasRecurrence && (
                        <p className="text-[10px] text-gray-400 px-1">
                            Irá criar próxima ocorrência automaticamente
                        </p>
                    )}

                    <button
                        onClick={onTriggerUpload}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2"
                    >
                        <Paperclip size={16} className="text-gray-400" /> Anexar arquivos
                    </button>
                </div>
            </div>

            {/* Status popover (fixed position, rendered here) */}
            {statusPopover && (
                <StatusPopover
                    statusList={statuses}
                    currentStatusId={currentTask.status_id}
                    position={statusPopover.position}
                    onSelect={async (statusId) => {
                        const doneStatusId = statuses[statuses.length - 1]?.id;
                        if (statusId === doneStatusId) {
                            celebrate();
                            toast.success('Tarefa concluída! 🎉');
                        }
                        await onUpdateTask({ status_id: statusId });
                        setStatusPopover(null);
                    }}
                    onClose={() => setStatusPopover(null)}
                />
            )}
        </div>
    );
}

// Re-export celebrate/toast so they're available if needed elsewhere
export { celebrate, toast };
