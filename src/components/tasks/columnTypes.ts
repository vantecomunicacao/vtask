import type { SortField } from '../../hooks/useTaskFilters';

export type ColumnId = 'project' | 'due_date' | 'priority';

export interface ColumnDef {
    id: ColumnId;
    label: string;
    flex: number;       // flex-grow value (2 = double width, 1 = single)
    sortField?: SortField;
}

export const DEFAULT_COLUMNS: ColumnDef[] = [
    { id: 'project',   label: 'Projeto',     flex: 2, sortField: 'project' },
    { id: 'due_date',  label: 'Prazo',       flex: 2, sortField: 'due_date' },
    { id: 'priority',  label: 'Prioridade',  flex: 1, sortField: 'priority' },
];
