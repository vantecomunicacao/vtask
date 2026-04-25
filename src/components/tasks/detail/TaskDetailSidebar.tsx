import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../lib/database.types';
import type { TaskWithAssignee, CustomStatus } from '../../../store/taskStore';
import type { Document } from '../../../store/documentStore';
import { Select } from '../../ui/Select';
import { DatePicker } from '../../ui/DatePicker';
import { StatusPopover } from '../StatusPopover';
import {
    Clock, FileText, Search, Plus, X,
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
    const [linkedDocuments, setLinkedDocuments] = useState<Array<{ id: string; document_id: string; title: string }>>([]);
    const [docSearchOpen, setDocSearchOpen] = useState(false);
    const [docSearchQuery, setDocSearchQuery] = useState('');
    const [docDropdownPos, setDocDropdownPos] = useState({ top: 0, left: 0, width: 0 });
    const docSearchWrapperRef = useRef<HTMLDivElement>(null);
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
        <div className="w-full md:w-56 shrink-0 space-y-6">
            {/* Details panel */}
            <div>
                <span className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Detalhes</span>
                <div className="space-y-4 bg-surface-0 rounded-[var(--radius-card)] p-3 border border-border-subtle">
                    {/* Status */}
                    <div>
                        <label className="text-[11px] text-muted font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                            Status
                        </label>
                        <button
                            onClick={toggleStatusPopover}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-surface-card border border-border-subtle rounded-[var(--radius-md)] text-sm hover:border-brand/50 transition-all group"
                        >
                            <div className="flex items-center gap-2 truncate">
                                <div
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: statuses.find(s => s.id === currentTask.status_id)?.color || '#ccc' }}
                                />
                                <span className="truncate font-medium">
                                    {statuses.find(s => s.id === currentTask.status_id)?.name || 'Selecionar status'}
                                </span>
                            </div>
                            <ChevronRight size={14} className="text-muted group-hover:text-brand transition-colors shrink-0" />
                        </button>
                    </div>

                    <Select
                        label="Responsável"
                        value={currentTask.assignee_id || ''}
                        onChange={(e) => onUpdateTask({ assignee_id: e.target.value || null })}
                        options={[
                            { value: '', label: 'Não atribuído', icon: <div className="w-4 h-4 rounded bg-surface-1 flex items-center justify-center text-[8px] text-muted font-bold">--</div> },
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
                    >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                    </Select>

                    <div>
                        <label className="text-[11px] text-muted font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
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
                        options={[
                            { value: '', label: 'Nenhum tipo selecionado' },
                            ...taskCategories.map(c => ({
                                value: c.id,
                                label: c.name,
                                icon: c.color ? <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: c.color }} /> : undefined,
                            })),
                        ]}
                    />

                    {/* Linked documents */}
                    <div>
                        <label className="text-[11px] text-muted font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                            <FileText size={12} /> Documentos
                        </label>
                        <div className="space-y-1.5">
                            {linkedDocuments.map(doc => (
                                <div
                                    key={doc.id}
                                    className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-card border border-border-subtle rounded-[var(--radius-md)] group/doc hover:border-brand/30 transition-all"
                                >
                                    <FileText size={12} className="text-brand shrink-0" />
                                    <button
                                        onClick={() => { onClose(); navigate(`/documentos/${doc.document_id}`); }}
                                        className="text-xs font-medium text-secondary hover:text-brand transition-colors truncate flex-1 text-left"
                                    >
                                        {doc.title}
                                    </button>
                                    <button
                                        onClick={async () => {
                                            await supabase.from('task_documents').delete().eq('id', doc.id);
                                            setLinkedDocuments(prev => prev.filter(d => d.id !== doc.id));
                                        }}
                                        className="opacity-0 group-hover/doc:opacity-100 p-0.5 text-muted hover:text-red-500 transition-all"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}

                            {docSearchOpen ? (
                                <div ref={docSearchWrapperRef}>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-card border border-brand/30 rounded-[var(--radius-md)]">
                                        <Search size={12} className="text-muted shrink-0" />
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Buscar documento..."
                                            value={docSearchQuery}
                                            onChange={e => setDocSearchQuery(e.target.value)}
                                            onKeyDown={e => e.key === 'Escape' && setDocSearchOpen(false)}
                                            className="flex-1 outline-none text-xs bg-transparent"
                                            ref={el => {
                                                if (el && docSearchWrapperRef.current) {
                                                    const r = docSearchWrapperRef.current.getBoundingClientRect();
                                                    setDocDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width });
                                                }
                                            }}
                                        />
                                    </div>
                                    {createPortal(
                                        <div
                                            style={{ position: 'fixed', top: docDropdownPos.top, left: docDropdownPos.left, width: docDropdownPos.width, zIndex: 9999 }}
                                            className="bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float max-h-40 overflow-y-auto popover-enter"
                                        >
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
                                                        className="stagger-item w-full flex items-center gap-2 px-3 py-2 text-xs text-secondary hover:bg-surface-0 transition-colors text-left"
                                                        style={{ animationDelay: `${i * 30}ms` }}
                                                    >
                                                        <FileText size={12} className="text-muted" />
                                                        <span className="truncate">{doc.title}</span>
                                                    </button>
                                                ))}
                                            {documents
                                                .filter(d => d.title.toLowerCase().includes(docSearchQuery.toLowerCase()))
                                                .filter(d => !linkedDocuments.some(ld => ld.document_id === d.id))
                                                .length === 0 && (
                                                <div className="px-3 py-3 text-xs text-muted text-center italic">
                                                    Nenhum documento encontrado
                                                </div>
                                            )}
                                        </div>,
                                        document.body
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => setDocSearchOpen(true)}
                                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted hover:text-brand hover:bg-brand/5 border border-dashed border-border-subtle hover:border-brand/30 rounded-[var(--radius-md)] transition-all"
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
                <span className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Ações Rápidas</span>
                <div className="space-y-1">
                    <button
                        onClick={toggleStatusPopover}
                        disabled={saving}
                        className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors',
                            isCompleted
                                ? 'bg-surface-0 text-secondary hover:bg-surface-1'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                        )}
                    >
                        <CheckCircle size={16} />
                        {isCompleted ? 'Alterar Status' : 'Concluir Tarefa'}
                    </button>

                    {!isCompleted && hasRecurrence && (
                        <p className="text-[10px] text-muted px-1">
                            Irá criar próxima ocorrência automaticamente
                        </p>
                    )}

                    <button
                        onClick={onTriggerUpload}
                        className="w-full text-left px-3 py-2 text-sm text-secondary hover:bg-surface-0 rounded-[var(--radius-md)] transition-colors flex items-center gap-2"
                    >
                        <Paperclip size={16} className="text-muted" /> Anexar arquivos
                    </button>
                </div>
            </div>

            {/* Status popover */}
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
