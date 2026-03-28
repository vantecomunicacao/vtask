import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Link } from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../../store/documentStore';
import { useProjectStore } from '../../store/projectStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Callout } from './extensions/Callout';
import { Details } from './extensions/Details';
import { DocMention } from './extensions/DocMention';
import { renderDocItems } from './DocMentionSuggestion';
import { Button } from '../ui/Button';
import { SlashCommands, suggestionItems, renderItems } from './SlashCommands';
import {
    Save, Bold, Italic, Strikethrough, List, ListOrdered,
    Heading1, Heading2, Heading3, Link as LinkIcon,
    AlignLeft, AlignCenter, AlignRight, Table as TableIcon,
    CheckSquare, Code, Image as ImageIcon, Trash2, Minus,
    FileText, Plus, Undo, Redo, Palette, Highlighter, FolderOpen,
    History, Download,
} from 'lucide-react';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import type { DocumentVersion } from '../../store/documentStore';

const lowlight = createLowlight(common);

// ─── Helper: botão da toolbar ─────────────────────────────────────
function TB({
    onClick, active, title, children,
}: {
    onClick: () => void;
    active?: boolean;
    title?: string;
    children: React.ReactNode;
}) {
    return (
        <button
            onMouseDown={e => { e.preventDefault(); onClick(); }}
            title={title}
            className={`p-1.5 rounded-[var(--radius-sm)] transition-all ${active ? 'text-brand bg-surface-card shadow-[var(--shadow-card)]' : 'text-secondary hover:bg-surface-card hover:shadow-[var(--shadow-card)]'}`}
        >
            {children}
        </button>
    );
}

function Divider() {
    return <div className="w-px h-5 bg-border-subtle mx-1 shrink-0" />;
}

// ─── Props ────────────────────────────────────────────────────────
interface DocumentEditorProps {
    documentId: string;
    onClose: () => void;
    onAddSubPage?: (parentId: string) => void;
}

export function DocumentEditor({ documentId, onClose, onAddSubPage }: DocumentEditorProps) {
    const navigate = useNavigate();
    const { documents, updateDocument, deleteDocument, uploadImage, saveVersion, restoreVersion } = useDocumentStore();
    const { projects, fetchProjects } = useProjectStore();
    const { activeWorkspace } = useWorkspaceStore();
    const doc = documents.find(d => d.id === documentId);
    const subPages = documents.filter(d => d.parent_id === documentId);

    const [title, setTitle] = useState(doc?.title || '');
    const [saving, setSaving] = useState(false);
    const [wordCount, setWordCount] = useState(0);
    const [showVersionPanel, setShowVersionPanel] = useState(false);

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const handleSaveRef = useRef<() => void>(() => {});
    const documentsRef = useRef(documents);
    useEffect(() => { documentsRef.current = documents; }, [documents]);

    // Carrega projetos se necessário
    useEffect(() => {
        if (activeWorkspace && projects.length === 0) {
            fetchProjects(activeWorkspace.id);
        }
    }, [activeWorkspace, projects.length, fetchProjects]);

    // ─── Upload de imagem ─────────────────────────────────────────
    const handleFileUpload = useCallback(async (file: File) => {
        if (!editor) return;
        const url = await uploadImage(file);
        if (url) editor.chain().focus().setImage({ src: url }).run();
    }, [uploadImage]);

    // ─── Editor ───────────────────────────────────────────────────
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ codeBlock: false }),
            Placeholder.configure({
                placeholder: 'Digite "/" para comandos ou comece a escrever...',
            }),
            Image.configure({
                HTMLAttributes: { class: 'rounded-lg border border-border-subtle shadow-sm max-w-full h-auto my-4' },
            }),
            Table.configure({ resizable: true }),
            TableRow, TableHeader, TableCell,
            TaskList,
            TaskItem.configure({ nested: true }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: 'text-brand underline underline-offset-4 cursor-pointer' },
            }),
            TextStyle, Color,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            CodeBlockLowlight.configure({ lowlight }),
            Callout,
            Details,
            DocMention.configure({
                HTMLAttributes: {
                    class: 'doc-mention-node',
                },
                suggestion: {
                    char: '[[',
                    items: ({ query }: { query: string }) =>
                        documentsRef.current
                            .filter(d =>
                                d.id !== documentId &&
                                (d.title || '').toLowerCase().includes(query.toLowerCase())
                            )
                            .slice(0, 10),
                    render: renderDocItems,
                },
            }),
            SlashCommands.configure({
                suggestion: {
                    items: ({ query }: { query: string }) =>
                        suggestionItems
                            .filter(item =>
                                item.title.toLowerCase().includes(query.toLowerCase()) ||
                                item.searchTerms.some(term => term.includes(query.toLowerCase()))
                            )
                            .slice(0, 15),
                    render: renderItems,
                },
            }),
        ],
        content: (doc?.content as any) || '',
        onUpdate: ({ editor: e }) => {
            // Word count
            const text = e.getText();
            setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
            // Autosave debounce
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
            handleDrop: (_, event, __, moved) => {
                if (!moved && event.dataTransfer?.files?.[0]) {
                    const file = event.dataTransfer.files[0];
                    if (file.type.startsWith('image')) { event.preventDefault(); handleFileUpload(file); return true; }
                }
                return false;
            },
        },
    });

    // Carrega conteúdo quando editor inicializa OU quando o doc chega do servidor
    useEffect(() => {
        if (doc && editor) {
            setTitle(doc.title);
            editor.commands.setContent((doc.content as any) || '');
        }
        // doc?.id: re-executa se o documento chegar após o editor inicializar (carregamento assíncrono)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, doc?.id]);

    // Upload via evento do SlashCommands
    useEffect(() => {
        const handler = (e: any) => { if (e.detail?.file) handleFileUpload(e.detail.file); };
        window.addEventListener('editor-upload-image', handler);
        return () => window.removeEventListener('editor-upload-image', handler);
    }, [handleFileUpload]);

    // ─── Salvar ───────────────────────────────────────────────────
    const handleSave = useCallback(async (isManual = false) => {
        if (!editor || saving) return;
        setSaving(true);
        try {
            const content = editor.getJSON() as any;
            await updateDocument(documentId, { title, content });
            if (isManual) {
                await saveVersion(documentId, title, content);
            }
        } finally {
            setSaving(false);
        }
    }, [editor, title, documentId, updateDocument, saving, saveVersion]);

    // Mantém ref atualizada para o autosave usar sem re-registrar listeners
    useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

    // Ctrl+S → save manual (cria versão)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(true); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleSave]);

    // ─── Exportar PDF ─────────────────────────────────────────────
    const handleExportPdf = useCallback(() => {
        if (!editor) return;
        const docTitle = title || 'Documento';
        const html = editor.getHTML();

        const printStyles = `
            body { font-family: "Figtree", ui-sans-serif, system-ui, sans-serif;
                   max-width: 800px; margin: 40px auto; padding: 0 40px;
                   color: #1c1a18; font-size: 16px; line-height: 1.6; }
            h1 { font-size: 2.25rem; font-weight: 800; margin: 1.5rem 0 0.5rem; color: #1c1a18; }
            h2 { font-size: 1.6rem; font-weight: 700; margin: 1.25rem 0 0.4rem; color: #1c1a18; }
            h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.35rem; color: #1c1a18; }
            p  { margin-bottom: 0.5rem; }
            ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.75rem 0; }
            ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.75rem 0; }
            li { margin-bottom: 0.25rem; }
            table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; }
            td, th { border: 1px solid #e8e5e0; padding: 8px 12px; text-align: left; }
            th { background: #f5f3ef; font-weight: 600; font-size: 0.875rem; }
            pre { background: #1c1a18; color: #f5f3ef; padding: 1rem 1.25rem;
                  border-radius: 8px; overflow-x: auto; font-size: 0.875rem;
                  font-family: monospace; line-height: 1.6; }
            code:not(pre code) { background: #ece9e4; color: #db4035; padding: 0.1em 0.35em;
                                 border-radius: 4px; font-size: 0.875em; }
            blockquote { border-left: 3px solid #db4035; padding: 0.75rem 1rem;
                         background: #fdf3f2; margin: 1.5rem 0; font-style: italic; color: #6b6860; }
            img { max-width: 100%; height: auto; border-radius: 6px; }
            hr { border: none; border-top: 1px solid #e8e5e0; margin: 1.5rem 0; }
            @media print { body { margin: 0; padding: 20px; } }
        `;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Permita popups neste site para exportar o PDF.');
            return;
        }

        printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <style>${printStyles}</style>
</head>
<body>
  <h1 style="border-bottom:2px solid #e8e5e0;padding-bottom:0.5rem;margin-bottom:1.5rem;">${docTitle}</h1>
  ${html}
</body>
</html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 350);
    }, [editor, title]);

    // Limpa timer ao desmontar
    useEffect(() => () => clearTimeout(saveTimerRef.current), []);

    // ─── Delete ───────────────────────────────────────────────────
    const handleDelete = async () => {
        if (window.confirm('Tem certeza que deseja excluir esta página?')) {
            await deleteDocument(documentId);
            onClose();
        }
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
            <div className="h-14 border-b border-border-subtle flex items-center justify-between px-6 bg-surface-card shrink-0">
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onBlur={() => handleSave()}
                    placeholder="Título da página"
                    className="text-lg font-bold text-primary outline-none flex-1 bg-transparent mr-4 placeholder:text-muted placeholder:font-normal"
                />
                <div className="flex items-center gap-2">
                    {/* Project link */}
                    {projects.length > 0 && (
                        <div className="flex items-center gap-1.5 shrink-0">
                            <FolderOpen size={13} className="text-muted shrink-0" />
                            <select
                                value={doc.project_id || ''}
                                onChange={e => updateDocument(documentId, { project_id: e.target.value || null })}
                                className="text-xs text-secondary bg-transparent border border-border-subtle rounded px-1.5 py-0.5 outline-none hover:border-brand/40 focus:ring-1 focus:ring-brand/20 max-w-[130px] cursor-pointer"
                            >
                                <option value="">Sem projeto</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="w-px h-5 bg-border-subtle" />
                    <span className="text-[10px] text-muted font-medium uppercase tracking-wider hidden sm:block">
                        {saving ? 'Salvando...' : 'Salvo'}
                    </span>
                    {/* Histórico de versões */}
                    <button
                        onClick={() => setShowVersionPanel(v => !v)}
                        title="Histórico de versões"
                        className={`p-2 rounded-[var(--radius-md)] transition-colors ${showVersionPanel ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-surface-0 hover:text-secondary'}`}
                    >
                        <History size={17} />
                    </button>
                    {/* Exportar PDF */}
                    <button
                        onClick={handleExportPdf}
                        title="Exportar como PDF"
                        className="p-2 text-muted hover:bg-surface-0 hover:text-secondary rounded-[var(--radius-md)] transition-colors"
                    >
                        <Download size={17} />
                    </button>
                    <Button variant="ghost" onClick={() => handleSave(true)} disabled={saving} className="gap-1.5">
                        <Save size={15} /> Salvar
                    </Button>
                    <div className="w-px h-5 bg-border-subtle" />
                    <button
                        onClick={handleDelete}
                        className="p-2 hover:bg-red-50 text-muted hover:text-red-500 rounded-[var(--radius-md)] transition-colors"
                        title="Excluir página"
                    >
                        <Trash2 size={17} />
                    </button>
                </div>
            </div>

            {/* ── Bubble Menu ── */}
            {editor && (
                <BubbleMenu
                    editor={editor}
                    className="flex items-center gap-0.5 bg-gray-900 text-white p-1.5 rounded-xl shadow-2xl border border-white/10"
                >
                    {/* Heading selector */}
                    <button
                        onMouseDown={e => { e.preventDefault(); editor.chain().toggleHeading({ level: 1 }).run(); }}
                        className={`px-1.5 py-1 rounded text-xs font-bold hover:bg-white/10 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'text-brand' : 'text-gray-300'}`}
                        title="Título 1"
                    >H1</button>
                    <button
                        onMouseDown={e => { e.preventDefault(); editor.chain().toggleHeading({ level: 2 }).run(); }}
                        className={`px-1.5 py-1 rounded text-xs font-bold hover:bg-white/10 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'text-brand' : 'text-gray-300'}`}
                        title="Título 2"
                    >H2</button>
                    <button
                        onMouseDown={e => { e.preventDefault(); editor.chain().toggleHeading({ level: 3 }).run(); }}
                        className={`px-1.5 py-1 rounded text-xs font-bold hover:bg-white/10 transition-colors ${editor.isActive('heading', { level: 3 }) ? 'text-brand' : 'text-gray-300'}`}
                        title="Título 3"
                    >H3</button>

                    <div className="w-px h-4 bg-white/20 mx-0.5" />

                    <button
                        onMouseDown={e => { e.preventDefault(); editor.chain().toggleBold().run(); }}
                        className={`p-1.5 rounded hover:bg-white/10 transition-colors ${editor.isActive('bold') ? 'text-brand' : ''}`}
                        title="Negrito (Ctrl+B)"
                    ><Bold size={14} /></button>
                    <button
                        onMouseDown={e => { e.preventDefault(); editor.chain().toggleItalic().run(); }}
                        className={`p-1.5 rounded hover:bg-white/10 transition-colors ${editor.isActive('italic') ? 'text-brand' : ''}`}
                        title="Itálico (Ctrl+I)"
                    ><Italic size={14} /></button>
                    <button
                        onMouseDown={e => { e.preventDefault(); editor.chain().toggleStrike().run(); }}
                        className={`p-1.5 rounded hover:bg-white/10 transition-colors ${editor.isActive('strike') ? 'text-brand' : ''}`}
                        title="Tachado"
                    ><Strikethrough size={14} /></button>

                    <div className="w-px h-4 bg-white/20 mx-0.5" />

                    <button
                        onMouseDown={e => { e.preventDefault(); editor.chain().toggleHighlight({ color: '#FEF08A' }).run(); }}
                        className={`p-1.5 rounded hover:bg-white/10 transition-colors ${editor.isActive('highlight') ? 'text-yellow-400' : ''}`}
                        title="Destacar"
                    ><Highlighter size={14} /></button>

                    {/* Cor do texto */}
                    <label className="relative p-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer" title="Cor do texto">
                        <Palette size={14} />
                        <input
                            type="color"
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            onInput={e => editor.chain().setColor((e.target as HTMLInputElement).value).run()}
                        />
                    </label>

                    <div className="w-px h-4 bg-white/20 mx-0.5" />

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
                        className={`p-1.5 rounded hover:bg-white/10 transition-colors ${editor.isActive('link') ? 'text-brand' : ''}`}
                        title="Link"
                    ><LinkIcon size={14} /></button>
                </BubbleMenu>
            )}

            {/* ── Toolbar principal ── */}
            <div className="border-b border-border-subtle bg-surface-0/60 px-4 py-1.5 flex items-center gap-0.5 shrink-0 overflow-x-auto custom-scrollbar">

                {/* Undo / Redo */}
                <TB onClick={() => editor?.chain().focus().undo().run()} title="Desfazer (Ctrl+Z)">
                    <Undo size={16} />
                </TB>
                <TB onClick={() => editor?.chain().focus().redo().run()} title="Refazer (Ctrl+Y)">
                    <Redo size={16} />
                </TB>

                <Divider />

                {/* Headings */}
                <TB onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="Título 1">
                    <Heading1 size={17} />
                </TB>
                <TB onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Título 2">
                    <Heading2 size={17} />
                </TB>
                <TB onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} title="Título 3">
                    <Heading3 size={17} />
                </TB>

                <Divider />

                {/* Formatação inline */}
                <TB onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Negrito (Ctrl+B)">
                    <Bold size={17} />
                </TB>
                <TB onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Itálico (Ctrl+I)">
                    <Italic size={17} />
                </TB>
                <TB onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')} title="Tachado">
                    <Strikethrough size={17} />
                </TB>
                <TB onClick={() => editor?.chain().focus().toggleHighlight({ color: '#FEF08A' }).run()} active={editor?.isActive('highlight')} title="Destacar texto">
                    <Highlighter size={17} />
                </TB>

                {/* Cor do texto */}
                <label
                    className="p-1.5 rounded-[var(--radius-sm)] transition-all text-secondary hover:bg-surface-card hover:shadow-[var(--shadow-card)] cursor-pointer relative"
                    title="Cor do texto"
                >
                    <Palette size={17} />
                    <input
                        type="color"
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        defaultValue="#374151"
                        onInput={e => editor?.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
                    />
                </label>

                <Divider />

                {/* Listas */}
                <TB onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Lista">
                    <List size={17} />
                </TB>
                <TB onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Lista numerada">
                    <ListOrdered size={17} />
                </TB>
                <TB onClick={() => editor?.chain().focus().toggleTaskList().run()} active={editor?.isActive('taskList')} title="Lista de tarefas">
                    <CheckSquare size={17} />
                </TB>

                <Divider />

                {/* Bloco */}
                <TB onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Tabela">
                    <TableIcon size={17} />
                </TB>
                <TB onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive('codeBlock')} title="Bloco de código">
                    <Code size={17} />
                </TB>
                <TB onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Divisor">
                    <Minus size={17} />
                </TB>

                {/* Imagem */}
                <label className="p-1.5 rounded-[var(--radius-sm)] transition-all text-secondary hover:bg-surface-card hover:shadow-[var(--shadow-card)] cursor-pointer" title="Inserir imagem">
                    <ImageIcon size={17} />
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                    />
                </label>

                <Divider />

                {/* Alinhamento */}
                <TB onClick={() => editor?.chain().focus().setTextAlign('left').run()} active={editor?.isActive({ textAlign: 'left' })} title="Alinhar à esquerda">
                    <AlignLeft size={17} />
                </TB>
                <TB onClick={() => editor?.chain().focus().setTextAlign('center').run()} active={editor?.isActive({ textAlign: 'center' })} title="Centralizar">
                    <AlignCenter size={17} />
                </TB>
                <TB onClick={() => editor?.chain().focus().setTextAlign('right').run()} active={editor?.isActive({ textAlign: 'right' })} title="Alinhar à direita">
                    <AlignRight size={17} />
                </TB>
            </div>

            {/* ── Área do editor + painel de versões ── */}
            <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-y-auto bg-surface-card custom-scrollbar">
                <div className="max-w-3xl mx-auto py-10 px-8">
                    <EditorContent editor={editor} className="tiptap-editor-container" />

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

            <style dangerouslySetInnerHTML={{ __html: `
                .tiptap-editor-container .ProseMirror:focus { outline: none; }
                .tiptap-editor-container .ProseMirror { min-height: 500px; font-family: "Figtree", ui-sans-serif, system-ui, sans-serif; }

                .tiptap-editor-container .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left; color: #a09d98; pointer-events: none; height: 0;
                }

                /* Tipografia — tokens do design system */
                .tiptap-editor-container .ProseMirror h1 { font-size: 2.25rem; font-weight: 800; margin: 1.5rem 0 0.5rem; color: #1c1a18; line-height: 1.2; }
                .tiptap-editor-container .ProseMirror h2 { font-size: 1.6rem; font-weight: 700; margin: 1.25rem 0 0.4rem; color: #1c1a18; line-height: 1.3; }
                .tiptap-editor-container .ProseMirror h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.35rem; color: #1c1a18; line-height: 1.4; }
                .tiptap-editor-container .ProseMirror p { margin-bottom: 0.5rem; line-height: 1.55; color: #1c1a18; font-size: 1rem; }
                .tiptap-editor-container .ProseMirror s { text-decoration: line-through; color: #a09d98; }

                /* Inline code */
                .tiptap-editor-container .ProseMirror code:not(pre code) {
                    background: #ece9e4; color: #db4035; padding: 0.1em 0.35em;
                    border-radius: 4px; font-size: 0.875em; font-family: monospace;
                    border: 1px solid #e8e5e0;
                }

                /* Tabelas */
                .tiptap-editor-container table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 1.5rem 0; overflow: hidden; border-radius: 10px; }
                .tiptap-editor-container table td,
                .tiptap-editor-container table th { border: 1px solid #e8e5e0; padding: 8px 12px; position: relative; text-align: left; color: #1c1a18; }
                .tiptap-editor-container table th { background: #f5f3ef; font-weight: 600; font-size: 0.875rem; color: #6b6860; }
                .tiptap-editor-container .selectedCell:after { background: rgba(219,64,53,0.06); content: ""; inset: 0; pointer-events: none; position: absolute; z-index: 2; }

                /* Task List */
                .tiptap-editor-container ul[data-type="taskList"] { list-style: none; padding: 0; }
                .tiptap-editor-container ul[data-type="taskList"] li { display: flex; align-items: flex-start; margin-bottom: 0.4rem; gap: 0.6rem; }
                .tiptap-editor-container ul[data-type="taskList"] input[type="checkbox"] { width: 1.1rem; height: 1.1rem; margin-top: 0.2rem; cursor: pointer; accent-color: #db4035; }
                .tiptap-editor-container ul[data-type="taskList"] li[data-checked="true"] > div { text-decoration: line-through; color: #a09d98; }

                /* Code Block */
                .tiptap-editor-container pre { background: #1c1a18; color: #f5f3ef; padding: 1.1rem 1.25rem; border-radius: 14px; margin: 1.25rem 0; font-family: 'JetBrains Mono', monospace; overflow-x: auto; font-size: 0.875rem; line-height: 1.6; border: 1px solid rgba(255,255,255,0.06); }
                .tiptap-editor-container pre code { background: none; color: inherit; padding: 0; }
                .hljs-comment, .hljs-quote { color: #6b6860; }
                .hljs-keyword, .hljs-selector-tag { color: #f472b6; }
                .hljs-string, .hljs-doctag, .hljs-addition { color: #34d399; }
                .hljs-title, .hljs-section, .hljs-type, .hljs-name { color: #60a5fa; }
                .hljs-variable, .hljs-tag, .hljs-link { color: #fbbf24; }

                /* Lists */
                .tiptap-editor-container hr { border: none; border-top: 1px solid #e8e5e0; margin: 1.5rem 0; }
                .tiptap-editor-container ul:not([data-type="taskList"]) { list-style-type: disc; padding-left: 1.5rem; margin: 0.75rem 0; color: #1c1a18; }
                .tiptap-editor-container ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.75rem 0; color: #1c1a18; }
                .tiptap-editor-container li { margin-bottom: 0.25rem; }

                /* Blockquote */
                .tiptap-editor-container blockquote { border-left: 3px solid #db4035; padding-left: 1rem; font-style: italic; color: #6b6860; margin: 1.5rem 0; background: #fdf3f2; border-radius: 0 6px 6px 0; padding: 0.75rem 1rem; }

                /* Highlight */
                .tiptap-editor-container mark { border-radius: 3px; padding: 0.1em 0.15em; }

                /* Doc Mention chip */
                .doc-mention-chip {
                    display: inline-flex; align-items: center; gap: 0.25em;
                    background: color-mix(in srgb, #db4035 8%, transparent);
                    border: 1px solid color-mix(in srgb, #db4035 25%, transparent);
                    color: #b83228; font-size: 0.82em; font-weight: 500;
                    padding: 0.15em 0.5em 0.15em 0.35em; border-radius: 5px;
                    cursor: pointer; transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
                    vertical-align: middle; white-space: nowrap; user-select: none;
                    line-height: 1.6;
                }
                .doc-mention-chip:hover {
                    background: color-mix(in srgb, #db4035 15%, transparent);
                    border-color: color-mix(in srgb, #db4035 40%, transparent);
                    box-shadow: 0 1px 4px color-mix(in srgb, #db4035 15%, transparent);
                }
                .doc-mention-icon { display: inline; flex-shrink: 0; opacity: 0.75; }
                .doc-mention-ext { display: inline; flex-shrink: 0; opacity: 0; transition: opacity 0.15s; margin-left: 0.1em; }
                .doc-mention-chip:hover .doc-mention-ext { opacity: 0.55; }

                /* Toggle / Details block */
                .tiptap-details { margin: 0.75rem 0; }
                .tiptap-details-header {
                    display: flex; align-items: center; gap: 0.4rem;
                    user-select: none;
                }
                .tiptap-details-toggle {
                    display: flex; align-items: center; justify-content: center;
                    width: 1.25rem; height: 1.25rem; border-radius: 6px;
                    background: transparent; border: none; cursor: pointer;
                    color: #a09d98; flex-shrink: 0;
                    transition: background 0.1s, color 0.1s;
                }
                .tiptap-details-toggle:hover { background: #ece9e4; color: #1c1a18; }
                .tiptap-details-title {
                    font-size: 1rem; font-weight: 600; color: #1c1a18;
                    border: none; outline: none; background: transparent;
                    flex: 1; cursor: text; font-family: "Figtree", ui-sans-serif, sans-serif;
                }
                .tiptap-details-title::placeholder { color: #a09d98; font-weight: 400; }
                .tiptap-details-content {
                    padding-left: 1.65rem;
                    border-left: 2px solid #e8e5e0;
                    margin-top: 0.25rem;
                    margin-left: 0.6rem;
                }

                /* Callout blocks */
                .tiptap-editor-container [data-callout] {
                    padding: 0.85rem 1rem 0.85rem 1.25rem;
                    border-radius: 0.5rem;
                    margin: 1rem 0;
                    position: relative;
                }
                .tiptap-editor-container [data-callout] > p:last-child { margin-bottom: 0; }
                .tiptap-editor-container [data-callout]::before {
                    content: attr(data-type);
                    position: absolute;
                    top: -0.65rem; left: 1rem;
                    font-size: 0.65rem; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.08em;
                    padding: 0.1rem 0.5rem;
                    border-radius: 999px;
                }
                .tiptap-editor-container [data-callout][data-type="info"] {
                    background: #eff6ff; border-left: 3px solid #3b82f6;
                }
                .tiptap-editor-container [data-callout][data-type="info"]::before {
                    background: #dbeafe; color: #1d4ed8;
                    content: "ℹ️  Info";
                }
                .tiptap-editor-container [data-callout][data-type="warning"] {
                    background: #fffbeb; border-left: 3px solid #f59e0b;
                }
                .tiptap-editor-container [data-callout][data-type="warning"]::before {
                    background: #fef3c7; color: #b45309;
                    content: "⚠️  Atenção";
                }
                .tiptap-editor-container [data-callout][data-type="success"] {
                    background: #f0fdf4; border-left: 3px solid #22c55e;
                }
                .tiptap-editor-container [data-callout][data-type="success"]::before {
                    background: #dcfce7; color: #15803d;
                    content: "✅  Sucesso";
                }
                .tiptap-editor-container [data-callout][data-type="error"] {
                    background: #fef2f2; border-left: 3px solid #ef4444;
                }
                .tiptap-editor-container [data-callout][data-type="error"]::before {
                    background: #fee2e2; color: #b91c1c;
                    content: "🚫  Erro";
                }
                .tiptap-editor-container [data-callout][data-type="note"] {
                    background: #f5f3ff; border-left: 3px solid #8b5cf6;
                }
                .tiptap-editor-container [data-callout][data-type="note"]::before {
                    background: #ede9fe; color: #6d28d9;
                    content: "📌  Nota";
                }
            `}} />
        </div>
    );
}
