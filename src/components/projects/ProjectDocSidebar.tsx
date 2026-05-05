import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, X, PanelLeftClose, PanelLeftOpen, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Document } from '../../store/documentStore';

// ─── DocTreeNode ───────────────────────────────────────────────────────
function DocTreeNode({ doc, allDocs, depth, onSelect, onOpenFull, activeDocId }: {
    doc: Document; allDocs: Document[]; depth: number;
    onSelect: (id: string) => void;
    onOpenFull: (id: string) => void;
    activeDocId: string | null;
}) {
    const [expanded, setExpanded] = useState(true);
    const children = allDocs.filter(d => d.parent_id === doc.id);
    const hasChildren = children.length > 0;
    const isActive = doc.id === activeDocId;

    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-1 pr-2 py-1 cursor-pointer group transition-colors rounded-lg text-sm",
                    isActive ? "bg-brand-light text-brand" : "hover:bg-surface-0"
                )}
                style={{ paddingLeft: `${6 + depth * 14}px` }}
            >
                <button
                    className="p-0.5 shrink-0 text-muted hover:text-secondary rounded"
                    onClick={e => { e.stopPropagation(); if (hasChildren) setExpanded(v => !v); }}
                >
                    {hasChildren
                        ? <ChevronRight size={12} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
                        : <span className="w-3 inline-block" />
                    }
                </button>
                <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => onSelect(doc.id)}>
                    <FileText size={13} className={cn("shrink-0 transition-colors", isActive ? "text-brand" : "text-muted group-hover:text-brand")} />
                    <span className={cn("flex-1 truncate leading-none py-0.5 transition-colors", isActive ? "text-brand font-medium" : "text-secondary group-hover:text-brand")}>
                        {doc.title || 'Sem título'}
                    </span>
                </div>
                <button
                    onClick={e => { e.stopPropagation(); onOpenFull(doc.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted hover:text-secondary transition-all shrink-0"
                    title="Abrir em tela cheia"
                >
                    <ExternalLink size={11} />
                </button>
            </div>
            {hasChildren && expanded && children.map(child => (
                <DocTreeNode key={child.id} doc={child} allDocs={allDocs} depth={depth + 1}
                    onSelect={onSelect} onOpenFull={onOpenFull} activeDocId={activeDocId} />
            ))}
        </div>
    );
}

// ─── ProjectDocSidebar ────────────────────────────────────────────────
interface ProjectDocSidebarProps {
    projectDocs: Document[];
    selectedDocId: string | null;
    showCollapseButton: boolean;
    onSelectDoc: (docId: string) => void;
    onCreateDoc: () => void;
    onCollapse: () => void;
}

export function ProjectDocSidebar({
    projectDocs, selectedDocId, showCollapseButton,
    onSelectDoc, onCreateDoc, onCollapse,
}: ProjectDocSidebarProps) {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [docSearch, setDocSearch] = useState('');

    const filteredDocs = docSearch.trim()
        ? projectDocs.filter(d => (d.title || '').toLowerCase().includes(docSearch.toLowerCase()))
        : null;
    const rootDocs = projectDocs.filter(d => !d.parent_id || !projectDocs.find(p => p.id === d.parent_id));

    const handleSelect = (docId: string) => {
        onSelectDoc(docId);
        setDocSearch('');
    };

    if (collapsed) {
        return (
            <div className="shrink-0 w-10 flex flex-col items-center gap-2 py-2.5 bg-surface-card border border-border-subtle rounded-card overflow-hidden">
                <button
                    onClick={() => setCollapsed(false)}
                    title="Expandir painel de documentos"
                    className="p-1.5 rounded text-muted hover:text-brand hover:bg-brand-light transition-colors"
                >
                    <PanelLeftOpen size={15} />
                </button>
                <FileText size={13} className="text-muted" />
            </div>
        );
    }

    return (
        <div className="shrink-0 w-64 flex flex-col bg-surface-card border border-border-subtle rounded-card overflow-hidden transition-all duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-subtle shrink-0">
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-muted" />
                    <span className="text-xs font-black uppercase tracking-widest text-muted">Documentos</span>
                    {projectDocs.length > 0 && (
                        <span className="text-[10px] font-bold bg-surface-0 border border-border-subtle text-muted px-1.5 py-0.5 rounded-full">
                            {projectDocs.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-0.5">
                    {showCollapseButton && (
                        <button
                            onClick={() => { setCollapsed(true); onCollapse(); }}
                            title="Recolher painel"
                            className="p-1 rounded text-muted hover:text-brand hover:bg-brand-light transition-colors"
                        >
                            <PanelLeftClose size={14} />
                        </button>
                    )}
                    <button
                        onClick={onCreateDoc}
                        title="Novo documento"
                        aria-label="Novo documento"
                        className="p-1 rounded text-muted hover:text-brand hover:bg-brand-light transition-colors"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="px-2 pt-2 pb-1 shrink-0">
                <div className="relative">
                    <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                        value={docSearch}
                        onChange={e => setDocSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') setDocSearch(''); }}
                        placeholder="Buscar documento..."
                        className="w-full pl-6 pr-6 py-1 text-xs bg-surface-0 border border-border-subtle rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/30"
                    />
                    {docSearch && (
                        <button onClick={() => setDocSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-secondary">
                            <X size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Doc list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {projectDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                        <FileText size={24} className="text-muted" />
                        <p className="text-xs text-muted">Nenhum documento ainda</p>
                        <button onClick={onCreateDoc} className="text-xs text-brand hover:underline">
                            Criar primeiro
                        </button>
                    </div>
                ) : filteredDocs ? (
                    filteredDocs.length === 0 ? (
                        <p className="text-xs text-muted text-center py-4">Nenhum resultado</p>
                    ) : filteredDocs.map(doc => (
                        <div
                            key={doc.id}
                            onClick={() => handleSelect(doc.id)}
                            className={cn(
                                'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors',
                                selectedDocId === doc.id ? 'bg-brand-light text-brand' : 'text-secondary hover:bg-surface-0 hover:text-brand'
                            )}
                        >
                            <FileText size={12} className="shrink-0 text-muted" />
                            <span className="truncate text-xs">{doc.title || 'Sem título'}</span>
                        </div>
                    ))
                ) : rootDocs.map(doc => (
                    <DocTreeNode
                        key={doc.id}
                        doc={doc}
                        allDocs={projectDocs}
                        depth={0}
                        onSelect={handleSelect}
                        onOpenFull={docId => navigate(`/documentos/${docId}`)}
                        activeDocId={selectedDocId}
                    />
                ))}
            </div>
        </div>
    );
}
