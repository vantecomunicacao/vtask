import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { ResizableImage } from '../components/documents/extensions/ResizableImage';
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
import { Callout } from '../components/documents/extensions/Callout';
import { Details } from '../components/documents/extensions/Details';
import { ColoredBlockquote } from '../components/documents/extensions/ColoredBlockquote';
import { PdfAttachment } from '../components/documents/extensions/PdfAttachment';
import { DocMention } from '../components/documents/extensions/DocMention';
import { createRenderDocItems } from '../components/documents/DocMentionSuggestion';
import { SlashCommands, suggestionItems, renderItems } from '../components/documents/SlashCommands';
import { PageBreak } from '../components/documents/extensions/PageBreak';
import { TextSubstitutions } from './tiptapExtensions';
import type { MutableRefObject } from 'react';
import type { Document } from '../store/documentStore';

const lowlight = createLowlight(common);

export interface EditorExtensionsOptions {
    documentsRef: MutableRefObject<Document[]>;
    placeholder?: string;
    /** ID do documento atual — exclui ele próprio das sugestões de menção */
    currentDocId?: string;
    /** Inclui extensão de quebra de página (só necessário no editor de docs) */
    includePageBreak?: boolean;
}

export function createEditorExtensions(options: EditorExtensionsOptions) {
    const { documentsRef, placeholder, currentDocId, includePageBreak = false } = options;

    const baseExtensions = [
        StarterKit.configure({ codeBlock: false, blockquote: false }),
        ColoredBlockquote,
        TextSubstitutions,
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Placeholder.configure({ placeholder: placeholder ?? 'Digite "/" para comandos ou comece a escrever...' }),
        Link.configure({
            openOnClick: false,
            HTMLAttributes: { class: 'text-brand underline underline-offset-4 cursor-pointer' },
        }),
        ResizableImage,
        PdfAttachment,
        Table.configure({ resizable: true }),
        TableRow, TableHeader, TableCell,
        TaskList,
        TaskItem.configure({ nested: true }),
        CodeBlockLowlight.configure({ lowlight }),
        Callout,
        Details,
        DocMention.configure({
            HTMLAttributes: { class: 'doc-mention-node' },
            suggestion: {
                char: '[[',
                items: ({ query }: { query: string }) => {
                    const all = documentsRef.current;
                    const q = query.toLowerCase().trim();
                    return all
                        .filter(d => d.id !== currentDocId && !d.deleted_at)
                        .map(d => ({
                            ...d,
                            _parentTitle: d.parent_id
                                ? (all.find(p => p.id === d.parent_id)?.title ?? null)
                                : null,
                        }))
                        .filter(d =>
                            q === '' ||
                            (d.title || '').toLowerCase().includes(q) ||
                            ((d as any)._parentTitle || '').toLowerCase().includes(q)
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
                render: createRenderDocItems(id => documentsRef.current.find(d => d.id === id)),
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
    ];

    if (includePageBreak) {
        baseExtensions.push(PageBreak);
    }

    return baseExtensions;
}
