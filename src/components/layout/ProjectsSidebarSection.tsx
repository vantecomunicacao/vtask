import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import {
    ChevronDown, ChevronRight, FolderPlus, Folder, FolderOpen,
    MoreHorizontal, Pencil, Trash2, Archive, X, Check,
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useProjectFolderStore } from '../../store/projectFolderStore';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface Props {
    projectsExpanded: boolean;
    setProjectsExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
}

interface MenuAnchor {
    id: string;
    top: number;
    left: number;
}

export function ProjectsSidebarSection({ projectsExpanded, setProjectsExpanded }: Props) {
    const { projects, moveToFolder } = useProjectStore();
    const { folders, fetchFolders, createFolder, renameFolder, deleteFolder } = useProjectFolderStore();
    const { activeWorkspace } = useWorkspaceStore();

    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('fd_expanded_project_folders');
            return saved ? new Set(JSON.parse(saved)) : new Set<string>();
        } catch { return new Set<string>(); }
    });

    const [creatingFolder, setCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameName, setRenameName] = useState('');
    const [folderMenu, setFolderMenu] = useState<MenuAnchor | null>(null);
    const [projectMenu, setProjectMenu] = useState<MenuAnchor | null>(null);

    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeWorkspace) fetchFolders(activeWorkspace.id);
    }, [activeWorkspace, fetchFolders]);

    useEffect(() => {
        localStorage.setItem('fd_expanded_project_folders', JSON.stringify([...expandedFolders]));
    }, [expandedFolders]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // fecha se clicar fora de qualquer menu portal
            if (!target.closest('[data-sidebar-menu]')) {
                setFolderMenu(null);
                setProjectMenu(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const openFolderMenu = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (folderMenu?.id === id) { setFolderMenu(null); return; }
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setFolderMenu({ id, top: rect.bottom + 4, left: rect.left });
        setProjectMenu(null);
    };

    const openProjectMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (projectMenu?.id === id) { setProjectMenu(null); return; }
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        // abre à esquerda do botão para não sair da tela
        setProjectMenu({ id, top: rect.bottom + 4, left: rect.right - 176 });
        setFolderMenu(null);
    };

    const toggleFolder = (id: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const activeProjects = projects.filter(p => p.status === 'active');
    const archivedCount = projects.filter(p => p.status === 'archived' || p.status === 'completed').length;
    const rootProjects = activeProjects.filter(p => !p.folder_id);
    const folderProjects = (folderId: string) => activeProjects.filter(p => p.folder_id === folderId);

    const handleDragEnd = (result: DropResult) => {
        const { draggableId, destination } = result;
        if (!destination) return;
        moveToFolder(draggableId, destination.droppableId === 'root' ? null : destination.droppableId);
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || !activeWorkspace) return;
        const folder = await createFolder(newFolderName.trim(), activeWorkspace.id);
        if (folder) setExpandedFolders(prev => new Set([...prev, folder.id]));
        setNewFolderName('');
        setCreatingFolder(false);
    };

    const handleRename = async (id: string) => {
        if (renameName.trim()) await renameFolder(id, renameName.trim());
        setRenamingId(null);
    };

    const projectNavClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-[var(--radius-md)] transition-colors flex-1 min-w-0 ${isActive ? 'text-brand bg-brand-light' : 'text-secondary hover:bg-surface-0'}`;

    const rootNavClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-[var(--radius-md)] transition-colors flex-1 min-w-0 ${isActive ? 'text-brand bg-brand-light' : 'text-secondary hover:bg-surface-0'}`;

    // Folder menu — rendered via portal
    const folderMenuPortal = folderMenu && createPortal(
        <div
            data-sidebar-menu
            style={{ position: 'fixed', top: folderMenu.top, left: folderMenu.left, zIndex: 9999 }}
            className="bg-surface-card border border-border-subtle rounded-lg shadow-float py-1 w-36"
        >
            <button
                onClick={() => { setFolderMenu(null); setRenamingId(folderMenu.id); setRenameName(folders.find(f => f.id === folderMenu.id)?.name ?? ''); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-secondary hover:bg-surface-0"
            >
                <Pencil size={11} /> Renomear
            </button>
            <button
                onClick={async () => { setFolderMenu(null); await deleteFolder(folderMenu.id); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
            >
                <Trash2 size={11} /> Excluir pasta
            </button>
        </div>,
        document.body
    );

    // Project menu — rendered via portal
    const currentProjectInFolder = projectMenu ? activeProjects.find(p => p.id === projectMenu.id) : null;
    const projectMenuPortal = projectMenu && createPortal(
        <div
            data-sidebar-menu
            style={{ position: 'fixed', top: projectMenu.top, left: projectMenu.left, zIndex: 9999 }}
            className="bg-surface-card border border-border-subtle rounded-lg shadow-float py-1 w-44"
        >
            {currentProjectInFolder?.folder_id ? (
                <button
                    onClick={async () => { setProjectMenu(null); await moveToFolder(projectMenu.id, null); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-secondary hover:bg-surface-0"
                >
                    <X size={11} /> Remover da pasta
                </button>
            ) : (
                <>
                    <p className="px-3 py-1 text-[10px] text-muted uppercase tracking-wider font-bold">Mover para</p>
                    {folders.map(f => (
                        <button
                            key={f.id}
                            onClick={async () => { setProjectMenu(null); await moveToFolder(projectMenu.id, f.id); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-secondary hover:bg-surface-0"
                        >
                            <Folder size={11} /> {f.name}
                        </button>
                    ))}
                </>
            )}
        </div>,
        document.body
    );

    return (
        <div className="mt-6" ref={sectionRef}>
            {folderMenuPortal}
            {projectMenuPortal}

            {/* Section header */}
            <div className="flex items-center gap-1 px-3 mb-1 group">
                <button
                    onClick={() => setProjectsExpanded(v => !v)}
                    className="flex items-center gap-1 flex-1 text-left"
                >
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Projetos Ativos</span>
                    {projectsExpanded
                        ? <ChevronDown size={12} className="text-gray-400 ml-1" />
                        : <ChevronRight size={12} className="text-gray-400 ml-1" />}
                </button>
                {projectsExpanded && (
                    <button
                        onClick={() => setCreatingFolder(true)}
                        title="Nova pasta"
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-2 text-gray-400 hover:text-secondary transition-all"
                    >
                        <FolderPlus size={13} />
                    </button>
                )}
            </div>

            {projectsExpanded && (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="space-y-0.5">

                        {/* Inline folder creation */}
                        {creatingFolder && (
                            <div className="flex items-center gap-1 px-2 py-1">
                                <input
                                    autoFocus
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleCreateFolder();
                                        if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); }
                                    }}
                                    placeholder="Nome da pasta"
                                    className="flex-1 text-xs px-2 py-1 rounded border border-brand/40 bg-surface-0 outline-none"
                                />
                                <button onClick={handleCreateFolder} className="p-1 text-brand hover:bg-brand-light rounded transition-colors">
                                    <Check size={12} />
                                </button>
                                <button onClick={() => { setCreatingFolder(false); setNewFolderName(''); }} className="p-1 text-muted hover:bg-surface-2 rounded transition-colors">
                                    <X size={12} />
                                </button>
                            </div>
                        )}

                        {/* Folders */}
                        {folders.map(folder => {
                            const fps = folderProjects(folder.id);
                            const isExpanded = expandedFolders.has(folder.id);

                            return (
                                <div key={folder.id}>
                                    <div
                                        className="flex items-center gap-1 px-2 py-1.5 rounded-[var(--radius-md)] hover:bg-surface-0 group/folder cursor-pointer select-none"
                                        onClick={() => toggleFolder(folder.id)}
                                    >
                                        <ChevronRight
                                            size={14}
                                            className={`text-muted transition-transform duration-150 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                                        />
                                        {isExpanded
                                            ? <FolderOpen size={18} className="text-muted shrink-0" />
                                            : <Folder size={18} className="text-muted shrink-0" />}

                                        {renamingId === folder.id ? (
                                            <input
                                                autoFocus
                                                value={renameName}
                                                onChange={e => setRenameName(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                                onKeyDown={e => {
                                                    e.stopPropagation();
                                                    if (e.key === 'Enter') handleRename(folder.id);
                                                    if (e.key === 'Escape') setRenamingId(null);
                                                }}
                                                onBlur={() => handleRename(folder.id)}
                                                className="flex-1 text-xs px-1 py-0.5 rounded border border-brand/40 bg-surface-0 outline-none"
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-secondary flex-1 truncate">
                                                {folder.name}
                                                {!isExpanded && fps.length > 0 && (
                                                    <span className="text-muted ml-1 font-normal">({fps.length})</span>
                                                )}
                                            </span>
                                        )}

                                        <button
                                            data-sidebar-menu
                                            onClick={e => openFolderMenu(e, folder.id)}
                                            className="opacity-0 group-hover/folder:opacity-100 p-0.5 rounded hover:bg-surface-2 text-muted transition-all shrink-0"
                                        >
                                            <MoreHorizontal size={12} />
                                        </button>
                                    </div>

                                    {isExpanded && (
                                        <Droppable droppableId={folder.id}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    className={`ml-4 pl-2 border-l border-border-subtle space-y-0.5 min-h-[4px] rounded-r-sm transition-colors ${snapshot.isDraggingOver ? 'bg-brand/5 border-brand/30' : ''}`}
                                                >
                                                    {fps.length === 0 && !snapshot.isDraggingOver && (
                                                        <p className="px-2 py-1.5 text-xs text-muted italic">Arraste projetos aqui</p>
                                                    )}
                                                    {fps.map((p, index) => (
                                                        <Draggable key={p.id} draggableId={p.id} index={index}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className={`group/proj flex items-center ${snapshot.isDragging ? 'opacity-60' : ''}`}
                                                                >
                                                                    <NavLink to={`/projetos/${p.id}`} className={projectNavClass}>
                                                                        <span style={p.color ? { color: p.color } : { color: '#9ca3af' }} className="font-bold">#</span>
                                                                        <span className="truncate">{p.name}</span>
                                                                    </NavLink>
                                                                    <button
                                                                        data-sidebar-menu
                                                                        onClick={e => openProjectMenu(e, p.id)}
                                                                        className="opacity-0 group-hover/proj:opacity-100 p-0.5 mr-1 rounded hover:bg-surface-2 text-muted transition-all shrink-0"
                                                                    >
                                                                        <MoreHorizontal size={12} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    )}
                                </div>
                            );
                        })}

                        {/* Root projects */}
                        <Droppable droppableId="root">
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`space-y-0.5 min-h-[4px] rounded-md transition-colors ${snapshot.isDraggingOver ? 'bg-brand/5' : ''}`}
                                >
                                    {rootProjects.length === 0 && folders.length > 0 && !snapshot.isDraggingOver && (
                                        <p className="px-3 py-1.5 text-xs text-muted italic">Sem projetos fora de pastas</p>
                                    )}
                                    {rootProjects.length === 0 && folders.length === 0 && (
                                        <p className="px-3 py-2 text-xs text-muted">Nenhum projeto ativo.</p>
                                    )}
                                    {rootProjects.map((p, index) => (
                                        <Draggable key={p.id} draggableId={p.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`group/proj flex items-center ${snapshot.isDragging ? 'opacity-60' : ''}`}
                                                >
                                                    <NavLink to={`/projetos/${p.id}`} className={rootNavClass}>
                                                        <span style={p.color ? { color: p.color } : { color: '#9ca3af' }} className="font-bold">#</span>
                                                        <span className="truncate">{p.name}</span>
                                                    </NavLink>
                                                    {folders.length > 0 && (
                                                        <button
                                                            data-sidebar-menu
                                                            onClick={e => openProjectMenu(e, p.id)}
                                                            className="opacity-0 group-hover/proj:opacity-100 p-0.5 mr-1 rounded hover:bg-surface-2 text-muted transition-all shrink-0"
                                                        >
                                                            <MoreHorizontal size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>

                        {/* Archived link */}
                        {archivedCount > 0 && (
                            <NavLink
                                to="/arquivados"
                                className={({ isActive }) => `flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] transition-colors mt-1 ${isActive ? 'text-brand bg-brand-light' : 'text-muted hover:bg-surface-0 hover:text-secondary'}`}
                            >
                                <Archive size={12} />
                                <span>{archivedCount} arquivado{archivedCount !== 1 ? 's' : ''}</span>
                            </NavLink>
                        )}
                    </div>
                </DragDropContext>
            )}
        </div>
    );
}
