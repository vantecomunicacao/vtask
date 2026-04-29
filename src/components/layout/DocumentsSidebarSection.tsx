import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { useDocumentStore, type Document } from '../../store/documentStore';
import { useProjectStore } from '../../store/projectStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import {
    FileText, Plus, ChevronRight, ChevronDown,
    Trash2, Search, FilePlus, GripVertical, FolderOpen, X,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Nó da árvore ────────────────────────────────────────────────
function DocTreeItem({
    doc, allDocs, depth, activeId, onSelect, onAddChild, onDelete,
    dragging, dropTarget, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
}: {
    doc: Document; allDocs: Document[]; depth: number; activeId: string | undefined;
    onSelect: (id: string) => void; onAddChild: (parentId: string) => void;
    onDelete: (doc: Document) => void; dragging: string | null; dropTarget: string | null;
    onDragStart: (id: string) => void; onDragEnd: () => void; onDragOver: (id: string) => void;
    onDragLeave: () => void; onDrop: (targetId: string) => void;
}) {
    const children = allDocs.filter(d => d.parent_id === doc.id);
    const [open, setOpen] = useState(depth === 0);
    const isActive = activeId === doc.id;
    const isDropTarget = dropTarget === doc.id && dragging !== doc.id;
    const isDragging = dragging === doc.id;

    return (
        <div>
            <div
                className={cn(
                    'group flex items-center gap-1 rounded-lg py-1 pr-1 cursor-pointer text-sm transition-all select-none',
                    isDragging && 'opacity-40',
                    isDropTarget && 'ring-2 ring-brand/40 bg-brand/5',
                    !isDropTarget && isActive && 'bg-brand/10 text-brand font-semibold',
                    !isDropTarget && !isActive && 'text-secondary hover:bg-surface-0 hover:text-primary',
                )}
                style={{ paddingLeft: `${6 + depth * 14}px`, minHeight: '32px' }}
                draggable
                onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(doc.id); }}
                onDragEnd={() => onDragEnd()}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); onDragOver(doc.id); }}
                onDragLeave={e => { e.stopPropagation(); onDragLeave(); }}
                onDrop={e => { e.preventDefault(); e.stopPropagation(); onDrop(doc.id); }}
                onClick={() => onSelect(doc.id)}
            >
                <span className="hidden group-hover:flex items-center text-muted/40 hover:text-muted cursor-grab shrink-0" onMouseDown={e => e.stopPropagation()}>
                    <GripVertical size={12} />
                </span>
                <button className="p-0.5 shrink-0 text-muted hover:text-secondary rounded" onClick={e => { e.stopPropagation(); setOpen(v => !v); }}>
                    {children.length > 0
                        ? open ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                        : <span className="w-3 inline-block" />}
                </button>
                <FileText size={13} className="shrink-0" />
                <span className="flex-1 truncate leading-none py-0.5">{doc.title || 'Sem título'}</span>
                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <button title="Nova sub-página" className="p-1 rounded hover:bg-surface-2 text-muted hover:text-secondary" onClick={e => { e.stopPropagation(); onAddChild(doc.id); }}>
                        <Plus size={11} />
                    </button>
                    <button title="Excluir" className="p-1 rounded hover:bg-red-50 text-muted hover:text-red-500" onClick={e => { e.stopPropagation(); onDelete(doc); }}>
                        <Trash2 size={11} />
                    </button>
                </div>
            </div>
            {open && children.map(child => (
                <DocTreeItem key={child.id} doc={child} allDocs={allDocs} depth={depth + 1}
                    activeId={activeId} onSelect={onSelect} onAddChild={onAddChild} onDelete={onDelete}
                    dragging={dragging} dropTarget={dropTarget} onDragStart={onDragStart}
                    onDragEnd={onDragEnd} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                />
            ))}
        </div>
    );
}

// ─── Seção principal ──────────────────────────────────────────────
export function DocumentsSidebarSection() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { activeWorkspace } = useWorkspaceStore();
    const { documents, fetchDocuments, createDocument, createSubDocument, deleteDocument, restoreDocument, moveDocument, loading } = useDocumentStore();
    const { projects, fetchProjects } = useProjectStore();

    const activeDocId = pathname.startsWith('/documentos/') ? pathname.split('/documentos/')[1] : undefined;

    const [search, setSearch] = useState('');
    const [projectFilter, setProjectFilter] = useState<string | null>(null);
    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
    const [projectDropdownPos, setProjectDropdownPos] = useState({ top: 0, left: 0 });
    const [dragging, setDragging] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(true);

    const projectFilterBtnRef = useRef<HTMLButtonElement>(null);
    const projectDropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeWorkspace) {
            fetchDocuments(activeWorkspace.id);
            if (projects.length === 0) fetchProjects(activeWorkspace.id);
        }
    }, [activeWorkspace, fetchDocuments, fetchProjects, projects.length]);

    useEffect(() => {
        if (!projectDropdownOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node) &&
                projectFilterBtnRef.current && !projectFilterBtnRef.current.contains(e.target as Node)
            ) setProjectDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [projectDropdownOpen]);

    const handleCreate = useCallback(async () => {
        if (!activeWorkspace) return;
        const newDoc = await createDocument({
            workspace_id: activeWorkspace.id,
            title: 'Nova página',
            content: { type: 'doc', content: [] },
            project_id: projectFilter || null,
            folder_id: null,
            parent_id: null,
        });
        if (newDoc) navigate(`/documentos/${newDoc.id}`);
    }, [activeWorkspace, createDocument, navigate, projectFilter]);

    const handleAddChild = useCallback(async (parentId: string) => {
        if (!activeWorkspace) return;
        const newDoc = await createSubDocument(parentId, activeWorkspace.id);
        if (newDoc) navigate(`/documentos/${newDoc.id}`);
    }, [activeWorkspace, createSubDocument, navigate]);

    const handleDelete = useCallback(async (doc: Document) => {
        const docTitle = doc.title || 'Documento';
        await deleteDocument(doc.id);
        if (activeDocId === doc.id) navigate('/documentos');
        toast.success(`"${docTitle}" movido para a lixeira`, {
            duration: 6000,
            action: { label: 'Desfazer', onClick: async () => { await restoreDocument(doc.id); toast.success('Documento restaurado'); } },
        });
    }, [documents, deleteDocument, restoreDocument, activeDocId, navigate]);

    const isDescendant = useCallback((nodeId: string, ancestorId: string): boolean => {
        const node = documents.find(d => d.id === nodeId);
        if (!node?.parent_id) return false;
        if (node.parent_id === ancestorId) return true;
        return isDescendant(node.parent_id, ancestorId);
    }, [documents]);

    const [rootDropHover, setRootDropHover] = useState(false);

    const handleDragStart = useCallback((id: string) => { setDragging(id); setDropTarget(null); }, []);
    const handleDragEnd = useCallback(() => { setDragging(null); setDropTarget(null); setRootDropHover(false); }, []);
    const handleDragOver = useCallback((targetId: string) => {
        if (!dragging || targetId === dragging || isDescendant(targetId, dragging)) return;
        setDropTarget(targetId);
    }, [dragging, isDescendant]);
    const handleDragLeave = useCallback(() => setDropTarget(null), []);
    const handleDrop = useCallback(async (targetId: string) => {
        if (!dragging || dragging === targetId || isDescendant(targetId, dragging)) { setDragging(null); setDropTarget(null); return; }
        await moveDocument(dragging, targetId);
        setDragging(null); setDropTarget(null);
    }, [dragging, isDescendant, moveDocument]);

    const rootDocs = documents.filter(d => !d.parent_id);
    const searchResults = search.trim() ? documents.filter(d => d.title.toLowerCase().includes(search.toLowerCase())) : null;
    const filteredByProject = projectFilter ? documents.filter(d => d.project_id === projectFilter) : null;
    const activeProjectName = projectFilter ? projects.find(p => p.id === projectFilter)?.name : null;

    return (
        <div className="mt-4 border-t border-border-subtle pt-3">
            {/* Header — also a root drop target when dragging */}
            <div
                className={cn("flex items-center justify-between px-3 mb-1 rounded-lg transition-colors", rootDropHover && "bg-brand/10 ring-2 ring-brand/30")}
                onDragOver={e => { if (!dragging) return; e.preventDefault(); e.stopPropagation(); setRootDropHover(true); }}
                onDragLeave={() => setRootDropHover(false)}
                onDrop={async e => { e.preventDefault(); e.stopPropagation(); if (dragging) { await moveDocument(dragging, null); setDragging(null); setDropTarget(null); } setRootDropHover(false); }}
            >
                <button
                    onClick={() => setExpanded(v => !v)}
                    className={cn("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors", rootDropHover ? "text-brand" : "text-muted hover:text-secondary")}
                >
                    <ChevronRight size={11} className={cn("transition-transform duration-200", expanded && "rotate-90")} />
                    {rootDropHover ? "↓ Soltar para tornar raiz" : "Documentos"}
                </button>
                <div className="flex items-center gap-0.5">
                    {projects.length > 0 && (
                        <div className="relative">
                            <button
                                ref={projectFilterBtnRef}
                                title="Filtrar por projeto"
                                className={cn('p-1 rounded-lg hover:bg-surface-0 transition-colors', projectFilter ? 'text-brand bg-brand/10' : 'text-muted hover:text-primary')}
                                onClick={e => {
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    setProjectDropdownPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - 224 - 8)) });
                                    setProjectDropdownOpen(v => !v);
                                }}
                            >
                                <FolderOpen size={13} />
                            </button>
                            {projectDropdownOpen && createPortal(
                                <div ref={projectDropdownRef} style={{ top: projectDropdownPos.top, left: projectDropdownPos.left }}
                                    className="fixed w-56 bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float z-[9999] py-1 overflow-hidden"
                                >
                                    <p className="px-3 py-1.5 text-[10px] font-black text-muted uppercase tracking-widest">Filtrar por projeto</p>
                                    <div className="border-t border-border-subtle" />
                                    <button onClick={() => { setProjectFilter(null); setProjectDropdownOpen(false); }}
                                        className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left', !projectFilter ? 'text-brand bg-brand/5 font-medium' : 'text-secondary hover:bg-surface-2')}
                                    >
                                        <FolderOpen size={13} className="shrink-0" /> Todos os documentos
                                    </button>
                                    {projects.map(p => (
                                        <button key={p.id} onClick={() => { setProjectFilter(p.id); setProjectDropdownOpen(false); }}
                                            className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left', projectFilter === p.id ? 'text-brand bg-brand/5 font-medium' : 'text-secondary hover:bg-surface-2')}
                                        >
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: (p as { color?: string }).color || '#888' }} />
                                            <span className="truncate">{p.name}</span>
                                        </button>
                                    ))}
                                </div>,
                                document.body
                            )}
                        </div>
                    )}
                    <button onClick={handleCreate} title="Nova página" aria-label="Nova página" className="p-1 rounded-lg hover:bg-surface-0 text-muted hover:text-primary transition-colors">
                        <FilePlus size={13} />
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="px-2">
                    {/* Search */}
                    <div className="relative mb-1.5">
                        <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            ref={searchRef}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full pl-6 pr-2 py-1 text-xs bg-surface-card border border-border-subtle rounded-lg outline-none focus:ring-2 focus:ring-brand/20"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-secondary">
                                <X size={10} />
                            </button>
                        )}
                    </div>

                    {/* Active project filter badge */}
                    {activeProjectName && (
                        <div className="flex items-center gap-1 bg-brand/8 text-brand rounded-lg px-2 py-0.5 mb-1.5">
                            <FolderOpen size={10} />
                            <span className="text-[11px] font-medium flex-1 truncate">{activeProjectName}</span>
                            <button onClick={() => setProjectFilter(null)} className="hover:text-brand/60"><X size={10} /></button>
                        </div>
                    )}

                    {/* Tree */}
                    <div className="space-y-0.5 max-h-64 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="space-y-1 px-1">
                                {[...Array(4)].map((_, i) => <div key={i} className="skeleton-pulse h-5 rounded" style={{ width: `${65 + i * 8}%` }} />)}
                            </div>
                        ) : searchResults ? (
                            searchResults.length === 0
                                ? <p className="text-xs text-muted px-2 py-2 text-center">Nenhum resultado</p>
                                : searchResults.map(doc => (
                                    <div key={doc.id} onClick={() => navigate(`/documentos/${doc.id}`)}
                                        className={cn('flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer text-sm transition-all', activeDocId === doc.id ? 'bg-brand/10 text-brand font-semibold' : 'text-secondary hover:bg-surface-0')}
                                    >
                                        <FileText size={12} className="shrink-0" />
                                        <span className="truncate text-xs">{doc.title || 'Sem título'}</span>
                                    </div>
                                ))
                        ) : filteredByProject ? (
                            filteredByProject.length === 0
                                ? <p className="text-xs text-muted px-2 py-2 text-center">Nenhum documento neste projeto</p>
                                : filteredByProject.map(doc => (
                                    <div key={doc.id} onClick={() => navigate(`/documentos/${doc.id}`)}
                                        className={cn('flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer text-sm transition-all', activeDocId === doc.id ? 'bg-brand/10 text-brand font-semibond' : 'text-secondary hover:bg-surface-0')}
                                    >
                                        <FileText size={12} className="shrink-0" />
                                        <span className="truncate text-xs">{doc.title || 'Sem título'}</span>
                                    </div>
                                ))
                        ) : rootDocs.length === 0 ? (
                            <button onClick={handleCreate}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted hover:text-secondary hover:bg-surface-0 transition-all border border-dashed border-border-subtle"
                            >
                                <Plus size={12} /> Criar primeira página
                            </button>
                        ) : (
                            rootDocs.map(doc => (
                                <DocTreeItem key={doc.id} doc={doc} allDocs={documents} depth={0}
                                    activeId={activeDocId} onSelect={id => navigate(`/documentos/${id}`)}
                                    onAddChild={handleAddChild} onDelete={handleDelete}
                                    dragging={dragging} dropTarget={dropTarget}
                                    onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                                />
                            ))
                        )}
                    </div>

                </div>
            )}
        </div>
    );
}
