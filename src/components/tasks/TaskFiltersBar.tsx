import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Filter, X, ChevronsDown, ChevronsUp, SlidersHorizontal } from 'lucide-react';
import { Select } from '../ui/Select';
import { Toggle } from '../ui/Toggle';
import { cn } from '../../lib/utils';
import type { GroupBy } from '../../hooks/useTaskFilters';
import { useIsMobile } from '../../hooks/useIsMobile';

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
    const isMobile = useIsMobile();
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [filtersPos, setFiltersPos] = useState({ top: 0, left: 0 });
    const [viewPos, setViewPos] = useState({ top: 0, left: 0 });
    const filtersBtnRef = useRef<HTMLButtonElement>(null);
    const viewBtnRef = useRef<HTMLButtonElement>(null);
    const filtersDropRef = useRef<HTMLDivElement>(null);
    const viewDropRef = useRef<HTMLDivElement>(null);

    const calcLeft = (rect: DOMRect, dropdownWidth: number) =>
        Math.max(8, Math.min(rect.left, window.innerWidth - dropdownWidth - 8));

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const t = e.target as Node;
            if (filtersDropRef.current && !filtersDropRef.current.contains(t) &&
                filtersBtnRef.current && !filtersBtnRef.current.contains(t)) {
                setIsFiltersOpen(false);
            }
            if (viewDropRef.current && !viewDropRef.current.contains(t) &&
                viewBtnRef.current && !viewBtnRef.current.contains(t)) {
                setIsViewOpen(false);
            }
        };
        if (isFiltersOpen || isViewOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFiltersOpen, isViewOpen]);

    const filtersDropdown = isFiltersOpen && createPortal(
        <div
            ref={filtersDropRef}
            style={{ top: filtersPos.top, left: filtersPos.left }}
            className="fixed w-64 bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float z-[9999] p-3 flex flex-col gap-3"
        >
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-muted uppercase tracking-widest">Projeto</label>
                <Select value={selectedProject} onChange={(e) => onProjectChange(e.target.value)}>
                    <option value="all">Todos os Projetos</option>
                    {uniqueProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-muted uppercase tracking-widest">Responsável</label>
                <Select value={selectedAssignee} onChange={(e) => onAssigneeChange(e.target.value)}>
                    <option value="all">Todos</option>
                    {uniqueAssignees.map(a => <option key={a.id} value={a.id}>{a.full_name || a.email.split('@')[0]}</option>)}
                </Select>
            </div>
            {uniqueCategories.length > 0 && (
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest">Tipo de Tarefa</label>
                    <Select value={selectedCategory} onChange={(e) => onCategoryChange(e.target.value)}>
                        <option value="all">Todos os Tipos</option>
                        {uniqueCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                </div>
            )}
            <div className="border-t border-border-subtle pt-2.5">
                <button
                    onClick={() => onShowCompletedChange(!showCompleted)}
                    className="flex items-center gap-2 text-xs text-secondary hover:text-primary transition-colors"
                >
                    <div className={cn("w-7 h-4 rounded-full transition-colors shrink-0", showCompleted ? 'bg-brand' : 'bg-border-subtle')}>
                        <div className={cn("w-3 h-3 bg-surface-card rounded-full m-0.5 transition-transform duration-200", showCompleted ? 'translate-x-3' : 'translate-x-0')} />
                    </div>
                    Mostrar concluídas
                </button>
            </div>
            {activeFilterCount > 0 && (
                <button
                    onClick={() => { onProjectChange('all'); onAssigneeChange('all'); onCategoryChange('all'); }}
                    className="text-xs text-brand hover:text-brand/70 font-medium text-left transition-colors"
                >
                    Limpar filtros
                </button>
            )}
        </div>,
        document.body
    );

    const viewDropdown = isViewOpen && createPortal(
        <div
            ref={viewDropRef}
            style={{ top: viewPos.top, left: viewPos.left }}
            className="fixed w-56 bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float z-[9999] p-3 flex flex-col gap-3"
        >
            <label className="text-[10px] font-black text-muted uppercase tracking-widest">Visualização</label>
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-secondary">Grupos abertos por padrão</span>
                <Toggle checked={defaultExpanded} onCheckedChange={onDefaultExpandedChange} className="scale-75 origin-right" />
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => { onExpandAll(); setIsViewOpen(false); }}
                    className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary border border-border-subtle rounded-md hover:bg-surface-2 transition-colors"
                >
                    <ChevronsDown size={12} /> Expandir
                </button>
                <button
                    onClick={() => { onCollapseAll(); setIsViewOpen(false); }}
                    className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary border border-border-subtle rounded-md hover:bg-surface-2 transition-colors"
                >
                    <ChevronsUp size={12} /> Recolher
                </button>
            </div>
        </div>,
        document.body
    );

    const filterChips = (
        <>
            {selectedProject !== 'all' && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-brand/10 text-brand text-xs rounded-full font-medium shrink-0">
                    {uniqueProjects.find(p => p.id === selectedProject)?.name}
                    <button onClick={() => onProjectChange('all')} className="hover:text-brand/60 transition-colors"><X size={10} /></button>
                </span>
            )}
            {selectedAssignee !== 'all' && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-brand/10 text-brand text-xs rounded-full font-medium shrink-0">
                    {(() => { const a = uniqueAssignees.find(a => a.id === selectedAssignee); return a?.full_name || a?.email.split('@')[0]; })()}
                    <button onClick={() => onAssigneeChange('all')} className="hover:text-brand/60 transition-colors"><X size={10} /></button>
                </span>
            )}
            {selectedCategory !== 'all' && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-brand/10 text-brand text-xs rounded-full font-medium shrink-0">
                    {uniqueCategories.find(c => c.id === selectedCategory)?.name}
                    <button onClick={() => onCategoryChange('all')} className="hover:text-brand/60 transition-colors"><X size={10} /></button>
                </span>
            )}
            {showCompleted && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-brand/10 text-brand text-xs rounded-full font-medium shrink-0">
                    Concluídas
                    <button onClick={() => onShowCompletedChange(false)} className="hover:text-brand/60 transition-colors"><X size={10} /></button>
                </span>
            )}
        </>
    );

    const groupByButtons = (
        <div className="flex bg-surface-0 p-0.5 rounded-[var(--radius-md)] shrink-0">
            {(['status', 'project', 'due_date'] as const).map(option => (
                <button
                    key={option}
                    onClick={() => onGroupByChange(option)}
                    className={cn(
                        "text-xs font-bold rounded-md transition-all duration-200",
                        isMobile ? "px-3 py-2.5 min-h-[44px]" : "px-2.5 py-1",
                        groupBy === option ? 'bg-surface-card text-brand border border-border-subtle' : 'text-muted hover:text-secondary'
                    )}
                >
                    {option === 'status' ? 'Status' : option === 'project' ? 'Projeto' : 'Prazo'}
                </button>
            ))}
        </div>
    );

    const filtersBtn = (
        <button
            ref={filtersBtnRef}
            onClick={() => {
                const rect = filtersBtnRef.current?.getBoundingClientRect();
                if (rect) setFiltersPos({ top: rect.bottom + 4, left: calcLeft(rect, 256) });
                setIsFiltersOpen(v => !v);
                setIsViewOpen(false);
            }}
            className={cn(
                "flex items-center gap-1.5 px-3 rounded-[var(--radius-md)] text-xs font-bold border transition-all duration-200",
                isMobile ? "py-2.5 min-h-[44px]" : "py-1.5",
                activeFilterCount > 0 ? 'bg-brand/10 border-brand/30 text-brand' : 'bg-surface-card border-border-subtle text-secondary hover:bg-surface-2'
            )}
        >
            <Filter size={13} />
            Filtros
            {activeFilterCount > 0 && (
                <span className="min-w-4 h-4 px-0.5 rounded-full bg-brand text-white text-[9px] font-black flex items-center justify-center">
                    {activeFilterCount}
                </span>
            )}
            <ChevronDown size={11} className={cn("transition-transform duration-200", isFiltersOpen && "rotate-180")} />
        </button>
    );

    const viewBtn = (
        <button
            ref={viewBtnRef}
            onClick={() => {
                const rect = viewBtnRef.current?.getBoundingClientRect();
                if (rect) setViewPos({ top: rect.bottom + 4, left: calcLeft(rect, 224) });
                setIsViewOpen(v => !v);
                setIsFiltersOpen(false);
            }}
            className={cn("flex items-center gap-1.5 px-3 rounded-[var(--radius-md)] text-xs font-bold border bg-surface-card border-border-subtle text-secondary hover:bg-surface-2 transition-all duration-200", isMobile ? "py-2.5 min-h-[44px]" : "py-1.5")}
            title="Preferências de visualização"
        >
            <SlidersHorizontal size={13} />
            <ChevronDown size={11} className={cn("transition-transform duration-200", isViewOpen && "rotate-180")} />
        </button>
    );

    if (isMobile) {
        return (
            <div className="px-3 pt-3 pb-2 border-b border-border-subtle flex flex-col gap-2 bg-surface-2/50 shrink-0">
                {/* Linha 1: busca full-width */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Buscar tarefas..."
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-surface-card border border-border-subtle rounded-[var(--radius-md)] text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-colors"
                    />
                </div>
                {/* Linha 2: controles */}
                <div className="flex items-center gap-2 flex-wrap">
                    {groupByButtons}
                    {filtersBtn}
                    {viewBtn}
                </div>
                {/* Linha 3: chips ativos (só se houver) */}
                {(selectedProject !== 'all' || selectedAssignee !== 'all' || selectedCategory !== 'all' || showCompleted) && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {filterChips}
                    </div>
                )}
                {filtersDropdown}
                {viewDropdown}
            </div>
        );
    }

    return (
        <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-3 bg-surface-2/50 shrink-0 overflow-x-auto">
            {/* Search */}
            <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar... ( / )"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-surface-card border border-border-subtle rounded-[var(--radius-md)] text-sm focus:ring-2 focus:ring-brand/20 outline-none w-52 transition-colors"
                />
            </div>

            <div className="h-5 w-px bg-border-subtle shrink-0" />
            {groupByButtons}
            <div className="h-5 w-px bg-border-subtle shrink-0" />
            <div className="shrink-0">{filtersBtn}</div>
            <div className="shrink-0">{viewBtn}</div>

            {filtersDropdown}
            {viewDropdown}

            {/* Active filter chips */}
            {filterChips}
        </div>
    );
}
