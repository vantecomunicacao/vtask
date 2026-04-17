import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { cn } from '../../lib/utils';
import { TextSubstitutions } from '../../lib/tiptapExtensions';
import {
    Bold, Italic, Strikethrough, List, ListOrdered,
    Heading2, Heading3, CheckSquare, Code,
} from 'lucide-react';

interface MiniRichEditorProps {
    value?: string;
    onChange?: (html: string) => void;
    placeholder?: string;
    className?: string;
}

function TB({ onClick, active, title, children }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onMouseDown={e => { e.preventDefault(); onClick(); }}
            title={title}
            className={cn(
                'p-1.5 rounded-[var(--radius-sm)] transition-all text-secondary',
                active
                    ? 'bg-brand/10 text-brand'
                    : 'hover:bg-surface-0 hover:text-primary'
            )}
        >
            {children}
        </button>
    );
}

export function MiniRichEditor({ value, onChange, placeholder, className }: MiniRichEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            TextSubstitutions,
            Placeholder.configure({ placeholder: placeholder ?? 'Adicione uma descrição detalhada...' }),
            TaskList,
            TaskItem.configure({ nested: true }),
        ],
        content: value || '',
        onUpdate({ editor }) {
            const html = editor.isEmpty ? '' : editor.getHTML();
            onChange?.(html);
        },
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[80px] px-3 py-2 text-primary text-sm',
            },
        },
    });

    if (!editor) return null;

    return (
        <div className={cn('tiptap-editor-container border border-border-subtle rounded-[var(--radius-md)] bg-surface-card focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all', className)}>
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border-subtle bg-surface-2/50 rounded-t-[var(--radius-md)]">
                <TB onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito">
                    <Bold size={13} />
                </TB>
                <TB onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico">
                    <Italic size={13} />
                </TB>
                <TB onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado">
                    <Strikethrough size={13} />
                </TB>
                <TB onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Código inline">
                    <Code size={13} />
                </TB>

                <div className="w-px h-4 bg-border-subtle mx-1" />

                <TB onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título H2">
                    <Heading2 size={13} />
                </TB>
                <TB onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Título H3">
                    <Heading3 size={13} />
                </TB>

                <div className="w-px h-4 bg-border-subtle mx-1" />

                <TB onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista">
                    <List size={13} />
                </TB>
                <TB onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
                    <ListOrdered size={13} />
                </TB>
                <TB onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Lista de tarefas">
                    <CheckSquare size={13} />
                </TB>
            </div>

            {/* Editor content */}
            <EditorContent editor={editor} />
        </div>
    );
}
