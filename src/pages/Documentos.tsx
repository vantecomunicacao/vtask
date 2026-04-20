import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import { useDocumentStore, type Document } from '../store/documentStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useProjectStore } from '../store/projectStore';
import { Button } from '../components/ui/Button';
import { DocumentEditor } from '../components/documents/DocumentEditor';
import {
    FileText, Plus, ChevronRight, ChevronDown,
    Trash2, Inbox, Search, FilePlus, GripVertical, FolderOpen, X,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Nó da árvore de documentos ──────────────────────────────────
function DocTreeItem({
    doc,
    allDocs,
    depth,
    activeId,
    onSelect,
    onAddChild,
    onDelete,
    dragging,
    dropTarget,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    isMobile,
}: {
    doc: Document;
    allDocs: Document[];
    depth: number;
    activeId: string | undefined;
    onSelect: (id: string) => void;
    onAddChild: (parentId: string) => void;
    onDelete: (doc: Document) => void;
    dragging: string | null;
    dropTarget: string | null;
    onDragStart: (id: string) => void;
    onDragOver: (id: string) => void;
    onDragLeave: () => void;
    onDrop: (targetId: string) => void;
    isMobile: boolean;
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
                style={{ paddingLeft: `${6 + depth * 14}px`, minHeight: isMobile ? '44px' : undefined }}
                draggable={true}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(doc.id); }}
                onDragEnd={() => onDragLeave()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragOver(doc.id); }}
                onDragLeave={(e) => { e.stopPropagation(); onDragLeave(); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(doc.id); }}
                onClick={() => onSelect(doc.id)}
            >
                {/* Drag handle */}
                <span
                    className="hidden group-hover:flex items-center text-muted/40 hover:text-muted cursor-grab shrink-0"
                    onMouseDown={e => e.stopPropagation()}
                >
                    <GripVertical size={12} />
                </span>

                {/* Expand toggle */}
                <button
                    className="p-0.5 shrink-0 text-muted hover:text-secondary rounded"
                    onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
                >
                    {children.length > 0
                        ? open ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                        : <span className="w-3 inline-block" />
                    }
                </button>

                <FileText size={13} className="shrink-0" />
                <span className="flex-1 truncate leading-none py-0.5">{doc.title || 'Sem título'}</span>

                {/* Hover actions */}
                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <button
                        title="Nova sub-página"
                        className="p-1 rounded hover:bg-surface-2 text-muted hover:text-secondary"
                        onClick={e => { e.stopPropagation(); onAddChild(doc.id); }}
                    >
                        <Plus size={11} />
                    </button>
                    <button
                        title="Excluir"
                        className="p-1 rounded hover:bg-red-50 text-muted hover:text-red-500"
                        onClick={e => { e.stopPropagation(); onDelete(doc); }}
                    >
                        <Trash2 size={11} />
                    </button>
                </div>
            </div>

            {open && children.map(child => (
                <DocTreeItem
                    key={child.id}
                    doc={child}
                    allDocs={allDocs}
                    depth={depth + 1}
                    activeId={activeId}
                    onSelect={onSelect}
                    onAddChild={onAddChild}
                    onDelete={onDelete}
                    dragging={dragging}
                    dropTarget={dropTarget}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    isMobile={isMobile}
                />
            ))}
        </div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 fade-in py-20">
            <div className="w-16 h-16 rounded-card bg-surface-0 flex items-center justify-center">
                <Inbox size={32} className="text-muted" />
            </div>
            <p className="text-secondary font-medium">Nenhum documento ainda</p>
            <Button size="sm" onClick={onCreate} className="gap-2 mt-1">
                <Plus size={14} /> Novo Documento
            </Button>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function Documentos() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { activeWorkspace } = useWorkspaceStore();
    const { documents, fetchDocuments, createDocument, createSubDocument, deleteDocument, moveDocument, loading } = useDocumentStore();
    const { projects, fetchProjects } = useProjectStore();

    const isMobile = useIsMobile();
    const [search, setSearch] = useState('');
    const [projectFilter, setProjectFilter] = useState<string | null>(null);
    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
    const [projectDropdownPos, setProjectDropdownPos] = useState({ top: 0, left: 0 });
    const projectFilterBtnRef = useRef<HTMLButtonElement>(null);
    const projectDropdownRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<string | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        if (activeWorkspace) {
            fetchDocuments(activeWorkspace.id);
            if (projects.length === 0) fetchProjects(activeWorkspace.id);
        }
    }, [activeWorkspace, fetchDocuments, fetchProjects, projects.length]);

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
        const hasChildren = documents.some(d => d.parent_id === doc.id);
        const msg = hasChildren
            ? `Excluir "${doc.title}" e todas as sub-páginas?`
            : `Excluir "${doc.title}"?`;
        if (window.confirm(msg)) {
            await deleteDocument(doc.id);
            if (id === doc.id) navigate('/documentos');
        }
    }, [documents, deleteDocument, id, navigate]);

    // ─── Drag-and-drop helpers ────────────────────────────────────
    const isDescendant = useCallback((nodeId: string, ancestorId: string): boolean => {
        const node = documents.find(d => d.id === nodeId);
        if (!node?.parent_id) return false;
        if (node.parent_id === ancestorId) return true;
        return isDescendant(node.parent_id, ancestorId);
    }, [documents]);

    const handleDragStart = useCallback((id: string) => {
        setDragging(id);
        setDropTarget(null);
    }, []);

    const handleDragOver = useCallback((targetId: string) => {
        if (!dragging || targetId === dragging) return;
        if (isDescendant(targetId, dragging)) return;
        setDropTarget(targetId);
    }, [dragging, isDescendant]);

    const handleDragLeave = useCallback(() => {
        setDropTarget(null);
    }, []);

    const handleDrop = useCallback(async (targetId: string) => {
        if (!dragging || dragging === targetId) { setDragging(null); setDropTarget(null); return; }
        if (isDescendant(targetId, dragging)) { setDragging(null); setDropTarget(null); return; }
        await moveDocument(dragging, targetId);
        setDragging(null);
        setDropTarget(null);
    }, [dragging, isDescendant, moveDocument]);

    const handleRootDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        if (!dragging) return;
        await moveDocument(dragging, null);
        setDragging(null);
        setDropTarget(null);
    }, [dragging, moveDocument]);

    // Keyboard shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
            if (e.key === 'n' || e.key === 'N') { e.preventDefault(); handleCreate(); }
            if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [handleCreate]);

    // Docs raiz (sem pai)
    const rootDocs = documents.filter(d => !d.parent_id);

    // Busca flat
    const searchResults = search.trim()
        ? documents.filter(d => d.title.toLowerCase().includes(search.toLowerCase()))
        : null;

    // Filtro por projeto (flat list)
    const filteredByProject = projectFilter
        ? documents.filter(d => d.project_id === projectFilter)
        : null;

    const activeProjectName = projectFilter
        ? projects.find(p => p.id === projectFilter)?.name
        : null;

    return (
        <div className="h-full flex fade-in rounded-card overflow-hidden border border-border-subtle shadow-card bg-surface-card">
            {/* ── Sidebar de Páginas — oculta no mobile quando editor está aberto ── */}
            {(!isMobile || !id) && (
            <div className={cn("shrink-0 flex flex-col border-r border-border-subtle bg-surface-2/40 overflow-hidden", isMobile ? "w-full" : "w-60")}>
                {/* Header */}
                <div className="px-3 pt-4 pb-2 flex items-center justify-between shrink-0">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-widest">Páginas</span>
                    <div className="flex items-center gap-1">
                        {/* Project filter button */}
                        {projects.length > 0 && (
                            <div className="relative group/filter">
                                <button
                                    ref={projectFilterBtnRef}
                                    title="Filtrar por projeto"
                                    className={cn(
                                        'rounded-lg hover:bg-surface-0 transition-colors',
                                        isMobile ? 'p-3' : 'p-1',
                                        projectFilter ? 'text-brand bg-brand/10' : 'text-muted hover:text-primary'
                                    )}
                                    onClick={e => {
                                        if (isMobile) {
                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                            setProjectDropdownPos({
                                                top: rect.bottom + 4,
                                                left: Math.max(8, Math.min(rect.left, window.innerWidth - 224 - 8)),
                                            });
                                            setProjectDropdownOpen(v => !v);
                                        }
                                    }}
                                >
                                    <FolderOpen size={isMobile ? 18 : 14} />
                                </button>

                                {/* Desktop: native select overlay */}
                                {!isMobile && (
                                    <select
                                        value={projectFilter || ''}
                                        onChange={e => setProjectFilter(e.target.value || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        title="Filtrar por projeto"
                                    >
                                        <option value="">Todos os documentos</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                )}

                                {/* Mobile: custom dropdown via portal */}
                                {isMobile && projectDropdownOpen && createPortal(
                                    <div
                                        ref={projectDropdownRef}
                                        style={{ top: projectDropdownPos.top, left: projectDropdownPos.left }}
                                        className="fixed w-56 bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float z-[9999] py-1 overflow-hidden"
                                    >
                                        <p className="px-3 py-1.5 text-[10px] font-black text-muted uppercase tracking-widest">Filtrar por projeto</p>
                                        <div className="border-t border-border-subtle" />
                                        <button
                                            onClick={() => { setProjectFilter(null); setProjectDropdownOpen(false); }}
                                            className={cn(
                                                'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left',
                                                !projectFilter ? 'text-brand bg-brand/5 font-medium' : 'text-secondary hover:bg-surface-2'
                                            )}
                                        >
                                            <FolderOpen size={14} className="shrink-0" />
                                            Todos os documentos
                                        </button>
                                        {projects.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => { setProjectFilter(p.id); setProjectDropdownOpen(false); }}
                                                className={cn(
                                                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left',
                                                    projectFilter === p.id ? 'text-brand bg-brand/5 font-medium' : 'text-secondary hover:bg-surface-2'
                                                )}
                                            >
                                                <span
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: (p as { color?: string }).color || '#888' }}
                                                />
                                                <span className="truncate">{p.name}</span>
                                            </button>
                                        ))}
                                    </div>,
                                    document.body
                                )}
                            </div>
                        )}
                        <button
                            onClick={handleCreate}
                            title="Nova página (N)"
                            className={cn(
                                'rounded-lg hover:bg-surface-0 text-muted hover:text-primary transition-colors',
                                isMobile ? 'p-3' : 'p-1'
                            )}
                        >
                            <FilePlus size={isMobile ? 18 : 15} />
                        </button>
                    </div>
                </div>

                {/* Active project filter badge */}
                {activeProjectName && (
                    <div className="px-3 pb-1.5 shrink-0">
                        <div className="flex items-center gap-1.5 bg-brand/8 text-brand rounded-lg px-2 py-1">
                            <FolderOpen size={11} />
                            <span className="text-[11px] font-medium flex-1 truncate">{activeProjectName}</span>
                            <button
                                onClick={() => setProjectFilter(null)}
                                className="hover:text-brand/60"
                            >
                                <X size={11} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="px-3 pb-2 shrink-0">
                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            ref={searchRef}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full pl-7 pr-3 py-1.5 text-xs bg-surface-card border border-border-subtle rounded-lg outline-none focus:ring-2 focus:ring-brand/20"
                        />
                    </div>
                </div>

                {/* Tree / Search / Filter results */}
                <div
                    className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar"
                    onDragOver={dragging && !dropTarget ? (e) => e.preventDefault() : undefined}
                    onDrop={dragging ? handleRootDrop : undefined}
                >
                    {loading ? (
                        <div className="space-y-1 px-1 pt-1">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="skeleton-pulse h-6 rounded-lg" style={{ width: `${70 + i * 5}%` }} />
                            ))}
                        </div>
                    ) : searchResults ? (
                        searchResults.length === 0 ? (
                            <p className="text-xs text-muted px-2 py-4 text-center">Nenhum resultado</p>
                        ) : (
                            searchResults.map(doc => (
                                <div
                                    key={doc.id}
                                    onClick={() => navigate(`/documentos/${doc.id}`)}
                                    className={cn(
                                        'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-all',
                                        id === doc.id ? 'bg-brand/10 text-brand font-semibold' : 'text-secondary hover:bg-surface-0'
                                    )}
                                >
                                    <FileText size={13} className="shrink-0" />
                                    <span className="truncate">{doc.title || 'Sem título'}</span>
                                </div>
                            ))
                        )
                    ) : filteredByProject ? (
                        filteredByProject.length === 0 ? (
                            <div className="py-4 text-center">
                                <p className="text-xs text-muted">Nenhum documento neste projeto</p>
                                <button
                                    onClick={handleCreate}
                                    className="mt-2 text-xs text-brand hover:underline"
                                >
                                    Criar documento vinculado
                                </button>
                            </div>
                        ) : (
                            filteredByProject.map(doc => (
                                <div
                                    key={doc.id}
                                    onClick={() => navigate(`/documentos/${doc.id}`)}
                                    className={cn(
                                        'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-all',
                                        id === doc.id ? 'bg-brand/10 text-brand font-semibold' : 'text-secondary hover:bg-surface-0'
                                    )}
                                >
                                    <FileText size={13} className="shrink-0" />
                                    <span className="flex-1 truncate">{doc.title || 'Sem título'}</span>
                                </div>
                            ))
                        )
                    ) : rootDocs.length === 0 ? (
                        <button
                            onClick={handleCreate}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-muted hover:text-secondary hover:bg-surface-0 transition-all border border-dashed border-border-subtle mt-1"
                        >
                            <Plus size={13} /> Criar primeira página
                        </button>
                    ) : (
                        <>
                            {rootDocs.map(doc => (
                                <DocTreeItem
                                    key={doc.id}
                                    doc={doc}
                                    allDocs={documents}
                                    depth={0}
                                    activeId={id}
                                    onSelect={docId => navigate(`/documentos/${docId}`)}
                                    onAddChild={handleAddChild}
                                    onDelete={handleDelete}
                                    dragging={dragging}
                                    dropTarget={dropTarget}
                                    onDragStart={handleDragStart}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    isMobile={isMobile}
                                />
                            ))}
                            {/* Root drop zone — shown while dragging */}
                            {dragging && (
                                <div
                                    className="mt-2 p-2 rounded-lg border-2 border-dashed border-brand/30 text-[11px] text-brand/60 text-center transition-colors hover:border-brand/60 hover:text-brand"
                                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropTarget(null); }}
                                    onDrop={async (e) => { e.preventDefault(); e.stopPropagation(); await handleRootDrop(e); }}
                                >
                                    Soltar aqui para nível raiz
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-3 py-3 border-t border-border-subtle shrink-0">
                    <Button size="sm" onClick={handleCreate} className="w-full gap-2 justify-center">
                        <Plus size={14} /> Nova página
                    </Button>
                </div>
            </div>
            )}

            {/* ── Área principal — oculta no mobile quando nenhum doc selecionado ── */}
            {(!isMobile || !!id) && (
            <div className="flex-1 overflow-hidden">
                {id ? (
                    <DocumentEditor
                        key={id}
                        documentId={id}
                        onClose={() => navigate('/documentos')}
                        onAddSubPage={handleAddChild}
                        isMobile={isMobile}
                    />
                ) : (
                    <EmptyState onCreate={handleCreate} />
                )}
            </div>
            )}
        </div>
    );
}
