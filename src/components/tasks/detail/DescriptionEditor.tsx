import { useState, useEffect, useRef, useCallback } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import {
    Bold, Italic, Strikethrough, Link as LinkIcon,
    List, CheckSquare,
    AlignLeft, AlignCenter, AlignRight,
    Highlighter, Palette, Eraser,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import type { TaskWithAssignee } from '../../../store/taskStore';
import { createEditorExtensions } from '../../../lib/editorExtensions';
import { useDocumentStore } from '../../../store/documentStore';
import { EditorToolbar } from '../../ui/EditorToolbar';

function PickerPortal({ pos, children }: { pos: { top: number; left: number }; children: React.ReactNode }) {
    return createPortal(
        <div data-picker style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}>
            {children}
        </div>,
        document.body
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
    const [highlightPickerOpen, setHighlightPickerOpen] = useState<'bubble' | null>(null);
    const [textColorPickerOpen, setTextColorPickerOpen] = useState<'bubble' | null>(null);
    const [highlightPickerPos, setHighlightPickerPos] = useState({ top: 0, left: 0 });
    const [textColorPickerPos, setTextColorPickerPos] = useState({ top: 0, left: 0 });
    const imageUploadRef = useRef<((file: File) => void) | undefined>(undefined);
    const pdfUploadRef = useRef<((file: File) => void) | undefined>(undefined);

    const documentsRef = useRef(documents);
    useEffect(() => { documentsRef.current = documents; }, [documents]);

    const taskRef = useRef(task);
    const onUpdateTaskRef = useRef(onUpdateTask);
    useEffect(() => { taskRef.current = task; });
    useEffect(() => { onUpdateTaskRef.current = onUpdateTask; });


    const editor = useEditor({
        extensions: createEditorExtensions({
            documentsRef,
            placeholder: 'Digite "/" para comandos...',
        }),
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
            handleDrop: (view, event, __, moved) => {
                if (!moved && event.dataTransfer?.files?.[0]) {
                    const file = event.dataTransfer.files[0];
                    if (file.type.startsWith('image')) { event.preventDefault(); imageUploadRef.current?.(file); return true; }
                    if (file.type === 'application/pdf') {
                        event.preventDefault();
                        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
                        if (coords) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const sel = (view.state.selection.constructor as any).near(view.state.doc.resolve(coords.pos));
                            view.dispatch(view.state.tr.setSelection(sel));
                        }
                        pdfUploadRef.current?.(file);
                        return true;
                    }
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

    const handleEditorPdfUpload = useCallback(async (file: File) => {
        if (!editor || !task || !session) return;
        const MAX_MB = 10;
        if (file.type !== 'application/pdf') { import('sonner').then(({ toast }) => toast.error('Apenas arquivos PDF são permitidos.')); return; }
        if (file.size > MAX_MB * 1024 * 1024) { import('sonner').then(({ toast }) => toast.error(`O PDF deve ter no máximo ${MAX_MB} MB.`)); return; }
        setUploadingInternal(true);
        const filePath = `${task.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('task_attachments').upload(filePath, file, { contentType: 'application/pdf' });
        if (!uploadError) {
            const url = supabase.storage.from('task_attachments').getPublicUrl(filePath).data.publicUrl;
            editor.chain().focus().insertContent({ type: 'pdfAttachment', attrs: { label: file.name, url } }).run();
            await supabase.from('task_attachments').insert({
                task_id: task.id, user_id: session.user.id, file_name: file.name,
                file_path: filePath, file_size: file.size, file_type: file.type,
            });
            reloadAttachments();
        }
        setUploadingInternal(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, task?.id, session]);

    useEffect(() => { pdfUploadRef.current = handleEditorPdfUpload; }, [handleEditorPdfUpload]);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.file) handleEditorPdfUpload(detail.file);
        };
        window.addEventListener('editor-upload-pdf', handler);
        return () => window.removeEventListener('editor-upload-pdf', handler);
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
                .tiptap-editor-mini .pdf-mention-chip {
                    background: color-mix(in srgb, #2563eb 10%, transparent);
                    color: #1d4ed8;
                    border-color: color-mix(in srgb, #2563eb 20%, transparent);
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
                    <EditorToolbar
                        editor={editor}
                        onImageUpload={file => imageUploadRef.current?.(file)}
                        size="sm"
                        className="border-b border-border-subtle bg-surface-0 px-2 py-1.5 shrink-0 custom-scrollbar"
                    />
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

            {/* Color picker portals (BubbleMenu only) */}
            {highlightPickerOpen && (
                <PickerPortal pos={highlightPickerPos}>
                    <div className="bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float p-2 flex flex-col gap-1.5 min-w-[9rem]">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted px-1">Destaque</span>
                        <div className="grid grid-cols-4 gap-1">
                            {[{c:'#FEF08A',l:'Amarelo'},{c:'#BBF7D0',l:'Verde'},{c:'#BAE6FD',l:'Azul'},{c:'#FBCFE8',l:'Rosa'},{c:'#FED7AA',l:'Laranja'},{c:'#DDD6FE',l:'Roxo'},{c:'#FECACA',l:'Vermelho'},{c:'#E5E7EB',l:'Cinza'}].map(({c,l}) => (
                                <button key={c} onMouseDown={e => { e.preventDefault(); editor.chain().focus().setHighlight({ color: c }).run(); setHighlightPickerOpen(null); }}
                                    title={l} className="w-7 h-7 rounded-[var(--radius-sm)] border-2 border-transparent hover:border-brand transition-all hover:scale-110" style={{ backgroundColor: c }} />
                            ))}
                        </div>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); setHighlightPickerOpen(null); }} className="text-[10px] text-muted hover:text-primary px-1 text-left mt-0.5">Remover destaque</button>
                    </div>
                </PickerPortal>
            )}
            {textColorPickerOpen && (
                <PickerPortal pos={textColorPickerPos}>
                    <div className="bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float p-2 flex flex-col gap-1.5 min-w-[9rem]">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted px-1">Cor do texto</span>
                        <div className="grid grid-cols-3 gap-1">
                            {[{c:'#1c1a18',l:'Padrão'},{c:'#db4035',l:'Vermelho'},{c:'#ff9f1a',l:'Laranja'},{c:'#d9730d',l:'Marrom'},{c:'#0b6e99',l:'Azul'},{c:'#0f7b6c',l:'Verde'},{c:'#6940a5',l:'Roxo'},{c:'#ad1a72',l:'Rosa'},{c:'#64748b',l:'Cinza'}].map(({c,l}) => (
                                <button key={c} onMouseDown={e => { e.preventDefault(); c === '#1c1a18' ? editor.chain().focus().unsetColor().run() : editor.chain().focus().setColor(c).run(); setTextColorPickerOpen(null); }}
                                    title={l} className="flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-surface-0 transition-colors">
                                    <div className="w-4 h-4 rounded-full border border-border-subtle shrink-0" style={{ backgroundColor: c }} />
                                    <span className="text-[10px] text-secondary truncate">{l}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </PickerPortal>
            )}
        </div>
    );
}
