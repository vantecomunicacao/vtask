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
import { useEffect, useState, useCallback } from 'react';
import { useDocumentStore } from '../../store/documentStore';
import { Button } from '../ui/Button';
import { SlashCommands, suggestionItems, renderItems } from './SlashCommands';
import {
    ChevronLeft, Save, Bold, Italic, List, ListOrdered,
    Heading1, Heading2, Link as LinkIcon, Type,
    AlignLeft, AlignCenter, AlignRight, Table as TableIcon,
    CheckSquare, Code, Image as ImageIcon, Trash2, Minus
} from 'lucide-react';

const lowlight = createLowlight(common);

interface DocumentEditorProps {
    documentId: string;
    onClose: () => void;
}

export function DocumentEditor({ documentId, onClose }: DocumentEditorProps) {
    const { documents, updateDocument, deleteDocument, uploadImage } = useDocumentStore();
    const doc = documents.find(d => d.id === documentId);

    const [title, setTitle] = useState(doc?.title || '');
    const [saving, setSaving] = useState(false);

    const handleFileUpload = useCallback(async (file: File) => {
        if (!editor) return;
        const url = await uploadImage(file);
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    }, [uploadImage]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
            }),
            Placeholder.configure({
                placeholder: 'Digite "/" para comandos ou comece a escrever...',
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-lg border border-border-subtle shadow-sm max-w-full h-auto my-6',
                },
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-brand underline underline-offset-4 cursor-pointer',
                },
            }),
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            CodeBlockLowlight.configure({
                lowlight,
            }),
            SlashCommands.configure({
                suggestion: {
                    items: ({ query }: { query: string }) => {
                        return suggestionItems
                            .filter(item =>
                                item.title.toLowerCase().includes(query.toLowerCase()) ||
                                item.searchTerms.some(term => term.includes(query.toLowerCase()))
                            )
                            .slice(0, 15);
                    },
                    render: renderItems,
                },
            }),
        ],
        content: (doc?.content as any) || '',
        editorProps: {
            handlePaste: (_, event) => {
                const items = Array.from(event.clipboardData?.items || []);
                const imageItem = items.find(item => item.type.startsWith('image'));

                if (imageItem) {
                    const file = imageItem.getAsFile();
                    if (file) {
                        event.preventDefault();
                        handleFileUpload(file);
                        return true;
                    }
                }
                return false;
            },
            handleDrop: (_, event, __, moved) => {
                if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                    const file = event.dataTransfer.files[0];
                    if (file.type.startsWith('image')) {
                        event.preventDefault();
                        handleFileUpload(file);
                        return true;
                    }
                }
                return false;
            },
        },
    });

    useEffect(() => {
        if (doc) {
            setTitle(doc.title);
            if (editor && editor.isEmpty && doc.content) {
                editor.commands.setContent(doc.content as any);
            }
        }
    }, [doc, editor]);

    // Escutar evento de upload de imagem do SlashCommands
    useEffect(() => {
        const handler = (e: any) => {
            if (e.detail?.file) {
                handleFileUpload(e.detail.file);
            }
        };
        window.addEventListener('editor-upload-image', handler);
        return () => window.removeEventListener('editor-upload-image', handler);
    }, [handleFileUpload]);

    const handleSave = useCallback(async () => {
        if (!editor || saving) return;
        setSaving(true);
        try {
            await updateDocument(documentId, {
                title,
                content: editor.getJSON() as any
            });
        } finally {
            setSaving(false);
        }
    }, [editor, title, documentId, updateDocument, saving]);

    const handleDelete = async () => {
        if (window.confirm('Tem certeza que deseja excluir este documento?')) {
            await deleteDocument(documentId);
            onClose();
        }
    };

    // Shortcut de salvamento (Ctrl/Cmd + S)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleSave]);

    if (!doc) return null;

    return (
        <div className="fixed inset-y-0 right-0 left-64 bg-white z-20 flex flex-col animate-in slide-in-from-right duration-300 border-l border-border-subtle shadow-2xl overflow-hidden">
            {/* Toolbar Superior */}
            <div className="h-16 border-b border-border-subtle flex items-center justify-between px-6 bg-white shrink-0">
                <div className="flex items-center gap-4 flex-1">
                    <button
                        onClick={() => { handleSave(); onClose(); }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Título do Documento"
                        className="text-lg font-bold text-gray-900 outline-none flex-1 bg-transparent"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mr-2">
                        {saving ? 'Salvando...' : 'Salvo'}
                    </div>
                    <Button
                        variant="ghost"
                        onClick={handleSave}
                        disabled={saving}
                        className="gap-2"
                    >
                        <Save size={18} /> Salvar
                    </Button>
                    <div className="w-px h-6 bg-gray-200 mx-1" />
                    <button
                        onClick={handleDelete}
                        className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                        title="Excluir documento"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* Bubble Menu (Menu Flutuante sobre Seleção) */}
            {editor && (
                <BubbleMenu editor={editor} className="flex items-center gap-1 bg-gray-900 text-white p-1.5 rounded-lg shadow-xl border border-white/10">
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`p-1.5 rounded hover:bg-white/10 transition-colors ${editor.isActive('bold') ? 'text-brand' : ''}`}
                    >
                        <Bold size={16} />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`p-1.5 rounded hover:bg-white/10 transition-colors ${editor.isActive('italic') ? 'text-brand' : ''}`}
                    >
                        <Italic size={16} />
                    </button>
                    <div className="w-px h-4 bg-white/20 mx-1" />
                    <button
                        onClick={() => {
                            const url = window.prompt('URL do link:');
                            if (url) {
                                editor.chain().focus().setLink({ href: url }).run();
                            } else if (url === '') {
                                editor.chain().focus().unsetLink().run();
                            }
                        }}
                        className={`p-1.5 rounded hover:bg-white/10 transition-colors ${editor.isActive('link') ? 'text-brand' : ''}`}
                    >
                        <LinkIcon size={16} />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        className={`p-1.5 rounded hover:bg-white/10 transition-colors ${editor.isActive('highlight') ? 'text-yellow-400' : ''}`}
                    >
                        <Type size={16} />
                    </button>
                </BubbleMenu>
            )}

            {/* Toolbar Principal - Agora fixa no topo da área de edição */}
            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-2 flex items-center gap-1 shrink-0 overflow-x-auto custom-scrollbar">
                <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`p-2 rounded hover:bg-white hover:shadow-sm transition-all ${editor?.isActive('heading', { level: 1 }) ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}
                >
                    <Heading1 size={18} />
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-2 rounded hover:bg-white hover:shadow-sm transition-all ${editor?.isActive('heading', { level: 2 }) ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}
                >
                    <Heading2 size={18} />
                </button>
                <div className="w-px h-6 bg-gray-200 mx-2" />
                <button
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    className={`p-2 rounded hover:bg-white hover:shadow-sm transition-all ${editor?.isActive('bold') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}
                >
                    <Bold size={18} />
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    className={`p-2 rounded hover:bg-white hover:shadow-sm transition-all ${editor?.isActive('italic') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}
                >
                    <Italic size={18} />
                </button>
                <div className="w-px h-6 bg-gray-200 mx-2" />
                <button
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    className={`p-2 rounded hover:bg-white hover:shadow-sm transition-all ${editor?.isActive('bulletList') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}
                >
                    <List size={18} />
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    className={`p-2 rounded hover:bg-white hover:shadow-sm transition-all ${editor?.isActive('orderedList') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}
                >
                    <ListOrdered size={18} />
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleTaskList().run()}
                    className={`p-2 rounded hover:bg-white hover:shadow-sm transition-all ${editor?.isActive('taskList') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}
                >
                    <CheckSquare size={18} />
                </button>
                <div className="w-px h-6 bg-gray-200 mx-2" />
                <button
                    onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                    className="p-2 rounded hover:bg-white hover:shadow-sm transition-all text-gray-500"
                >
                    <TableIcon size={18} />
                </button>
                <button
                    onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleFileUpload(file);
                        };
                        input.click();
                    }}
                    className="p-2 rounded hover:bg-white hover:shadow-sm transition-all text-gray-500"
                >
                    <ImageIcon size={18} />
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                    className={`p-2 rounded hover:bg-white hover:shadow-sm transition-all ${editor?.isActive('codeBlock') ? 'text-brand bg-white shadow-sm' : 'text-gray-500'}`}
                >
                    <Code size={18} />
                </button>
                <div className="w-px h-6 bg-gray-200 mx-2" />
                <button
                    onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                    className="p-2 rounded hover:bg-white hover:shadow-sm transition-all text-gray-500"
                >
                    <Minus size={18} />
                </button>
                <div className="w-px h-6 bg-gray-200 mx-2" />
                <button
                    onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                    className="p-2 rounded hover:bg-white hover:shadow-sm transition-all text-gray-500"
                >
                    <AlignLeft size={18} />
                </button>
                <button
                    onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                    className="p-2 rounded hover:bg-white hover:shadow-sm transition-all text-gray-500"
                >
                    <AlignCenter size={18} />
                </button>
                <button
                    onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                    className="p-2 rounded hover:bg-white hover:shadow-sm transition-all text-gray-500"
                >
                    <AlignRight size={18} />
                </button>
            </div>

            {/* Área do Editor */}
            <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
                <div className="max-w-4xl mx-auto py-12 px-8 min-h-full">
                    <EditorContent editor={editor} className="tiptap-editor-container" />
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .tiptap-editor-container .ProseMirror:focus { outline: none; }
                .tiptap-editor-container .ProseMirror { min-height: 500px; }
                
                /* Placeholder */
                .tiptap-editor-container .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #adb5bd;
                    pointer-events: none;
                    height: 0;
                }

                /* Tipografia Base */
                .tiptap-editor-container .ProseMirror h1 { font-size: 2.5rem; font-weight: 800; margin: 2rem 0 1rem; color: #111827; }
                .tiptap-editor-container .ProseMirror h2 { font-size: 1.875rem; font-weight: 700; margin: 1.5rem 0 0.75rem; color: #1f2937; }
                .tiptap-editor-container .ProseMirror p { margin-bottom: 1rem; line-height: 1.7; color: #374151; font-size: 1.05rem; }

                /* Tabelas */
                .tiptap-editor-container table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 2rem 0; overflow: hidden; }
                .tiptap-editor-container table td, 
                .tiptap-editor-container table th { border: 1px solid #e5e7eb; padding: 12px; position: relative; text-align: left; transition: background 0.1s; }
                .tiptap-editor-container table th { background-color: #f9fafb; font-weight: 600; }
                .tiptap-editor-container .selectedCell:after { background: rgba(59, 130, 246, 0.1); content: ""; inset: 0; pointer-events: none; position: absolute; z-index: 2; }

                /* Task List */
                .tiptap-editor-container ul[data-type="taskList"] { list-style: none; padding: 0; }
                .tiptap-editor-container ul[data-type="taskList"] li { display: flex; align-items: flex-start; margin-bottom: 0.5rem; gap: 0.75rem; }
                .tiptap-editor-container ul[data-type="taskList"] input[type="checkbox"] { 
                    width: 1.2rem; height: 1.2rem; margin-top: 0.2rem; cursor: pointer;
                    accent-color: #db4035;
                }
                .tiptap-editor-container ul[data-type="taskList"] li[data-checked="true"] > div { text-decoration: line-through; color: #9ca3af; }

                /* Code Block */
                .tiptap-editor-container pre { background: #1f2937; color: #e5e7eb; padding: 1.25rem; border-radius: 0.75rem; margin: 1.5rem 0; font-family: 'JetBrains Mono', monospace; overflow-x: auto; font-size: 0.9rem; }
                .tiptap-editor-container pre code { background: none; color: inherit; padding: 0; }
                .hljs-comment, .hljs-quote { color: #6b7280; }
                .hljs-keyword, .hljs-selector-tag { color: #f472b6; }
                .hljs-string, .hljs-doctag, .hljs-regexp, .hljs-attr, .hljs-template-tag, .hljs-template-variable, .hljs-addition { color: #34d399; }
                .hljs-title, .hljs-section, .hljs-type, .hljs-name, .hljs-attribute { color: #60a5fa; }
                .hljs-variable, .hljs-template-variable, .hljs-tag, .hljs-link { color: #fbbf24; }

                /* Lists & HR */
                .tiptap-editor-container hr { border: none; border-top: 2px solid #e5e7eb; margin: 2rem 0; clear: both; }
                .tiptap-editor-container ul:not([data-type="taskList"]) { list-style-type: disc; padding-left: 1.5rem; margin: 1rem 0; }
                .tiptap-editor-container ol { list-style-type: decimal; padding-left: 1.5rem; margin: 1rem 0; }
                
                /* Blockquote */
                .tiptap-editor-container blockquote { border-left: 4px solid #db4035; padding-left: 1.25rem; font-style: italic; color: #4b5563; margin: 2rem 0; }
            `}} />
        </div>
    );
}
