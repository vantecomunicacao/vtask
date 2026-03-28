import Mention from '@tiptap/extension-mention';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { FileText, ExternalLink } from 'lucide-react';

function DocMentionView({ node }: NodeViewProps) {
    const label = (node.attrs.label as string) ?? '';
    const id = node.attrs.id as string;

    return (
        <NodeViewWrapper as="span" style={{ display: 'inline' }}>
            <span
                contentEditable={false}
                onClick={() => id && window.open(`/documentos/${id}`, '_blank')}
                title={`Abrir "${label}" em nova aba`}
                className="doc-mention-chip"
            >
                <FileText size={11} className="doc-mention-icon" />
                <span>{label}</span>
                <ExternalLink size={9} className="doc-mention-ext" />
            </span>
        </NodeViewWrapper>
    );
}

export const DocMention = Mention.extend({
    name: 'docMention',

    addNodeView() {
        return ReactNodeViewRenderer(DocMentionView);
    },

    parseHTML() {
        return [{ tag: 'span[data-type="doc-mention"]' }];
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            'span',
            {
                'data-type': 'doc-mention',
                'data-doc-id': node.attrs.id,
                ...HTMLAttributes,
            },
            `📄 ${node.attrs.label ?? ''}`,
        ];
    },
});
