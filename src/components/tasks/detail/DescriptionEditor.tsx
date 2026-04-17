import { useState, useEffect, useRef } from 'react';
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
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import {
    Bold, Italic, Link as LinkIcon, Heading1, Heading2, List, ListOrdered,
    CheckSquare, Table as TableIcon, Image as ImageIcon, Code,
    AlignLeft, AlignCenter, AlignRight, Minus,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import type { TaskWithAssignee } from '../../../store/taskStore';
import { SlashCommands, suggestionItems, renderItems } from '../../documents/SlashCommands';
import { DocMention } from '../../documents/extensions/DocMention';
import { renderDocItems } from '../../documents/DocMentionSuggestion';
import { useDocumentStore } from '../../../store/documentStore';

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

    const documentsRef = useRef(documents);
    useEffect(() => { documentsRef.current = documents; }, [documents]);

    // Refs keep values fresh inside TipTap closures (stale closure problem)
    const taskRef = useRef(task);
    const onUpdateTaskRef = useRef(onUpdateTask);
    useEffect(() => { taskRef.current = task; });
    useEffect(() => { onUpdateTaskRef.current = onUpdateTask; });

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextSubstitutions,
            Placeholder.configure({ placeholder: 'Digite "/" para comandos...' }),
            Link.configure({ openOnClick: false }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Table.configure({ resizable: true }),
            TableRow, TableHeader, TableCell,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Image.configure({
                HTMLAttributes: { class: 'rounded-lg border border-border-subtle shadow-sm max-w-full h-auto my-4' },
            }),
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
                    items: ({ query }: { query: string }) =>
                        documentsRef.current
                            .filter(d => (d.title || '').toLowerCase().includes(query.toLowerCase()))
                            .slice(0, 10),
                    render: renderDocItems,
                },
            }),
        ],
        content: '',
        editorProps: {
            attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] text-gray-700 leading-relaxed' },
        },
    });

    // Blur saves via ref so the handler always has fresh task/onUpdateTask
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

    // Sync content when task changes
    useEffect(() => {
        if (task && editor) {
            const content = task.description || '';
            try {
                editor.commands.setContent(content.startsWith('{') ? JSON.parse(content) : content);
            } catch {
                editor.commands.setContent(content);
            }
        }
    }, [task.id, !!editor]);

    const handleEditorImageUpload = async (file: File) => {
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
    };

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.file) handleEditorImageUpload(detail.file);
        };
        window.addEventListener('editor-upload-image', handler);
        return () => window.removeEventListener('editor-upload-image', handler);
    }, [!!editor, task.id]);

    // Auto-save on content change while editing
    useEffect(() => {
        if (!editor || !isEditingDesc) return;
        const timeoutId = setTimeout(() => {
            const jsonStr = JSON.stringify(editor.getJSON());
            if (jsonStr !== task.description) {
                onUpdateTask({ description: jsonStr });
            }
        }, 1000);
        return () => clearTimeout(timeoutId);
    }, [editor?.getJSON(), isEditingDesc]);

    if (!editor) return null;

    const editorText = editor.getText() || '';
    const isLongDescription = editorText.length > 300 || editorText.split('\n').length > 6;

    return (
        <div className="flex flex-col gap-2">
            <style dangerouslySetInnerHTML={{
                __html: `
                .tiptap-editor-mini .ProseMirror:focus { outline: none; }
                .tiptap-editor-mini .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder); float: left; color: #adb5bd; pointer-events: none; height: 0;
                }
                .tiptap-editor-mini .ProseMirror p { margin-bottom: 0.5rem; }
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
                .tiptap-editor-mini .doc-mention-chip {
                    display: inline-flex; align-items: center; gap: 3px;
                    padding: 1px 6px; border-radius: 4px;
                    background: color-mix(in srgb, var(--color-brand, #db4035) 10%, transparent);
                    color: var(--color-brand, #db4035);
                    font-size: 12px; font-weight: 600; cursor: pointer;
                    border: 1px solid color-mix(in srgb, var(--color-brand, #db4035) 20%, transparent);
                }
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
                <BubbleMenu editor={editor} className="flex items-center gap-1 bg-gray-900 text-white p-1 rounded-lg shadow-xl border border-white/10 z-50">
                    <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-white/10 ${editor.isActive('bold') ? 'text-brand' : ''}`}><Bold size={14} /></button>
                    <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-white/10 ${editor.isActive('italic') ? 'text-brand' : ''}`}><Italic size={14} /></button>
                    <div className="w-px h-4 bg-white/20 mx-0.5" />
                    <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded hover:bg-white/10 ${editor.isActive('bulletList') ? 'text-brand' : ''}`}><List size={14} /></button>
                    <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded hover:bg-white/10 ${editor.isActive('taskList') ? 'text-brand' : ''}`}><CheckSquare size={14} /></button>
                    <div className="w-px h-4 bg-white/20 mx-0.5" />
                    <button onClick={() => {
                        const url = window.prompt('URL:');
                        if (url) editor.chain().focus().setLink({ href: url }).run();
                    }} className={`p-1.5 rounded hover:bg-white/10 ${editor.isActive('link') ? 'text-brand' : ''}`}><LinkIcon size={14} /></button>
                </BubbleMenu>
            )}

            <div
                onClick={() => !isEditingDesc && setIsEditingDesc(true)}
                className={`bg-gray-50/50 rounded-lg border transition-all relative overflow-hidden flex flex-col
                    ${saving ? 'border-brand/30 opacity-70' : 'border-border-subtle'}
                    ${!isEditingDesc ? 'p-4 cursor-pointer hover:bg-gray-100/50' : 'bg-white border-brand shadow-sm'}
                    ${!isExpanded && isLongDescription && !isEditingDesc ? 'max-h-[150px]' : 'max-h-none'}`}
            >
                {isEditingDesc && (
                    <div className="border-b border-gray-100 bg-gray-50 px-2 py-1.5 flex items-center gap-1 shrink-0 overflow-x-auto custom-scrollbar">
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('heading', { level: 1 }) ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><Heading1 size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('heading', { level: 2 }) ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><Heading2 size={16} /></button>
                        <div className="w-px h-5 bg-gray-200 mx-1" />
                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('bold') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><Bold size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('italic') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><Italic size={16} /></button>
                        <div className="w-px h-5 bg-gray-200 mx-1" />
                        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('bulletList') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><List size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('orderedList') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><ListOrdered size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('taskList') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><CheckSquare size={16} /></button>
                        <div className="w-px h-5 bg-gray-200 mx-1" />
                        <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="p-1.5 rounded hover:bg-white text-gray-500"><TableIcon size={16} /></button>
                        <button onClick={() => {
                            const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
                            input.onchange = async (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) handleEditorImageUpload(file); };
                            input.click();
                        }} className="p-1.5 rounded hover:bg-white text-gray-500"><ImageIcon size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive('codeBlock') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><Code size={16} /></button>
                        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className="p-1.5 rounded hover:bg-white text-gray-500"><Minus size={16} /></button>
                        <div className="w-px h-5 bg-gray-200 mx-1" />
                        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive({ textAlign: 'left' }) ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><AlignLeft size={16} /></button>
                        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive({ textAlign: 'center' }) ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><AlignCenter size={16} /></button>
                        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-1.5 rounded hover:bg-white ${editor.isActive({ textAlign: 'right' }) ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}><AlignRight size={16} /></button>
                    </div>
                )}

                <div className={`tiptap-editor-mini ${isEditingDesc ? 'p-4' : ''}`}>
                    <EditorContent editor={editor} />
                </div>

                {!isExpanded && isLongDescription && !isEditingDesc && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50/90 to-transparent pointer-events-none" />
                )}

                {(saving || uploadingInternal) && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-bold text-brand animate-pulse bg-white/80 px-2 py-1 rounded shadow-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" />
                        {uploadingInternal ? 'Enviando...' : 'Salvando...'}
                    </div>
                )}
            </div>

            {!isEditingDesc && isLongDescription && (
                <div className="flex justify-center -mt-4 relative z-10">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="text-[10px] font-black uppercase tracking-widest text-brand hover:text-brand-dark px-6 py-2 rounded-full bg-white border border-brand/20 shadow-md transition-all hover:scale-110 active:scale-95 flex items-center gap-2"
                    >
                        {isExpanded ? <span>Recolher</span> : <span>Expandir descrição</span>}
                    </button>
                </div>
            )}
        </div>
    );
}
