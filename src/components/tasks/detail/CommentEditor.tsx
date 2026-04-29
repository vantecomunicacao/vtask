import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef, useCallback } from 'react';
import { PdfAttachment } from '../../documents/extensions/PdfAttachment';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { TextSubstitutions } from '../../../lib/tiptapExtensions';

interface CommentEditorProps {
    value: string;
    onChange: (html: string) => void;
    onSubmit: () => void;
    placeholder?: string;
    taskId?: string;
}

export function CommentEditor({ value, onChange, onSubmit, placeholder, taskId }: CommentEditorProps) {
    const { session } = useAuthStore();
    const editorRef = useRef<ReturnType<typeof useEditor>>(null);

    const handlePdfUpload = useCallback(async (file: File) => {
        const editor = editorRef.current;
        if (!editor || !taskId || !session) return;
        const MAX_MB = 10;
        if (file.type !== 'application/pdf') { import('sonner').then(({ toast }) => toast.error('Apenas PDFs são permitidos.')); return; }
        if (file.size > MAX_MB * 1024 * 1024) { import('sonner').then(({ toast }) => toast.error(`O PDF deve ter no máximo ${MAX_MB} MB.`)); return; }
        const filePath = `${taskId}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from('task_attachments').upload(filePath, file, { contentType: 'application/pdf' });
        if (!error) {
            const url = supabase.storage.from('task_attachments').getPublicUrl(filePath).data.publicUrl;
            editor.chain().focus().insertContent({ type: 'pdfAttachment', attrs: { label: file.name, url } }).run();
            await supabase.from('task_attachments').insert({
                task_id: taskId, user_id: session.user.id, file_name: file.name,
                file_path: filePath, file_size: file.size, file_type: file.type,
            });
        }
    }, [taskId, session]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextSubstitutions,
            PdfAttachment,
            Placeholder.configure({ placeholder: placeholder ?? 'Escreva um comentário...' }),
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
            handleDrop: (view, event, __, moved) => {
                if (!moved && event.dataTransfer?.files?.[0]) {
                    const file = event.dataTransfer.files[0];
                    if (file.type === 'application/pdf') {
                        event.preventDefault();
                        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
                        if (coords) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const sel = (view.state.selection.constructor as any).near(view.state.doc.resolve(coords.pos));
                            view.dispatch(view.state.tr.setSelection(sel));
                        }
                        handlePdfUpload(file);
                        return true;
                    }
                }
                return false;
            },
        },
    });

    useEffect(() => { editorRef.current = editor; }, [editor]);

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
                .comment-editor .pdf-mention-chip,
                .comment-body .pdf-mention-chip {
                    display: inline-flex; align-items: center; gap: 3px;
                    padding: 1px 6px; border-radius: 4px;
                    background: color-mix(in srgb, #2563eb 10%, transparent);
                    color: #1d4ed8;
                    font-size: 12px; font-weight: 600; cursor: pointer;
                    border: 1px solid color-mix(in srgb, #2563eb 20%, transparent);
                }
                .comment-body p { margin: 0; }
            `}</style>
            <EditorContent editor={editor} className="comment-editor" />
        </div>
    );
}
