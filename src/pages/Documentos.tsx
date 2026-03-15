import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDocumentStore, type Document } from '../store/documentStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { Button } from '../components/ui/Button';
import { DocumentEditor } from '../components/documents/DocumentEditor';
import {
    FileText, Plus, ChevronRight, ChevronDown,
    Trash2, Inbox, Search, FilePlus
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
}: {
    doc: Document;
    allDocs: Document[];
    depth: number;
    activeId: string | undefined;
    onSelect: (id: string) => void;
    onAddChild: (parentId: string) => void;
    onDelete: (doc: Document) => void;
}) {
    const children = allDocs.filter(d => d.parent_id === doc.id);
    const [open, setOpen] = useState(depth === 0);
    const isActive = activeId === doc.id;

    return (
        <div>
            <div
                className={cn(
                    'group flex items-center gap-1 rounded-lg py-1 pr-1 cursor-pointer text-sm transition-all select-none',
                    isActive ? 'bg-brand/10 text-brand font-semibold' : 'text-secondary hover:bg-surface-0 hover:text-primary'
                )}
                style={{ paddingLeft: `${6 + depth * 14}px` }}
                onClick={() => onSelect(doc.id)}
            >
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
    const { documents, fetchDocuments, createDocument, createSubDocument, deleteDocument, loading } = useDocumentStore();

    const [search, setSearch] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeWorkspace) fetchDocuments(activeWorkspace.id);
    }, [activeWorkspace, fetchDocuments]);

    const handleCreate = useCallback(async () => {
        if (!activeWorkspace) return;
        const newDoc = await createDocument({
            workspace_id: activeWorkspace.id,
            title: 'Nova página',
            content: { type: 'doc', content: [] },
            project_id: null,
            folder_id: null,
            parent_id: null,
        });
        if (newDoc) navigate(`/documentos/${newDoc.id}`);
    }, [activeWorkspace, createDocument, navigate]);

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

    // Busca flat (todos os docs que batem com o search)
    const searchResults = search.trim()
        ? documents.filter(d => d.title.toLowerCase().includes(search.toLowerCase()))
        : null;

    return (
        <div className="h-full flex fade-in rounded-card overflow-hidden border border-border-subtle shadow-card bg-surface-card">
            {/* ── Sidebar de Páginas ── */}
            <div className="w-60 shrink-0 flex flex-col border-r border-border-subtle bg-surface-2/40 overflow-hidden">
                {/* Header */}
                <div className="px-3 pt-4 pb-2 flex items-center justify-between shrink-0">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-widest">Páginas</span>
                    <button
                        onClick={handleCreate}
                        title="Nova página (N)"
                        className="p-1 rounded-lg hover:bg-surface-0 text-muted hover:text-primary transition-colors"
                    >
                        <FilePlus size={15} />
                    </button>
                </div>

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

                {/* Tree / Search results */}
                <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
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
                    ) : rootDocs.length === 0 ? (
                        <button
                            onClick={handleCreate}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-muted hover:text-secondary hover:bg-surface-0 transition-all border border-dashed border-border-subtle mt-1"
                        >
                            <Plus size={13} /> Criar primeira página
                        </button>
                    ) : (
                        rootDocs.map(doc => (
                            <DocTreeItem
                                key={doc.id}
                                doc={doc}
                                allDocs={documents}
                                depth={0}
                                activeId={id}
                                onSelect={docId => navigate(`/documentos/${docId}`)}
                                onAddChild={handleAddChild}
                                onDelete={handleDelete}
                            />
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-3 py-3 border-t border-border-subtle shrink-0">
                    <Button size="sm" onClick={handleCreate} className="w-full gap-2 justify-center">
                        <Plus size={14} /> Nova página
                    </Button>
                </div>
            </div>

            {/* ── Área principal ── */}
            <div className="flex-1 overflow-hidden">
                {id ? (
                    <DocumentEditor
                        key={id}
                        documentId={id}
                        onClose={() => navigate('/documentos')}
                        onAddSubPage={handleAddChild}
                    />
                ) : (
                    <EmptyState onCreate={handleCreate} />
                )}
            </div>
        </div>
    );
}
