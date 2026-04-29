import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { FileText, ExternalLink } from 'lucide-react';

function PdfAttachmentView({ node }: NodeViewProps) {
    const label = (node.attrs.label as string) ?? 'documento.pdf';
    const url = node.attrs.url as string;

    return (
        <NodeViewWrapper as="span" style={{ display: 'inline' }}>
            <span
                contentEditable={false}
                onClick={() => url && window.open(url, '_blank')}
                title={`Abrir "${label}"`}
                className="doc-mention-chip pdf-mention-chip"
            >
                <FileText size={11} className="doc-mention-icon" />
                <span>{label}</span>
                <ExternalLink size={9} className="doc-mention-ext" />
            </span>
        </NodeViewWrapper>
    );
}

export const PdfAttachment = Node.create({
    name: 'pdfAttachment',
    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
        return {
            label: { default: '' },
            url: { default: '' },
        };
    },

    parseHTML() {
        return [{ tag: 'span[data-type="pdf-attachment"]' }];
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'pdf-attachment',
                'data-url': node.attrs.url,
                'data-label': node.attrs.label,
            }),
            `📎 ${node.attrs.label ?? ''}`,
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(PdfAttachmentView);
    },
});
