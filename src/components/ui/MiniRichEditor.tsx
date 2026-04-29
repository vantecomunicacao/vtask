import { useEditor, EditorContent } from '@tiptap/react';
import { useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { createEditorExtensions } from '../../lib/editorExtensions';
import { useDocumentStore } from '../../store/documentStore';
import { supabase } from '../../lib/supabase';
import { EditorToolbar } from './EditorToolbar';

interface MiniRichEditorProps {
    value?: string;
    onChange?: (html: string) => void;
    placeholder?: string;
    className?: string;
}

export function MiniRichEditor({ value, onChange, placeholder, className }: MiniRichEditorProps) {
    const { documents } = useDocumentStore();
    const documentsRef = useRef(documents);
    useEffect(() => { documentsRef.current = documents; }, [documents]);

    const imageUploadRef = useRef<((file: File) => void) | undefined>(undefined);

    const editor = useEditor({
        // eslint-disable-next-line react-hooks/exhaustive-deps
        extensions: createEditorExtensions({
            documentsRef,
            placeholder: placeholder ?? 'Adicione uma descrição detalhada...',
        }),
        content: value || '',
        onUpdate({ editor }) {
            const html = editor.isEmpty ? '' : editor.getHTML();
            onChange?.(html);
        },
        editorProps: {
            attributes: { class: 'focus:outline-none min-h-[120px] px-3 py-2 text-primary text-sm' },
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

    useEffect(() => {
        if (!editor) return;
        imageUploadRef.current = async (file: File) => {
            const filePath = `new-task/${Date.now()}_${file.name}`;
            const { error, data } = await supabase.storage.from('document-images').upload(filePath, file);
            if (!error && data) {
                const url = supabase.storage.from('document-images').getPublicUrl(filePath).data.publicUrl;
                editor.chain().focus().setImage({ src: url }).run();
            }
        };
    }, [editor]);

    if (!editor) return null;

    return (
        <div className={cn('tiptap-editor-container border border-border-subtle rounded-[var(--radius-md)] bg-surface-card focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all', className)}>
            <EditorToolbar
                editor={editor}
                onImageUpload={file => imageUploadRef.current?.(file)}
                size="sm"
                className="px-2 py-1.5 border-b border-border-subtle bg-surface-2/50 rounded-t-[var(--radius-md)]"
            />
            <EditorContent editor={editor} />
        </div>
    );
}
