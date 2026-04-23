import React, { useState, useRef, useEffect } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { ChevronRight, Plus, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TaskWithAssignee, CustomStatus } from '../../store/taskStore';
import { useTaskStore } from '../../store/taskStore';
import { useProjectStore } from '../../store/projectStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { GroupBy } from '../../hooks/useTaskFilters';
import { TaskRow } from './TaskRow';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

function GroupProgressBar({ completedCount, totalCount, color }: { completedCount: number; totalCount: number; color: string }) {
    if (totalCount === 0) return null;
    const percent = Math.round((completedCount / totalCount) * 100);
    return (
        <div className="group-progress-bar mt-1.5 w-full">
            <div
                className="group-progress-fill"
                style={{ width: `${percent}%`, backgroundColor: color }}
            />
        </div>
    );
}

interface QuickAddRowProps {
    statusId: string;
    onClose: () => void;
}

function QuickAddRow({ statusId, onClose }: QuickAddRowProps) {
    const { activeWorkspace } = useWorkspaceStore();
    const projects = useProjectStore(s => s.projects);
    const fetchWorkspaceTasks = useTaskStore(s => s.fetchWorkspaceTasks);
    const invalidateTasksCache = useTaskStore(s => s.invalidateTasksCache);

    const [title, setTitle] = useState('');
    const [projectId, setProjectId] = useState(() => projects[0]?.id ?? '');
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const handleSave = async () => {
        if (!title.trim() || !projectId || !activeWorkspace) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('tasks').insert({
                title: title.trim(),
                project_id: projectId,
                status_id: statusId,
            });
            if (error) throw error;
            invalidateTasksCache();
            await fetchWorkspaceTasks(activeWorkspace.id, true);
            toast.success('Tarefa criada');
            onClose();
        } catch {
            toast.error('Erro ao criar tarefa');
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
        if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };

    return (
        <div className="px-4 py-2 flex items-center gap-3 bg-brand/[0.02] border-t border-brand/10">
            {/* indent para alinhar com o título */}
            <div className="w-4 shrink-0" />
            <div className="w-5 shrink-0" />
            <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nome da tarefa..."
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted text-primary min-w-0"
                disabled={saving}
            />
            {projects.length > 1 && (
                <select
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                    className="text-xs text-secondary bg-surface-0 border border-border-subtle rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-brand/30 shrink-0"
                    disabled={saving}
                >
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            )}
            <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={handleSave}
                    disabled={!title.trim() || !projectId || saving}
                    className="px-2.5 py-1 text-xs font-bold bg-brand text-white rounded-md hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                    {saving ? <Loader2 size={11} className="animate-spin" /> : null}
                    Salvar
                </button>
                <button
                    onClick={onClose}
                    className="px-2 py-1 text-xs text-muted hover:text-secondary transition-colors"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}

interface Group {
    id: string;
    name: string;
    color: string;
    tasks: TaskWithAssignee[];
}

interface TaskGroupSectionProps {
    group: Group;
    isExpanded: boolean;
    animating: 'enter' | 'exit' | undefined;
    groupBy: GroupBy;
    gridTemplate: string;
    doneStatusId: string | undefined;
    filteredTasks: TaskWithAssignee[];
    focusedTaskIndex: number;
    selectedTaskIds: Set<string>;
    statuses: CustomStatus[];
    isMobile?: boolean;
    onToggleSection: (id: string) => void;
    onToggleSelect: (id: string) => void;
    onToggleStatusPopover: (e: React.MouseEvent, id: string) => void;
    onOpenDetail: (task: TaskWithAssignee) => void;
}

export function TaskGroupSection({
    group,
    isExpanded,
    animating,
    groupBy,
    gridTemplate,
    doneStatusId,
    filteredTasks,
    focusedTaskIndex,
    selectedTaskIds,
    statuses,
    isMobile = false,
    onToggleSection,
    onToggleSelect,
    onToggleStatusPopover,
    onOpenDetail,
}: TaskGroupSectionProps) {
    const completedInGroup = group.tasks.filter(t => t.status_id === doneStatusId).length;
    const anySelected = selectedTaskIds.size > 0;
    const [isQuickAdding, setIsQuickAdding] = useState(false);

    return (
        <div className="flex flex-col">
            {/* Group Header */}
            <div
                onClick={() => onToggleSection(group.id)}
                className="flex items-center gap-2 px-4 py-2.5 bg-surface-2/50 border-b border-border-subtle cursor-pointer hover:bg-surface-0/60 transition-colors duration-150 group/header"
            >
                <div className={cn("transition-transform duration-200", isExpanded && "rotate-90")}>
                    <ChevronRight size={14} className="text-muted" />
                </div>
                <div
                    className="w-2.5 h-2.5 rounded-full transition-transform duration-200 group-hover/header:scale-125 bg-[var(--dot-color)]"
                    style={{ '--dot-color': group.color || '#ccc' } as React.CSSProperties}
                />
                <span className="text-[10px] font-black text-secondary uppercase tracking-widest">
                    {group.name}
                </span>
                <span className="text-[10px] font-bold text-muted bg-surface-0/50 px-1.5 py-0.5 rounded-full ml-1">
                    {group.tasks.length}
                </span>

                {groupBy === 'status' && group.tasks.length > 0 && (
                    <div className="flex-1 max-w-32 ml-2">
                        <GroupProgressBar
                            completedCount={completedInGroup}
                            totalCount={group.tasks.length}
                            color={group.color || '#ccc'}
                        />
                    </div>
                )}

                {/* Quick add trigger — só visível no hover do header */}
                {groupBy === 'status' && isExpanded && (
                    <button
                        onClick={e => { e.stopPropagation(); setIsQuickAdding(true); }}
                        className="ml-auto opacity-0 group-hover/header:opacity-100 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-muted hover:text-brand hover:bg-brand/5 transition-all"
                        title="Adicionar tarefa neste grupo"
                    >
                        <Plus size={11} /> Adicionar
                    </button>
                )}
            </div>

            {/* Group Content with animation */}
            {(isExpanded || animating === 'exit') && (
                <div className={cn(
                    animating === 'enter' && "group-content-enter",
                    animating === 'exit' && "group-content-exit"
                )}>
                    <Droppable droppableId={group.id} isDropDisabled={groupBy !== 'status'}>
                        {(provided, snapshot) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={cn(
                                    "flex flex-col divide-y divide-border-subtle bg-surface-card transition-colors duration-200",
                                    snapshot.isDraggingOver && "bg-brand/[0.03]"
                                )}
                            >
                                {group.tasks.length === 0 && !isQuickAdding && (
                                    <div className="py-6 text-center text-xs text-muted italic">
                                        {groupBy === 'status' ? 'Arraste tarefas para cá' : 'Nenhuma tarefa neste grupo'}
                                    </div>
                                )}
                                {group.tasks.map((task, index) => {
                                    const globalIndex = filteredTasks.indexOf(task);
                                    return (
                                        <TaskRow
                                            key={task.id}
                                            task={task}
                                            index={index}
                                            isFocused={globalIndex === focusedTaskIndex}
                                            isSelected={selectedTaskIds.has(task.id)}
                                            anySelected={anySelected}
                                            groupBy={groupBy}
                                            gridTemplate={gridTemplate}
                                            doneStatusId={doneStatusId}
                                            statuses={statuses}
                                            isMobile={isMobile}
                                            onToggleSelect={onToggleSelect}
                                            onToggleStatusPopover={onToggleStatusPopover}
                                            onOpenDetail={onOpenDetail}
                                        />
                                    );
                                })}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>

                    {/* Quick add inline */}
                    {groupBy === 'status' && isQuickAdding && (
                        <QuickAddRow
                            statusId={group.id}
                            onClose={() => setIsQuickAdding(false)}
                        />
                    )}

                    {/* Botão "+ Adicionar" no rodapé do grupo */}
                    {groupBy === 'status' && !isQuickAdding && (
                        <button
                            onClick={() => setIsQuickAdding(true)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-xs text-muted hover:text-brand hover:bg-brand/[0.03] transition-colors border-t border-border-subtle/50 group/add"
                        >
                            <Plus size={12} className="group-hover/add:text-brand transition-colors" />
                            <span>Adicionar tarefa</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
