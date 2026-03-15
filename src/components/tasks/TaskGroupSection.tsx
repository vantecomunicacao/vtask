import { Droppable } from '@hello-pangea/dnd';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TaskWithAssignee, CustomStatus } from '../../store/taskStore';
import type { GroupBy } from '../../hooks/useTaskFilters';
import { TaskRow } from './TaskRow';

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
    totalTasksInGroup: number;
    doneStatusId: string | undefined;
    filteredTasks: TaskWithAssignee[];
    focusedTaskIndex: number;
    selectedTaskIds: Set<string>;
    statuses: CustomStatus[];
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
    totalTasksInGroup,
    doneStatusId,
    filteredTasks,
    focusedTaskIndex,
    selectedTaskIds,
    statuses,
    onToggleSection,
    onToggleSelect,
    onToggleStatusPopover,
    onOpenDetail,
}: TaskGroupSectionProps) {
    const completedInGroup = group.tasks.filter(t => t.status_id === doneStatusId).length;
    const anySelected = selectedTaskIds.size > 0;

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
                    className="w-2.5 h-2.5 rounded-full transition-transform duration-200 group-hover/header:scale-125"
                    style={{ backgroundColor: group.color || '#ccc' }}
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
                            totalCount={totalTasksInGroup}
                            color={group.color || '#ccc'}
                        />
                    </div>
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
                                {group.tasks.length === 0 && (
                                    <div className="py-6 text-center text-xs text-muted italic">
                                        Arraste tarefas para cá
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
                                            doneStatusId={doneStatusId}
                                            statuses={statuses}
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
                </div>
            )}
        </div>
    );
}
