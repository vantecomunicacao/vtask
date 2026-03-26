import React, { useRef, useEffect, useState } from 'react';
import { Search, ChevronDown, Filter, X, ChevronsDown, ChevronsUp } from 'lucide-react';
import { Select } from '../ui/Select';
import { Toggle } from '../ui/Toggle';
import { cn } from '../../lib/utils';
import type { GroupBy } from '../../hooks/useTaskFilters';

interface Project { id: string; name: string; color?: string | null; }
interface Assignee { id: string; email: string; full_name?: string | null; }
interface Category { id: string; name: string; color?: string | null; }

interface TaskFiltersBarProps {
    search: string;
    onSearchChange: (v: string) => void;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    groupBy: GroupBy;
    onGroupByChange: (v: GroupBy) => void;
    selectedProject: string;
    onProjectChange: (v: string) => void;
    selectedAssignee: string;
    onAssigneeChange: (v: string) => void;
    selectedCategory: string;
    onCategoryChange: (v: string) => void;
    uniqueProjects: Project[];
    uniqueAssignees: Assignee[];
    uniqueCategories: Category[];
    activeFilterCount: number;
    showCompleted: boolean;
    onShowCompletedChange: (v: boolean) => void;
    defaultExpanded: boolean;
    onDefaultExpandedChange: (v: boolean) => void;
    onExpandAll: () => void;
    onCollapseAll: () => void;
}

export function TaskFiltersBar({
    search, onSearchChange, searchInputRef,
    groupBy, onGroupByChange,
    selectedProject, onProjectChange,
    selectedAssignee, onAssigneeChange,
    selectedCategory, onCategoryChange,
    uniqueProjects, uniqueAssignees, uniqueCategories, activeFilterCount,
    showCompleted, onShowCompletedChange,
    defaultExpanded, onDefaultExpandedChange,
    onExpandAll, onCollapseAll,
}: TaskFiltersBarProps) {
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const filtersRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
                setIsFiltersOpen(false);
            }
        };
        if (isFiltersOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFiltersOpen]);

    return (
        <div className="px-4 py-3 border-b border-border-subtle flex flex-wrap gap-3 items-center justify-between bg-surface-2/50 shrink-0">
            <div className="flex flex-wrap gap-3 items-center">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Buscar... ( / )"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9 pr-4 py-1.5 bg-surface-card border border-border-subtle rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none w-52 transition-all focus:w-72"
                    />
                </div>

                <div className="h-5 w-px bg-border-subtle" />

                {/* Group by */}
                <div className="flex bg-surface-0 p-0.5 rounded-lg">
                    {(['status', 'project', 'due_date'] as const).map(option => (
                        <button
                            key={option}
                            onClick={() => onGroupByChange(option)}
                            className={cn(
                                "px-2.5 py-1 text-xs font-bold rounded-md transition-all duration-200",
                                groupBy === option
                                    ? 'bg-surface-card text-brand shadow-sm'
                                    : 'text-muted hover:text-secondary'
                            )}
                        >
                            {option === 'status' ? 'Status' : option === 'project' ? 'Projeto' : 'Prazo'}
                        </button>
                    ))}
                </div>

                <div className="h-5 w-px bg-border-subtle" />

                {/* Filters dropdown */}
                <div className="relative" ref={filtersRef}>
                    <button
                        onClick={() => setIsFiltersOpen(v => !v)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200",
                            activeFilterCount > 0
                                ? 'bg-brand/10 border-brand/30 text-brand'
                                : 'bg-surface-card border-border-subtle text-secondary hover:bg-surface-2'
                        )}
                    >
                        <Filter size={13} />
                        Filtros
                        {activeFilterCount > 0 && (
                            <span className="w-4 h-4 rounded-full bg-brand text-white text-[9px] font-black flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                        <ChevronDown size={11} className={cn("transition-transform duration-200", isFiltersOpen && "rotate-180")} />
                    </button>

                    {isFiltersOpen && (
                        <div className="absolute top-full left-0 mt-1 w-64 bg-surface-card border border-border-subtle rounded-lg shadow-float z-20 p-3 flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-muted uppercase tracking-widest">Projeto</label>
                                <Select value={selectedProject} onChange={(e) => onProjectChange(e.target.value)}>
                                    <option value="all">Todos os Projetos</option>
                                    {uniqueProjects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-muted uppercase tracking-widest">Responsável</label>
                                <Select value={selectedAssignee} onChange={(e) => onAssigneeChange(e.target.value)}>
                                    <option value="all">Todos</option>
                                    {uniqueAssignees.map(a => (
                                        <option key={a.id} value={a.id}>{a.full_name || a.email.split('@')[0]}</option>
                                    ))}
                                </Select>
                            </div>
                            {uniqueCategories.length > 0 && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black text-muted uppercase tracking-widest">Tipo de Tarefa</label>
                                    <Select value={selectedCategory} onChange={(e) => onCategoryChange(e.target.value)}>
                                        <option value="all">Todos os Tipos</option>
                                        {uniqueCategories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </Select>
                                </div>
                            )}
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={() => { onProjectChange('all'); onAssigneeChange('all'); onCategoryChange('all'); }}
                                    className="text-xs text-red-500 hover:text-red-600 font-medium text-left transition-colors"
                                >
                                    Limpar filtros
                                </button>
                            )}

                            {/* View preferences */}
                            <div className="border-t border-border-subtle pt-3 flex flex-col gap-3">
                                <label className="text-[10px] font-black text-muted uppercase tracking-widest">Visualização</label>

                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs text-secondary">Grupos abertos por padrão</span>
                                    <Toggle
                                        checked={defaultExpanded}
                                        onCheckedChange={onDefaultExpandedChange}
                                        className="scale-75 origin-right"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { onExpandAll(); setIsFiltersOpen(false); }}
                                        className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary border border-border-subtle rounded-md hover:bg-surface-2 transition-colors"
                                    >
                                        <ChevronsDown size={12} /> Expandir tudo
                                    </button>
                                    <button
                                        onClick={() => { onCollapseAll(); setIsFiltersOpen(false); }}
                                        className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary border border-border-subtle rounded-md hover:bg-surface-2 transition-colors"
                                    >
                                        <ChevronsUp size={12} /> Recolher tudo
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Active filter chips */}
                {selectedProject !== 'all' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-brand/10 text-brand text-xs rounded-full font-medium">
                        {uniqueProjects.find(p => p.id === selectedProject)?.name}
                        <button onClick={() => onProjectChange('all')} className="hover:text-brand/60 transition-colors">
                            <X size={10} />
                        </button>
                    </span>
                )}
                {selectedAssignee !== 'all' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-brand/10 text-brand text-xs rounded-full font-medium">
                        {(() => { const a = uniqueAssignees.find(a => a.id === selectedAssignee); return a?.full_name || a?.email.split('@')[0]; })()}
                        <button onClick={() => onAssigneeChange('all')} className="hover:text-brand/60 transition-colors">
                            <X size={10} />
                        </button>
                    </span>
                )}
                {selectedCategory !== 'all' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-brand/10 text-brand text-xs rounded-full font-medium">
                        {uniqueCategories.find(c => c.id === selectedCategory)?.name}
                        <button onClick={() => onCategoryChange('all')} className="hover:text-brand/60 transition-colors">
                            <X size={10} />
                        </button>
                    </span>
                )}
            </div>

            <button
                onClick={() => onShowCompletedChange(!showCompleted)}
                className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200",
                    showCompleted
                        ? 'bg-brand text-white'
                        : 'bg-surface-card border border-border-subtle text-secondary hover:bg-surface-2'
                )}
            >
                {showCompleted ? 'Ocultar Concluídas' : 'Mostrar Concluídas'}
            </button>
        </div>
    );
}
