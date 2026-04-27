import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { TextSubstitutions } from '../../../lib/tiptapExtensions';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { ResizableImage } from '../../documents/extensions/ResizableImage';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { Callout } from '../../documents/extensions/Callout';
import { Details } from '../../documents/extensions/Details';
import { ColoredBlockquote, BLOCKQUOTE_COLORS, type BlockquoteColor } from '../../documents/extensions/ColoredBlockquote';
import {
    Bold, Italic, Strikethrough, Link as LinkIcon,
    Heading1, Heading2, Heading3, List, ListOrdered,
    CheckSquare, Table as TableIcon, Image as ImageIcon, Code,
    AlignLeft, AlignCenter, AlignRight, Minus,
    Undo2, Redo2, Highlighter, Palette, Quote, Eraser,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import type { TaskWithAssignee } from '../../../store/taskStore';
import { SlashCommands, suggestionItems, renderItems } from '../../documents/SlashCommands';
import { DocMention } from '../../documents/extensions/DocMention';
import { renderDocItems } from '../../documents/DocMentionSuggestion';
import { useDocumentStore } from '../../../store/documentStore';
import { cn } from '../../../lib/utils';

const lowlight = createLowlight(common);

const HIGHLIGHT_COLORS = [
    { color: '#FEF08A', label: 'Amarelo' },
    { color: '#BBF7D0', label: 'Verde' },
    { color: '#BAE6FD', label: 'Azul' },
    { color: '#FBCFE8', label: 'Rosa' },
    { color: '#FED7AA', label: 'Laranja' },
    { color: '#DDD6FE', label: 'Roxo' },
    { color: '#FECACA', label: 'Vermelho' },
    { color: '#E5E7EB', label: 'Cinza' },
];

const TEXT_COLORS = [
    { color: '#1c1a18', label: 'Padrão' },
    { color: '#db4035', label: 'Vermelho' },
    { color: '#ff9f1a', label: 'Laranja' },
    { color: '#d9730d', label: 'Marrom' },
    { color: '#0b6e99', label: 'Azul' },
    { color: '#0f7b6c', label: 'Verde' },
    { color: '#6940a5', label: 'Roxo' },
    { color: '#ad1a72', label: 'Rosa' },
    { color: '#64748b', label: 'Cinza' },
];

function PickerPortal({ pos, children }: { pos: { top: number; left: number }; children: React.ReactNode }) {
    return createPortal(
        <div data-picker style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}>
            {children}
        </div>,
        document.body
    );
}

function HighlightSwatches({ editor, onClose }: { editor: import('@tiptap/react').Editor; onClose: () => void }) {
    return (
        <div className="bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float p-2 flex flex-col gap-1.5 min-w-[9rem]">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted px-1">Destaque</span>
            <div className="grid grid-cols-4 gap-1">
                {HIGHLIGHT_COLORS.map(({ color, label }) => (
                    <button key={color} onMouseDown={e => { e.preventDefault(); editor.chain().focus().setHighlight({ color }).run(); onClose(); }}
                        title={label} className="w-7 h-7 rounded-[var(--radius-sm)] border-2 border-transparent hover:border-brand transition-all hover:scale-110"
                        style={{ backgroundColor: color }} />
                ))}
            </div>
            <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); onClose(); }}
                className="text-[10px] text-muted hover:text-primary transition-colors px-1 text-left mt-0.5">
                Remover destaque
            </button>
        </div>
    );
}

function TextColorSwatches({ editor, onClose }: { editor: import('@tiptap/react').Editor; onClose: () => void }) {
    return (
        <div className="bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float p-2 flex flex-col gap-1.5 min-w-[9rem]">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted px-1">Cor do texto</span>
            <div className="grid grid-cols-3 gap-1">
                {TEXT_COLORS.map(({ color, label }) => (
                    <button key={color} onMouseDown={e => {
                        e.preventDefault();
                        if (color === '#1c1a18') editor.chain().focus().unsetColor().run();
                        else editor.chain().focus().setColor(color).run();
                        onClose();
                    }} title={label}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-surface-0 transition-colors">
                        <div className="w-4 h-4 rounded-full border border-border-subtle shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[10px] text-secondary truncate">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function BlockquotePicker({ editor, onClose }: { editor: import('@tiptap/react').Editor; onClose: () => void }) {
    return (
        <div className="bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float p-2 flex flex-col gap-1.5 min-w-[9rem]">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted px-1">Citação</span>
            <div className="grid grid-cols-3 gap-1">
                {(Object.entries(BLOCKQUOTE_COLORS) as [BlockquoteColor, { border: string; bg: string; label: string }][]).map(([key, { border, bg, label }]) => (
                    <button key={key} onMouseDown={e => {
                        e.preventDefault();
                        if (!editor.isActive('blockquote')) editor.chain().focus().toggleBlockquote().run();
                        editor.chain().focus().setBlockquoteColor(key).run();
                        onClose();
                    }} title={label}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-sm)] hover:opacity-80 transition-opacity"
                        style={{ borderLeft: `3px solid ${border}`, backgroundColor: bg }}>
                        <span className="text-[10px] font-medium truncate" style={{ color: border }}>{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export interface DescriptionEditorProps {
    task: TaskWithAssignee;
    onUpdateTask: (updates: Partial<TaskWithAssignee>) => Promise<void>;
    isExpanded: boolean;
    setIsExpanded: (val: boolean) => void;
    isEditingDesc: boolean;
    setIsEditingDesc: (val: boolean) => void;
    saving: boolean;
    reloadAttachments: () => void;
}

export function DescriptionEditor({
    task, onUpdateTask, isExpanded, setIsExpanded,
    isEditingDesc, setIsEditingDesc, saving, reloadAttachments,
}: DescriptionEditorProps) {
    const { session } = useAuthStore();
    const { documents } = useDocumentStore();
    const [uploadingInternal, setUploadingInternal] = useState(false);
    const [highlightPickerOpen, setHighlightPickerOpen] = useState<'toolbar' | 'bubble' | null>(null);
    const [textColorPickerOpen, setTextColorPickerOpen] = useState<'toolbar' | 'bubble' | null>(null);
    const [blockquotePickerOpen, setBlockquotePickerOpen] = useState<'toolbar' | null>(null);
    const [highlightPickerPos, setHighlightPickerPos] = useState({ top: 0, left: 0 });
    const [textColorPickerPos, setTextColorPickerPos] = useState({ top: 0, left: 0 });
    const [blockquotePickerPos, setBlockquotePickerPos] = useState({ top: 0, left: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageUploadRef = useRef<((file: File) => void) | undefined>(undefined);

    const documentsRef = useRef(documents);
    useEffect(() => { documentsRef.current = documents; }, [documents]);

    const taskRef = useRef(task);
    const onUpdateTaskRef = useRef(onUpdateTask);
    useEffect(() => { taskRef.current = task; });
    useEffect(() => { onUpdateTaskRef.current = onUpdateTask; });

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-picker]') && !target.closest('[data-picker-btn]')) {
                setHighlightPickerOpen(null);
                setTextColorPickerOpen(null);
                setBlockquotePickerOpen(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ codeBlock: false, blockquote: false }),
            ColoredBlockquote,
            TextSubstitutions,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            Callout,
            Details,
            Placeholder.configure({ placeholder: 'Digite "/" para comandos...' }),
            Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-brand underline underline-offset-4 cursor-pointer' } }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Table.configure({ resizable: true }),
            TableRow, TableHeader, TableCell,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            ResizableImage,
            CodeBlockLowlight.configure({ lowlight }),
            SlashCommands.configure({
                suggestion: {
                    items: ({ query }: { query: string }) => suggestionItems
                        .filter(item =>
                            item.title.toLowerCase().includes(query.toLowerCase()) ||
                            item.searchTerms.some(term => term.includes(query.toLowerCase()))
                        )
                        .slice(0, 10),
                    render: renderItems,
                },
            }),
            DocMention.configure({
                HTMLAttributes: { class: 'doc-mention-node' },
                suggestion: {
                    char: '[[',
                    items: ({ query }: { query: string }) => {
                        const all = documentsRef.current;
                        const q = query.toLowerCase().trim();
                        return all
                            .filter(d => !d.deleted_at)
                            .map(d => ({
                                ...d,
                                _parentTitle: d.parent_id
                                    ? (all.find(p => p.id === d.parent_id)?.title ?? null)
                                    : null,
                            }))
                            .filter(d =>
                                q === '' ||
                                (d.title || '').toLowerCase().includes(q) ||
                                (d._parentTitle || '').toLowerCase().includes(q)
                            )
                            .sort((a, b) => {
                                if (!q) return (a.title || '').localeCompare(b.title || '');
                                const aExact = (a.title || '').toLowerCase().startsWith(q);
                                const bExact = (b.title || '').toLowerCase().startsWith(q);
                                if (aExact && !bExact) return -1;
                                if (!aExact && bExact) return 1;
                                return (a.title || '').localeCompare(b.title || '');
                            });
                    },
                    render: renderDocItems,
                },
            }),
        ],
        content: '',
        editorProps: {
            attributes: { class: 'focus:outline-none min-h-[100px] text-sm text-primary' },
            handlePaste: (_, event) => {
                const imageItem = Array.from(event.clipboardData?.items || []).find(i => i.type.startsWith('image'));
                if (imageItem) {
                    const file = imageItem.getAsFile();
                    if (file) { event.preventDefault(); imageUploadRef.current?.(file); return true; }
                }
                return false;
            },
            handleDrop: (_, event, __, moved) => {
                if (!moved && event.dataTransfer?.files?.[0]) {
                    const file = event.dataTransfer.files[0];
                    if (file.type.startsWith('image')) { event.preventDefault(); imageUploadRef.current?.(file); return true; }
                }
                return false;
            },
        },
    });

    const [editorVersion, setEditorVersion] = useState(0);
    const incVersion = useCallback(() => setEditorVersion(v => v + 1), []);

    useEffect(() => {
        if (!editor) return;
        editor.on('update', incVersion);
        return () => { editor.off('update', incVersion); };
    }, [editor, incVersion]);

    useEffect(() => {
        if (!editor) return;
        const handleBlur = () => {
            const jsonStr = JSON.stringify(editor.getJSON());
            if (jsonStr !== taskRef.current.description) {
                onUpdateTaskRef.current({ description: jsonStr });
            }
        };
        editor.on('blur', handleBlur);
        return () => { editor.off('blur', handleBlur); };
    }, [editor]);

    useEffect(() => {
        if (task && editor) {
            const content = task.description || '';
            try {
                editor.commands.setContent(content.startsWith('{') ? JSON.parse(content) : content);
            } catch {
                editor.commands.setContent(content);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [task.id, !!editor]);

    const handleEditorImageUpload = useCallback(async (file: File) => {
        if (!editor || !task || !session) return;
        setUploadingInternal(true);
        const filePath = `${task.id}/${Date.now()}_${file.name}`;
        const { error: uploadError, data } = await supabase.storage.from('task_attachments').upload(filePath, file);
        if (!uploadError && data) {
            const url = supabase.storage.from('task_attachments').getPublicUrl(filePath).data.publicUrl;
            editor.chain().focus().setImage({ src: url }).run();
            await supabase.from('task_attachments').insert({
                task_id: task.id, user_id: session.user.id, file_name: file.name,
                file_path: filePath, file_size: file.size, file_type: file.type,
            });
            reloadAttachments();
        }
        setUploadingInternal(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, task?.id, session]);

    useEffect(() => { imageUploadRef.current = handleEditorImageUpload; }, [handleEditorImageUpload]);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.file) handleEditorImageUpload(detail.file);
        };
        window.addEventListener('editor-upload-image', handler);
        return () => window.removeEventListener('editor-upload-image', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!editor, task.id]);

    useEffect(() => {
        if (!editor || !isEditingDesc) return;
        const timeoutId = setTimeout(() => {
            const jsonStr = JSON.stringify(editor.getJSON());
            if (jsonStr !== taskRef.current.description) {
                onUpdateTaskRef.current({ description: jsonStr });
            }
        }, 1000);
        return () => clearTimeout(timeoutId);
    }, [editor, editorVersion, isEditingDesc]);

    if (!editor) return null;

    const editorText = editor.getText() || '';
    const isLongDescription = editorText.length > 300 || editorText.split('\n').length > 6;

    const openPicker = (
        setter: (v: 'toolbar') => void,
        posSetter: (p: { top: number; left: number }) => void,
        btnEl: HTMLElement
    ) => {
        const r = btnEl.getBoundingClientRect();
        posSetter({ top: r.bottom + 4, left: r.left });
        setter('toolbar');
    };

    return (
        <div className="flex flex-col gap-2">
            <style dangerouslySetInnerHTML={{
                __html: `
                .tiptap-editor-mini .ProseMirror:focus { outline: none; }
                .tiptap-editor-mini .ProseMirror { line-height: 1.55; }
                .tiptap-editor-mini .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder); float: left; color: #adb5bd; pointer-events: none; height: 0;
                }
                .tiptap-editor-mini .ProseMirror p { margin-top: 0; margin-bottom: 0; }
                .tiptap-editor-mini ul[data-type="taskList"] { list-style: none; padding: 0; }
                .tiptap-editor-mini ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.25rem; }
                .tiptap-editor-mini ul[data-type="taskList"] input[type="checkbox"] { width: 1rem; height: 1rem; margin-top: 0.2rem; cursor: pointer; accent-color: #db4035; }
                .tiptap-editor-mini ul:not([data-type="taskList"]) { list-style-type: disc; padding-left: 1.25rem; }
                .tiptap-editor-mini ol { list-style-type: decimal; padding-left: 1.25rem; }
                .tiptap-editor-mini a { color: #db4035; text-decoration: underline; cursor: pointer; }
                .tiptap-editor-mini hr { border: none; border-top: 2px solid #e5e7eb; margin: 1.5rem 0; }
                .tiptap-editor-mini .ProseMirror h1 { font-size: 1.875rem; font-weight: 800; margin: 1.5rem 0 0.75rem; }
                .tiptap-editor-mini .ProseMirror h2 { font-size: 1.5rem; font-weight: 700; margin: 1.25rem 0 0.5rem; }
                .tiptap-editor-mini table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 1.5rem 0; }
                .tiptap-editor-mini table td, .tiptap-editor-mini table th { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
                .tiptap-editor-mini pre { background: #1f2937; color: #e5e7eb; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; overflow-x: auto; }
                .tiptap-editor-mini code:not(pre code) { background: #f3f4f6; color: #db4035; padding: 0.1em 0.35em; border-radius: 4px; font-size: 0.875em; }
                .tiptap-editor-mini mark { background: #fef08a; color: inherit; border-radius: 2px; padding: 0 2px; }
                .tiptap-editor-mini s { text-decoration: line-through; }
                .tiptap-editor-mini [data-callout] { padding: 0.75rem 1rem; border-radius: 6px; margin: 0.75rem 0; border-left: 3px solid; }
                .tiptap-editor-mini [data-callout][data-type="info"] { background: #eff6ff; border-color: #3b82f6; }
                .tiptap-editor-mini [data-callout][data-type="warning"] { background: #fffbeb; border-color: #f59e0b; }
                .tiptap-editor-mini [data-callout][data-type="success"] { background: #f0fdf4; border-color: #22c55e; }
                .tiptap-editor-mini [data-callout][data-type="error"] { background: #fef2f2; border-color: #ef4444; }
                .tiptap-editor-mini [data-callout][data-type="note"] { background: #faf5ff; border-color: #a855f7; }
                .tiptap-editor-mini .tiptap-details { border: 1px solid var(--color-border-subtle); border-radius: 6px; margin: 0.5rem 0; overflow: hidden; }
                .tiptap-editor-mini .tiptap-details-header { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: var(--color-surface-0); }
                .tiptap-editor-mini .tiptap-details-toggle { background: none; border: none; cursor: pointer; padding: 2px; color: var(--color-text-muted); display: flex; }
                .tiptap-editor-mini .tiptap-details-title { border: none; background: transparent; font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); outline: none; flex: 1; }
                .tiptap-editor-mini .tiptap-details-content { padding: 8px 12px; }
                .tiptap-editor-mini .doc-mention-chip {
                    display: inline-flex; align-items: center; gap: 3px;
                    padding: 1px 6px; border-radius: 4px;
                    background: color-mix(in srgb, var(--color-brand, #db4035) 10%, transparent);
                    color: var(--color-brand, #db4035);
                    font-size: 12px; font-weight: 600; cursor: pointer;
                    border: 1px solid color-mix(in srgb, var(--color-brand, #db4035) 20%, transparent);
                }
                .tiptap-editor-mini blockquote { padding: 0.6rem 0.875rem; border-radius: 4px; margin: 0.75rem 0; border-left: 3px solid #db4035; background: #fdf3f2; }
                .tiptap-editor-mini img { max-width: 100%; height: auto; border-radius: 6px; }
                .tiptap-editor-mini img.ProseMirror-selectednode { outline: 2px solid #db4035; }
            `}} />

            <div className="flex items-center justify-between mb-1">
                {isEditingDesc && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                        Salvamento automático ativo
                    </span>
                )}
                {isEditingDesc && (
                    <button
                        onClick={() => setIsEditingDesc(false)}
                        className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        Fechar Editor
                    </button>
                )}
            </div>

            {isEditingDesc && (
                <BubbleMenu editor={editor} className="flex items-center gap-0.5 bg-surface-card text-primary p-1 rounded-[var(--radius-sm)] shadow-float border border-border-subtle z-50">
                    <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 ${editor.isActive('bold') ? 'text-brand' : 'text-secondary'}`}><Bold size={13} /></button>
                    <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 ${editor.isActive('italic') ? 'text-brand' : 'text-secondary'}`}><Italic size={13} /></button>
                    <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 ${editor.isActive('strike') ? 'text-brand' : 'text-secondary'}`}><Strikethrough size={13} /></button>
                    <button data-picker-btn onMouseDown={e => {
                        e.preventDefault();
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setHighlightPickerPos({ top: r.bottom + 4, left: r.left });
                        setHighlightPickerOpen(v => v ? null : 'bubble');
                        setTextColorPickerOpen(null);
                    }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 ${editor.isActive('highlight') ? 'text-brand' : 'text-secondary'}`}><Highlighter size={13} /></button>
                    <button data-picker-btn onMouseDown={e => {
                        e.preventDefault();
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setTextColorPickerPos({ top: r.bottom + 4, left: r.left });
                        setTextColorPickerOpen(v => v ? null : 'bubble');
                        setHighlightPickerOpen(null);
                    }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 ${editor.getAttributes('textStyle').color ? 'text-brand' : 'text-secondary'}`}><Palette size={13} /></button>
                    <div className="w-px h-4 bg-border-subtle mx-0.5" />
                    <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 ${editor.isActive({ textAlign: 'left' }) ? 'text-brand' : 'text-secondary'}`}><AlignLeft size={13} /></button>
                    <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 ${editor.isActive({ textAlign: 'center' }) ? 'text-brand' : 'text-secondary'}`}><AlignCenter size={13} /></button>
                    <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 ${editor.isActive({ textAlign: 'right' }) ? 'text-brand' : 'text-secondary'}`}><AlignRight size={13} /></button>
                    <div className="w-px h-4 bg-border-subtle mx-0.5" />
                    <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 ${editor.isActive('bulletList') ? 'text-brand' : 'text-secondary'}`}><List size={13} /></button>
                    <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleTaskList().run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 ${editor.isActive('taskList') ? 'text-brand' : 'text-secondary'}`}><CheckSquare size={13} /></button>
                    <div className="w-px h-4 bg-border-subtle mx-0.5" />
                    <button onMouseDown={e => {
                        e.preventDefault();
                        const url = window.prompt('URL:');
                        if (url) editor.chain().focus().setLink({ href: url }).run();
                    }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 ${editor.isActive('link') ? 'text-brand' : 'text-secondary'}`}><LinkIcon size={13} /></button>
                    <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetAllMarks().run(); }} className="p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-0 text-secondary" title="Limpar formatação"><Eraser size={13} /></button>
                </BubbleMenu>
            )}

            <div
                onClick={() => !isEditingDesc && setIsEditingDesc(true)}
                className={`bg-surface-0 rounded-[var(--radius-card)] border transition-all relative overflow-hidden flex flex-col
                    ${saving ? 'border-brand/30 opacity-70' : 'border-border-subtle'}
                    ${!isEditingDesc ? 'p-4 cursor-pointer hover:bg-surface-0' : 'bg-surface-card border-brand'}
                    ${!isExpanded && isLongDescription && !isEditingDesc ? 'max-h-[150px]' : 'max-h-none'}`}
            >
                {isEditingDesc && (
                    <div className="border-b border-border-subtle bg-surface-0 px-2 py-1.5 flex items-center gap-0.5 shrink-0 overflow-x-auto custom-scrollbar">
                        {/* Undo/Redo */}
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().undo().run(); }} disabled={!editor.can().undo()} className="p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 text-muted disabled:opacity-30"><Undo2 size={15} /></button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().redo().run(); }} disabled={!editor.can().redo()} className="p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 text-muted disabled:opacity-30"><Redo2 size={15} /></button>
                        <div className="w-px h-5 bg-border-subtle mx-1" />
                        {/* Headings */}
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive('heading', { level: 1 }) ? 'text-brand bg-surface-2' : 'text-muted'}`}><Heading1 size={15} /></button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive('heading', { level: 2 }) ? 'text-brand bg-surface-2' : 'text-muted'}`}><Heading2 size={15} /></button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive('heading', { level: 3 }) ? 'text-brand bg-surface-2' : 'text-muted'}`}><Heading3 size={15} /></button>
                        <div className="w-px h-5 bg-border-subtle mx-1" />
                        {/* Formatting */}
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive('bold') ? 'text-brand bg-surface-2' : 'text-muted'}`}><Bold size={15} /></button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive('italic') ? 'text-brand bg-surface-2' : 'text-muted'}`}><Italic size={15} /></button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive('strike') ? 'text-brand bg-surface-2' : 'text-muted'}`}><Strikethrough size={15} /></button>
                        {/* Highlight picker */}
                        <button data-picker-btn onMouseDown={e => {
                            e.preventDefault();
                            openPicker(setHighlightPickerOpen, setHighlightPickerPos, e.currentTarget as HTMLElement);
                            setTextColorPickerOpen(null); setBlockquotePickerOpen(null);
                        }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive('highlight') ? 'text-brand bg-surface-2' : 'text-muted'}`} title="Destaque">
                            <Highlighter size={15} />
                        </button>
                        {/* Text color picker */}
                        <button data-picker-btn onMouseDown={e => {
                            e.preventDefault();
                            openPicker(setTextColorPickerOpen, setTextColorPickerPos, e.currentTarget as HTMLElement);
                            setHighlightPickerOpen(null); setBlockquotePickerOpen(null);
                        }} className={cn('p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2', editor.getAttributes('textStyle').color ? 'text-brand bg-surface-2' : 'text-muted')} title="Cor do texto">
                            <Palette size={15} />
                        </button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetAllMarks().run(); }} className="p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 text-muted" title="Limpar formatação"><Eraser size={15} /></button>
                        <div className="w-px h-5 bg-border-subtle mx-1" />
                        {/* Lists */}
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive('bulletList') ? 'text-brand bg-surface-2' : 'text-muted'}`}><List size={15} /></button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive('orderedList') ? 'text-brand bg-surface-2' : 'text-muted'}`}><ListOrdered size={15} /></button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleTaskList().run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive('taskList') ? 'text-brand bg-surface-2' : 'text-muted'}`}><CheckSquare size={15} /></button>
                        {/* Blockquote picker */}
                        <button data-picker-btn onMouseDown={e => {
                            e.preventDefault();
                            openPicker(setBlockquotePickerOpen, setBlockquotePickerPos, e.currentTarget as HTMLElement);
                            setHighlightPickerOpen(null); setTextColorPickerOpen(null);
                        }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive('blockquote') ? 'text-brand bg-surface-2' : 'text-muted'}`} title="Citação">
                            <Quote size={15} />
                        </button>
                        <div className="w-px h-5 bg-border-subtle mx-1" />
                        {/* Insert */}
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }} className="p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 text-muted"><TableIcon size={15} /></button>
                        <button onMouseDown={e => { e.preventDefault(); fileInputRef.current?.click(); }} className="p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 text-muted" title="Inserir imagem"><ImageIcon size={15} /></button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive('codeBlock') ? 'text-brand bg-surface-2' : 'text-muted'}`}><Code size={15} /></button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setHorizontalRule().run(); }} className="p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 text-muted"><Minus size={15} /></button>
                        <div className="w-px h-5 bg-border-subtle mx-1" />
                        {/* Align */}
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive({ textAlign: 'left' }) ? 'text-brand bg-surface-2' : 'text-muted'}`}><AlignLeft size={15} /></button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive({ textAlign: 'center' }) ? 'text-brand bg-surface-2' : 'text-muted'}`}><AlignCenter size={15} /></button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run(); }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive({ textAlign: 'right' }) ? 'text-brand bg-surface-2' : 'text-muted'}`}><AlignRight size={15} /></button>
                        {/* Link */}
                        <div className="w-px h-5 bg-border-subtle mx-1" />
                        <button onMouseDown={e => {
                            e.preventDefault();
                            const url = window.prompt('URL:');
                            if (url) editor.chain().focus().setLink({ href: url }).run();
                        }} className={`p-1.5 rounded-[var(--radius-xs)] hover:bg-surface-2 ${editor.isActive('link') ? 'text-brand bg-surface-2' : 'text-muted'}`}><LinkIcon size={15} /></button>
                    </div>
                )}

                <div className={`tiptap-editor-mini ${isEditingDesc ? 'p-4' : ''}`}>
                    <EditorContent editor={editor} />
                </div>

                {!isExpanded && isLongDescription && !isEditingDesc && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface-0 to-transparent pointer-events-none" />
                )}

                {(saving || uploadingInternal) && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-bold text-brand animate-pulse bg-surface-card/80 px-2 py-1 rounded-[var(--radius-xs)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" />
                        {uploadingInternal ? 'Enviando...' : 'Salvando...'}
                    </div>
                )}
            </div>

            {!isEditingDesc && isLongDescription && (
                <div className="flex justify-center -mt-4 relative z-10">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="text-[10px] font-black uppercase tracking-widest text-brand hover:text-brand-dark px-6 py-2 rounded-full bg-surface-card border border-border-subtle transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        {isExpanded ? <span>Recolher</span> : <span>Expandir descrição</span>}
                    </button>
                </div>
            )}

            {/* Hidden file input for image upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async e => {
                    const file = e.target.files?.[0];
                    if (file) await handleEditorImageUpload(file);
                    e.target.value = '';
                }}
            />

            {/* Color picker portals */}
            {highlightPickerOpen && (
                <PickerPortal pos={highlightPickerPos}>
                    <HighlightSwatches editor={editor} onClose={() => setHighlightPickerOpen(null)} />
                </PickerPortal>
            )}
            {textColorPickerOpen && (
                <PickerPortal pos={textColorPickerPos}>
                    <TextColorSwatches editor={editor} onClose={() => setTextColorPickerOpen(null)} />
                </PickerPortal>
            )}
            {blockquotePickerOpen && (
                <PickerPortal pos={blockquotePickerPos}>
                    <BlockquotePicker editor={editor} onClose={() => setBlockquotePickerOpen(null)} />
                </PickerPortal>
            )}
        </div>
    );
}
