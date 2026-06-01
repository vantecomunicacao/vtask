import { useEditor, EditorContent } from '@tiptap/react';
import { createPortal } from 'react-dom';
import { BubbleMenu } from '@tiptap/react/menus';
import { useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useDocumentEditorState } from '../../hooks/useDocumentEditorState';
import './tiptap-editor.css';
import { useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../../store/documentStore';
import { useProjectStore } from '../../store/projectStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
import { EditorToolbar, HighlightSwatches, BlockquotePicker } from '../ui/EditorToolbar';
import { TableBubbleMenu } from './TableBubbleMenu';
import { createEditorExtensions } from '../../lib/editorExtensions';
import {
    Save, Trash2, FileText, Plus, FolderOpen,
    History, Download, ChevronDown, ChevronRight, Check, ChevronLeft,
    BookOpen, Bold, Italic, Strikethrough, Link as LinkIcon,
    Highlighter, Palette, Quote, Eraser,
} from 'lucide-react';
import { cn } from '../../lib/utils';
const VersionHistoryPanel = lazy(() => import('./VersionHistoryPanel').then(m => ({ default: m.VersionHistoryPanel })));
import type { DocumentVersion } from '../../store/documentStore';

function PickerPortal({ pos, children }: { pos: { top: number; left: number }; children: React.ReactNode }) {
    return createPortal(
        <div data-picker style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}>
            {children}
        </div>,
        document.body
    );
}

// ─── Props ────────────────────────────────────────────────────────
interface DocumentEditorProps {
    documentId: string;
    onClose: () => void;
    onAddSubPage?: (parentId: string) => void;
    isMobile?: boolean;
}

export function DocumentEditor({ documentId, onClose, onAddSubPage, isMobile = false }: DocumentEditorProps) {
    const navigate = useNavigate();
    const { documents, updateDocument, deleteDocument, restoreDocument, uploadImage, uploadPdf, saveVersion, restoreVersion } = useDocumentStore();
    const { projects, fetchProjects } = useProjectStore();
    const { activeWorkspace } = useWorkspaceStore();
    const doc = documents.find(d => d.id === documentId);
    const subPages = documents.filter(d => d.parent_id === documentId);

    // ─── UI state ─────────────────────────────────────────────────
    const {
        title, setTitle,
        saving, setSaving,
        wordCount, setWordCount,
        showVersionPanel, setShowVersionPanel,
        pageViewMode, setPageViewMode,
        projectDropdownOpen, setProjectDropdownOpen,
        highlightPickerOpen, setHighlightPickerOpen,
        blockquotePickerOpen, setBlockquotePickerOpen,
        highlightPickerPos, setHighlightPickerPos,
        blockquotePickerPos, setBlockquotePickerPos,
    } = useDocumentEditorState(doc?.title ?? '');

    // ─── Refs (evitam stale closures sem recriar o editor) ────────
    const projectDropdownRef = useRef<HTMLDivElement>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const handleSaveRef = useRef<() => void>(() => {});
    const handleFileUploadRef = useRef<(file: File) => void>(() => {});
    const loadedDocIdRef = useRef<string | null>(null);
    const savingRef = useRef(false);
    const documentsRef = useRef(documents);
    useEffect(() => { documentsRef.current = documents; }, [documents]);

    // Fecha dropdowns ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
                setProjectDropdownOpen(false);
            }
            const target = e.target as HTMLElement;
            if (!target.closest('[data-picker]') && !target.closest('[data-picker-btn]')) {
                setHighlightPickerOpen(null);
                setBlockquotePickerOpen(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Carrega projetos uma vez por workspace
    const fetchedProjectsForRef = useRef<string | null>(null);
    useEffect(() => {
        if (activeWorkspace && fetchedProjectsForRef.current !== activeWorkspace.id) {
            fetchedProjectsForRef.current = activeWorkspace.id;
            fetchProjects(activeWorkspace.id);
        }
    }, [activeWorkspace, fetchProjects]);

    // Ref de upload estável para editorProps (paste/drop) sem recriar o editor
    const handleFileUpload = useCallback(async (file: File) => {
        handleFileUploadRef.current(file);
    }, []);

    // ─── Editor ───────────────────────────────────────────────────
    const editor = useEditor({
        extensions: createEditorExtensions({
            documentsRef,
            placeholder: 'Digite "/" para comandos ou comece a escrever...',
            currentDocId: documentId,
            includePageBreak: true,
        }),
        content: (doc?.content as any) || '',
        onUpdate: ({ editor: e }) => {
            const text = e.getText();
            setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => handleSaveRef.current(), 1500);
        },
        editorProps: {
            handlePaste: (_, event) => {
                const imageItem = Array.from(event.clipboardData?.items || []).find(i => i.type.startsWith('image'));
                if (imageItem) {
                    const file = imageItem.getAsFile();
                    if (file) { event.preventDefault(); handleFileUpload(file); return true; }
                }
                return false;
            },
            handleDrop: (view, event, __, moved) => {
                if (!moved && event.dataTransfer?.files?.[0]) {
                    const file = event.dataTransfer.files[0];
                    if (file.type.startsWith('image')) { event.preventDefault(); handleFileUpload(file); return true; }
                    if (file.type === 'application/pdf') {
                        event.preventDefault();
                        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
                        if (coords) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const sel = (view.state.selection.constructor as any).near(view.state.doc.resolve(coords.pos));
                            view.dispatch(view.state.tr.setSelection(sel));
                        }
                        window.dispatchEvent(new CustomEvent('editor-upload-pdf', { detail: { file } }));
                        return true;
                    }
                }
                return false;
            },
        },
    });

    // Mantém ref de upload sempre atualizada com editor atual
    useEffect(() => {
        handleFileUploadRef.current = async (file: File) => {
            if (!editor) return;
            const url = await uploadImage(file);
            if (url) editor.chain().focus().setImage({ src: url }).run();
        };
    }, [editor, uploadImage]);

    // Carrega conteúdo só quando o doc ID muda — evita sobrescrever edições do usuário
    useEffect(() => {
        if (!doc || !editor) return;
        if (loadedDocIdRef.current === doc.id) return;
        loadedDocIdRef.current = doc.id;
        setTitle(doc.title);
        editor.commands.setContent((doc.content as any) || '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, doc?.id]);

    // Upload via evento do SlashCommands
    useEffect(() => {
        const handler = (e: any) => { if (e.detail?.file) handleFileUpload(e.detail.file); };
        window.addEventListener('editor-upload-image', handler);
        return () => window.removeEventListener('editor-upload-image', handler);
    }, [handleFileUpload]);

    // Upload de PDF via evento do SlashCommands
    useEffect(() => {
        if (!editor) return;
        const handler = async (e: Event) => {
            const file = (e as CustomEvent<{ file: File }>).detail?.file;
            if (!file) return;
            const result = await uploadPdf(file);
            if ('error' in result) {
                import('sonner').then(({ toast }) => toast.error(result.error));
                return;
            }
            editor.chain().focus().insertContent({
                type: 'pdfAttachment',
                attrs: { label: result.name, url: result.url },
            }).run();
        };
        window.addEventListener('editor-upload-pdf', handler);
        return () => window.removeEventListener('editor-upload-pdf', handler);
    }, [editor, uploadPdf]);

    // ─── Salvar ───────────────────────────────────────────────────
    const handleSave = useCallback(async (isManual = false) => {
        if (!editor || savingRef.current) return;
        savingRef.current = true;
        setSaving(true);
        try {
            const content = editor.getJSON() as any;
            await updateDocument(documentId, { title, content });
            if (isManual) await saveVersion(documentId, title, content);
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }, [editor, title, documentId, updateDocument, saveVersion]);

    useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

    // Ctrl+S → salva manualmente (cria versão)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(true); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleSave]);

    // ─── Estilos comuns de impressão ─────────────────────────────
    const escapeHtml = (str: string) =>
        str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const buildPrintHTML = useCallback((docTitle: string, html: string, autoprint = false) => {
        const safeTitle = escapeHtml(docTitle);
        const contentStyles = `
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; box-sizing: border-box; }
            body { font-family: "Figtree", ui-sans-serif, system-ui, sans-serif;
                   color: #1c1a18; font-size: 16px; line-height: 1.6; margin: 0; }
            h1 { font-size: 2.25rem; font-weight: 800; margin: 1.5rem 0 0.5rem; color: #1c1a18; }
            h2 { font-size: 1.6rem; font-weight: 700; margin: 1.25rem 0 0.4rem; color: #1c1a18; }
            h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.35rem; color: #1c1a18; }
            p  { margin-bottom: 0.5rem; }
            ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.75rem 0; }
            ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.75rem 0; }
            li { margin-bottom: 0.25rem; }
            table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; }
            td, th { border: 1px solid #e8e5e0; padding: 8px 12px; text-align: left; }
            th { background: #f5f3ef !important; font-weight: 600; font-size: 0.875rem; }
            pre { background: #1c1a18 !important; color: #f5f3ef !important; padding: 1rem 1.25rem;
                  border-radius: 8px; overflow-x: auto; font-size: 0.875rem;
                  font-family: monospace; line-height: 1.6; }
            code:not(pre code) { background: #ece9e4 !important; color: #db4035 !important; padding: 0.1em 0.35em;
                                 border-radius: 4px; font-size: 0.875em; }
            blockquote { border-left: 3px solid #db4035; padding: 0.75rem 1rem;
                         background: #fdf3f2 !important; margin: 1.5rem 0; font-style: italic; color: #6b6860; }
            mark { padding: 0.1em 0.2em; border-radius: 3px; }
            img { max-width: 100%; height: auto; border-radius: 6px; }
            hr { border: none; border-top: 1px solid #e8e5e0; margin: 1.5rem 0; }
            div[data-page-break] { page-break-after: always; break-after: page; height: 0; margin: 0; padding: 0; border: none; }
        `;

        const previewBar = autoprint ? '' : `
            <div id="preview-bar">
                <span class="doc-title">${safeTitle}</span>
                <button onclick="window.print()">⬇ Baixar PDF / Imprimir</button>
                <button class="close-btn" onclick="window.close()">Fechar</button>
            </div>`;

        const previewStyles = autoprint ? `
            body { width: 210mm; margin: 20mm auto; padding: 0; }
            @media print { body { margin: 0; padding: 10mm 20mm; width: 100%; } }
        ` : `
            html { background: #e8e5e0; min-height: 100%; }
            body { width: 210mm; margin: 80px auto 60px; padding: 20mm; background: white;
                   box-shadow: 0 4px 24px rgba(0,0,0,0.18); }
            #preview-bar { position: fixed; top: 0; left: 0; right: 0; height: 52px; background: #1c1a18;
                display: flex; align-items: center; justify-content: space-between;
                padding: 0 24px; z-index: 999;
                font-family: ui-sans-serif, system-ui, sans-serif; gap: 12px; }
            #preview-bar .doc-title { color: rgba(255,255,255,0.6); font-size: 13px;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
            #preview-bar button { background: #db4035; color: white; border: none; padding: 7px 16px;
                border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; white-space: nowrap; }
            #preview-bar button:hover { background: #c0392b; }
            #preview-bar .close-btn { background: transparent; color: rgba(255,255,255,0.55); }
            #preview-bar .close-btn:hover { background: rgba(255,255,255,0.1); color: white; }
            @media print {
                #preview-bar { display: none !important; }
                html { background: white; padding: 0; }
                body { width: 100%; margin: 0; padding: 0; box-shadow: none; }
            }
        `;

        return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <style>${contentStyles}${previewStyles}</style>
</head>
<body>
  ${previewBar}
  <h1 style="border-bottom:2px solid #e8e5e0;padding-bottom:0.5rem;margin-bottom:1.5rem;">${safeTitle}</h1>
  ${html}
  ${autoprint ? '<script>window.onload=()=>{window.print();window.close();}<\/script>' : ''}
</body>
</html>`;
    }, []);

    // ─── Preview (abre janela sem auto-imprimir) ──────────────────
    const handleExportPdf = useCallback(() => {
        if (!editor) return;
        const docTitle = title || 'Documento';
        const w = window.open('', '_blank', 'width=960,height=860');
        if (!w) { alert('Permita popups neste site para abrir o preview.'); return; }
        w.document.write(buildPrintHTML(docTitle, editor.getHTML(), false));
        w.document.close();
        w.focus();
    }, [editor, title, buildPrintHTML]);

    // Limpa timer ao desmontar
    useEffect(() => () => clearTimeout(saveTimerRef.current), []);

    // ─── Delete ───────────────────────────────────────────────────
    const handleDelete = async () => {
        const docTitle = doc?.title || 'Documento';
        await deleteDocument(documentId);
        onClose();
        toast.success(`"${docTitle}" movido para a lixeira`, {
            duration: 6000,
            action: { label: 'Desfazer', onClick: async () => { await restoreDocument(documentId); toast.success('Documento restaurado'); } },
        });
    };

    if (!doc) return (
        <div className="h-full flex items-center justify-center bg-surface-card">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
                <span className="text-xs text-muted">Carregando documento...</span>
            </div>
        </div>
    );

    return (
        <div className="h-full bg-surface-card flex flex-col overflow-hidden">

            {/* ── Top bar: título + ações ── */}
            <div className="h-14 border-b border-border-subtle flex items-center justify-between px-4 md:px-6 bg-surface-card shrink-0">
                {isMobile && (
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1 min-h-[44px] px-1 text-sm font-medium text-brand mr-2 shrink-0"
                    >
                        <ChevronLeft size={20} />
                        Docs
                    </button>
                )}
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onBlur={() => handleSave()}
                    placeholder="Título da página"
                    className="text-lg font-bold text-primary outline-none flex-1 bg-transparent mr-4 placeholder:text-muted placeholder:font-normal"
                />
                <div className="flex items-center gap-1 md:gap-2">
                    {/* Project link */}
                    {projects.length > 0 && (
                        <div className="relative shrink-0" ref={projectDropdownRef}>
                            <button
                                onClick={() => setProjectDropdownOpen(v => !v)}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-[var(--radius-md)] border transition-colors cursor-pointer outline-none',
                                    isMobile ? 'p-2' : 'px-2 py-1 text-xs',
                                    doc.project_id
                                        ? 'border-brand/30 text-brand bg-brand/5 hover:bg-brand/10'
                                        : 'border-border-subtle text-secondary bg-transparent hover:border-brand/40 hover:text-primary'
                                )}
                                title={projects.find(p => p.id === doc.project_id)?.name ?? 'Sem projeto'}
                            >
                                <FolderOpen size={isMobile ? 16 : 13} className="shrink-0" />
                                {!isMobile && (
                                    <>
                                        <span className="max-w-[110px] truncate">
                                            {projects.find(p => p.id === doc.project_id)?.name ?? 'Sem projeto'}
                                        </span>
                                        <ChevronDown size={12} className={cn('transition-transform duration-200 shrink-0', projectDropdownOpen && 'rotate-180')} />
                                    </>
                                )}
                            </button>
                            {projectDropdownOpen && (
                                <div className="absolute top-full right-0 mt-1 z-50 bg-surface-card border border-border-subtle rounded-card shadow-float overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 min-w-[160px]">
                                    <div className="max-h-52 overflow-y-auto py-1">
                                        <div
                                            className={cn(
                                                'flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer transition-colors',
                                                !doc.project_id ? 'bg-brand/5 text-brand font-medium' : 'text-secondary hover:bg-surface-2 hover:text-primary'
                                            )}
                                            onClick={() => { updateDocument(documentId, { project_id: null }); setProjectDropdownOpen(false); }}
                                        >
                                            <span>Sem projeto</span>
                                            {!doc.project_id && <Check size={12} className="text-brand shrink-0" />}
                                        </div>
                                        {projects.map(p => (
                                            <div
                                                key={p.id}
                                                className={cn(
                                                    'flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer transition-colors',
                                                    doc.project_id === p.id ? 'bg-brand/5 text-brand font-medium' : 'text-secondary hover:bg-surface-2 hover:text-primary'
                                                )}
                                                onClick={() => { updateDocument(documentId, { project_id: p.id }); setProjectDropdownOpen(false); }}
                                            >
                                                <span className="truncate">{p.name}</span>
                                                {doc.project_id === p.id && <Check size={12} className="text-brand shrink-0" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Ações secundárias — ocultas no mobile (auto-save funciona no blur) */}
                    {!isMobile && (
                        <>
                            <div className="w-px h-5 bg-border-subtle" />
                            <span className="text-[10px] text-muted font-medium uppercase tracking-wider hidden sm:block">
                                {saving ? 'Salvando...' : 'Salvo'}
                            </span>
                            <button
                                onClick={() => setShowVersionPanel(v => !v)}
                                title="Histórico de versões"
                                className={`p-2 rounded-[var(--radius-md)] transition-colors ${showVersionPanel ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-surface-0 hover:text-secondary'}`}
                            >
                                <History size={17} />
                            </button>
                            <button
                                onClick={() => setPageViewMode(v => !v)}
                                title={pageViewMode ? 'Ocultar guias de página' : 'Mostrar guias A4'}
                                className={`p-2 rounded-[var(--radius-md)] transition-colors ${pageViewMode ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-surface-0 hover:text-secondary'}`}
                            >
                                <BookOpen size={17} />
                            </button>
                            <button
                                onClick={handleExportPdf}
                                title="Visualizar / Exportar PDF"
                                className="p-2 text-muted hover:bg-surface-0 hover:text-secondary rounded-[var(--radius-md)] transition-colors"
                            >
                                <Download size={17} />
                            </button>
                            <Button variant="ghost" onClick={() => handleSave(true)} disabled={saving} className="gap-1.5">
                                <Save size={15} /> Salvar
                            </Button>
                            <div className="w-px h-5 bg-border-subtle" />
                        </>
                    )}

                    <button
                        onClick={handleDelete}
                        className={cn("hover:bg-brand-light text-muted hover:text-brand rounded-[var(--radius-md)] transition-colors flex items-center justify-center", isMobile ? "w-11 h-11" : "p-2")}
                        title="Excluir página"
                    >
                        <Trash2 size={17} />
                    </button>
                </div>
            </div>

            {/* ── Bubble Menu ── */}
            {editor && <TableBubbleMenu editor={editor} />}

            {/* ── Bubble Menu (texto — oculto dentro de tabelas) ── */}
            {editor && (
                <BubbleMenu
                    editor={editor}
                    pluginKey="textBubbleMenu"
                    shouldShow={({ editor: e, from, to }) => !e.isActive('table') && from !== to}
                    className="flex items-center gap-0.5 bg-surface-card text-primary p-1.5 rounded-[var(--radius-sm)] shadow-float border border-border-subtle"
                >
                    {/* Heading selector */}
                    <button
                        onMouseDown={e => { e.preventDefault(); editor.chain().toggleHeading({ level: 1 }).run(); }}
                        className={`px-1.5 py-1 rounded-[var(--radius-xs)] text-xs font-bold hover:bg-surface-0 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'text-brand' : 'text-secondary'}`}
                        title="Título 1"
                    >H1</button>
                    <button
                        onMouseDown={e => { e.preventDefault(); editor.chain().toggleHeading({ level: 2 }).run(); }}
                        className={`px-1.5 py-1 rounded-[var(--radius-xs)] text-xs font-bold hover:bg-surface-0 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'text-brand' : 'text-secondary'}`}
                        title="Título 2"
                    >H2</button>
                    <button
                        onMouseDown={e => { e.preventDefault(); editor.chain().toggleHeading({ level: 3 }).run(); }}
                        className={`px-1.5 py-1 rounded-[var(--radius-xs)] text-xs font-bold hover:bg-surface-0 transition-colors ${editor.isActive('heading', { level: 3 }) ? 'text-brand' : 'text-secondary'}`}
                        title="Título 3"
                    >H3</button>

                    <div className="w-px h-4 bg-border-subtle mx-0.5" />

                    <button
                        onMouseDown={e => { e.preventDefault(); editor.chain().toggleBold().run(); }}
                        className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 transition-colors ${editor.isActive('bold') ? 'text-brand' : 'text-secondary'}`}
                        title="Negrito (Ctrl+B)"
                    ><Bold size={14} /></button>
                    <button
                        onMouseDown={e => { e.preventDefault(); editor.chain().toggleItalic().run(); }}
                        className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 transition-colors ${editor.isActive('italic') ? 'text-brand' : 'text-secondary'}`}
                        title="Itálico (Ctrl+I)"
                    ><Italic size={14} /></button>
                    <button
                        onMouseDown={e => { e.preventDefault(); editor.chain().toggleStrike().run(); }}
                        className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 transition-colors ${editor.isActive('strike') ? 'text-brand' : 'text-secondary'}`}
                        title="Tachado"
                    ><Strikethrough size={14} /></button>

                    <div className="w-px h-4 bg-border-subtle mx-0.5" />

                    <button
                        data-picker-btn
                        onMouseDown={e => {
                            e.preventDefault();
                            const r = e.currentTarget.getBoundingClientRect();
                            setHighlightPickerPos({ top: r.bottom + 6, left: r.left });
                            setHighlightPickerOpen(v => v === 'bubble' ? null : 'bubble');
                        }}
                        className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 transition-colors flex flex-col items-center gap-0.5 ${editor.isActive('highlight') ? 'text-brand' : 'text-secondary'}`}
                        title="Destacar"
                    >
                        <Highlighter size={14} />
                        <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: editor.getAttributes('highlight').color ?? '#FEF08A' }} />
                    </button>
                    {highlightPickerOpen === 'bubble' && (
                        <PickerPortal pos={highlightPickerPos}>
                            <HighlightSwatches editor={editor} onClose={() => setHighlightPickerOpen(null)} />
                        </PickerPortal>
                    )}

                    {/* Cor do texto */}
                    <label className="relative p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 transition-colors cursor-pointer text-secondary" title="Cor do texto">
                        <Palette size={14} />
                        <input
                            type="color"
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            onInput={e => editor.chain().setColor((e.target as HTMLInputElement).value).run()}
                        />
                    </label>

                    <div className="w-px h-4 bg-border-subtle mx-0.5" />

                    <button
                        onMouseDown={e => {
                            e.preventDefault();
                            if (editor.isActive('link')) {
                                editor.chain().unsetLink().run();
                            } else {
                                const url = window.prompt('URL do link:');
                                if (url) editor.chain().setLink({ href: url }).run();
                            }
                        }}
                        className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 transition-colors ${editor.isActive('link') ? 'text-brand' : 'text-secondary'}`}
                        title="Link"
                    ><LinkIcon size={14} /></button>

                    <div className="w-px h-4 bg-border-subtle mx-0.5" />

                    <button
                        data-picker-btn
                        onMouseDown={e => {
                            e.preventDefault();
                            const r = e.currentTarget.getBoundingClientRect();
                            setBlockquotePickerPos({ top: r.bottom + 6, left: r.left });
                            setBlockquotePickerOpen(v => v === 'bubble' ? null : 'bubble');
                        }}
                        className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 transition-colors ${editor.isActive('blockquote') ? 'text-brand' : 'text-secondary'}`}
                        title="Citação"
                    ><Quote size={14} /></button>
                    {blockquotePickerOpen === 'bubble' && (
                        <PickerPortal pos={blockquotePickerPos}>
                            <BlockquotePicker editor={editor} onClose={() => setBlockquotePickerOpen(null)} />
                        </PickerPortal>
                    )}

                    <button
                        onMouseDown={e => { e.preventDefault(); editor.chain().focus().clearNodes().unsetAllMarks().run(); }}
                        className="p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 transition-colors text-secondary"
                        title="Remover formatação"
                    ><Eraser size={14} /></button>
                </BubbleMenu>
            )}

            {/* ── Toolbar principal ── */}
            {editor && (
                <EditorToolbar
                    editor={editor}
                    onImageUpload={handleFileUpload}
                    size="md"
                    includePageBreak
                    className="border-b border-border-subtle bg-surface-0/60 px-4 py-1.5 shrink-0 custom-scrollbar"
                />
            )}

            {/* ── Área do editor + painel de versões ── */}
            <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-y-auto bg-surface-card custom-scrollbar">
                <div className="max-w-3xl mx-auto py-10 px-8">
                    {/* Breadcrumb de projeto */}
                    {doc.project_id && (() => {
                        const proj = projects.find(p => p.id === doc.project_id);
                        if (!proj) return null;
                        return (
                            <div className="flex items-center gap-1.5 mb-4 text-xs text-muted">
                                <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: (proj as { color?: string }).color || '#888' }}
                                />
                                <span className="font-medium text-secondary">{proj.name}</span>
                                <ChevronRight size={11} className="text-muted/60" />
                                <span className="truncate">{doc.title || 'Sem título'}</span>
                            </div>
                        );
                    })()}
                    <EditorContent editor={editor} className={cn("tiptap-editor-container", pageViewMode && "page-view-mode")} />

                    {/* Sub-páginas */}
                    <div className="mt-12 pt-8 border-t border-border-subtle">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-muted uppercase tracking-widest">
                                Sub-páginas{subPages.length > 0 && ` · ${subPages.length}`}
                            </span>
                            {onAddSubPage && (
                                <button
                                    onClick={() => onAddSubPage(documentId)}
                                    className="flex items-center gap-1.5 text-xs text-muted hover:text-brand transition-colors px-2 py-1 rounded-[var(--radius-sm)] hover:bg-brand/5"
                                >
                                    <Plus size={13} /> Adicionar página
                                </button>
                            )}
                        </div>

                        {subPages.length === 0 ? (
                            onAddSubPage && (
                                <button
                                    onClick={() => onAddSubPage(documentId)}
                                    className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-card)] border border-dashed border-border-subtle text-muted hover:text-brand hover:border-brand/40 hover:bg-brand/[0.02] transition-all text-sm"
                                >
                                    <Plus size={16} />
                                    <span>Adicionar sub-página</span>
                                </button>
                            )
                        ) : (
                            <div className="grid grid-cols-1 gap-1.5">
                                {subPages.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => navigate(`/documentos/${sub.id}`)}
                                        className="flex items-center gap-3 p-3 rounded-[var(--radius-card)] border border-border-subtle hover:border-brand/30 hover:bg-brand/[0.02] transition-all text-left group shadow-[var(--shadow-card)]"
                                    >
                                        <div className="w-8 h-8 rounded-[var(--radius-md)] bg-surface-0 flex items-center justify-center text-muted group-hover:bg-brand/10 group-hover:text-brand transition-colors shrink-0">
                                            <FileText size={15} />
                                        </div>
                                        <span className="text-sm font-medium text-secondary group-hover:text-brand transition-colors truncate">
                                            {sub.title || 'Sem título'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Painel de versões ── */}
            {showVersionPanel && (
                <Suspense fallback={null}>
                <VersionHistoryPanel
                    documentId={documentId}
                    currentTitle={title}
                    onRestore={(version: DocumentVersion) => {
                        editor?.commands.setContent(version.content as any);
                        setTitle(version.title);
                        restoreVersion(documentId, version);
                        setShowVersionPanel(false);
                    }}
                    onClose={() => setShowVersionPanel(false)}
                />
                </Suspense>
            )}
            </div>

            {/* ── Status bar ── */}
            <div className="h-7 border-t border-border-subtle bg-surface-0/60 px-6 flex items-center justify-end gap-4 shrink-0">
                <span className="text-[10px] text-muted">
                    {wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}
                </span>
                <span className="text-[10px] text-muted/40">·</span>
                <span className="text-[10px] text-muted">Ctrl+S para salvar</span>
            </div>

        </div>
    );
}
