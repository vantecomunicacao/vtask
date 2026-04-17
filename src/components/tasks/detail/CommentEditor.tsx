import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';
import { DocMention } from '../../documents/extensions/DocMention';
import { renderDocItems } from '../../documents/DocMentionSuggestion';
import { useDocumentStore } from '../../../store/documentStore';
import { TextSubstitutions } from '../../../lib/tiptapExtensions';

interface CommentEditorProps {
    value: string;
    onChange: (html: string) => void;
    onSubmit: () => void;
    placeholder?: string;
}

export function CommentEditor({ value, onChange, onSubmit, placeholder }: CommentEditorProps) {
    const { documents } = useDocumentStore();
    const documentsRef = useRef(documents);
    useEffect(() => { documentsRef.current = documents; }, [documents]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ codeBlock: false }),
            TextSubstitutions,
            Placeholder.configure({ placeholder: placeholder ?? 'Escreva um comentário… use [[ para mencionar um documento' }),
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
        content: value || '',
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            handleKeyDown: (_view, event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    onSubmit();
                    return true;
                }
                return false;
            },
        },
    });

    // Reset editor content when value is cleared externally (after submit)
    useEffect(() => {
        if (!editor) return;
        if (value === '' && editor.getText().trim() !== '') {
            editor.commands.clearContent();
        }
    }, [value, editor]);

    return (
        <div
            className="flex-1 min-h-[60px] border border-border-subtle rounded-lg bg-surface-card focus-within:border-brand transition-colors cursor-text"
            onClick={() => editor?.commands.focus()}
        >
            <style>{`
                .comment-editor .tiptap { padding: 8px 12px; font-size: 14px; outline: none; min-height: 60px; }
                .comment-editor .tiptap p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: var(--color-muted, #9ca3af);
                    pointer-events: none;
                    height: 0;
                }
                .comment-editor .tiptap p { margin: 0; }
                .comment-editor .doc-mention-chip,
                .comment-body .doc-mention-chip {
                    display: inline-flex; align-items: center; gap: 3px;
                    padding: 1px 6px; border-radius: 4px;
                    background: color-mix(in srgb, var(--color-brand, #db4035) 10%, transparent);
                    color: var(--color-brand, #db4035);
                    font-size: 12px; font-weight: 600; cursor: pointer;
                    border: 1px solid color-mix(in srgb, var(--color-brand, #db4035) 20%, transparent);
                    text-decoration: none;
                }
                .comment-body p { margin: 0; }
                .comment-body [data-type="doc-mention"] {
                    display: inline-flex; align-items: center; gap: 3px;
                    padding: 1px 6px; border-radius: 4px;
                    background: color-mix(in srgb, var(--color-brand, #db4035) 10%, transparent);
                    color: var(--color-brand, #db4035);
                    font-size: 12px; font-weight: 600; cursor: pointer;
                    border: 1px solid color-mix(in srgb, var(--color-brand, #db4035) 20%, transparent);
                }
            `}</style>
            <EditorContent editor={editor} className="comment-editor" />
        </div>
    );
}
